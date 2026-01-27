/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { createLikeNotification } = require('../utils/notifications')

router.post('/', async (req, res) => {
  try {
    const { post_id, author_uid, board } = req.body

    if (!post_id || !author_uid || !board) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['post_id', 'author_uid', 'board'],
      })
    }

    const postIdNum = Number(post_id)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        error: 'post_id 格式錯誤',
        details: 'post_id 必須是正整數',
      })
    }

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
      return res.status(404).json({
        error: '貼文不存在',
        details: `找不到 ID 為 ${postIdNum} 的 ${board} 貼文`,
      })
    }

    const checkQuery = `
      SELECT id, board FROM public.likes
      WHERE post_id = $1 AND author_uid = $2
    `
    const checkResult = await pool.query(checkQuery, [postIdNum, author_uid])

    let liked = false
    let likesCount = 0

    if (checkResult.rows.length > 0) {
      const existingRecord = checkResult.rows[0]
      if (existingRecord.board === board) {
        const deleteQuery = `
          DELETE FROM public.likes
          WHERE post_id = $1 AND author_uid = $2
        `
        await pool.query(deleteQuery, [postIdNum, author_uid])
        liked = false
      } else {
        const updateQuery = `
          UPDATE public.likes
          SET board = $1, created_at = CURRENT_TIMESTAMP
          WHERE post_id = $2 AND author_uid = $3
        `
        await pool.query(updateQuery, [board, postIdNum, author_uid])
        liked = true
      }
    } else {
      try {
        const insertQuery = `
          INSERT INTO public.likes (post_id, author_uid, board, created_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        `
        await pool.query(insertQuery, [postIdNum, author_uid, board])
        liked = true
      } catch (insertError) {
        if (insertError.code === '23505') {
          const updateQuery = `
            UPDATE public.likes
            SET board = $1, created_at = CURRENT_TIMESTAMP
            WHERE post_id = $2 AND author_uid = $3
          `
          await pool.query(updateQuery, [board, postIdNum, author_uid])
          liked = true
        } else if (insertError.code === '23503') {
          throw new Error(
            `無法為 ${board} 類型的帖子創建按讚記錄。` +
            `數據庫外鍵約束只支持 discussion 類型的帖子。` +
            `請聯繫管理員修改數據庫結構以支持 ${board} 類型的帖子。`,
          )
        } else {
          throw insertError
        }
      }
    }

    const countQuery = `
      SELECT COUNT(*) as count FROM public.likes
      WHERE post_id = $1 AND board = $2
    `
    const countResult = await pool.query(countQuery, [postIdNum, board])
    likesCount = parseInt(countResult.rows[0].count) || 0

    if (liked) {
      try {
        let postQuery = ''
        if (board === 'discussion') {
          postQuery = `SELECT author_uid, title FROM discussion.discussion WHERE id = $1`
        } else if (board === 'traveler') {
          postQuery = `SELECT author_uid, title FROM travelers.travelers WHERE id = $1`
        }

        if (postQuery) {
          const postResult = await pool.query(postQuery, [postIdNum])

          if (postResult.rows.length > 0) {
            const postAuthor = postResult.rows[0].author_uid
            const postTitle = postResult.rows[0].title

            if (postAuthor && postAuthor !== author_uid) {
              let likerName = null
              let likerAvatar = null

              try {
                const userResult = await pool.query(
                  `SELECT nickname, avatar FROM public.users WHERE uid = $1`,
                  [author_uid]
                )

                if (userResult.rows.length > 0) {
                  const user = userResult.rows[0]
                  likerName = (user.nickname && user.nickname.trim() !== '') ? user.nickname : null
                  likerAvatar = (user.avatar && user.avatar.trim() !== '') ? user.avatar : null
                }
              } catch (error) {
                console.error('查詢用戶資訊失敗:', error.message)
              }

              await createLikeNotification({
                user_uid: postAuthor,
                post_id: postIdNum,
                board,
                liker_uid: author_uid,
                liker_name: likerName,
                liker_avatar: likerAvatar,
                post_title: postTitle,
              })
            }
          }
        }
      } catch (notifError) {
        console.error('創建按讚通知失敗（不影響主流程）：', notifError)
      }
    }

    res.json({
      liked,
      likesCount,
    })
  } catch (error) {
    console.error('按讚操作失敗：', error)
    res.status(500).json({
      error: '按讚操作失敗',
      details: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
    })
  }
})

