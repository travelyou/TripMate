const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 1. 取得所有行程 (列表頁用)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        title,
        price,
        agency_name as "agencyName",
        start_date,        -- ★ 新增：回傳開始日期
        end_date,          -- ★ 新增：回傳結束日期
        COALESCE(end_date - start_date + 1, 1) as "durationDays",
        banner_image as "coverImage",
        location as destinations,
        content as description,
        views_count as "totalViews",
        saves_count as "totalSaves",
        likes_count as likes,
        created_at
      FROM itineraries
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)

    const data = result.rows.map((row) => ({
      ...row,
      destinations: row.destinations ? [row.destinations] : [],
    }))

    res.json({ success: true, data })
  } catch (err) {
    console.error('查詢行程列表失敗:', err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 2. 取得單一行程詳細資料
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const itineraryQuery = `
      SELECT
        id, title, price, agency_name as "agencyName",
        start_date,        -- ★ 新增
        end_date,          -- ★ 新增
        COALESCE(end_date - start_date + 1, 1) as "durationDays",
        banner_image as "coverImage",
        location,
        content as description,
        tags,
        views_count as "totalViews",
        saves_count as "totalSaves",
        likes_count as likes,
        author_name, author_avatar
      FROM itineraries WHERE id = $1
    `
    const itineraryResult = await pool.query(itineraryQuery, [id])

    if (itineraryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' })
    }
    const itinerary = itineraryResult.rows[0]

    const daysResult = await pool.query(
      'SELECT day_number as day, activities FROM itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC',
      [id],
    )

    const packingResult = await pool.query(
      'SELECT category, items FROM itinerary_packing_lists WHERE itinerary_id = $1',
      [id],
    )

    const fullData = {
      ...itinerary,
      itinerary: {
        days: daysResult.rows.map((row) => ({
          day: row.day,
          activities: row.activities,
        })),
      },
      packingList: packingResult.rows.map((row) => ({
        category: row.category,
        items: row.items,
      })),
    }

    res.json({ success: true, data: fullData })
  } catch (err) {
    console.error('查詢單一行程失敗:', err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 3. 建立新行程 (維持原本的，不需要變動，這裡列出是為了完整性)
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    const {
      title,
      description,
      location,
      coverImage,
      price,
      agencyName,
      start_date,
      end_date, // 接收日期
      itinerary,
      packingList,
      tags,
    } = req.body

    // 驗證必填
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: '請提供開始與結束日期' })
    }

    await client.query('BEGIN')

    const insertItineraryQuery = `
      INSERT INTO itineraries
      (title, content, location, banner_image, price, agency_name, start_date, end_date, tags, author_uid, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
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
      'vendor_default_001',
      'published',
    ]
    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    // 每日行程
    if (itinerary && itinerary.days) {
      const dayInsertQuery = `INSERT INTO itinerary_days (itinerary_id, day_number, activities, created_at) VALUES ($1, $2, $3, NOW())`
      for (const day of itinerary.days) {
        await client.query(dayInsertQuery, [
          newItineraryId,
          day.day,
          JSON.stringify(day.activities),
        ])
      }
    }

    // 打包清單
    if (packingList) {
      const packingInsertQuery = `INSERT INTO itinerary_packing_lists (itinerary_id, category, items, created_at) VALUES ($1, $2, $3, NOW())`
      for (const list of packingList) {
        await client.query(packingInsertQuery, [
          newItineraryId,
          list.category,
          JSON.stringify(list.items),
        ])
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, message: '建立成功', id: newItineraryId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('建立行程失敗:', err)
    res.status(500).json({ success: false, message: 'Create failed', error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
