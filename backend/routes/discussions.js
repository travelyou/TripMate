/* eslint-env node */
/* global require, module */
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

    console.log('🔵 [Backend GET / Step 2] WHERE 子句:', whereClause)
    console.log('🔵 [Backend GET / Step 2] 查詢參數:', queryParams)

    // 查詢討論，包含按讚數和留言數，並 JOIN users 表獲取最新頭貼
    // 明確列出所有欄位，使用 COALESCE(u.avatar, d.author_avatar) 確保優先使用 users.avatar（Firebase Storage URL）
    // 注意：d.author_avatar 在 COALESCE 中引用，即使不在 SELECT 列表中也可以使用
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
        d.author_name,
        d.author_avatar as old_author_avatar,
        d.deleted_at,
        d.banner,
        COALESCE(u.avatar, d.author_avatar) as author_avatar,
        COALESCE(u.nickname, d.author_name) as author_name,
        COALESCE(u.spirit_animal, NULL) as author_spirit_animal,
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
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `

    console.log('🔵 [Backend GET / Step 3] 執行查詢')
    console.log('🔵 [Backend GET / Step 3] SQL 查詢:', discussionsQuery.substring(0, 200) + '...')
    const discussionsResult = await pool.query(discussionsQuery, queryParams)

    // 測試：檢查 users 表中是否有對應的記錄
    if (discussionsResult.rows.length > 0) {
      const testUid = discussionsResult.rows[0].author_uid
      const testUserQuery = 'SELECT uid, nickname, avatar FROM users WHERE uid = $1'
      try {
        const testUserResult = await pool.query(testUserQuery, [testUid])
        if (testUserResult.rows.length > 0) {
          console.log(`🔵 [Backend GET / Step 3] ✅ users 表中有 UID ${testUid} 的記錄:`)
          console.log(
            `🔵 [Backend GET / Step 3]   - nickname: ${testUserResult.rows[0].nickname || 'NULL'}`,
          )
          console.log(
            `🔵 [Backend GET / Step 3]   - avatar: ${testUserResult.rows[0].avatar ? testUserResult.rows[0].avatar.substring(0, 50) + '...' : 'NULL'}`,
          )
        } else {
          console.log(`⚠️ [Backend GET / Step 3] ❌ users 表中沒有 UID ${testUid} 的記錄`)
        }
      } catch (testError) {
        console.error('⚠️ [Backend GET / Step 3] 測試查詢 users 表失敗:', testError.message)
      }
    }

    // 調試：檢查返回的 author_avatar 和 JOIN 結果
    if (discussionsResult.rows.length > 0) {
      const firstPost = discussionsResult.rows[0]
      console.log(
        '🔵 [Backend GET / Step 3] 第一個貼文的 author_avatar:',
        firstPost.author_avatar || 'NULL',
      )
      console.log('🔵 [Backend GET / Step 3] 第一個貼文的 author_uid:', firstPost.author_uid)
      console.log(
        '🔵 [Backend GET / Step 3] 第一個貼文的 author_name:',
        firstPost.author_name || 'NULL',
      )
      console.log(
        '🔵 [Backend GET / Step 3] 第一個貼文的 old_author_avatar:',
        firstPost.old_author_avatar || 'NULL',
      )

      // 測試 JOIN 是否成功：檢查是否有 u.avatar 的值
      // 由於使用了 d.*，我們需要檢查原始的 author_avatar 欄位
      console.log(
        '🔵 [Backend GET / Step 3] 第一個貼文的所有欄位:',
        Object.keys(firstPost).slice(0, 20),
      )

      // 檢查所有貼文的 author_avatar
      discussionsResult.rows.forEach((row, index) => {
        if (!row.author_avatar) {
          console.log(
            `⚠️ [Backend GET / Step 3] 貼文 ${index + 1} (UID: ${row.author_uid}) 沒有 author_avatar`,
          )
          console.log(
            `⚠️ [Backend GET / Step 3] 貼文 ${index + 1} 的 author_avatar 值:`,
            row.author_avatar,
          )
          console.log(
            `⚠️ [Backend GET / Step 3] 貼文 ${index + 1} 的 old_author_avatar 值:`,
            row.old_author_avatar,
          )
          console.log(
            `⚠️ [Backend GET / Step 3] 貼文 ${index + 1} 的 author_name 值:`,
            row.author_name,
          )
          // 檢查是否有其他 avatar 相關的欄位
          const avatarKeys = Object.keys(row).filter((k) => k.toLowerCase().includes('avatar'))
          console.log(`⚠️ [Backend GET / Step 3] 貼文 ${index + 1} 的 avatar 相關欄位:`, avatarKeys)

          // 檢查 users 表中是否有對應的記錄
          console.log(`⚠️ [Backend GET / Step 3] 檢查 users 表中是否有 UID: ${row.author_uid}`)
        }
      })
    }

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
    // 確保 author_avatar 使用 JOIN 後的值（來自 users.avatar）
    const discussions = discussionsResult.rows.map((discussion) => {
      // 調試：檢查每個貼文的 author_avatar
      if (!discussion.author_avatar) {
        console.log(
          `⚠️ [Backend GET / Step 4] 貼文 ID ${discussion.id} (UID: ${discussion.author_uid}) 沒有 author_avatar`,
        )
        console.log(`⚠️ [Backend GET / Step 4] 貼文的所有欄位:`, Object.keys(discussion))
        console.log(
          `⚠️ [Backend GET / Step 4] 貼文的完整資料:`,
          JSON.stringify(discussion, null, 2),
        )
      }

      // 調試：記錄第一個貼文的完整資料
      if (discussion.id === discussionsResult.rows[0].id) {
        console.log(`🔵 [Backend GET / Step 4] 第一個貼文的完整資料:`)
        console.log(`  - author_avatar: ${discussion.author_avatar || 'NULL'}`)
        console.log(`  - author_name: ${discussion.author_name || 'NULL'}`)
        console.log(`  - author_spirit_animal: ${discussion.author_spirit_animal || 'NULL'}`)
        console.log(`  - old_author_avatar: ${discussion.old_author_avatar || 'NULL'}`)
        console.log(`  - 所有欄位:`, Object.keys(discussion))
      }

      return {
        ...discussion,
        // 確保 author_avatar 使用 JOIN 後的值（來自 users.avatar）
        author_avatar: discussion.author_avatar || null,
        author_name: discussion.author_name || null,
        author_spirit_animal: discussion.author_spirit_animal || null,
        likes_count: parseInt(discussion.likes_count) || 0,
        comments_count: parseInt(discussion.comments_count) || 0,
        banner: discussion.banner || null,
        image_urls: Array.isArray(discussion.image_urls) ? discussion.image_urls : [],
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
    console.log('✅ [Backend POST / Step 5] 插入成功！')
    console.log('📊 [Backend POST / Success] 新討論 ID:', newDiscussion.id)
    console.log('📊 [Backend POST / Success] 創建時間:', newDiscussion.created_at)

    // 回傳最新作者資料，確保頭貼與個人檔案一致
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
        d.author_name,
        d.deleted_at,
        d.banner,
        COALESCE(u.avatar, d.author_avatar) as author_avatar,
        COALESCE(u.nickname, d.author_name) as author_name,
        COALESCE(u.spirit_animal, NULL) as author_spirit_animal,
        0 as likes_count,
        0 as comments_count
      FROM discussion.discussion d
      LEFT JOIN users u ON d.author_uid = u.uid
      WHERE d.id = $1
    `
    const enrichedResult = await pool.query(discussionQuery, [newDiscussion.id])
    const enrichedDiscussion = enrichedResult.rows[0] || newDiscussion

    console.log('🟢 [Backend POST /] ========== 完成 ==========')
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

    // 獲取討論，包含按讚數和留言數，並 JOIN users 表獲取最新頭貼
    // 明確列出所有欄位，使用 COALESCE(u.avatar, d.author_avatar) 確保優先使用 users.avatar
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
        d.author_name,
        d.deleted_at,
        d.banner,
        COALESCE(u.avatar, d.author_avatar) as author_avatar,
        COALESCE(u.nickname, d.author_name) as author_name,
        COALESCE(u.spirit_animal, NULL) as author_spirit_animal,
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
    console.log('🔵 [Backend GET /:id] 找到討論:', discussion.title)
    console.log('🔵 [Backend GET /:id] author_avatar:', discussion.author_avatar || 'NULL')
    console.log('🔵 [Backend GET /:id] author_uid:', discussion.author_uid)

    // 獲取留言
    const commentsResult = await pool.query(
      `SELECT * FROM public.comments
       WHERE post_id = $1 AND post_type = 'discussion' AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [idNum],
    )

    const detailedDiscussion = {
      ...discussion,
      commentsData: commentsResult.rows,
      comments_count: parseInt(discussion.comments_count) || 0,
      likes_count: parseInt(discussion.likes_count) || 0,
      banner: discussion.banner || null,
      image_urls: Array.isArray(discussion.image_urls) ? discussion.image_urls : [],
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
