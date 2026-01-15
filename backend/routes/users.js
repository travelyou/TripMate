const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

router.post('/', async (req, res) => {
  try {
    console.log('[Users API] 收到 POST 請求')
    console.log('[Users API] 請求 Body:', JSON.stringify(req.body, null, 2))

    // 從 req.body 讀取值，避免解構賦值可能的問題
    // 使用獨立的變數聲明，確保所有需要重新賦值的變數都使用 let
    const uid = req.body.uid;
    const email = req.body.email;
    let nickname = req.body.nickname;
    let real_name = req.body.real_name;
    let avatar = req.body.avatar;
    let bio = req.body.bio;
    let spirit_animal = req.body.spirit_animal;
    let role = req.body.role;
    let vendor_id = req.body.vendor_id;

    if (!uid || !email) {
      console.warn('[Users API] 缺少必填欄位:', { uid: !!uid, email: !!email })
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['uid', 'email'],
      });
    }

    // 驗證 real_name 不能是 email 格式
    // 使用臨時變數來避免直接重新賦值
    let processedRealName = real_name;
    if (processedRealName && typeof processedRealName === 'string') {
      const trimmedName = processedRealName.trim();
      // 檢查是否包含 @ 或看起來像 email
      if (trimmedName.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedName)) {
        console.warn(`警告：real_name 看起來像 email，將其設為 null (UID: ${uid}, real_name: ${processedRealName})`);
        processedRealName = null;
      } else {
        processedRealName = trimmedName;
      }
    }
    real_name = processedRealName;

    // 統一處理空字符串為 null
    if (bio === '') {
      bio = null;
    }
    if (spirit_animal === '') {
      spirit_animal = null;
    }

    if (role && !['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: '無效的角色',
        validRoles: ['user', 'vendor', 'admin'],
      });
    }

    // 根據 role 強制設置 vendor_id
    // 使用臨時變數來計算 finalRole
    let finalRole = 'user';
    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      finalRole = role;
    }
    let finalVendorId = vendor_id;

    if (finalRole === 'user' || finalRole === 'admin') {
      // 一般用戶和管理員的 vendor_id 必須是 null（避免外鍵約束錯誤）
      finalVendorId = null;
    } else if (finalRole === 'vendor') {
      // 廠商角色：如果有 vendor_id，驗證它是否存在於 vendors 表
      if (finalVendorId) {
        console.log('[Users API] 驗證 vendor_id 是否存在於 vendors 表:', finalVendorId)
        try {
          const vendorCheck = await pool.query('SELECT id FROM vendors WHERE id = $1', [finalVendorId]);
          if (vendorCheck.rows.length === 0) {
            console.warn('[Users API] vendor_id 不存在於 vendors 表:', finalVendorId)
            return res.status(400).json({
              error: '無效的廠商 ID',
              message: `指定的 vendor_id (${finalVendorId}) 不存在於 vendors 表中`,
            });
          }
          console.log('[Users API] vendor_id 驗證通過:', finalVendorId)
        } catch (vendorCheckError) {
          console.error('[Users API] 檢查 vendor_id 時發生錯誤:', vendorCheckError)
          // 如果檢查失敗，仍然允許繼續（讓資料庫外鍵約束來處理）
        }
      } else {
        // 如果沒有 vendor_id，設為 null（註冊時可能還沒有創建 vendor 資料）
        // NULL 值不會觸發外鍵約束檢查
        finalVendorId = null;
        console.log('[Users API] vendor 角色但沒有提供 vendor_id，設為 null')
      }
    }

    console.log('[Users API] 準備查詢現有用戶，UID:', uid)
    const existingUser = await pool.query('SELECT uid, role, vendor_id FROM users WHERE uid = $1', [uid]);
    console.log('[Users API] 查詢結果：', existingUser.rows.length > 0 ? '用戶已存在' : '新用戶')

    if (existingUser.rows.length > 0) {
      const currentRole = existingUser.rows[0].role || 'user';

      if (role && role !== currentRole) {
        console.log(`角色變更請求：${currentRole} -> ${role} (UID: ${uid})`);
      }

      // 更新時也要根據 role 強制設置 vendor_id
      let updateVendorId;
      if (finalRole === 'user' || finalRole === 'admin') {
        // 一般用戶和管理員的 vendor_id 必須是 null
        updateVendorId = null;
      } else if (finalRole === 'vendor') {
        // 廠商角色：如果提供了 vendor_id 就使用，否則保持原值
        if (vendor_id !== undefined) {
          updateVendorId = finalVendorId;
        } else {
          // 沒有提供 vendor_id，保持原值
          updateVendorId = existingUser.rows[0].vendor_id || null;
        }
      } else {
        // 保持原值
        updateVendorId = existingUser.rows[0].vendor_id || null;
      }

      const updateQuery = `
        UPDATE users
        SET
          email = COALESCE($2, email),
          nickname = COALESCE($3, nickname),
          real_name = COALESCE($4, real_name),
          avatar = COALESCE($5, avatar),
          bio = COALESCE($6, bio),
          spirit_animal = COALESCE($7, spirit_animal),
          role = $8,
          vendor_id = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE uid = $1
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        uid,
        email,
        nickname,
        real_name,
        avatar,
        bio,
        spirit_animal,
        finalRole,
        updateVendorId,
      ]);
      res.json(result.rows[0]);
    } else {
      console.log('準備插入新用戶到資料庫：', {
        uid,
        email,
        nickname,
        real_name,
        role: finalRole,
        vendor_id: finalVendorId
      });

      // 確保所有參數都正確對應到資料庫欄位
      // 根據資料庫表結構，可能包含：uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id
      // 注意：created_at 和 updated_at 應該有默認值，不需要在 INSERT 中指定
      // 如果表中有 vendor 或 conversation 外鍵欄位，需要確認是否需要處理
      const insertQuery = `
        INSERT INTO users (uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      // 準備參數，確保順序正確
      // 如果資料庫表有 vendor 或 conversation 外鍵欄位，可能需要額外處理
      const insertParams = [
        uid,                    // $1: uid
        email,                  // $2: email
        nickname || null,       // $3: nickname
        real_name || null,      // $4: real_name
        avatar || null,         // $5: avatar
        bio || null,            // $6: bio
        spirit_animal || null,  // $7: spirit_animal
        finalRole,              // $8: role
        finalVendorId,          // $9: vendor_id
      ];

      console.log('[Users API] 準備執行 INSERT 查詢')
      console.log('[Users API] SQL:', insertQuery)
      console.log('[Users API] 查詢參數：', {
        param1_uid: insertParams[0],
        param2_email: insertParams[1],
        param3_nickname: insertParams[2],
        param4_real_name: insertParams[3],
        param5_avatar: insertParams[4],
        param6_bio: insertParams[5],
        param7_spirit_animal: insertParams[6],
        param8_role: insertParams[7],
        param9_vendor_id: insertParams[8]
      })

      const result = await pool.query(insertQuery, insertParams);

      console.log('用戶已成功插入資料庫：', {
        uid: result.rows[0].uid,
        email: result.rows[0].email,
        nickname: result.rows[0].nickname
      });

      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('[Users API] 創建/更新用戶失敗：', error);
    console.error('[Users API] 錯誤詳情：', {
      name: error.name,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message,
      stack: error.stack
    });

    // 處理資料庫連接錯誤
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('[Users API] 資料庫連接錯誤')
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message
      });
    }

    // 處理 PostgreSQL 外鍵約束錯誤 (23503)
    if (error.code === '23503') {
      console.error('[Users API] 外鍵約束錯誤:', {
        constraint: error.constraint,
        detail: error.detail,
        message: error.message
      })

      // 檢查是哪個外鍵約束失敗
      const constraintName = error.constraint || '';
      const errorDetail = error.detail || '';

      // 檢查 vendor 相關的外鍵約束
      if (constraintName.toLowerCase().includes('vendor') ||
          constraintName.toLowerCase().includes('users_vendor') ||
          errorDetail.toLowerCase().includes('vendor')) {
        return res.status(400).json({
          error: '無效的廠商 ID',
          message: '指定的 vendor_id 不存在於 vendors 表中，請確認 vendor_id 是否正確',
          constraint: error.constraint,
          detail: error.detail
        });
      }

      // 檢查 conversation 相關的外鍵約束
      if (constraintName.toLowerCase().includes('conversation') ||
          errorDetail.toLowerCase().includes('conversation')) {
        return res.status(400).json({
          error: '外鍵約束錯誤',
          message: 'conversation 外鍵約束失敗，請確認相關資料是否存在',
          constraint: error.constraint,
          detail: error.detail
        });
      }

      // 其他外鍵約束錯誤
      return res.status(400).json({
        error: '外鍵約束錯誤',
        message: error.detail || '外鍵約束失敗，請確認相關資料是否存在',
        constraint: error.constraint,
        detail: error.detail
      });
    }

    // 處理唯一約束錯誤
    if (error.code === '23505') {
      return res.status(400).json({
        error: '用戶已存在',
        message: error.detail || '該 UID 或 Email 已被使用',
      });
    }

    // 處理其他資料庫錯誤
    if (error.code && error.code.startsWith('23')) {
      return res.status(400).json({
        error: '資料庫約束錯誤',
        message: error.detail || error.message,
        code: error.code,
        constraint: error.constraint
      });
    }

    // 處理一般錯誤
    res.status(500).json({
      error: '創建/更新用戶失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
      code: error.code,
      constraint: error.constraint
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT uid, email, nickname, real_name, avatar, role, vendor_id, created_at FROM users';
    const params = [];

    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      query += ' WHERE role = $1';
      params.push(role);
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      params.push(parseInt(limit), offset);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('獲取用戶列表失敗：', error);
    res.status(500).json({ error: '獲取用戶列表失敗', details: error?.message || String(error) });
  }
});

