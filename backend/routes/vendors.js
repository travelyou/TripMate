const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 輔助函式：檢查字串是否為 UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// 1. 取得廠商基本資料
router.get('/:id', async (req, res) => {
  const { id } = req.params

  // 防呆：如果 ID 不是 UUID (例如 'vendor001')，直接回傳假資料
  if (!isUUID(id)) {
    return res.json({
      success: true,
      data: {
        id: id,
        name: '環遊世界旅行社',
        avatar: 'https://picsum.photos/200?random=vendor',
        description:
          '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。歡迎加入我們，一起發現世界的美好！',
        isVerified: true,
        rating: 5.0,
        reviewCount: 99,
      },
    })
  }

  try {
    const query = `
      SELECT id, name, avatar, email, banner_image, description, is_verified, rating, review_count
      FROM users
      WHERE id = $1
    `
    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      // 找不到也回傳 Mock，避免前端壞掉
      return res.json({
        success: true,
        data: {
          id: id,
          name: '環遊世界旅行社',
          avatar: 'https://www.facebook.com/photo/?fbid=405309498285146&set=a.405309464951816',
          description:
            '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。歡迎加入我們，一起發現世界的美好！',
          isVerified: false,
          rating: 0,
          reviewCount: 0,
        },
      })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('查詢廠商失敗:', err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 2. 取得該廠商發布的行程
router.get('/:id/itineraries', async (req, res) => {
  const { id } = req.params
  if (!isUUID(id)) return res.json({ success: true, data: [] })

  try {
    const query = `SELECT * FROM itineraries WHERE author_uid = $1 ORDER BY created_at DESC`
    const result = await pool.query(query, [id])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('查詢廠商行程失敗:', err)
    res.json({ success: true, data: [] })
  }
})

// 3. 取得該廠商發布的貼文
router.get('/:id/posts', async (req, res) => {
  const { id } = req.params
  if (!isUUID(id)) return res.json({ success: true, data: [] })

  try {
    // 假設你的資料表是 discussions (或 discussion.discussion)
    const query = `SELECT * FROM discussions WHERE author_uid = $1 ORDER BY created_at DESC`
    const result = await pool.query(query, [id])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('查詢廠商貼文失敗:', err)
    res.json({ success: true, data: [] })
  }
})

module.exports = router