router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    const { board } = req.query

    if (!uid) return res.status(400).json({ error: '缺少 UID' })

    let query = ''
    let params = [uid]

    if (board === 'discussion') {
      query = `
        SELECT
          d.*,
          'discussion' as type,
          u.nickname as nickname,
          u.avatar as avatar,
          u.spirit_animal as spirit_animal,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = d.id AND board = 'discussion') as likes_count,
          (SELECT COUNT(*) FROM public.comments WHERE post_id = d.id AND post_type = 'discussion') as comments_count
        FROM public.likes l
        JOIN discussion.discussion d ON l.post_id = d.id
        LEFT JOIN users u ON d.author_uid = u.uid
        WHERE l.author_uid = $1 AND l.board = 'discussion' AND d.deleted_at IS NULL
        ORDER BY l.created_at DESC
      `
    } else if (board === 'traveler') {
      query = `
        SELECT
          t.*,
          'traveler' as type,
          u.nickname as nickname,
          u.avatar as avatar,
          u.spirit_animal as spirit_animal,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = t.id AND board = 'traveler') as likes_count,
          (SELECT COUNT(*) FROM public.comments WHERE post_id = t.id AND post_type = 'traveler') as comments_count
        FROM public.likes l
        JOIN travelers.travelers t ON l.post_id = t.id
        LEFT JOIN users u ON t.author_uid = u.uid
        WHERE l.author_uid = $1 AND l.board = 'traveler' AND t.deleted_at IS NULL
        ORDER BY l.created_at DESC
      `
    } else if (board === 'itinerary') {
      query = `
        SELECT
          i.id,
          i.title,
          i.content,
          i.banner_image AS cover_image,
          i.price,
          i.category,
          i.location,
          i.destinations,
          i.start_date,
          i.end_date,
          i.duration_days,
          i.agency_name,
          i.author_uid,
          i.vendor_id,
          i.banner_position_y,
          'itinerary' as type,
          u.nickname,
          u.avatar,
          u.spirit_animal,
          l.created_at as liked_at,
          (SELECT COUNT(*) FROM public.likes WHERE post_id = i.id AND board = 'itinerary') as likes_count,
          (SELECT COUNT(*) FROM public.comments WHERE post_id = i.id AND post_type = 'itinerary' AND deleted_at IS NULL) as comments_count
        FROM public.likes l
        JOIN itinerary.itineraries i ON l.post_id = i.id
        LEFT JOIN users u ON i.author_uid = u.uid
        WHERE l.author_uid = $1 AND l.board = 'itinerary'
        ORDER BY l.created_at DESC
      `
    } else {
      return res.json([])
    }

    const result = await pool.query(query, params)

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
        author: row.nickname || row.author_nickname || '匿名用戶',
        time: new Date(row.created_at).toLocaleDateString(),
        avatar:
          row.avatar ||
          row.author_avatar ||
          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (row.author_uid || row.id),
        spiritAnimal: row.spirit_animal || row.author_spirit_animal || null,
      }

      if (row.type === 'traveler') {
        baseData.location = row.location || ''
        baseData.start_date = row.start_date || null
        baseData.end_date = row.end_date || null
        baseData.max_people = row.max_people || 0
        baseData.status = row.status || '招募中'
      }

      if (row.type === 'itinerary') {
        baseData.coverImage = row.cover_image || null
        baseData.description = row.content || ''
        baseData.price = row.price ?? null
        baseData.category = row.category || null
        baseData.destinations = row.location ? [row.location] : row.destinations || []
        baseData.start_date = row.start_date || null
        baseData.end_date = row.end_date || null
        baseData.durationDays = row.duration_days || null
        baseData.agencyName = row.agency_name || null
        baseData.author_uid = row.author_uid || null
        baseData.vendor_id = row.vendor_id || null
        baseData.banner_position_y = row.banner_position_y ?? 50
        baseData.isLiked = true
        baseData.comments_count = parseInt(row.comments_count) || 0
      }

      return baseData
    })

    res.json(favorites)
  } catch (error) {
    console.error('獲取收藏失敗：', error)
    res.status(500).json({ error: '獲取收藏失敗' })
  }
})

router.get('/:postId', async (req, res, next) => {
  try {
    const { postId } = req.params
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

    if (postId === 'user') return next()

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
    console.error('獲取按讚資訊失敗：', error)
    res.status(500).json({
      error: '獲取按讚資訊失敗',
      details: error?.message || String(error),
      code: error?.code,
    })
  }
})

module.exports = router
