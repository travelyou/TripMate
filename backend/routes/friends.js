/* eslint-env node */
/* global require, module */
const express = require('express');
const pool = require('../database/connection');

const router = express.Router();

let ensured = false;
async function ensureFriendsTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_uid VARCHAR(255) NOT NULL,
      friend_uid VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_uid, friend_uid),
      CONSTRAINT friends_not_self_chk CHECK (user_uid <> friend_uid)
    );
  `);
  ensured = true;
}

// GET /api/friends?uid=xxx
router.get('/', async (req, res) => {
  try {
    await ensureFriendsTable();
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: '缺少 uid' });

    // 盡量帶出 nickname/avatar（若 users 表沒有資料，就回傳 null 讓前端 fallback）
    const r = await pool.query(
      `
      SELECT
        f.friend_uid AS uid,
        u.nickname,
        u.avatar,
        u.email
      FROM friends f
      LEFT JOIN users u ON u.uid = f.friend_uid
      WHERE f.user_uid = $1
      ORDER BY COALESCE(u.nickname, u.email, f.friend_uid) ASC
      `,
      [uid],
    );

    const friends = r.rows.map((row) => ({
      uid: row.uid,
      nickname: row.nickname || (row.email ? String(row.email).split('@')[0] : null),
      avatar: row.avatar || null,
    }));

    res.json({ friends });
  } catch (e) {
    console.error('[friends/get] error:', e);
    res.status(500).json({ error: '取得好友列表失敗', details: e?.message || String(e) });
  }
});

// POST /api/friends  { uid, friendUid }
router.post('/', async (req, res) => {
  try {
    await ensureFriendsTable();
    const { uid, friendUid } = req.body || {};
    if (!uid || !friendUid) {
      return res.status(400).json({ error: '缺少必填欄位', required: ['uid', 'friendUid'] });
    }
    if (uid === friendUid) {
      return res.status(400).json({ error: '不能加自己為好友' });
    }

    // 雙向建立（A->B 與 B->A），方便查詢
    await pool.query(
      `
      INSERT INTO friends (user_uid, friend_uid)
      VALUES ($1, $2)
      ON CONFLICT (user_uid, friend_uid) DO NOTHING
      `,
      [uid, friendUid],
    );
    await pool.query(
      `
      INSERT INTO friends (user_uid, friend_uid)
      VALUES ($1, $2)
      ON CONFLICT (user_uid, friend_uid) DO NOTHING
      `,
      [friendUid, uid],
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('[friends/post] error:', e);
    res.status(500).json({ error: '新增好友失敗', details: e?.message || String(e) });
  }
});

module.exports = router;