router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const result = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('獲取用戶資料失敗：', error);
    res.status(500).json({ error: '獲取用戶資料失敗', details: error?.message || String(error) });
  }
});

router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    let { nickname, real_name, avatar, bio, spirit_animal } = req.body;

    // 驗證 real_name 不能是 email 格式
    if (real_name) {
      const trimmedName = real_name.trim();
      // 檢查是否包含 @ 或看起來像 email
      if (trimmedName.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedName)) {
        console.warn(`警告：real_name 看起來像 email，不更新此欄位 (UID: ${uid}, real_name: ${real_name})`);
        real_name = undefined;
      } else {
        real_name = trimmedName;
      }
    }

    // 統一處理空字符串為 null
    if (bio === '') bio = null;
    if (spirit_animal === '') spirit_animal = null;

    const updateQuery = `
      UPDATE users
      SET
        nickname = COALESCE($2, nickname),
        real_name = COALESCE($3, real_name),
        avatar = COALESCE($4, avatar),
        bio = COALESCE($5, bio),
        spirit_animal = COALESCE($6, spirit_animal),
        updated_at = CURRENT_TIMESTAMP
      WHERE uid = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      uid,
      nickname,
      real_name,
      avatar,
      bio,
      spirit_animal,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新用戶資料失敗：', error);
    res.status(500).json({ error: '更新用戶資料失敗', details: error?.message || String(error) });
  }
});

router.patch('/:uid/role', async (req, res) => {
  try {
    const { uid } = req.params;
    const role = req.body.role;
    const vendor_id = req.body.vendor_id;

    if (!role || !['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: '無效的角色',
        validRoles: ['user', 'vendor', 'admin'],
      });
    }

    const userCheck = await pool.query('SELECT role, vendor_id FROM users WHERE uid = $1', [uid]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 根據 role 強制設置 vendor_id
    let finalVendorId = null;
    if (role === 'user' || role === 'admin') {
      // 一般用戶和管理員的 vendor_id 必須是 null
      finalVendorId = null;
    } else if (role === 'vendor') {
      // 廠商角色：如果有 vendor_id，驗證它是否存在
      if (vendor_id) {
        const vendorCheck = await pool.query('SELECT id FROM vendors WHERE id = $1', [vendor_id]);
        if (vendorCheck.rows.length === 0) {
          return res.status(400).json({
            error: '無效的廠商 ID',
            message: '指定的 vendor_id 不存在於 vendors 表中',
          });
        }
        finalVendorId = vendor_id;
      } else {
        // 如果沒有提供 vendor_id，保持原值（可能註冊時還沒有創建 vendor 資料）
        finalVendorId = userCheck.rows[0].vendor_id;
      }
    }

    const updateQuery = `
      UPDATE users
      SET
        role = $2,
        vendor_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE uid = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [uid, role, finalVendorId]);

    res.json({
      message: '角色更新成功',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('更新用戶角色失敗：', error);

    if (error.code === '23503' && error.constraint === 'fk_users_vendor') {
      return res.status(400).json({
        error: '無效的廠商 ID',
        message: '指定的 vendor_id 不存在於 vendors 表中',
      });
    }

    res.status(500).json({
      error: '更新用戶角色失敗',
      details: error?.message || String(error)
    });
  }
});

module.exports = router;
