const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

router.get('/:id', async (req, res) => {
  const { id } = req.params

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '無效的廠商 ID',
    })
  }

  try {
    const query = `
      SELECT id, name, slogan, avatar, banner_image, is_banner_visible,
             region_tags, description, rating, review_count, is_verified
      FROM public.vendors
      WHERE id = $1
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      let searchId = id

      if (id.startsWith('vendor-')) {
        const numericPart = id.replace('vendor-', '')
        searchId = numericPart
      }

      const userQuery = `SELECT * FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
      const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]

        if (user.vendor_id) {
          const vendorRecheckQuery = `SELECT * FROM public.vendors WHERE id = $1`
          const vendorRecheckResult = await pool.query(vendorRecheckQuery, [user.vendor_id])

          if (vendorRecheckResult.rows.length > 0) {
            const vendorData = vendorRecheckResult.rows[0]
            vendorData.rating = parseFloat(vendorData.rating) || 0
            vendorData.review_count = parseInt(vendorData.review_count) || 0
            return res.json({ success: true, data: vendorData })
          }
        }

        const vendorData = {
          id: user.vendor_id || user.uid || id,
          name: user.nickname || user.real_name || '未命名廠商',
          slogan: user.bio || '',
          description: user.bio || '',
          avatar: user.avatar || '',
          banner_image: user.bg_image || '',
          is_banner_visible: true,
          region_tags: [],
          rating: 0,
          review_count: 0,
          is_verified: user.role === 'vendor',
        }

        return res.json({ success: true, data: vendorData })
      }

      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
        id: id,
      })
    }

    const vendorData = result.rows[0]
    vendorData.rating = parseFloat(vendorData.rating) || 0
    vendorData.review_count = parseInt(vendorData.review_count) || 0

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

    res.json({ success: true, data: formattedData })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message })
  }
})

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

    let targetUid = id
    let searchId = id

    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    try {
      const vendorQuery = `SELECT user_id FROM public.vendors WHERE id = $1 LIMIT 1`
      const vendorResult = await pool.query(vendorQuery, [id])

      if (vendorResult.rows.length > 0 && vendorResult.rows[0].user_id) {
        targetUid = vendorResult.rows[0].user_id
      } else {
        const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])
        if (userResult.rows.length > 0) {
          targetUid = userResult.rows[0].uid
        } else {
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
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM discussion.discussion
      WHERE author_uid = $1 AND deleted_at IS NULL
    `
    const countResult = await pool.query(countQuery, [targetUid])
    const total = parseInt(countResult.rows[0].total)

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
        d.deleted_at,
        COUNT(DISTINCT l.id) as likes,
        COUNT(DISTINCT cm.id) as comments
      FROM discussion.discussion d
      LEFT JOIN public.likes l
        ON d.id = l.post_id AND l.board = 'discussion'
      LEFT JOIN public.comments cm
        ON d.id = cm.post_id AND cm.post_type = 'discussion' AND cm.deleted_at IS NULL
      WHERE d.author_uid = $1 AND d.deleted_at IS NULL
      GROUP BY d.id, d.author_uid, d.title, d.content, d.image_urls,
               d.tags, d.created_at, d.updated_at, d.deleted_at
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [targetUid, limit, offset])

    const formattedPosts = result.rows.map((post) => {
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
        image: image || 'https://placehold.co/600x400?text=No+Image',
        likes: parseInt(post.likes) || 0,
        comments: parseInt(post.comments) || 0,
        time: post.created_at,
        tags: post.tags || [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }
    })

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
    res.status(500).json({
      success: false,
      message: '取得廠商貼文失敗',
      error: error.message,
    })
  }
})

router.get('/:id/itineraries', async (req, res) => {
  try {
    const { id } = req.params

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

    let targetUid = id
    let searchId = id

    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    try {
      const vendorQuery = `SELECT user_id FROM public.vendors WHERE id = $1 LIMIT 1`
      const vendorResult = await pool.query(vendorQuery, [id])

      if (vendorResult.rows.length > 0 && vendorResult.rows[0].user_id) {
        targetUid = vendorResult.rows[0].user_id
      } else {
        const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])

        if (userResult.rows.length > 0) {
          targetUid = userResult.rows[0].uid
        } else {
          targetUid = id
        }
      }
    } catch (e) {
      targetUid = id
    }

    if (!targetUid || targetUid === '') {
      return res.status(400).json({
        success: false,
        message: '無法確定廠商使用者 ID',
        data: [],
      })
    }

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

    const result = await pool.query(query, params)

    const formattedItineraries = result.rows.map((itinerary) => {
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
    res.status(500).json({
      success: false,
      message: '取得廠商行程失敗',
      error: error.message,
    })
  }
})

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

    let targetId = id
    let searchId = id

    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

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
        const userQuery = `SELECT uid, vendor_id, nickname, avatar, bio FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])

        if (userResult.rows.length > 0) {
          userData = userResult.rows[0]

          if (userData.vendor_id) {
            actualVendorId = userData.vendor_id
            const recheckQuery = `SELECT id FROM public.vendors WHERE id = $1 LIMIT 1`
            const recheckResult = await pool.query(recheckQuery, [actualVendorId])
            if (recheckResult.rows.length > 0) {
              vendorExists = true
            }
          }
        }
      }
    } catch (checkError) {
    }

    if (!vendorExists) {
      if (userData) {
        try {
          const { createVendor } = require('../utils/vendorHelper')

          let newVendorId = userData.uid

          try {
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
              userData.nickname || '未命名廠商',
              null,
              userData.avatar || null,
              null,
              true,
              [],
              userData.bio || '',
              0,
              0,
              false,
              userData.uid
            ])

            await pool.query(
              `UPDATE users SET vendor_id = $1, updated_at = NOW() WHERE uid = $2`,
              [newVendorId, userData.uid]
            )

            vendorExists = true
            actualVendorId = newVendorId
          } catch (insertError) {
            newVendorId = await createVendor({
              name: userData.nickname || '未命名廠商',
              avatar: userData.avatar || null,
              email: null
            })

            await pool.query(
              `UPDATE users SET vendor_id = $1, updated_at = NOW() WHERE uid = $2`,
              [newVendorId, userData.uid]
            )

            vendorExists = true
            actualVendorId = newVendorId
          }
        } catch (createError) {
          return res.status(500).json({
            success: false,
            message: '自動創建廠商記錄失敗，請稍後再試',
            error: process.env.NODE_ENV === 'development' ? createError.message : undefined
          })
        }
      } else {
        return res.status(404).json({
          success: false,
          message: '找不到此廠商，請確認廠商 ID 是否正確',
        })
      }
    }

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

    const processRegionTags = (tags) => {
      if (Array.isArray(tags)) {
        return tags
      }
      if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return [tags]
        }
      }
      return tags || []
    }

    const processBannerImage = (banner) => {
      if (typeof banner === 'string') {
        try {
          JSON.parse(banner)
          return banner
        } catch {
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

    const result = await pool.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此廠商',
      })
    }

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

    res.json({
      success: true,
      message: '廠商資料更新成功',
      data: formattedData,
    })
  } catch (error) {
    const response = {
      success: false,
      message: '更新廠商資料失敗，請稍後再試',
    }

    if (process.env.NODE_ENV === 'development') {
      response.error = error.message
      response.stack = error.stack
      response.code = error.code
      response.detail = error.detail
    }

    const statusCode = error.code === '23505' ? 409 :
                      error.code === '23503' ? 400 : 500
    res.status(statusCode).json(response)
  }
})

