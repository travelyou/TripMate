/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

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

module.exports = router
