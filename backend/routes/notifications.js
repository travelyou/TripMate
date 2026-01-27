/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 確保通知表存在
const ensureNotificationsTable = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS public.notifications (
        id SERIAL PRIMARY KEY,
        user_uid VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        related_id INTEGER,
        related_type VARCHAR(50),
        sender_uid VARCHAR(255),
        sender_name VARCHAR(255),
        sender_avatar TEXT,
        link TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    )

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_uid ON public.notifications(user_uid)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC)`,
    )
  } catch (error) {
    console.error('[Notifications] 創建通知表或索引失敗：', error.message)
    throw error
  }
}

// 創建通知
router.post('/', async (req, res) => {
  try {
    await ensureNotificationsTable()

    const {
      user_uid,
      type,
      title,
      content,
      related_id,
      related_type,
      sender_uid,
      sender_name,
      sender_avatar,
      link,
    } = req.body

    if (!user_uid || !type || !title) {
      return res.status(400).json({
        success: false,
        error: '缺少必填欄位',
        required: ['user_uid', 'type', 'title'],
      })
    }

    const result = await pool.query(
      `INSERT INTO public.notifications
       (user_uid, type, title, content, related_id, related_type, sender_uid, sender_name, sender_avatar, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user_uid,
        type,
        title,
        content || null,
        related_id || null,
        related_type || null,
        sender_uid || null,
        sender_name || null,
        sender_avatar || null,
        link || null,
      ],
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('創建通知失敗：', error)
    res.status(500).json({
      success: false,
      error: '創建通知失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 獲取用戶通知列表
router.get('/:uid', async (req, res) => {
  const { uid } = req.params
  const { limit = 50, offset = 0 } = req.query

  try {
    // 確保通知表存在
    try {
      await ensureNotificationsTable()
    } catch (tableError) {
      console.error('[Notifications] 創建/檢查通知表失敗：', tableError)
      // 即使表創建失敗，仍然嘗試查詢（可能表已存在但檢查失敗）
    }

    const result = await pool.query(
      `SELECT * FROM public.notifications
       WHERE user_uid = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [uid, parseInt(limit), parseInt(offset)],
    )

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[Notifications] 獲取通知列表失敗：', error.message)

    // 如果是表不存在的錯誤，返回空數組而不是錯誤
    if (error.code === '42P01') {
      return res.json({ success: true, data: [] })
    }

    res.status(500).json({
      success: false,
      error: '獲取通知列表失敗',
      message: error.message || '未知錯誤',
      code: error.code || 'UNKNOWN'
    })
  }
})

// 獲取未讀通知數量
router.get('/:uid/unread-count', async (req, res) => {
  const { uid } = req.params

  try {
    // 確保通知表存在
    try {
      await ensureNotificationsTable()
    } catch (tableError) {
      console.error('[Notifications] 創建/檢查通知表失敗：', tableError)
    }

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM public.notifications
       WHERE user_uid = $1 AND is_read = false`,
      [uid],
    )

    const count = parseInt(result.rows[0]?.count || 0)
    res.json({ success: true, count: Math.min(count, 99) }) // 最多顯示99
  } catch (error) {
    console.error('[Notifications] 獲取未讀通知數量失敗：', error)

    // 如果是表不存在的錯誤，返回 0
    if (error.code === '42P01') {
      return res.json({ success: true, count: 0 })
    }

    res.status(500).json({
      success: false,
      error: '獲取未讀通知數量失敗',
      message: error.message || '未知錯誤',
      code: error.code || 'UNKNOWN'
    })
  }
})

// 標記通知為已讀
router.patch('/:id/read', async (req, res) => {
  try {
    await ensureNotificationsTable()

    const { id } = req.params

    const result = await pool.query(
      `UPDATE public.notifications
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '通知不存在',
      })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('標記通知已讀失敗：', error)
    res.status(500).json({
      success: false,
      error: '標記通知已讀失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 標記所有通知為已讀
router.patch('/:uid/read-all', async (req, res) => {
  try {
    await ensureNotificationsTable()

    const { uid } = req.params

    const result = await pool.query(
      `UPDATE public.notifications
       SET is_read = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_uid = $1 AND is_read = false
       RETURNING id`,
      [uid],
    )

    res.json({
      success: true,
      count: result.rows.length,
    })
  } catch (error) {
    console.error('標記所有通知已讀失敗：', error)
    res.status(500).json({
      success: false,
      error: '標記所有通知已讀失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 刪除通知
router.delete('/:id', async (req, res) => {
  try {
    await ensureNotificationsTable()

    const { id } = req.params

    const result = await pool.query(
      `DELETE FROM public.notifications WHERE id = $1 RETURNING id`,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '通知不存在',
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('刪除通知失敗：', error)
    res.status(500).json({
      success: false,
      error: '刪除通知失敗',
      message: error.message || '未知錯誤',
    })
  }
})

module.exports = router