router.post('/:id/itineraries', async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const {
      title,
      description,
      location,
      coverImage,
      price,
      agencyName,
      start_date,
      end_date,
      itinerary,
      packingList,
      tags,
      category,
      max_people,
    } = req.body

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: '請提供開始與結束日期' })
    }

    let targetUid = id
    let searchId = id

    if (id.startsWith('vendor-')) {
      searchId = id.replace('vendor-', '')
    }

    try {
      const vendorQuery = `SELECT user_id FROM public.vendors WHERE id = $1 LIMIT 1`
      const vendorResult = await pool.query(vendorQuery, [id])

      if (vendorResult.rows.length > 0 && vendorResult.rows[0].user_id) {
        targetUid = vendorResult.rows[0].user_id
      } else {
        const userQuery = `SELECT uid FROM users WHERE uid = $1 OR vendor_id = $1 OR uid::text LIKE $2 LIMIT 1`
        const userResult = await pool.query(userQuery, [searchId, `%${searchId}%`])

        if (userResult.rows.length > 0) {
          targetUid = userResult.rows[0].uid
        } else {
          targetUid = id
        }
      }
    } catch (e) {
      targetUid = id
    }

    if (!targetUid || targetUid === '') {
      return res.status(400).json({
        success: false,
        message: '無法確定廠商使用者 ID',
      })
    }

    await client.query('BEGIN')

    const insertItineraryQuery = `
      INSERT INTO itinerary.itineraries
      (title, content, location, banner_image, price, agency_name, start_date, end_date, tags, category, max_people, author_uid, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING id
    `

    const itineraryValues = [
      title,
      description,
      location,
      coverImage,
      price || 0,
      agencyName,
      start_date,
      end_date,
      tags || [],
      category || null,
      max_people || 20,
      targetUid,
      'published',
    ]

    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    if (itinerary && itinerary.days) {
      const dayInsertQuery = `INSERT INTO itinerary.itinerary_days (itinerary_id, day_number, activities, created_at) VALUES ($1, $2, $3, NOW())`
      for (const day of itinerary.days) {
        const activitiesJson =
          typeof day.activities === 'string' ? day.activities : JSON.stringify(day.activities || [])

        await client.query(dayInsertQuery, [newItineraryId, day.day, activitiesJson])
      }
    }

    if (packingList) {
      const packingInsertQuery = `INSERT INTO itinerary.itinerary_packing_lists (itinerary_id, category, items, created_at) VALUES ($1, $2, $3, NOW())`
      for (const list of packingList) {
        const itemsJson = typeof list.items === 'string' ? list.items : JSON.stringify(list.items || [])

        await client.query(packingInsertQuery, [newItineraryId, list.category, itemsJson])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, message: '建立成功', id: newItineraryId })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({
      success: false,
      message: '建立行程失敗',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  } finally {
    client.release()
  }
})

module.exports = router
