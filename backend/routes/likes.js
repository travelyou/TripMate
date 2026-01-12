const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// POST /api/likes - 按讚/取消按讚
router.post('/', async (req, res) => {
  console.log('🔵 [Backend Likes POST] ========== 開始 ==========')
  console.log('🔵 [Backend Likes POST] Body:', req.body)

  try {
    const { post_id, author_uid, board } = req.body

    // 驗證必填欄位
    if (!post_id || !author_uid || !board) {
      console.log('❌ [Backend Likes POST] 缺少必填欄位')
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['post_id', 'author_uid', 'board'],
      })
    }

    console.log('🔵 [Backend Likes POST] 檢查是否已按讚')

    // 檢查是否已經按讚
    const checkQuery = `
      SELECT id FROM public.likes
      WHERE post_id = $1 AND author_uid = $2 AND board = $3
    `
    const checkResult = await pool.query(checkQuery, [post_id, author_uid, board])

    let liked = false
    let likesCount = 0

    if (checkResult.rows.length > 0) {
      // 已經按讚，取消按讚
      console.log('🔵 [Backend Likes POST] 取消按讚')
      const deleteQuery = `
        DELETE FROM public.likes
        WHERE post_id = $1 AND author_uid = $2 AND board = $3
      `
      await pool.query(deleteQuery, [post_id, author_uid, board])
      liked = false
    } else {
      // 尚未按讚，新增按讚
      console.log('🔵 [Backend Likes POST] 新增按讚')
      const insertQuery = `
        INSERT INTO public.likes (post_id, author_uid, board, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `
      await pool.query(insertQuery, [post_id, author_uid, board])
      liked = true
    }

    // 查詢更新後的按讚總數
    console.log('🔵 [Backend Likes POST] 查詢按讚總數')
    const countQuery = `
      SELECT COUNT(*) as count FROM public.likes
      WHERE post_id = $1 AND board = $2
    `
    const countResult = await pool.query(countQuery, [post_id, board])
    likesCount = parseInt(countResult.rows[0].count) || 0

    console.log('✅ [Backend Likes POST] 成功，liked:', liked, 'count:', likesCount)

    res.json({
      liked,
      likesCount,
    })
  } catch (error) {
    console.error('❌ [Backend Likes POST] 錯誤:', error)
    res.status(500).json({
      error: '按讚操作失敗',
      details: error?.message || String(error),
    })
  }
})

// GET /api/likes/user/:uid - 獲取用戶收藏列表 (這是新增的，為了 FavoritesPage)
router.get('/user/:uid', async (req, res) => {
  console.log('🔵 [Backend Likes GET User] 獲取用戶收藏:', req.params.uid)

  try {
    const { uid } = req.params
    const { board } = req.query // 例如 ?board=discussion

    if (!uid) return res.status(400).json({ error: '缺少 UID' })

    // 這裡我們需要 JOIN discussion 表來拿到文章詳細資料
    // 注意：這裡假設你主要先做 discussion 的收藏。
    // 如果要支援 traveler 或 itinerary，這裡的 SQL 需要根據 board 參數動態調整 JOIN 的表

    let query = ''
    let params = [uid]

    if (board === 'discussion') {
      query = `
        SELECT
          d.*,
          'discussion' as type,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = d.id AND board = 'discussion') as likes_count,
          (SELECT COUNT(*) FROM public.comments WHERE post_id = d.id AND post_type = 'discussion') as comments_count
        FROM public.likes l
        JOIN discussion.discussion d ON l.post_id = d.id
        WHERE l.author_uid = $1 AND l.board = 'discussion' AND d.deleted_at IS NULL
        ORDER BY l.created_at DESC
      `
    } else {
      // 預設或是擴充其他類型 (暫時只回傳空的或通用查詢)
      // 如果你有 traveler 表，這裡要寫類似上面的 JOIN
      return res.json([])
    }

    const result = await pool.query(query, params)

    // 整理回傳格式以符合前端 Card
    const favorites = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      banner: row.banner,
      image_urls: row.image_urls || [],
      tags: row.tags || [],
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      author: row.author_uid, // 這裡建議之後 JOIN users 表拿 nickname
      time: new Date(row.created_at).toLocaleDateString(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + row.author_uid, // 暫時用頭像
    }))

    console.log(`✅ [Backend Likes GET User] 找到 ${favorites.length} 筆收藏`)
    res.json(favorites)
  } catch (error) {
    console.error('❌ [Backend Likes GET User] 錯誤:', error)
    res.status(500).json({ error: '獲取收藏失敗' })
  }
})

// GET /api/likes/:postId - 獲取單篇文章按讚資訊
router.get('/:postId', async (req, res) => {
  // ... (保留你原本的程式碼)
  console.log('🔵 [Backend Likes GET] ========== 開始 ==========')
  // ... (省略，因為你上面已經有了，這裡只需要確保上面的 user 路由放在 /:postId 之前，避免衝突)
  // 注意：Express路由匹配是由上而下，因為 :postId 會把 'user' 也當成 id，
  // 所以一定要把 router.get('/user/:uid'...) 放在 router.get('/:postId'...) 之前！

  // (為節省篇幅，這裡請維持你原本的邏輯，但請務必檢查順序)
  try {
    const { postId } = req.params
    const { author_uid, board } = req.query

    // 簡單的防止 'user' 被當成 ID
    if (postId === 'user') return res.next()

    if (!board) return res.status(400).json({ error: '缺少 board' })

    const postIdNum = Number(postId)
    // ... (你原本的邏輯)
    const countQuery = `SELECT COUNT(*) as count FROM public.likes WHERE post_id = $1 AND board = $2`
    const countResult = await pool.query(countQuery, [postIdNum, board])
    const likesCount = parseInt(countResult.rows[0].count) || 0

    let isLiked = false
    if (author_uid) {
      const checkQuery = `SELECT id FROM public.likes WHERE post_id = $1 AND author_uid = $2 AND board = $3`
      const checkResult = await pool.query(checkQuery, [postIdNum, author_uid, board])
      isLiked = checkResult.rows.length > 0
    }
    res.json({ likesCount, isLiked })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
