/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { isValidImageUrl } = require('../utils/imageUtils')

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, author_uid, search } = req.query
    const offset = (page - 1) * limit

    let whereClause = 'd.deleted_at IS NULL'
    const queryParams = [limit, offset]
    let paramIndex = 3

    if (author_uid) {
      whereClause += ` AND d.author_uid = $${paramIndex}`
      queryParams.push(author_uid)
      paramIndex++
    }

    if (category && category !== '全部') {
      whereClause += ` AND d.category = $${paramIndex}`
      queryParams.push(category)
      paramIndex++
    }

    // [修正] 搜尋功能改用 u.nickname 而不是 d.author_name
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      whereClause += ` AND (
        d.title ILIKE $${paramIndex}
        OR d.content ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM unnest(d.tags) AS tag
          WHERE tag ILIKE $${paramIndex}
        )
        OR EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.uid = d.author_uid AND u2.nickname ILIKE $${paramIndex}
        )
      )`
      queryParams.push(searchTerm)
      paramIndex++
    }

    // [修正] SQL 移除 d.author_name, d.author_avatar，完全改用 users 表的資料
    const discussionsQuery = `
      SELECT
        d.id,
        d.author_uid,
        d.category,
        d.title,
        d.content,
        d.tags,
        d.image_urls,
        d.created_at,
        d.updated_at,
        d.deleted_at,
        d.banner,
        NULLIF(TRIM(u.nickname), '') as author_name,
        NULLIF(TRIM(u.avatar), '') as author_avatar,
        NULLIF(TRIM(u.spirit_animal), '') as author_spirit_animal,
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
      LEFT JOIN public.users u ON d.author_uid = u.uid
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `

    const discussionsResult = await pool.query(discussionsQuery, queryParams)

    // [修正] 總數查詢也要 JOIN users 才能搜尋作者名
    let countQuery = `
      SELECT COUNT(*)
      FROM discussion.discussion d
      LEFT JOIN users u ON d.author_uid = u.uid
      WHERE d.deleted_at IS NULL
    `
    let countParams = []
    let countParamIndex = 1

    if (author_uid) {
      countQuery += ` AND d.author_uid = $${countParamIndex}`
      countParams.push(author_uid)
      countParamIndex++
    }

    if (category && category !== '全部') {
      countQuery += ` AND d.category = $${countParamIndex}`
      countParams.push(category)
      countParamIndex++
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      countQuery += ` AND (
        d.title ILIKE $${countParamIndex}
        OR d.content ILIKE $${countParamIndex}
        OR EXISTS (
          SELECT 1 FROM unnest(d.tags) AS tag
          WHERE tag ILIKE $${countParamIndex}
        )
        OR EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.uid = author_uid AND u2.nickname ILIKE $${countParamIndex}
        )
      )`
      countParams.push(searchTerm)
      countParamIndex++
    }
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    const discussions = discussionsResult.rows.map((discussion) => {
      const cleanBanner = isValidImageUrl(discussion.banner) ? discussion.banner : null
      const cleanImageUrls = Array.isArray(discussion.image_urls)
        ? discussion.image_urls.filter((url) => isValidImageUrl(url))
        : []

      return {
        ...discussion,
        author_avatar: discussion.author_avatar || null,
        author_name: discussion.author_name || null,
        author_spirit_animal: discussion.author_spirit_animal || null,
        likes_count: parseInt(discussion.likes_count) || 0,
        comments_count: parseInt(discussion.comments_count) || 0,
        banner: cleanBanner,
        image_urls: cleanImageUrls,
        tags: Array.isArray(discussion.tags) ? discussion.tags : [],
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
      category,
      title,
      content,
      banner = null,
      image_urls = [],
      tags = [],
    } = req.body

    if (!author_uid || !title || !content) {
      return res.status(400).json({ error: '缺少必填欄位 (author_uid, title, content)' })
    }

    const tagsArray = Array.isArray(tags) ? tags : []
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : []

    const insertDiscussionQuery = `
      INSERT INTO discussion.discussion (
        author_uid, category, title, content, tags, banner, image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    const discussionResult = await pool.query(insertDiscussionQuery, [
      author_uid,
      category || '其他',
      title,
      content,
      tagsArray,
      banner,
      imageUrlsArray,
    ])

    const newDiscussion = discussionResult.rows[0]
    console.log('✅ [Backend POST /] 插入成功，ID:', newDiscussion.id)

    // 回傳完整資料（包含 JOIN 的 user 資訊）
    const discussionQuery = `
      SELECT
        d.id,
        d.author_uid,
        d.category,
        d.title,
        d.content,
        d.tags,
        d.image_urls,
        d.created_at,
        d.updated_at,
        d.deleted_at,
        d.banner,
        NULLIF(TRIM(u.avatar), '') as author_avatar,
        NULLIF(TRIM(u.nickname), '') as author_name,
        NULLIF(TRIM(u.spirit_animal), '') as author_spirit_animal,
        0 as likes_count,
        0 as comments_count
      FROM discussion.discussion d
      LEFT JOIN users u ON d.author_uid = u.uid
      WHERE d.id = $1
    `
    const enrichedResult = await pool.query(discussionQuery, [newDiscussion.id])
    const enrichedDiscussion = enrichedResult.rows[0] || newDiscussion

    res.status(201).json(enrichedDiscussion)
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

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }

    // 獲取討論，包含按讚數和留言數，並 JOIN users 表獲取最新頭貼
    // 一律使用 users 表的數據，不使用 discussion 表的舊值
    // [修正] 移除 d.author_name 等欄位，改用 users 表
    const discussionQuery = `
      SELECT
        d.id,
        d.author_uid,
        d.category,
        d.title,
        d.content,
        d.tags,
        d.image_urls,
        d.created_at,
        d.updated_at,
        d.deleted_at,
        d.banner,
        NULLIF(TRIM(u.avatar), '') as author_avatar,
        NULLIF(TRIM(u.nickname), '') as author_name,
        NULLIF(TRIM(u.spirit_animal), '') as author_spirit_animal,
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
      LEFT JOIN users u ON d.author_uid = u.uid
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `

    const discussionResult = await pool.query(discussionQuery, [idNum])

    if (discussionResult.rows.length === 0) {
      return res.status(404).json({ error: '討論不存在' })
    }

    const discussion = discussionResult.rows[0]

    // 獲取留言，JOIN users 表
    const commentsResult = await pool.query(
      `SELECT
        c.*,
        u.nickname as author_nickname,
        u.avatar as author_avatar,
        u.spirit_animal as author_spirit_animal
      FROM public.comments c
      LEFT JOIN users u ON c.author_uid = u.uid
      WHERE c.post_id = $1 AND c.post_type = 'discussion' AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
      [idNum],
    )

    const cleanBanner = isValidImageUrl(discussion.banner) ? discussion.banner : null
    const cleanImageUrls = Array.isArray(discussion.image_urls)
      ? discussion.image_urls.filter((url) => isValidImageUrl(url))
      : []

    const detailedDiscussion = {
      ...discussion,
      commentsData: commentsResult.rows,
      comments_count: parseInt(discussion.comments_count) || 0,
      likes_count: parseInt(discussion.likes_count) || 0,
      banner: cleanBanner,
      image_urls: cleanImageUrls,
      tags: Array.isArray(discussion.tags) ? discussion.tags : [],
    }

    res.json(detailedDiscussion)
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
