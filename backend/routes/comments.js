/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { createCommentNotification } = require('../utils/notifications')

// GET /api/posts/:postId/comments - 獲取指定貼文的留言
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params
    const { board } = req.query
    const postIdNum = Number(postId)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' })
    }

    // 確定 post_type，如果沒有提供 board，默認為 'discussion'
    const postType = board === 'traveler' ? 'traveler' : 'discussion'

    // 檢查貼文是否存在
    let postExists = false
    if (postType === 'discussion') {
      const postCheckQuery = `
        SELECT id FROM discussion.discussion
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    } else if (postType === 'traveler') {
      const postCheckQuery = `
        SELECT id FROM travelers.travelers
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    }

    if (!postExists) {
      return res.status(404).json({
        error: '貼文不存在',
        details: `找不到 ID 為 ${postIdNum} 的 ${postType} 貼文`,
      })
    }

    const commentsResult = await pool.query(
      `SELECT * FROM public.comments 
       WHERE post_id = $1 AND post_type = $2 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [postIdNum, postType],
    )

    res.json({
      postId,
      comments: commentsResult.rows,
      count: commentsResult.rows.length,
    })
  } catch (error) {
    console.error('獲取留言失敗：', error)
    res.status(500).json({ error: '獲取留言失敗', details: error?.message || String(error) })
  }
})

// POST /api/posts/:postId/comments - 創建留言
router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params
    const postIdNum = Number(postId)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' })
    }
    const { author_uid, content, board, author_name, author_avatar, parent_comment_id } = req.body

    // 驗證必填欄位
    if (!author_uid || !content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid', 'content'],
      })
    }

    // 確定 post_type，如果沒有提供 board，默認為 'discussion'
    const postType = board === 'traveler' ? 'traveler' : 'discussion'

    // 檢查貼文是否存在
    let postExists = false
    if (postType === 'discussion') {
      const postCheckQuery = `
        SELECT id FROM discussion.discussion
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    } else if (postType === 'traveler') {
      const postCheckQuery = `
        SELECT id FROM travelers.travelers
        WHERE id = $1 AND deleted_at IS NULL
      `
      const postCheckResult = await pool.query(postCheckQuery, [postIdNum])
      postExists = postCheckResult.rows.length > 0
    }

    if (!postExists) {
      return res.status(404).json({
        error: '貼文不存在',
        details: `找不到 ID 為 ${postIdNum} 的 ${postType} 貼文`,
      })
    }

    // 插入留言（包含所有必需字段）
    const insertCommentQuery = `
      INSERT INTO public.comments (
        post_id,
        post_type,
        author_uid,
        author_name,
        author_avatar,
        content,
        parent_comment_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `

    const result = await pool.query(insertCommentQuery, [
      postIdNum,
      postType,
      author_uid,
      author_name || '匿名用戶',
      author_avatar || null,
      content,
      parent_comment_id || null,
    ])
    const newComment = result.rows[0]

    // 創建回覆通知（不給自己發通知）
    try {
      // 獲取貼文作者和標題
      let postQuery = ''
      if (postType === 'discussion') {
        postQuery = `SELECT author_uid, title FROM discussion.discussion WHERE id = $1`
      } else if (postType === 'traveler') {
        postQuery = `SELECT author_uid, title FROM travelers.travelers WHERE id = $1`
      }
      
      if (postQuery) {
        const postResult = await pool.query(postQuery, [postIdNum])
        if (postResult.rows.length > 0) {
          const postAuthor = postResult.rows[0].author_uid
          const postTitle = postResult.rows[0].title
          
          // 只有當回覆者不是貼文作者時才發送通知
          if (postAuthor && postAuthor !== author_uid) {
            // 確保有回覆者名稱和頭像（優先使用 nickname）
            let commenterName = author_name || '匿名用戶'
            let commenterAvatar = author_avatar
            
            // 優先從 users 表獲取 nickname 和頭像
            try {
              const userResult = await pool.query(
                `SELECT nickname, name, avatar FROM users WHERE uid = $1`,
                [author_uid]
              )
              if (userResult.rows.length > 0) {
                const user = userResult.rows[0]
                // 優先使用 users 表中的 nickname，如果沒有則使用 name，最後使用 author_name
                commenterName = user.nickname || user.name || author_name || '匿名用戶'
                // 如果有頭像則使用，否則保持原值
                if (user.avatar) {
                  commenterAvatar = user.avatar
                }
              } else {
                // 如果 users 表中沒有，但 author_name 存在，使用 author_name
                // 但避免使用 uid 作為名稱
                if (!author_name || author_name === author_uid) {
                  commenterName = '匿名用戶'
                }
              }
            } catch (userQueryError) {
              console.warn('查詢回覆者資訊失敗，使用提供的值：', userQueryError.message)
              // 如果查詢失敗且 author_name 是 uid，使用匿名用戶
              if (!author_name || author_name === author_uid) {
                commenterName = '匿名用戶'
              }
            }
            
            // 確保不會使用 uid 作為名稱
            if (commenterName === author_uid) {
              commenterName = '匿名用戶'
              console.warn(`[通知] 回覆者 ${author_uid} 沒有找到 nickname 或 name，使用匿名用戶`)
            }
            
            await createCommentNotification({
              user_uid: postAuthor,
              post_id: postIdNum,
              board: postType,
              commenter_uid: author_uid,
              commenter_name: commenterName,
              commenter_avatar: commenterAvatar,
              comment_content: content,
              post_title: postTitle,
            })
          }
        }
      }
    } catch (notifError) {
      console.error('創建回覆通知失敗（不影響主流程）：', notifError)
      console.error('創建回覆通知失敗詳情：', notifError.stack)
    }

    res.status(201).json(newComment)
  } catch (error) {
    console.error('創建留言失敗：', error)
    res.status(500).json({ error: '創建留言失敗', details: error?.message || String(error) })
  }
})
// PUT /api/comments/:id - 更新留言
router.put('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    // 驗證必填欄位
    if (!content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['content'],
      })
    }

    // 檢查留言是否存在
    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' })
    }

    // 更新留言
    const updateQuery = `
      UPDATE comments
      SET content = $1
      WHERE id = $2
      RETURNING *
    `

    const result = await pool.query(updateQuery, [content, id])
    const updatedComment = result.rows[0]

    res.json(updatedComment)
  } catch (error) {
    console.error('更新留言失敗：', error)
    res.status(500).json({ error: '更新留言失敗', details: error?.message || String(error) })
  }
})
// DELETE /api/comments/:id - 刪除留言
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 檢查留言是否存在
    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' })
    }

    // 刪除留言
    await pool.query('DELETE FROM comments WHERE id = $1', [id])

    res.json({ message: '留言已刪除' })
  } catch (error) {
    console.error('刪除留言失敗：', error)
    res.status(500).json({ error: '刪除留言失敗', details: error?.message || String(error) })
  }
})

// POST /api/comments/:id/likes - 留言按讚/取消按讚（僅更新 likes_count）
router.post('/comments/:id/likes', async (req, res) => {
  try {
    const { id } = req.params
    const { action } = req.body || {}
    const commentIdNum = Number(id)

    if (!Number.isInteger(commentIdNum) || commentIdNum <= 0) {
      return res.status(400).json({ error: '留言 ID 格式錯誤', details: 'id 必須是正整數' })
    }

    if (action !== 'like' && action !== 'unlike') {
      return res.status(400).json({ error: 'action 格式錯誤', details: "action 必須是 'like' 或 'unlike'" })
    }

    const delta = action === 'like' ? 1 : -1
    const updateQuery = `
      UPDATE public.comments
      SET likes_count = GREATEST(COALESCE(likes_count, 0) + $2, 0)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING likes_count
    `
    const updateResult = await pool.query(updateQuery, [commentIdNum, delta])

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' })
    }

    res.json({ likesCount: Number(updateResult.rows[0].likes_count) || 0 })
  } catch (error) {
    res.status(500).json({ error: '更新留言按讚失敗', details: error?.message || String(error) })
  }
})

module.exports = router
