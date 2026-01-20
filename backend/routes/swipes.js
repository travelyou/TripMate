/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

const ensureSwipeLikesTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS swipe_likes (
      id SERIAL PRIMARY KEY,
      user_uid VARCHAR(255) NOT NULL,
      target_uid VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_swipe_likes_pair
     ON swipe_likes (user_uid, target_uid)`,
  )
}

const ensureFriendsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_uid VARCHAR(255) NOT NULL,
      friend_uid VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(`ALTER TABLE friends ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`)
  await pool.query(`ALTER TABLE friends ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
  await pool.query(`ALTER TABLE friends ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_friends_pair
     ON friends (user_uid, friend_uid)`,
  )
}

const upsertAcceptedFriend = async (uid, targetUid) => {
  await ensureFriendsTable()

  const existing = await pool.query(
    `SELECT * FROM friends
     WHERE (user_uid = $1 AND friend_uid = $2)
        OR (user_uid = $2 AND friend_uid = $1)`,
    [uid, targetUid],
  )

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE friends
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE (user_uid = $1 AND friend_uid = $2)
          OR (user_uid = $2 AND friend_uid = $1)`,
      [uid, targetUid],
    )
    return
  }

  await pool.query(
    `INSERT INTO friends (user_uid, friend_uid, status, created_at, updated_at)
     VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [uid, targetUid],
  )
}

// POST /api/swipes/like - 抽卡喜歡（若互相喜歡，自動成為好友）
router.post('/like', async (req, res) => {
  try {
    const { uid, target_uid } = req.body

    if (!uid || !target_uid) {
      return res.status(400).json({ error: 'uid 與 target_uid 為必填欄位' })
    }

    if (uid === target_uid) {
      return res.status(400).json({ error: '不能對自己按喜歡' })
    }

    await ensureSwipeLikesTable()

    await pool.query(
      `INSERT INTO swipe_likes (user_uid, target_uid, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_uid, target_uid) DO NOTHING`,
      [uid, target_uid],
    )

    const mutualCheck = await pool.query(
      `SELECT 1 FROM swipe_likes WHERE user_uid = $1 AND target_uid = $2`,
      [target_uid, uid],
    )

    const matched = mutualCheck.rows.length > 0

    if (matched) {
      await upsertAcceptedFriend(uid, target_uid)
    }

    res.json({ success: true, matched })
  } catch (error) {
    console.error('抽卡喜歡失敗：', error)
    res.status(500).json({
      error: '抽卡喜歡失敗',
      message: error.message || '未知錯誤',
    })
  }
})

module.exports = router

