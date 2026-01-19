/* eslint-env node */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// GET /api/discussions - 獲取所有討論
router.get('/', async (req, res) => {
  console.log('🔵 [Backend GET /] ========== 開始 ==========')

  try {
    const { page = 1, limit = 10, category } = req.query
    const offset = (page - 1) * limit

    let whereClause = 'd.deleted_at IS NULL'
    const queryParams = [limit, offset]

    if (category && category !== '全部') {
      whereClause += ' AND d.category = $3'
      queryParams.push(category)
    }

    const discussionsQuery = `
      SELECT
        d.*,
        COALESCE((
          SELECT COUNT(*)
          FROM public.likes l
          WHERE l.post_id = d.id AND l.board = 'discussion'
        ), 0) as likes_count,
        COALESCE((
          SELECT COUNT(*)
          FROM public.comments c
          WHERE c.post_id = d.id AND c.post_type = 'discussion' AND c.deleted_at IS NULL
        ), 0) as comments_count
      FROM discussion.discussion d
      WHERE ${whereClause}
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

    // ★ 修改：格式化資料 (比照 travelers.js)
    const discussions = discussionsResult.rows.map((row) => {
      // 時間格式化：600秒內顯示「剛剛」
      const now = new Date()
      const created = new Date(row.created_at)
      const diffSeconds = Math.floor((now - created) / 1000)
      const timeStr =
        diffSeconds < 600
          ? '剛剛'
          : created.toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })

      return {
        id: row.id,
        category: row.category, // 分類
        title: row.title,
        content: row.content,
        banner: row.banner || null,
        image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
        tags: Array.isArray(row.tags) ? row.tags : [],

        // 作者資訊 (從 DB 讀取快照)
        author_uid: row.author_uid,
        author: row.author_name, // 對應前端 discussionCard 的 props
        authorAvatar: row.author_avatar,
        spiritAnimal: row.spirit_animal,

        // 數據
        likes: parseInt(row.likes_count) || 0,
        comments: parseInt(row.comments_count) || 0,
        created_at: timeStr, // 使用格式化後的時間
        time: timeStr, // 相容性欄位
      }
    })

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
    console.error('❌ [Backend GET /] 錯誤:', error)
    res.status(500).json({ error: '獲取討論失敗', details: error.message })
  }
})

// POST /api/discussions - 創建新討論
router.post('/', async (req, res) => {
  console.log('🟢 [Backend POST /] 收到發文請求')

  try {
    const {
      author_uid,
      // ★ 新增接收這些欄位
      author_name,
      author_avatar,
      spirit_animal,
      category,
      title,
      content,
      banner = null,
      image_urls = [],
      tags = [],
    } = req.body

    // 必填檢查
    if (!author_uid || !title || !content) {
      return res.status(400).json({ error: '缺少必填欄位 (author_uid, title, content)' })
    }

    const tagsArray = Array.isArray(tags) ? tags : []
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : []

    // ★ 修改：INSERT 加入作者資訊欄位
    const insertDiscussionQuery = `
      INSERT INTO discussion.discussion (
        author_uid, author_name, author_avatar, spirit_animal,
        category, title, content, tags, banner, image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `

    const discussionResult = await pool.query(insertDiscussionQuery, [
      author_uid,
      author_name || '匿名',
      author_avatar || null,
      spirit_animal || null,
      category || '其他',
      title,
      content,
      tagsArray,
      banner,
      imageUrlsArray,
    ])

    const newDiscussion = discussionResult.rows[0]
    console.log('✅ [Backend POST /] 插入成功 ID:', newDiscussion.id)
    res.status(201).json(newDiscussion)
  } catch (error) {
    console.error('❌ [Backend POST /] 錯誤:', error)
    res.status(500).json({ error: '創建討論失敗', details: error.message })
  }
})

// GET /api/discussions/:id - 獲取詳情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)

    const discussionQuery = `
      SELECT
        d.*,
        COALESCE((SELECT COUNT(*) FROM public.likes l WHERE l.post_id = d.id AND l.board = 'discussion'), 0) as likes_count,
        COALESCE((SELECT COUNT(*) FROM public.comments c WHERE c.post_id = d.id AND c.post_type = 'discussion' AND c.deleted_at IS NULL), 0) as comments_count
      FROM discussion.discussion d
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `

    const discussionResult = await pool.query(discussionQuery, [idNum])

    if (discussionResult.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在' })
    }

    const row = discussionResult.rows[0]

    // 獲取留言
    const commentsResult = await pool.query(
      `SELECT * FROM public.comments
       WHERE post_id = $1 AND post_type = 'discussion' AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [idNum],
    )

    // ★ 修改：格式化回傳資料
    const discussion = {
      ...row,
      author: row.author_name, // 對應前端
      authorAvatar: row.author_avatar,
      spiritAnimal: row.spirit_animal,

      commentsData: commentsResult.rows,
      comments: parseInt(row.comments_count) || 0,
      likes: parseInt(row.likes_count) || 0,
      banner: row.banner || null,
      image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
    }

    res.json(discussion)
  } catch (error) {
    console.error('❌ [Backend GET /:id] 錯誤:', error)
    res.status(500).json({ error: '獲取詳情失敗', details: error.message })
  }
})

// PUT (更新)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, category, banner, image_urls, tags } = req.body

    const updateQuery = `
      UPDATE discussion.discussion
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          category = COALESCE($3, category),
          banner = COALESCE($4, banner),
          tags = COALESCE($5, tags),
          image_urls = COALESCE($6, image_urls),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND deleted_at IS NULL
      RETURNING *
    `

    const result = await pool.query(updateQuery, [
      title || null,
      content || null,
      category || null,
      banner !== undefined ? banner : null,
      tags || null,
      image_urls || null,
      id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在或無法更新' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('❌ [Backend PUT] 錯誤:', error)
    res.status(500).json({ error: '更新失敗', details: error.message })
  }
})

// DELETE (刪除)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query(
      'UPDATE discussion.discussion SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    )
    res.json({ message: '已刪除', id })
  } catch (error) {
    res.status(500).json({ error: '刪除失敗', details: error.message })
  }
})

module.exports = router
