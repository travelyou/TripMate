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

    const postIdNum = Number(post_id)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      console.log('❌ [Backend Likes POST] post_id 格式錯誤:', post_id)
      return res.status(400).json({
        error: 'post_id 格式錯誤',
        details: 'post_id 必須是正整數',
      })
    }

    console.log('🔵 [Backend Likes POST] 檢查是否已按讚')

    // 檢查是否已經按讚
    const checkQuery = `
      SELECT id FROM public.likes
      WHERE post_id = $1 AND author_uid = $2 AND board = $3
    `
    const checkResult = await pool.query(checkQuery, [postIdNum, author_uid, board])

    let liked = false
    let likesCount = 0

    if (checkResult.rows.length > 0) {
      // 已經按讚，取消按讚
      console.log('🔵 [Backend Likes POST] 取消按讚')
      const deleteQuery = `
        DELETE FROM public.likes
        WHERE post_id = $1 AND author_uid = $2 AND board = $3
      `
      await pool.query(deleteQuery, [postIdNum, author_uid, board])
      liked = false
    } else {
      // 尚未按讚，新增按讚
      console.log('🔵 [Backend Likes POST] 新增按讚')
      const insertQuery = `
        INSERT INTO public.likes (post_id, author_uid, board, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `
      await pool.query(insertQuery, [postIdNum, author_uid, board])
      liked = true
    }

    // 查詢更新後的按讚總數
    console.log('🔵 [Backend Likes POST] 查詢按讚總數')
    const countQuery = `
      SELECT COUNT(*) as count FROM public.likes
      WHERE post_id = $1 AND board = $2
    `
    const countResult = await pool.query(countQuery, [postIdNum, board])
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
router.get('/:postId', async (req, res, next) => {
  console.log('🔵 [Backend Likes GET] ========== 開始 ==========')

  try {
    const { postId } = req.params
    // board 預設 discussion，避免前端漏帶就直接 400
    const boardRaw = req.query?.board
    const board = typeof boardRaw === 'string' && boardRaw.trim() ? boardRaw.trim() : 'discussion'

    const authorUidRaw = req.query?.author_uid
    const author_uid =
      typeof authorUidRaw === 'string' && authorUidRaw.trim() ? authorUidRaw.trim() : null

    const postIdNum = Number(postId)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        error: 'postId 格式錯誤',
        details: 'postId 必須是正整數',
      })
    }

    // 若有人誤打 /api/likes/user 這類，交給前面更明確的路由或 404
    if (postId === 'user') return next()

    // 一次查 likesCount + isLiked，減少 DB roundtrip（對併發 8 筆請求比較友善）
    const query = `
      SELECT
        (SELECT COUNT(*)::int FROM public.likes WHERE post_id = $1 AND board = $2) AS likes_count,
        CASE
          WHEN $3::text IS NULL THEN false
          ELSE EXISTS (
            SELECT 1
            FROM public.likes
            WHERE post_id = $1 AND board = $2 AND author_uid = $3
          )
        END AS is_liked
    `

    const result = await pool.query(query, [postIdNum, board, author_uid])
    const row = result.rows?.[0] || { likes_count: 0, is_liked: false }

    res.json({
      likesCount: Number(row.likes_count) || 0,
      isLiked: !!row.is_liked,
    })
  } catch (error) {
    console.error('❌ [Backend Likes GET] 錯誤:', error)
    res.status(500).json({
      error: '獲取按讚資訊失敗',
      details: error?.message || String(error),
      code: error?.code,
    })
  }
})

module.exports = router
