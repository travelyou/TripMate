/* eslint-env node */
/* global require, module */
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

    // 驗證 post_id 是否存在於對應的表中
    let postExists = false
    if (board === 'discussion') {
      const postCheckQuery = `
        SELECT id FROM discussion.discussion
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    } else if (board === 'traveler') {
      const postCheckQuery = `
        SELECT id FROM travelers.travelers
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    } else if (board === 'itinerary') {
      const postCheckQuery = `
        SELECT id FROM itinerary.itineraries
        WHERE id = $1
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    } else {
      return res.status(400).json({
        error: '不支援的 board 類型',
        details: `board 必須是 'discussion'、'traveler' 或 'itinerary'`,
      })
    }

    if (!postExists) {
      console.log('❌ [Backend Likes POST] 貼文不存在:', { post_id: postIdNum, board })
      return res.status(404).json({
        error: '貼文不存在',
        details: `找不到 ID 為 ${postIdNum} 的 ${board} 貼文`,
      })
    }

    // 檢查是否已經按讚（先檢查是否有 (post_id, author_uid) 的記錄，不管 board）
    const checkQuery = `
      SELECT id, board FROM public.likes
      WHERE post_id = $1 AND author_uid = $2
    `
    const checkResult = await pool.query(checkQuery, [postIdNum, author_uid])

    let liked = false
    let likesCount = 0

    if (checkResult.rows.length > 0) {
      // 已經存在記錄，檢查 board 是否匹配
      const existingRecord = checkResult.rows[0]
      if (existingRecord.board === board) {
        // board 匹配，取消按讚
        console.log('🔵 [Backend Likes POST] 取消按讚')
        const deleteQuery = `
          DELETE FROM public.likes
          WHERE post_id = $1 AND author_uid = $2
        `
        await pool.query(deleteQuery, [postIdNum, author_uid])
        liked = false
      } else {
        // board 不匹配，更新 board 字段
        console.log('🔵 [Backend Likes POST] 更新 board 字段')
        const updateQuery = `
          UPDATE public.likes
          SET board = $1, created_at = CURRENT_TIMESTAMP
          WHERE post_id = $2 AND author_uid = $3
        `
        await pool.query(updateQuery, [board, postIdNum, author_uid])
        liked = true
      }
    } else {
      // 尚未按讚，嘗試新增按讚
      console.log('🔵 [Backend Likes POST] 新增按讚')
      try {
        const insertQuery = `
          INSERT INTO public.likes (post_id, author_uid, board, created_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `
        await pool.query(insertQuery, [postIdNum, author_uid, board])
        liked = true
      } catch (insertError) {
        // 處理不同的錯誤類型
        if (insertError.code === '23505') {
          // 唯一約束衝突，更新記錄
          console.log('🔵 [Backend Likes POST] 檢測到唯一約束衝突，更新記錄')
          const updateQuery = `
            UPDATE public.likes
            SET board = $1, created_at = CURRENT_TIMESTAMP
            WHERE post_id = $2 AND author_uid = $3
          `
          await pool.query(updateQuery, [board, postIdNum, author_uid])
          liked = true
        } else if (insertError.code === '23503') {
          // 外鍵約束違反 - 這表示外鍵約束只指向 discussion 表
          // 對於 traveler 類型的帖子，我們需要跳過外鍵檢查
          console.log('⚠️ [Backend Likes POST] 檢測到外鍵約束違反，嘗試使用不同的方法')

          // 由於外鍵約束的限制，我們需要檢查是否可以通過其他方式插入
          // 或者提供更友好的錯誤信息
          throw new Error(
            `無法為 ${board} 類型的帖子創建按讚記錄。` +
              `數據庫外鍵約束只支持 discussion 類型的帖子。` +
              `請聯繫管理員修改數據庫結構以支持 ${board} 類型的帖子。`,
          )
        } else {
          // 其他錯誤，重新拋出
          throw insertError
        }
      }
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
    console.error('❌ [Backend Likes POST] 錯誤堆疊:', error.stack)
    console.error('❌ [Backend Likes POST] 錯誤代碼:', error.code)
    console.error('❌ [Backend Likes POST] 錯誤詳情:', error.detail)
    console.error('❌ [Backend Likes POST] 請求 Body:', req.body)
    res.status(500).json({
      error: '按讚操作失敗',
      details: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
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
    } else if (board === 'traveler') {
      query = `
        SELECT
          t.*,
          'traveler' as type,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = t.id AND board = 'traveler') as likes_count,
          (SELECT COUNT(*) FROM public.comments WHERE post_id = t.id AND post_type = 'traveler') as comments_count
        FROM public.likes l
        JOIN travelers.travelers t ON l.post_id = t.id
        WHERE l.author_uid = $1 AND l.board = 'traveler' AND t.deleted_at IS NULL
        ORDER BY l.created_at DESC
      `
    } else if (board === 'itinerary') {
      query = `
        SELECT
          i.*,
          'itinerary' as type,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = i.id AND board = 'itinerary') as likes_count
        FROM public.likes l
        JOIN itinerary.itineraries i ON l.post_id = i.id
        WHERE l.author_uid = $1 AND l.board = 'itinerary'
        ORDER BY l.created_at DESC
      `
    } else {
      return res.json([])
    }

    const result = await pool.query(query, params)

    // 整理回傳格式以符合前端 Card
    const favorites = result.rows.map((row) => {
      const baseData = {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content || '',
        banner: row.banner || row.banner_image || null,
        image_urls: row.image_urls || [],
        tags: row.tags || [],
        likes: parseInt(row.likes_count) || 0,
        comments: parseInt(row.comments_count) || 0,
        author: row.author_uid || row.author_uid,
        time: new Date(row.created_at).toLocaleDateString(),
        avatar:
          row.author_avatar ||
          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (row.author_uid || row.id),
      }

      if (row.type === 'traveler') {
        baseData.location = row.location || ''
        baseData.start_date = row.start_date || null
        baseData.end_date = row.end_date || null
        baseData.max_people = row.max_people || 0
        baseData.status = row.status || '招募中'
      }

      if (row.type === 'itinerary') {
        baseData.coverImage = row.banner_image || row.cover_image || row.coverImage || null
        baseData.price = row.price ?? null
        baseData.category = row.category || null
        baseData.destinations = row.location ? [row.location] : row.destinations || []
        baseData.start_date = row.start_date || null
        baseData.end_date = row.end_date || null
        baseData.durationDays = row.duration_days || row.durationDays || null
        baseData.agencyName = row.agency_name || row.agencyName || null
        baseData.author_uid = row.author_uid || null
        baseData.vendor_id = row.vendor_id || null
      }

      return baseData
    })

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
