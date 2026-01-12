const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// GET /api/discussions - 獲取所有討論（支援分頁和分類篩選）
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query
    const offset = (page - 1) * limit

    // 構建查詢條件
    let whereClause = 'd.deleted_at IS NULL'
    const queryParams = [limit, offset]

    if (category && category !== '全部') {
      whereClause += ' AND d.category = $3'
      queryParams.push(category)
    }

    // 查詢討論，包含按讚數和留言數
    const discussionsQuery = `
      SELECT
        d.*,
        COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM discussion.discussion d
      LEFT JOIN public.likes l ON d.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN public.comments c ON c.post_id = d.id AND c.post_type = 'discussion' AND c.deleted_at IS NULL
      WHERE ${whereClause}
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `

    const discussionsResult = await pool.query(discussionsQuery, queryParams)

    // 查詢總數
    let countQuery = 'SELECT COUNT(*) FROM discussion.discussion WHERE deleted_at IS NULL'
    let countParams = []

    if (category && category !== '全部') {
      countQuery += ' AND category = $1'
      countParams.push(category)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    // 處理結果
    const discussions = discussionsResult.rows.map((discussion) => ({
      ...discussion,
      likes_count: parseInt(discussion.likes_count) || 0,
      comments_count: parseInt(discussion.comments_count) || 0,
      banner: discussion.banner || null,
      image_urls: Array.isArray(discussion.image_urls) ? discussion.image_urls : [],
      tags: Array.isArray(discussion.tags) ? discussion.tags : [],
    }))

    res.json({
      posts: discussions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('獲取討論失敗：', error)
    console.error('錯誤堆疊：', error.stack)
    res.status(500).json({
      error: '獲取討論失敗',
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// GET /api/discussions/:id - 獲取單個討論詳情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }

    // 獲取討論，包含按讚數和留言數
    const discussionQuery = `
      SELECT
        d.*,
        COALESCE(COUNT(DISTINCT l.id), 0) as likes_count,
        COALESCE(COUNT(DISTINCT c.id), 0) as comments_count
      FROM discussion.discussion d
      LEFT JOIN public.likes l ON d.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN public.comments c ON c.post_id = d.id AND c.post_type = 'discussion' AND c.deleted_at IS NULL
      WHERE d.id = $1 AND d.deleted_at IS NULL
      GROUP BY d.id
    `

    const discussionResult = await pool.query(discussionQuery, [idNum])

    if (discussionResult.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在' })
    }

    const discussion = discussionResult.rows[0]

    // 獲取留言
    const commentsResult = await pool.query(
      `SELECT * FROM public.comments
       WHERE post_id = $1 AND post_type = 'discussion' AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [idNum],
    )

    discussion.commentsData = commentsResult.rows
    discussion.comments = parseInt(discussion.comments_count) || commentsResult.rows.length
    discussion.likes = parseInt(discussion.likes_count) || 0
    discussion.banner = discussion.banner || null
    discussion.image_urls = Array.isArray(discussion.image_urls) ? discussion.image_urls : []
    discussion.tags = Array.isArray(discussion.tags) ? discussion.tags : []

    res.json(discussion)
  } catch (error) {
    console.error('獲取討論詳情失敗：', error)
    res.status(500).json({ error: '獲取討論詳情失敗', details: error?.message || String(error) })
  }
})

// POST /api/discussions - 創建新討論
router.post('/', async (req, res) => {
  try {
    const {
      author_uid,
      board = 'discussion',
      category,
      title,
      content,
      banner = null,
      image_urls = [],
      tags = [],
    } = req.body

    console.log('收到創建討論請求：', {
      author_uid,
      board,
      category,
      title: title?.substring(0, 50),
      content: content?.substring(0, 50),
      hasBanner: !!banner,
      imageUrlsCount: image_urls?.length || 0,
      tagsCount: tags?.length || 0,
    })

    // 驗證必填欄位
    if (!author_uid || !title || !content) {
      return res.status(400).json({
        error: '缺少必填欄位',
        required: ['author_uid', 'title', 'content'],
        received: {
          hasAuthorUid: !!author_uid,
          hasTitle: !!title,
          hasContent: !!content,
        },
      })
    }

    // 確保 tags 和 image_urls 是陣列
    const tagsArray = Array.isArray(tags) ? tags : []
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : []

    // 插入討論
    const insertDiscussionQuery = `
      INSERT INTO discussion.discussion (
        author_uid, board, category, title, content, tags, banner, image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const discussionResult = await pool.query(insertDiscussionQuery, [
      author_uid,
      board,
      category,
      title,
      content,
      tagsArray,
      banner,
      imageUrlsArray,
    ])

    const newDiscussion = discussionResult.rows[0]

    console.log('討論創建成功，ID：', newDiscussion.id)

    res.status(201).json(newDiscussion)
  } catch (error) {
    console.error('創建討論失敗：', error)
    console.error('錯誤堆疊：', error.stack)
    console.error('請求資料：', req.body)
    res.status(500).json({
      error: '創建討論失敗',
      details: error?.message || String(error),
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// PUT /api/discussions/:id - 更新討論
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }
    const { title, content, category, banner, image_urls, tags } = req.body

    // 檢查討論是否存在
    const checkResult = await pool.query(
      'SELECT id FROM discussion.discussion WHERE id = $1 AND deleted_at IS NULL',
      [idNum],
    )
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在' })
    }

    // 更新討論
    const updateQuery = `
      UPDATE discussion.discussion
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          category = COALESCE($3, category),
          banner = COALESCE($4, banner),
          tags = COALESCE($5, tags),
          image_urls = COALESCE($6, image_urls),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `

    const result = await pool.query(updateQuery, [
      title || null,
      content || null,
      category || null,
      banner !== undefined ? banner : null,
      tags || null,
      image_urls || null,
      idNum,
    ])
    const updatedDiscussion = result.rows[0]
    res.json(updatedDiscussion)
  } catch (error) {
    console.error('更新討論失敗：', error)
    res.status(500).json({ error: '更新討論失敗', details: error?.message || String(error) })
  }
})

// DELETE /api/discussions/:id - 軟刪除討論
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }

    // 檢查討論是否存在
    const checkResult = await pool.query(
      'SELECT id FROM discussion.discussion WHERE id = $1 AND deleted_at IS NULL',
      [idNum],
    )
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在' })
    }

    // 軟刪除討論
    await pool.query(
      'UPDATE discussion.discussion SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [idNum],
    )

    res.json({ message: '討論已刪除', id: idNum })
  } catch (error) {
    console.error('刪除討論失敗：', error)
    res.status(500).json({ error: '刪除討論失敗', details: error?.message || String(error) })
  }
})

module.exports = router
