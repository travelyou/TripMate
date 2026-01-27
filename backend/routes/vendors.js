const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 輔助函式：檢查字串是否為 UUID
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// 1. 取得廠商基本資料
router.get('/:id', async (req, res) => {
  const { id } = req.params

  console.log('🔍 [Vendors] 取得廠商資料，ID:', id)

  try {
    const query = `
      SELECT id, name, slogan, avatar, banner_image, is_banner_visible,
             region_tags, description, rating, review_count, is_verified
      FROM public.vendors
      WHERE id = $1
    `
    console.log('🔍 [Vendors] 執行查詢:', query, '參數:', [id])

    // Debug: 檢查表結構
    try {
      const structureQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'vendors'
      `
      const structure = await pool.query(structureQuery)
      console.log('🔍 [Vendors] public.vendors 表結構:', structure.rows)
    } catch (e) {
      console.log('⚠️ [Vendors] 無法查詢表結構:', e.message)
    }

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      console.log('⚠️ [Vendors] public.vendors 找不到，嘗試從 users 查找 fallback...')

      // Fallback: 嘗試從 users 表讀取
      // 注意: users 表的主鍵是 uid，且有 vendor_id 欄位
      const userQuery = `SELECT * FROM users WHERE uid = $1 OR vendor_id = $1 LIMIT 1`
      const userResult = await pool.query(userQuery, [id])

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        console.log('✅ [Vendors] 從 users 表找到使用者，轉換為廠商格式:', user.nickname)

        // 構建廠商格式資料
        const vendorData = {
          id: user.id || id,
          name: user.nickname || user.name || '未命名廠商',
          slogan: user.bio || '',
          description: user.bio || '',
          avatar: user.avatar || '',
          banner_image: user.bg_image || '', // 嘗試對應 users 的 bg_image
          is_banner_visible: true,
          region_tags: [],
          rating: 0,
          review_count: 0,
          is_verified: user.role === 'vendor'
        }

        // 可選：考慮在此時將資料寫入 public.vendors 以便未來維護？
        // 暫時僅回傳以修復顯示問題
        return res.json({ success: true, data: vendorData })
      }

      console.log('⚠️ [Vendors] users 表也找不到，ID:', id)
      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
      })
    }

    // 格式化資料 (處理型別問題)
    const vendorData = result.rows[0]
    vendorData.rating = parseFloat(vendorData.rating) || 0
    vendorData.review_count = parseInt(vendorData.review_count) || 0

    console.log('✅ [Vendors] 成功取得廠商資料:', vendorData)
    res.json({ success: true, data: vendorData })
  } catch (err) {
    console.error('❌ [Vendors] 查詢廠商失敗:', err)
    console.error('❌ [Vendors] 錯誤詳情:', err.message)
    res.status(500).json({ success: false, message: 'Server Error', error: err.message })
  }
})

/**
 * GET /api/vendors/:id/posts
 * 取得廠商貼文列表
 * 對應 Table: discussion.discussion (使用 author_uid 關聯)
 */
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    console.log(`📋 [Vendors] 取得廠商貼文 - ID: ${id}, 頁數: ${page}, 每頁: ${limit}`)

    // 1. 先解析真實的 uid (因為 discussion 表存的是 author_uid = users.uid)
    let targetUid = id
    try {
      const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 LIMIT 1`
      const userResult = await pool.query(userQuery, [id])
      if (userResult.rows.length > 0) {
        targetUid = userResult.rows[0].uid
        console.log(`✅ [Vendors] Get Posts - ID 轉換: ${id} -> ${targetUid}`)
      }
    } catch (e) {
      console.warn('⚠️ [Vendors] Get Posts - ID 轉換失敗，使用原始 ID:', e.message)
    }

    // 2. 查詢總數
    const countQuery = `
      SELECT COUNT(*) as total
      FROM discussion.discussion
      WHERE author_uid = $1
    `
    const countResult = await pool.query(countQuery, [targetUid])
    const total = parseInt(countResult.rows[0].total)

    // 3. 查詢資料（含分頁）
    const query = `
      SELECT
        d.id,
        d.author_uid,
        d.title,
        d.content,
        d.image_urls,
        d.tags,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT l.id) as likes,
        COUNT(DISTINCT cm.id) as comments
      FROM discussion.discussion d
      LEFT JOIN public.likes l
        ON d.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN public.comments cm
        ON d.id = cm.post_id AND cm.post_type = 'discussion'
      WHERE d.author_uid = $1
      GROUP BY d.id, d.author_uid, d.title, d.content, d.image_urls,
               d.tags, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [targetUid, limit, offset])

    console.log(`✅ [Vendors] 找到 ${result.rows.length} 筆貼文（共 ${total} 筆）`)

    const formattedPosts = result.rows.map((post) => {
      // 處理 image_urls: 如果是陣列取第一張，如果是字串直接用
      let image = ''
      if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
        image = post.image_urls[0]
      } else if (typeof post.image_urls === 'string') {
        image = post.image_urls
      }

      return {
        id: post.id,
        vendorId: post.author_uid,
        title: post.title,
        content: post.content,
        image: image || 'https://placehold.co/600x400?text=No+Image', // Fallback
        likes: parseInt(post.likes) || 0,
        comments: parseInt(post.comments) || 0,
        time: post.created_at, // 直接回傳 ISO 時間，前端再格式化
        tags: post.tags || [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }
    })

    // 3. 回傳分頁資訊
    res.json({
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error) {
    console.error('❌ [Vendors] 取得廠商貼文錯誤:', error)
    res.status(500).json({
      success: false,
      message: '取得廠商貼文失敗',
      error: error.message,
    })
  }
})

/**
 * GET /api/vendors/:id/itineraries
 * 取得廠商行程列表
 * 對應 Table: itinerary.itineraries (使用 author_uid 關聯)
 */
router.get('/:id/itineraries', async (req, res) => {
  try {
    const { id } = req.params
    const { region } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12
    const offset = (page - 1) * limit

    console.log(
      `📋 [Vendors] 取得廠商行程 - ID: ${id}, 頁數: ${page}, 地區: ${region || '全部'}`,
    )

    // 1. 先解析真實的 uid (因為 itineraries 表存的是 author_uid = users.uid)
    // 傳進來的 id 可能是 uid 也可能是 vendor_id
    let targetUid = id
    try {
      const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 LIMIT 1`
      const userResult = await pool.query(userQuery, [id])
      if (userResult.rows.length > 0) {
        targetUid = userResult.rows[0].uid
        console.log(`✅ [Vendors] ID 轉換: ${id} -> ${targetUid}`)
      }
    } catch (e) {
      console.warn('⚠️ [Vendors] ID 轉換失敗，使用原始 ID:', e.message)
    }

    // 2. 查詢總數
    let countQuery = `
      SELECT COUNT(*) as total
      FROM itinerary.itineraries
      WHERE author_uid = $1
    `
    const countParams = [targetUid]

    if (region && region !== '全部') {
      countQuery += ` AND location = $2`
      countParams.push(region)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    // 3. 查詢資料（含分頁）
    let query = `
      SELECT
        id,
        author_uid,
        title,
        banner_image,
        price,
        start_date,
        end_date,
        location,
        tags,
        views_count,
        likes_count,
        comments_count,
        created_at,
        updated_at
      FROM itinerary.itineraries
      WHERE author_uid = $1
    `

    const params = [targetUid]
    let paramIndex = 2

    if (region && region !== '全部') {
      query += ` AND location = $${paramIndex}`
      params.push(region)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    console.log(`✅ [Vendors] 找到 ${result.rows.length} 筆行程（共 ${total} 筆）`)

    const formattedItineraries = result.rows.map((itinerary) => {
      // 計算天數
      const start = new Date(itinerary.start_date)
      const end = new Date(itinerary.end_date)
      const diffTime = Math.abs(end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      return {
        id: itinerary.id,
        vendorId: itinerary.author_uid,
        title: itinerary.title,
        image: itinerary.banner_image || 'https://placehold.co/600x400?text=No+Image',
        days: diffDays,
        nights: Math.max(0, diffDays - 1),
        price: parseFloat(itinerary.price) || 0,
        location: itinerary.location,
        likes: parseInt(itinerary.likes_count) || 0,
        views: parseInt(itinerary.views_count) || 0,
        comments: parseInt(itinerary.comments_count) || 0,
        tags: itinerary.tags || [],
        createdAt: itinerary.created_at,
        updatedAt: itinerary.updated_at,
      }
    })

    // 3. 回傳分頁資訊
    res.json({
      data: formattedItineraries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error) {
    console.error('❌ [Vendors] 取得廠商行程錯誤:', error)
    res.status(500).json({
      success: false,
      message: '取得廠商行程失敗',
      error: error.message,
    })
  }
})

/**
 * PUT /api/vendors/:id
 * 更新廠商資料 (後台使用)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      slogan,
      avatar,
      bannerImage,
      isBannerVisible,
      regionTags,
      description,
    } = req.body

    console.log('📝 [Vendors] 更新廠商資料，ID:', id)
    console.log('📝 [Vendors] 接收到的資料:', req.body)

    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    const addField = (col, val) => {
      if (val !== undefined) {
        updateFields.push(`${col} = $${paramIndex++}`)
        updateValues.push(val)
      }
    }

    addField('name', name)
    addField('slogan', slogan)
    addField('avatar', avatar)
    addField('banner_image', bannerImage)
    addField('is_banner_visible', isBannerVisible)
    addField('region_tags', regionTags)
    addField('description', description)

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供任何要更新的欄位',
      })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE public.vendors
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    console.log('🔍 [Vendors] SQL Query:', updateQuery)
    console.log('🔍 [Vendors] SQL Values:', updateValues)

    const result = await pool.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
      })
    }

    console.log('✅ [Vendors] 廠商資料更新成功')

    res.json({
      success: true,
      message: '廠商資料更新成功',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('❌ [Vendors] 更新廠商資料錯誤:', error)
    console.error('❌ [Vendors] 錯誤詳情:', error.message)
    console.error('❌ [Vendors] 錯誤堆疊:', error.stack)
    res.status(500).json({
      success: false,
      message: '更新廠商資料失敗',
      error: error.message,
    })
  }
})

module.exports = router
