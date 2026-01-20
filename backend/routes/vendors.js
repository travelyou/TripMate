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
        name: '環遊世界旅行社-123',
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

/**
 * GET /api/vendors/:id/posts
 * 取得廠商貼文列表
 * 對應 Table: discussion.discussion (使用 author_uid 關聯)
 */
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params
    console.log('📋 [Vendors] 取得廠商貼文，廠商 ID:', id)

    // 使用 JOIN 查詢真實統計數據
    const query = `
      SELECT
        d.id,
        d.author_uid,
        d.title,
        d.content,
        d.image_urls,
        d.tags,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT l.id) as likes,
        COUNT(DISTINCT cm.id) as comments
      FROM discussion.discussion d
      LEFT JOIN public.likes l
        ON d.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN public.comments cm
        ON d.id = cm.post_id AND cm.post_type = 'discussion'
      WHERE d.author_uid = $1
      GROUP BY d.id, d.author_uid, d.title, d.content, d.image_urls,
               d.tags, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
    `

    const result = await pool.query(query, [id])

    console.log('✅ [Vendors] 找到', result.rows.length, '筆貼文')

    const formattedPosts = result.rows.map((post) => {
      // 處理 image_urls: 如果是陣列取第一張，如果是字串直接用
      let image = ''
      if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
        image = post.image_urls[0]
      } else if (typeof post.image_urls === 'string') {
        image = post.image_urls
      }

      return {
        id: post.id,
        vendorId: post.author_uid,
        title: post.title,
        content: post.content,
        image: image || 'https://placehold.co/600x400?text=No+Image', // Fallback
        likes: parseInt(post.likes) || 0,
        comments: parseInt(post.comments) || 0,
        time: post.created_at, // 直接回傳 ISO 時間，前端再格式化
        tags: post.tags || [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }
    })

    res.json(formattedPosts)
  } catch (error) {
    console.error('❌ [Vendors] 取得廠商貼文錯誤:', error)
    res.status(500).json({
      success: false,
      message: '取得廠商貼文失敗',
      error: error.message,
    })
  }
})

/**
 * GET /api/vendors/:id/itineraries
 * 取得廠商行程列表
 * 對應 Table: itinerary.itineraries (使用 author_uid 關聯)
 */
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

module.exports = router
