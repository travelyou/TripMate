const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

router.post('/', async (req, res) => {
  try {
    console.log('[Users API] 收到 POST 請求')
    console.log('[Users API] 請求 Body:', JSON.stringify(req.body, null, 2))

    // 從 req.body 讀取值，避免解構賦值可能的問題
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
    if (real_name) {
      const trimmedName = real_name.trim();
      // 檢查是否包含 @ 或看起來像 email
      if (trimmedName.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedName)) {
        console.warn(`警告：real_name 看起來像 email，將其設為 null (UID: ${uid}, real_name: ${real_name})`);
        real_name = null;
      } else {
        real_name = trimmedName;
      }
    }

    // 統一處理空字符串為 null
    if (bio === '') bio = null;
    if (spirit_animal === '') spirit_animal = null;

    if (role && !['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: '無效的角色',
        validRoles: ['user', 'vendor', 'admin'],
      });
    }

    // 根據 role 強制設置 vendor_id
    const finalRole = role || 'user';
    let finalVendorId = vendor_id;

    if (finalRole === 'user' || finalRole === 'admin') {
      // 一般用戶和管理員的 vendor_id 必須是 null
      finalVendorId = null;
    } else if (finalRole === 'vendor') {
      // 廠商角色：如果有 vendor_id，驗證它是否存在於 vendors 表
      if (finalVendorId) {
        const vendorCheck = await pool.query('SELECT id FROM vendors WHERE id = $1', [finalVendorId]);
        if (vendorCheck.rows.length === 0) {
          return res.status(400).json({
            error: '無效的廠商 ID',
            message: '指定的 vendor_id 不存在於 vendors 表中',
          });
        }
      }
      // 如果沒有 vendor_id，允許為 null（註冊時可能還沒有創建 vendor 資料）
    }

    const existingUser = await pool.query('SELECT uid, role, vendor_id FROM users WHERE uid = $1', [uid]);

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

      const insertQuery = `
        INSERT INTO users (uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        uid,
        email,
        nickname || null,
        real_name || null,
        avatar || null,
        bio || null,
        spirit_animal || null,
        finalRole,
        finalVendorId,
      ]);

      console.log('用戶已成功插入資料庫：', {
        uid: result.rows[0].uid,
        email: result.rows[0].email,
        nickname: result.rows[0].nickname
      });

      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('創建/更新用戶失敗：', error);
    console.error('錯誤詳情：', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message,
      stack: error.stack
    });

    if (error.code === '23503' && error.constraint === 'fk_users_vendor') {
      return res.status(400).json({
        error: '無效的廠商 ID',
        message: '指定的 vendor_id 不存在於 vendors 表中',
      });
    }

    if (error.code === '23505') {
      return res.status(400).json({
        error: '用戶已存在',
        message: error.detail || '該 UID 或 Email 已被使用',
      });
    }

    res.status(500).json({
      error: '創建/更新用戶失敗',
      details: error?.message || String(error),
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
