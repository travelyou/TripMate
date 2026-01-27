/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { createCommentNotification } = require('../utils/notifications')
const { getUserInfo } = require('../utils/userInfo')

router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params
    const { board } = req.query
    const postIdNum = Number(postId)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' })
    }

    const postType = board === 'traveler' ? 'traveler' : 'discussion'

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
      `SELECT
        c.*,
        COALESCE(u.nickname, c.author_name) as author_name,
        COALESCE(u.avatar, c.author_avatar) as author_avatar,
        u.spirit_animal as author_spirit_animal
      FROM public.comments c
      LEFT JOIN public.users u ON c.author_uid = u.uid
      WHERE c.post_id = $1 AND c.post_type = $2 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
      [postIdNum, postType],
    )

    res.json({
      postId,
      comments: commentsResult.rows,
      count: commentsResult.rows.length,
    })
  } catch (error) {
    res.status(500).json({ error: '獲取留言失敗', details: error?.message || String(error) })
  }
})

router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params
    const postIdNum = Number(postId)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({ error: '貼文 ID 格式錯誤', details: 'postId 必須是正整數' })
    }
    const { author_uid, content, board, author_name, author_avatar, parent_comment_id } = req.body

    if (!author_uid || !content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid', 'content'],
      })
    }

    const postType = board === 'traveler' ? 'traveler' : 'discussion'

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

    try {
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

          if (postAuthor && postAuthor !== author_uid) {
            const commenterInfo = await getUserInfo(author_uid, author_name || '匿名用戶')

            let commenterName = commenterInfo.name
            if (commenterName === author_uid) {
              commenterName = '匿名用戶'
            }

            const commenterAvatar = commenterInfo.avatar || author_avatar

            let authorNickname = null
            try {
              const authorResult = await pool.query(
                `SELECT nickname FROM public.users WHERE uid = $1`,
                [postAuthor]
              )
              if (authorResult.rows.length > 0) {
                authorNickname = authorResult.rows[0].nickname
              }
            } catch (authorError) {
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
              author_name: authorNickname,
            })
          }
        }
      }
    } catch (notifError) {
    }

    res.status(201).json(newComment)
  } catch (error) {
    res.status(500).json({ error: '創建留言失敗', details: error?.message || String(error) })
  }
})
router.put('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['content'],
      })
    }

    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' })
    }

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
    res.status(500).json({ error: '更新留言失敗', details: error?.message || String(error) })
  }
})
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params

    const checkResult = await pool.query('SELECT id FROM comments WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' })
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id])

    res.json({ message: '留言已刪除' })
  } catch (error) {
    res.status(500).json({ error: '刪除留言失敗', details: error?.message || String(error) })
  }
})

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
