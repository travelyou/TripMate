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
      console.error('[Users API] 缺少必填欄位:', { uid: !!uid, email: !!email })
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['uid', 'email'],
      });
    }

    // 統一處理空字符串為 null
    if (bio === '') {
      bio = null;
    }
    if (spirit_animal === '') {
      spirit_animal = null;
    }

    // 根據 role 強制設置 vendor_id，使用臨時變數來計算 finalRole
    console.log('[Users API] ========== 開始角色處理 ==========');
    console.log('[Users API] 接收到的 role:', role);
    console.log('[Users API] 接收到的 vendor_id:', vendor_id);

    let finalRole = 'user';
    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      finalRole = role;
      console.log('[Users API] role 驗證通過，finalRole 設置為:', finalRole);
    } else {
      console.log('[Users API] role 無效或未提供，使用默認值 user');
    }
    let finalVendorId = vendor_id;

    console.log('[Users API] 角色處理開始:');
    console.log('[Users API]   - 原始 role:', role);
    console.log('[Users API]   - 原始 vendor_id:', vendor_id);
    console.log('[Users API]   - 計算後的 finalRole:', finalRole);
    console.log('[Users API]   - 初始 finalVendorId:', finalVendorId);
    console.log('[Users API] ========== 角色處理準備完成 ==========');

    if (finalRole === 'user' || finalRole === 'admin') {
      // 一般用戶和管理員的 vendor_id 必須是 null（避免外鍵約束錯誤）
      finalVendorId = null;
      console.log('[Users API] 用戶或管理員角色，vendor_id 設為 null');
    } else if (finalRole === 'vendor') {
      // 廠商角色：自動生成 vendor_id 並在 vendors 表中創建記錄
      // 自動生成 vendor-001, vendor-002 格式的 ID

      console.log('[Users API] ========== 開始處理 vendor 角色 ==========');
      console.log('[Users API] UID:', uid);
      console.log('[Users API] nickname:', nickname);
      console.log('[Users API] location:', location);
      console.log('[Users API] email:', email);

      try {
        // 查詢 users 表和 vendors 表中所有現有的 vendor_id，找出最大的數字以生成下一個 ID
        // 同時檢查兩個表，確保不會重複
        console.log('[Users API] 查詢現有的 vendor_id 以生成新的 ID...');
        const allVendorIdsFromUsers = await pool.query(
          "SELECT vendor_id FROM users WHERE vendor_id IS NOT NULL AND vendor_id LIKE 'vendor-%' ORDER BY vendor_id DESC"
        );
        const allVendorIdsFromVendors = await pool.query(
          "SELECT id FROM vendors WHERE id LIKE 'vendor-%' ORDER BY id DESC"
        );

        // 合併兩個查詢結果，找出所有現有的 vendor_id
        const allVendorIds = new Set();
        allVendorIdsFromUsers.rows.forEach(row => {
          if (row.vendor_id) allVendorIds.add(row.vendor_id);
        });
        allVendorIdsFromVendors.rows.forEach(row => {
          if (row.id) allVendorIds.add(row.id);
        });

        console.log('[Users API] 查詢結果，找到', allVendorIds.size, '個現有的 vendor_id');

        let newVendorId;
        if (allVendorIds.size === 0) {
          // 如果沒有任何 vendor_id，從 vendor-001 開始
          newVendorId = 'vendor-001';
          console.log('[Users API] 沒有現有的 vendor_id，從 vendor-001 開始');
        } else {
          // 找出最大的數字
          let maxNumber = 0;
          for (const vendorId of allVendorIds) {
            const match = vendorId.match(/^vendor-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) {
                maxNumber = num;
              }
            }
          }

          // 生成下一個 ID
          const nextNumber = maxNumber + 1;
          newVendorId = `vendor-${String(nextNumber).padStart(3, '0')}`;
          console.log('[Users API] 找到最大 vendor_id 數字:', maxNumber);
          console.log('[Users API] 生成新的 vendor_id:', newVendorId);
        }

        // 檢查生成的 vendor_id 是否已存在於 vendors 表或 users 表（防止併發問題）
        console.log('[Users API] 檢查生成的 vendor_id 是否已存在...');
        const existingVendorInVendors = await pool.query('SELECT id FROM vendors WHERE id = $1', [newVendorId]);
        const existingVendorInUsers = await pool.query('SELECT vendor_id FROM users WHERE vendor_id = $1', [newVendorId]);
        const exists = existingVendorInVendors.rows.length > 0 || existingVendorInUsers.rows.length > 0;
        console.log('[Users API] 檢查結果:', exists ? '已存在' : '不存在');

        if (!exists) {
          // 創建新的 vendor 記錄
          // 使用 nickname 作為 vendor 名稱
          const vendorName = nickname || email?.split('@')[0] || '未命名廠商';
          const vendorAvatar = avatar || null;

          console.log('[Users API] 準備創建 vendor 記錄:');
          console.log('[Users API]   - id (vendors 表主鍵):', newVendorId);
          console.log('[Users API]   - name:', vendorName);
          console.log('[Users API]   - avatar:', vendorAvatar);

          const insertVendorQuery = `
            INSERT INTO vendors (id, name, avatar, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
          `;

          console.log('[Users API] 執行 INSERT vendor SQL...');
          const vendorResult = await pool.query(insertVendorQuery, [
            newVendorId,
            vendorName,
            vendorAvatar
          ]);

          console.log('[Users API] ✅ 成功創建 vendor 記錄');
          console.log('[Users API] 創建的 vendor id (vendors 表主鍵):', vendorResult.rows[0].id);
          finalVendorId = newVendorId;
          console.log('[Users API] finalVendorId 設置為 (將用於 users.vendor_id):', finalVendorId);
        } else {
          // vendor_id 已存在（可能是併發創建導致），需要重新生成
          console.log('[Users API] ⚠️ vendor_id 已存在（可能是併發創建），重新生成...');
          // 遞增數字直到找到不存在的 ID
          let attemptNumber = parseInt(newVendorId.match(/^vendor-(\d+)$/)[1], 10) + 1;
          let foundAvailableId = false;
          while (!foundAvailableId && attemptNumber < 1000) {
            const candidateId = `vendor-${String(attemptNumber).padStart(3, '0')}`;
            const checkVendor = await pool.query('SELECT id FROM vendors WHERE id = $1', [candidateId]);
            const checkUser = await pool.query('SELECT vendor_id FROM users WHERE vendor_id = $1', [candidateId]);
            if (checkVendor.rows.length === 0 && checkUser.rows.length === 0) {
              newVendorId = candidateId;
              foundAvailableId = true;
              console.log('[Users API] 找到可用的 vendor_id:', newVendorId);

              // 創建新的 vendor 記錄
              const vendorName = nickname || email?.split('@')[0] || '未命名廠商';
              const vendorAvatar = avatar || null;
              const insertVendorQuery = `
                INSERT INTO vendors (id, name, avatar, created_at, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
              `;
              await pool.query(insertVendorQuery, [newVendorId, vendorName, vendorAvatar]);
              console.log('[Users API] ✅ 成功創建 vendor 記錄（重新生成後）');
            } else {
              attemptNumber++;
            }
          }

          if (!foundAvailableId) {
            throw new Error('無法找到可用的 vendor_id，請聯繫管理員');
          }

          finalVendorId = newVendorId;
          console.log('[Users API] finalVendorId 設置為 (將用於 users.vendor_id):', finalVendorId);
        }
        console.log('[Users API] ========== vendor 處理完成 ==========');
      } catch (vendorCreateError) {
        console.error('[Users API] ❌ 創建 vendor 記錄失敗');
        console.error('[Users API] 錯誤詳情:', {
          code: vendorCreateError.code,
          constraint: vendorCreateError.constraint,
          detail: vendorCreateError.detail,
          message: vendorCreateError.message,
          stack: vendorCreateError.stack
        });

        // 如果創建失敗，返回錯誤
        return res.status(500).json({
          error: '創建廠商記錄失敗',
          message: vendorCreateError.message || '無法創建廠商記錄',
          details: vendorCreateError.detail || String(vendorCreateError),
          code: vendorCreateError.code
        });
      }
    } else {
      console.log('[Users API] ⚠️ 未知角色，保持原 vendor_id:', finalVendorId);
    }

    console.log('[Users API] 最終 finalVendorId:', finalVendorId);

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
        // 廠商角色：如果原本沒有 vendor_id，自動創建；否則使用現有的
        const currentVendorId = existingUser.rows[0].vendor_id;
        if (!currentVendorId) {
          // 原本沒有 vendor_id，使用剛才創建的
          updateVendorId = finalVendorId;
        } else {
          // 原本已有 vendor_id，保持原值
          updateVendorId = currentVendorId;
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
          avatar = COALESCE($4, avatar),
          bio = COALESCE($5, bio),
          spirit_animal = COALESCE($6, spirit_animal),
          role = $7,
          vendor_id = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE uid = $1
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        uid,
        email,
        nickname,
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
        INSERT INTO users (uid, email, nickname, avatar, bio, spirit_animal, role, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const insertParams = [
        uid,                    // $1: uid
        email,                  // $2: email
        nickname || null,       // $3: nickname
        avatar || null,         // $4: avatar
        bio || null,            // $5: bio
        spirit_animal || null,  // $6: spirit_animal
        finalRole,              // $7: role
        finalVendorId,          // $8: vendor_id
      ];

      console.log('[Users API] ========== 準備插入新用戶 ==========');
      console.log('[Users API] SQL:', insertQuery);
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
      });
      console.log('[Users API] ⚠️ 特別注意 vendor_id 值:', insertParams[8]);
      console.log('[Users API] ⚠️ finalVendorId 變數值:', finalVendorId);

      const result = await pool.query(insertQuery, insertParams);

      console.log('[Users API] ✅ 用戶插入成功');
      console.log('[Users API] 插入的用戶資料:', {
        uid: result.rows[0].uid,
        email: result.rows[0].email,
        role: result.rows[0].role,
        vendor_id: result.rows[0].vendor_id
      });

      // 驗證 vendor_id 是否正確設置
      if (finalRole === 'vendor') {
        if (result.rows[0].vendor_id !== finalVendorId) {
          console.error('[Users API] ⚠️⚠️⚠️ 警告：vendor_id 不匹配！');
          console.error('[Users API] 預期的 vendor_id:', finalVendorId);
          console.error('[Users API] 實際插入的 vendor_id:', result.rows[0].vendor_id);
        } else {
          console.log('[Users API] ✅ vendor_id 驗證通過，值為:', result.rows[0].vendor_id);
        }

        // 再次驗證 vendors 表中是否有對應記錄
        const verifyVendor = await pool.query('SELECT id, name FROM vendors WHERE id = $1', [result.rows[0].vendor_id]);
        if (verifyVendor.rows.length === 0) {
          console.error('[Users API] ⚠️⚠️⚠️ 警告：vendors 表中找不到對應的記錄！');
          console.error('[Users API] 查找的 vendor_id:', result.rows[0].vendor_id);
        } else {
          console.log('[Users API] ✅ vendors 表中找到對應記錄:', verifyVendor.rows[0]);
        }
      }

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
    console.log('[Users API] GET /:uid 收到請求，UID:', uid);

    if (!uid) {
      console.warn('[Users API] GET /:uid UID 為空');
      return res.status(400).json({ error: 'UID 不能為空' });
    }

    console.log('[Users API] 準備查詢資料庫，SQL: SELECT * FROM users WHERE uid = $1');
    const result = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
    console.log('[Users API] 查詢結果，找到', result.rows.length, '筆記錄');

    if (result.rows.length === 0) {
      console.log('[Users API] 用戶不存在，返回 404');
      return res.status(404).json({ error: '用戶不存在' });
    }

    console.log('[Users API] 成功返回用戶資料');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Users API] GET /:uid 發生錯誤：', error);
    console.error('[Users API] 錯誤詳情：', {
      name: error.name,
      code: error.code,
      message: error.message,
      detail: error.detail,
      stack: error.stack
    });

    // 處理資料庫連接錯誤
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message
      });
    }

    res.status(500).json({
      error: '獲取用戶資料失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
      code: error.code
    });
  }
});

router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    let { nickname, real_name, location, avatar, bio, spirit_animal } = req.body;

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
    
    // 處理 location，如果沒有提供則設為 '台灣'
    if (location === undefined || location === null || location === '') {
      location = '台灣';
    }

    const updateQuery = `
      UPDATE users
      SET
        nickname = COALESCE($2, nickname),
        real_name = COALESCE($3, real_name),
        location = COALESCE($4, location, '台灣'),
        avatar = COALESCE($5, avatar),
        bio = COALESCE($6, bio),
        spirit_animal = COALESCE($7, spirit_animal),
        updated_at = CURRENT_TIMESTAMP
      WHERE uid = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      uid,
      nickname,
      real_name,
      location,
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
