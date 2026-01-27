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

  // 驗證 ID 格式（允許 UUID 或其他格式）
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '無效的廠商 ID',
    })
  }

  try {
    console.log(`🔍 [Vendors GET] 查詢 vendor，ID: ${id}`)

    const query = `
      SELECT id, name, slogan, avatar, banner_image, is_banner_visible,
             region_tags, description, rating, review_count, is_verified
      FROM public.vendors
      WHERE id = $1
    `

    const result = await pool.query(query, [id])
    console.log(`📊 [Vendors GET] 查詢結果: ${result.rows.length} 筆記錄`)

    if (result.rows.length === 0) {
      console.log(`⚠️ [Vendors GET] vendors 表中找不到記錄，嘗試從 users 表查找...`)
      // Fallback: 嘗試從 users 表讀取
      // 注意: users 表的主鍵是 uid，且有 vendor_id 欄位
      // 如果 ID 格式是 vendor-XXX，嘗試提取數字部分或直接查找
      let searchId = id

      // 處理 vendor-XXX 格式的 ID
      if (id.startsWith('vendor-')) {
        const numericPart = id.replace('vendor-', '')
        // 嘗試查找對應的 vendor_id 或 uid
        searchId = numericPart
      }

      const userQuery = `SELECT * FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
      const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])
      console.log(`📊 [Vendors GET] users 表查詢結果: ${userResult.rows.length} 筆記錄`)

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        console.log(`✅ [Vendors GET] 從 users 表找到用戶，uid: ${user.uid}, vendor_id: ${user.vendor_id}`)

        // 如果 users 表有 vendor_id，嘗試再次查詢 vendors 表
        if (user.vendor_id) {
          const vendorRecheckQuery = `SELECT * FROM public.vendors WHERE id = $1`
          const vendorRecheckResult = await pool.query(vendorRecheckQuery, [user.vendor_id])

          if (vendorRecheckResult.rows.length > 0) {
            console.log(`✅ [Vendors GET] 從 vendors 表找到記錄（通過 vendor_id）`)
            const vendorData = vendorRecheckResult.rows[0]
            vendorData.rating = parseFloat(vendorData.rating) || 0
            vendorData.review_count = parseInt(vendorData.review_count) || 0
            return res.json({ success: true, data: vendorData })
          }
        }

        // 構建廠商格式資料（Fallback）
        const vendorData = {
          id: user.vendor_id || user.uid || id,
          name: user.nickname || user.real_name || '未命名廠商',
          slogan: user.bio || '',
          description: user.bio || '',
          avatar: user.avatar || '',
          banner_image: user.bg_image || '', // 嘗試對應 users 的 bg_image
          is_banner_visible: true,
          region_tags: [],
          rating: 0,
          review_count: 0,
          is_verified: user.role === 'vendor',
        }

        console.log(`⚠️ [Vendors GET] 使用 users 表資料作為 Fallback`)
        return res.json({ success: true, data: vendorData })
      }

      console.log(`❌ [Vendors GET] 完全找不到記錄，ID: ${id}`)
      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
        id: id,
      })
    }

    // 格式化資料 (處理型別問題)
    const vendorData = result.rows[0]
    vendorData.rating = parseFloat(vendorData.rating) || 0
    vendorData.review_count = parseInt(vendorData.review_count) || 0

    // 轉換欄位名稱：snake_case → camelCase（與 PUT 路由保持一致）
    const formattedData = {
      ...vendorData,
      bannerImage: vendorData.banner_image,
      isBannerVisible: vendorData.is_banner_visible,
      regionTags: Array.isArray(vendorData.region_tags) ? vendorData.region_tags : (vendorData.region_tags || []),
      reviewCount: vendorData.review_count,
      isVerified: vendorData.is_verified,
    }
    delete formattedData.banner_image
    delete formattedData.is_banner_visible
    delete formattedData.region_tags
    delete formattedData.review_count
    delete formattedData.is_verified

    console.log(`✅ [Vendors GET] 成功返回 vendor 資料:`, {
      id: formattedData.id,
      name: formattedData.name,
      regionTags: formattedData.regionTags,
      regionTagsType: Array.isArray(formattedData.regionTags) ? 'array' : typeof formattedData.regionTags
    })
    res.json({ success: true, data: formattedData })
  } catch (err) {
    console.error('❌ [Vendors] 查詢廠商失敗:', err.message)
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

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '無效的廠商 ID',
        data: [],
      })
    }

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    // 1. 先解析真實的 uid (因為 discussion 表存的是 author_uid = users.uid)
    let targetUid = id
    let searchId = id

    // 處理 vendor-XXX 格式的 ID
    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    try {
      // 先嘗試從 vendors 表查找 user_id
      const vendorQuery = `SELECT user_id FROM public.vendors WHERE id = $1 LIMIT 1`
      const vendorResult = await pool.query(vendorQuery, [id])

      if (vendorResult.rows.length > 0 && vendorResult.rows[0].user_id) {
        targetUid = vendorResult.rows[0].user_id
        console.log(`✅ [Vendors Posts] 從 vendors 表找到 user_id: ${targetUid}`)
      } else {
        // 如果 vendors 表沒有，從 users 表查找
        const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])
        if (userResult.rows.length > 0) {
          targetUid = userResult.rows[0].uid
          console.log(`✅ [Vendors Posts] 從 users 表找到 uid: ${targetUid}`)
        } else {
          // 如果找不到對應的用戶，返回空列表而不是錯誤
          console.log(`⚠️ [Vendors Posts] 找不到對應的用戶，返回空列表`)
          return res.json({
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          })
        }
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
    console.error('❌ [Vendors] 取得廠商貼文錯誤:', error.message)
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

    console.log(`🔍 [Vendors Itineraries] 查詢行程，ID: ${id}`)

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '無效的廠商 ID',
        data: [],
      })
    }

    const { region } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12
    const offset = (page - 1) * limit

    // 1. 先解析真實的 uid (因為 itineraries 表存的是 author_uid = users.uid)
    // 傳進來的 id 可能是 uid 也可能是 vendor_id
    let targetUid = id
    let searchId = id

    // 處理 vendor-XXX 格式的 ID
    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    try {
      // 先嘗試從 vendors 表查找 user_id
      const vendorQuery = `SELECT user_id FROM public.vendors WHERE id = $1 LIMIT 1`
      const vendorResult = await pool.query(vendorQuery, [id])
      console.log(`📊 [Vendors Itineraries] vendors 表查詢結果:`, vendorResult.rows)

      if (vendorResult.rows.length > 0 && vendorResult.rows[0].user_id) {
        targetUid = vendorResult.rows[0].user_id
        console.log(`✅ [Vendors Itineraries] 從 vendors 表找到 user_id: ${targetUid}`)
      } else {
        // 如果 vendors 表沒有，從 users 表查找
        const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])
        console.log(`📊 [Vendors Itineraries] users 表查詢結果:`, userResult.rows)
        
        if (userResult.rows.length > 0) {
          targetUid = userResult.rows[0].uid
          console.log(`✅ [Vendors Itineraries] 從 users 表找到 uid: ${targetUid}`)
        } else {
          // 如果找不到對應的用戶，嘗試直接使用 id 作為 targetUid（可能是直接的 uid）
          console.log(`⚠️ [Vendors Itineraries] 找不到對應的用戶，嘗試直接使用 id: ${id}`)
          targetUid = id
        }
      }
    } catch (e) {
      console.warn('⚠️ [Vendors] ID 轉換失敗，使用原始 ID:', e.message)
      targetUid = id
    }

    console.log(`🎯 [Vendors Itineraries] 最終使用的 targetUid: ${targetUid}`)

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

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    console.log(`📝 [Vendors Itineraries] 執行查詢:`, { query, params })
    const result = await pool.query(query, params)
    console.log(`📊 [Vendors Itineraries] 查詢結果: ${result.rows.length} 筆行程`)

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
    console.log(`✅ [Vendors Itineraries] 返回 ${formattedItineraries.length} 筆行程`)
    res.json({
      success: true,
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
    console.error('❌ [Vendors] 取得廠商行程錯誤:', error.message)
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
    console.log(`🔄 [Vendors PUT] 開始處理更新請求，ID: ${id}`)

    const {
      name,
      slogan,
      avatar,
      bannerImage,
      isBannerVisible,
      regionTags,
      description,
    } = req.body

    // 處理 ID：如果是 vendor-XXX 格式，嘗試提取真實 ID
    let targetId = id
    let searchId = id

    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    // 先嘗試從 vendors 表查找
    let vendorExists = false
    let actualVendorId = null
    let userData = null

    try {
      const checkQuery = `SELECT id FROM public.vendors WHERE id = $1 LIMIT 1`
      const checkResult = await pool.query(checkQuery, [targetId])

      if (checkResult.rows.length > 0) {
        vendorExists = true
        actualVendorId = checkResult.rows[0].id
      } else {
        // 如果 vendors 表中不存在，嘗試從 users 表查找對應的 vendor_id
        const userQuery = `SELECT uid, vendor_id, nickname, avatar, bio FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])

        if (userResult.rows.length > 0) {
          userData = userResult.rows[0]

          if (userData.vendor_id) {
            actualVendorId = userData.vendor_id
            // 再次檢查 vendors 表
            const recheckQuery = `SELECT id FROM public.vendors WHERE id = $1 LIMIT 1`
            const recheckResult = await pool.query(recheckQuery, [actualVendorId])
            if (recheckResult.rows.length > 0) {
              vendorExists = true
            }
          }
        }
      }
    } catch (checkError) {
      console.error('⚠️ [Vendors] ID 查找錯誤:', checkError.message)
    }

    // 如果 vendors 表中不存在，但用戶存在，則自動創建 vendor 記錄
    if (!vendorExists) {
      if (userData) {
        console.log(`📝 [Vendors] 用戶存在但 vendor 記錄不存在，開始自動創建...`)
        try {
          // 使用用戶的 uid 作為 vendor id（如果 vendors 表支持）
          // 或者使用 vendorHelper 生成新的 vendor id
          const { createVendor } = require('../utils/vendorHelper')

          // 嘗試使用 uid 作為 vendor id，如果失敗則使用 vendorHelper
          let newVendorId = userData.uid

          try {
            // 先嘗試直接使用 uid 作為 vendor id
            // 注意：根據資料庫結構，需要包含所有必要欄位
            const insertQuery = `
              INSERT INTO public.vendors (
                id, name, slogan, avatar, banner_image, is_banner_visible,
                region_tags, description, rating, review_count, is_verified,
                user_id, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
              RETURNING id
            `
            const insertResult = await pool.query(insertQuery, [
              newVendorId,
              userData.nickname || '未命名廠商',  // name
              null,  // slogan
              userData.avatar || null,  // avatar
              null,  // banner_image
              true,  // is_banner_visible (default)
              [],  // region_tags (empty array)
              userData.bio || '',  // description
              0,  // rating (default)
              0,  // review_count (default)
              false,  // is_verified (default)
              userData.uid  // user_id - 關聯到 users 表
            ])

            // 更新 users 表的 vendor_id
            await pool.query(
              `UPDATE users SET vendor_id = $1, updated_at = NOW() WHERE uid = $2`,
              [newVendorId, userData.uid]
            )

            vendorExists = true
            actualVendorId = newVendorId
            console.log(`✅ [Vendors] 自動創建 vendor 記錄成功: ${newVendorId}`)
          } catch (insertError) {
            // 如果直接插入失敗（可能是 ID 格式問題或唯一性約束），使用 vendorHelper
            console.log(`⚠️ [Vendors] 使用 uid 作為 vendor id 失敗 (code: ${insertError.code})，改用 vendorHelper`)
            newVendorId = await createVendor({
              name: userData.nickname || '未命名廠商',
              avatar: userData.avatar || null,
              email: null
            })

            // 更新 users 表的 vendor_id
            await pool.query(
              `UPDATE users SET vendor_id = $1, updated_at = NOW() WHERE uid = $2`,
              [newVendorId, userData.uid]
            )

            vendorExists = true
            actualVendorId = newVendorId
            console.log(`✅ [Vendors] 使用 vendorHelper 創建 vendor 記錄成功: ${newVendorId}`)
          }
        } catch (createError) {
          console.error('❌ [Vendors] 自動創建 vendor 記錄失敗:', {
            message: createError.message,
            stack: createError.stack,
            code: createError.code
          })
          return res.status(500).json({
            success: false,
            message: '自動創建廠商記錄失敗，請稍後再試',
            error: process.env.NODE_ENV === 'development' ? createError.message : undefined
          })
        }
      } else {
        console.log(`❌ [Vendors] 找不到用戶記錄，ID: ${id}`)
        return res.status(404).json({
          success: false,
          message: '找不到此廠商，請確認廠商 ID 是否正確',
        })
      }
    }

    // 使用實際的 vendor ID
    targetId = actualVendorId || targetId

    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    const addField = (col, val, transform = null) => {
      if (val !== undefined) {
        let processedVal = val
        if (transform) {
          processedVal = transform(val)
        }
        updateFields.push(`${col} = $${paramIndex++}`)
        updateValues.push(processedVal)
      }
    }

    // 處理 regionTags：資料庫是 ARRAY 類型，直接傳遞陣列
    const processRegionTags = (tags) => {
      if (Array.isArray(tags)) {
        // PostgreSQL ARRAY 類型，直接返回陣列
        return tags
      }
      if (typeof tags === 'string') {
        try {
          // 如果是 JSON 字串，解析為陣列
          const parsed = JSON.parse(tags)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          // 如果不是 JSON，轉換為陣列
          return [tags]
        }
      }
      // 其他情況返回空陣列
      return tags || []
    }

    // 處理 bannerImage：確保是有效的 JSON 字串
    const processBannerImage = (banner) => {
      if (typeof banner === 'string') {
        // 如果已經是 JSON 字串，驗證是否有效
        try {
          JSON.parse(banner)
          return banner
        } catch {
          // 如果不是有效 JSON，返回空陣列的 JSON
          return JSON.stringify([])
        }
      }
      if (Array.isArray(banner)) {
        return JSON.stringify(banner)
      }
      return banner
    }

    addField('name', name)
    addField('slogan', slogan)
    addField('avatar', avatar)
    addField('banner_image', bannerImage, processBannerImage)
    addField('is_banner_visible', isBannerVisible)
    // region_tags 是 PostgreSQL ARRAY 類型，需要特殊處理
    if (regionTags !== undefined) {
      const processedTags = processRegionTags(regionTags)
      updateFields.push(`region_tags = $${paramIndex}::text[]`)
      updateValues.push(processedTags)
      paramIndex++
    }
    addField('description', description)

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供任何要更新的欄位',
      })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(targetId)

    const updateQuery = `
      UPDATE public.vendors
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    console.log(`🔄 [Vendors] 執行更新查詢，targetId: ${targetId}, fields: ${updateFields.length}`)
    const result = await pool.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      console.log(`❌ [Vendors] 更新後找不到廠商記錄，targetId: ${targetId}`)
      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
      })
    }

    // 🔧 轉換欄位名稱：snake_case → camelCase
    const updatedData = result.rows[0]
    const formattedData = {
      ...updatedData,
      bannerImage: updatedData.banner_image,
      isBannerVisible: updatedData.is_banner_visible,
      regionTags: Array.isArray(updatedData.region_tags) ? updatedData.region_tags : (updatedData.region_tags || []),
      reviewCount: updatedData.review_count,
      isVerified: updatedData.is_verified,
    }
    delete formattedData.banner_image
    delete formattedData.is_banner_visible
    delete formattedData.region_tags
    delete formattedData.review_count
    delete formattedData.is_verified

    console.log(`✅ [Vendors PUT] 成功返回 vendor 資料:`, {
      id: formattedData.id,
      name: formattedData.name,
      regionTags: formattedData.regionTags,
      regionTagsType: Array.isArray(formattedData.regionTags) ? 'array' : typeof formattedData.regionTags
    })
    res.json({
      success: true,
      message: '廠商資料更新成功',
      data: formattedData,
    })
  } catch (error) {
    console.error('❌ [Vendors] 更新廠商資料錯誤:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    })

    const response = {
      success: false,
      message: '更新廠商資料失敗，請稍後再試',
    }

    // 僅在開發環境才回傳詳細錯誤訊息
    if (process.env.NODE_ENV === 'development') {
      response.error = error.message
      response.stack = error.stack
      response.code = error.code
      response.detail = error.detail
    }

    // 確保返回正確的狀態碼
    const statusCode = error.code === '23505' ? 409 :
                      error.code === '23503' ? 400 : 500
    res.status(statusCode).json(response)
  }
})

module.exports = router
