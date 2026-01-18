const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// GET /api/discussions - 獲取所有討論（支援分頁和分類篩選）
router.get('/', async (req, res) => {
  console.log('🔵 [Backend GET /] ========== 開始 ==========')
  console.log('🔵 [Backend GET /] Query 參數:', req.query)

  try {
    const { page = 1, limit = 10, category } = req.query
    const offset = (page - 1) * limit

    console.log('🔵 [Backend GET / Step 1] 分頁參數:', { page, limit, offset, category })

    // 構建查詢條件
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
    console.log('🔵 [Backend GET / Step 3] 查詢結果數量:', discussionsResult.rows.length)

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

    console.log('🔵 [Backend GET / Step 4] 查詢總數')
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)
    console.log('🔵 [Backend GET / Step 4] 總數:', total)

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
        // 確保 author_avatar 存在（即使為 null 也要明確設置）
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

    console.log('✅ [Backend GET /] 查詢成功，回傳', discussions.length, '筆資料')

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
    console.error('❌ [Backend GET /] ========== 錯誤 ==========')
    console.error('❌ [Backend GET /] 錯誤訊息:', error.message)
    console.error('❌ [Backend GET /] 錯誤名稱:', error.name)
    console.error('❌ [Backend GET /] 錯誤代碼:', error.code)
    console.error('❌ [Backend GET /] 錯誤堆疊:', error.stack)

    if (error.name === 'AggregateError' && error.errors) {
      console.error('❌ [Backend GET /] AggregateError 詳細錯誤:')
      error.errors.forEach((err, index) => {
        console.error(`  錯誤 ${index + 1}:`, err.message, err.code)
      })
    }

    const errorDetails =
      error.name === 'AggregateError' && error.errors
        ? error.errors.map((e) => e.message || String(e)).join('; ')
        : error?.message || String(error)

    res.status(500).json({
      error: '獲取討論失敗',
      details: errorDetails,
      errorType: error.name,
      errorCode: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// POST /api/discussions - 創建新討論
router.post('/', async (req, res) => {
  console.log('🟢 [Backend POST /] ========== 開始創建討論 ==========')
  console.log('🟢 [Backend POST / Step 0] 收到請求')
  console.log('🟢 [Backend POST / Step 0] Content-Type:', req.headers['content-type'])
  console.log('🟢 [Backend POST / Step 0] Body 大小:', JSON.stringify(req.body).length, 'bytes')

  try {
    const {
      author_uid,
      // board, // 這裡不需要 board
      category,
      title,
      content,
      banner = null,
      image_urls = [],
      tags = [],
    } = req.body

    console.log('🟢 [Backend POST / Step 1] 解析請求資料')
    console.log('📊 [Backend POST / Data]', {
      author_uid,
      category,
      titleLength: title?.length || 0,
      contentLength: content?.length || 0,
      hasBanner: !!banner,
      bannerSize: banner ? `${(banner.length / 1024).toFixed(2)} KB` : '無',
      imageUrlsCount: Array.isArray(image_urls) ? image_urls.length : 0,
      tagsCount: Array.isArray(tags) ? tags.length : 0,
    })

    // 驗證必填欄位
    console.log('🟢 [Backend POST / Step 2] 驗證必填欄位')
    if (!author_uid || !title || !content) {
      console.log('❌ [Backend POST / Step 2] 必填欄位缺失:', {
        hasAuthorUid: !!author_uid,
        hasTitle: !!title,
        hasContent: !!content,
      })

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
    console.log('✅ [Backend POST / Step 2] 必填欄位驗證通過')

    // 確保 tags 和 image_urls 是陣列
    const tagsArray = Array.isArray(tags) ? tags : []
    const imageUrlsArray = Array.isArray(image_urls) ? image_urls : []

    console.log('🟢 [Backend POST / Step 3] 準備插入資料庫')
    console.log('📊 [Backend POST / SQL Data]', {
      author_uid,
      category,
      title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
      contentLength: content.length,
      tagsCount: tagsArray.length,
      hasBanner: !!banner,
      imageUrlsCount: imageUrlsArray.length,
    })

    // 插入討論 (已移除 board)
    const insertDiscussionQuery = `
      INSERT INTO discussion.discussion (
        author_uid, category, title, content, tags, banner, image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    console.log('🟢 [Backend POST / Step 4] 執行 SQL INSERT')
    const discussionResult = await pool.query(insertDiscussionQuery, [
      author_uid,
      category,
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

    console.log('🟢 [Backend POST /] ========== 完成 ==========')
    res.status(201).json(newDiscussion)
  } catch (error) {
    console.error('❌ [Backend POST /] ========== 失敗 ==========')
    console.error('❌ [Backend POST /] 錯誤類型:', error.name)
    console.error('❌ [Backend POST /] 錯誤訊息:', error.message)
    console.error('❌ [Backend POST /] 錯誤代碼:', error.code)
    console.error('❌ [Backend POST /] 錯誤堆疊:', error.stack)
    console.error('❌ [Backend POST /] 請求 Body:', req.body)

    if (error.code) {
      console.error('❌ [Backend POST /] PostgreSQL 錯誤代碼:', error.code)
      console.error('❌ [Backend POST /] PostgreSQL 錯誤詳情:', error.detail)
    }

    res.status(500).json({
      error: '創建討論失敗',
      details: error?.message || String(error),
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// GET /api/discussions/:id - 獲取單個討論詳情
router.get('/:id', async (req, res) => {
  console.log('🔵 [Backend GET /:id] 開始，ID:', req.params.id)

  try {
    const { id } = req.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      console.log('❌ [Backend GET /:id] ID 格式錯誤:', id)
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }

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

    console.log('🔵 [Backend GET /:id] 執行查詢')
    const discussionResult = await pool.query(discussionQuery, [idNum])

    if (discussionResult.rows.length === 0) {
      console.log('❌ [Backend GET /:id] 討論不存在')
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

    discussion.commentsData = commentsResult.rows
    discussion.comments = parseInt(discussion.comments_count) || commentsResult.rows.length
    discussion.likes = parseInt(discussion.likes_count) || 0
    discussion.banner = discussion.banner || null
    discussion.image_urls = Array.isArray(discussion.image_urls) ? discussion.image_urls : []
    discussion.tags = Array.isArray(discussion.tags) ? discussion.tags : []

    console.log('✅ [Backend GET /:id] 回傳成功，留言數:', commentsResult.rows.length)
    res.json(discussion)
  } catch (error) {
    console.error('❌ [Backend GET /:id] 錯誤:', error)
    res.status(500).json({ error: '獲取討論詳情失敗', details: error?.message || String(error) })
  }
})

// PUT /api/discussions/:id - 更新討論
router.put('/:id', async (req, res) => {
  console.log('🟡 [Backend PUT /:id] 開始，ID:', req.params.id)

  try {
    const { id } = req.params
    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: '討論 ID 格式錯誤', details: 'id 必須是正整數' })
    }
    const { title, content, category, banner, image_urls, tags } = req.body

    console.log('🟡 [Backend PUT /:id] 更新資料:', {
      hasTitle: !!title,
      hasContent: !!content,
      hasCategory: !!category,
    })

    // 檢查討論是否存在
    const checkResult = await pool.query(
      'SELECT id FROM discussion.discussion WHERE id = $1 AND deleted_at IS NULL',
      [idNum],
    )
    if (checkResult.rows.length === 0) {
      console.log('❌ [Backend PUT /:id] 討論不存在')
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
    console.log('✅ [Backend PUT /:id] 更新成功')
    res.json(updatedDiscussion)
  } catch (error) {
    console.error('❌ [Backend PUT /:id] 錯誤:', error)
    res.status(500).json({ error: '更新討論失敗', details: error?.message || String(error) })
  }
})

// DELETE /api/discussions/:id - 軟刪除討論
router.delete('/:id', async (req, res) => {
  console.log('🔴 [Backend DELETE /:id] 開始，ID:', req.params.id)

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
      console.log('❌ [Backend DELETE /:id] 討論不存在')
      return res.status(404).json({ error: '討論不存在' })
    }

    // 軟刪除討論
    await pool.query(
      'UPDATE discussion.discussion SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [idNum],
    )

    console.log('✅ [Backend DELETE /:id] 刪除成功')
    res.json({ message: '討論已刪除', id: idNum })
  } catch (error) {
    console.error('❌ [Backend DELETE /:id] 錯誤:', error)
    res.status(500).json({ error: '刪除討論失敗', details: error?.message || String(error) })
  }
})

module.exports = router
