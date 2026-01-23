/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// POST: 創建用戶 (保持原樣，省略...)
router.post('/', async (req, res) => {
  // ... (保留你原本的 POST 邏輯)
  try {
    // 簡單範例，請保留你原本的完整代碼
    const { uid, email, is_matching_enabled } = req.body
    if (!uid || !email) return res.status(400).json({ error: 'Missing fields' })
    const existing = await pool.query('SELECT * FROM users WHERE uid=$1', [uid])
    if (existing.rows.length > 0) res.json(existing.rows[0])
    else {
      await pool.query(
        'INSERT INTO users (uid, email, is_matching_enabled) VALUES ($1, $2, COALESCE($3, true))',
        [uid, email, is_matching_enabled],
      )
      res.status(201).json({ uid, email })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET: 獲取所有用戶 (抽卡列表)
// [修正] 加入 gallery
router.get('/', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    // [修正] 加上 gallery
    let query = `
      SELECT
        uid, email, nickname, real_name, avatar, role, vendor_id, created_at,
        location, bio, spirit_animal, tags,
        card_bio, card_photo, card_tags, gallery, is_matching_enabled
      FROM users
    `
    const params = []

    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      query += ' WHERE role = $1'
      params.push(role)
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(parseInt(limit), offset)
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params.push(parseInt(limit), offset)
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: '獲取用戶列表失敗', details: error.message })
  }
})

// GET: 獲取單一用戶
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    // 使用 SELECT * 確保抓到 gallery
    const result = await pool.query('SELECT * FROM users WHERE uid = $1', [uid])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: '獲取用戶資料失敗', details: error.message })
  }
})

// PUT: 更新用戶資料
// [修正] 加入 gallery 更新邏輯
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    let {
      nickname,
      location,
      avatar,
      bio,
      spirit_animal,
      tags,
      card_bio,
      card_photo,
      card_tags,
      gallery, // [NEW] 接收 gallery
      is_matching_enabled,
    } = req.body

    if (bio === '') bio = null
    if (spirit_animal === '') spirit_animal = null
    if (location === '') location = null

    const setClauses = []
    const params = [uid]
    let paramIndex = 2

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        setClauses.push(`${field} = COALESCE($${paramIndex}, ${field})`)
        params.push(value)
        paramIndex++
      }
    }

    addUpdate('nickname', nickname)
    addUpdate('location', location)
    addUpdate('avatar', avatar)
    addUpdate('bio', bio)
    addUpdate('spirit_animal', spirit_animal)

    if (Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
      const val = Array.isArray(tags) ? tags : []
      setClauses.push(`tags = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    // 卡片資料
    if (card_bio !== undefined) {
      setClauses.push(`card_bio = $${paramIndex}`)
      params.push(card_bio)
      paramIndex++
    }
    if (card_photo !== undefined) {
      setClauses.push(`card_photo = $${paramIndex}`)
      params.push(card_photo)
      paramIndex++
    }
    if (card_tags !== undefined) {
      const val = Array.isArray(card_tags) ? card_tags : []
      setClauses.push(`card_tags = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    // [NEW] Gallery
    if (gallery !== undefined) {
      const val = Array.isArray(gallery) ? gallery : []
      setClauses.push(`gallery = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    if (is_matching_enabled !== undefined) {
      setClauses.push(`is_matching_enabled = $${paramIndex}`)
      params.push(is_matching_enabled)
      paramIndex++
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP')

    const updateQuery = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE uid = $1
      RETURNING *
    `

    const result = await pool.query(updateQuery, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update Error:', error)
    res.status(500).json({ error: '更新失敗', details: error.message })
  }
})

// PATCH role (保持原樣)
router.patch('/:uid/role', async (req, res) => {
  // ... 原本邏輯
  try {
    const { uid } = req.params
    const { role, vendor_id } = req.body
    await pool.query('UPDATE users SET role=$2, vendor_id=$3 WHERE uid=$1', [uid, role, vendor_id])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
