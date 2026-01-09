const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// POST /api/users - 創建或更新用戶資料
router.post('/', async (req, res) => {
  try {
    const { uid, email, nickname, real_name, avatar, bio, spirit_animal } = req.body;

    // 驗證必填欄位
    if (!uid || !email) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['uid', 'email'],
      });
    }

    // 檢查用戶是否已存在
    const existingUser = await pool.query('SELECT uid FROM users WHERE uid = $1', [uid]);

    if (existingUser.rows.length > 0) {
      // 更新現有用戶
      const updateQuery = `
        UPDATE users
        SET 
          email = COALESCE($2, email),
          nickname = COALESCE($3, nickname),
          real_name = COALESCE($4, real_name),
          avatar = COALESCE($5, avatar),
          bio = COALESCE($6, bio),
          spirit_animal = COALESCE($7, spirit_animal),
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
      ]);
      res.json(result.rows[0]);
    } else {
      // 創建新用戶
      const insertQuery = `
        INSERT INTO users (uid, email, nickname, real_name, avatar, bio, spirit_animal)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
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
      ]);
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('創建/更新用戶失敗：', error);
    res.status(500).json({ error: '創建/更新用戶失敗', details: error.message });
  }
});

// GET /api/users/:uid - 獲取用戶資料
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
    res.status(500).json({ error: '獲取用戶資料失敗', details: error.message });
  }
});

// PUT /api/users/:uid - 更新用戶資料
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { nickname, real_name, avatar, bio, spirit_animal } = req.body;

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
    res.status(500).json({ error: '更新用戶資料失敗', details: error.message });
  }
});

module.exports = router;

