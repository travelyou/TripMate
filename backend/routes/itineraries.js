const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

const { authenticate } = require('../middleware/auth')

// 1. 取得所有行程 (列表頁用)
router.get('/', async (req, res) => {
  try {
    const { ids } = req.query || {}

    if (ids) {
      const idList = String(ids)
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isInteger(n))

      if (idList.length === 0) {
        return res.status(400).json({ ok: false, message: 'ids is invalid' })
      }

      const r = await pool.query(
        `SELECT id, title, content, banner_image, start_date, end_date, price, status
        FROM itinerary.itineraries
        WHERE id = ANY($1::int[])
        ORDER BY id`,
        [idList],
      )
      return res.json({ ok: true, items: r.rows })
    }

    const query = `
      SELECT
        id,
        title,
        price,
        agency_name as "agencyName",
        start_date,
        end_date,
        COALESCE(end_date - start_date + 1, 1) as "durationDays",
        banner_image as "coverImage",
        location as destinations,
        content as description,
        views_count as "totalViews",
        saves_count as "totalSaves",
        likes_count as likes,
        created_at
      FROM itinerary.itineraries
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
        start_date,
        end_date,
        COALESCE(end_date - start_date + 1, 1) as "durationDays",
        banner_image as "coverImage",
        location,
        content as description,
        tags,
        views_count as "totalViews",
        saves_count as "totalSaves",
        likes_count as likes,
        author_uid, author_name, author_avatar
      FROM itinerary.itineraries WHERE id = $1
    `
    const itineraryResult = await pool.query(itineraryQuery, [id])

    if (itineraryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' })
    }
    const itinerary = itineraryResult.rows[0]

    const daysResult = await pool.query(
      'SELECT day_number as day, activities FROM itinerary.itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC',
      [id],
    )

    const packingResult = await pool.query(
      'SELECT category, items FROM itinerary.itinerary_packing_lists WHERE itinerary_id = $1',
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

// 3. 建立新行程

router.post('/', authenticate, async (req, res) => {
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
      end_date,
      itinerary,
      packingList,
      tags,
      // 如果前端有傳 vendor_id，也可以在這裡解構出來，若沒有則使用 req.user.uid
    } = req.body

    // 驗證必填
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: '請提供開始與結束日期' })
    }

    await client.query('BEGIN')

    const insertItineraryQuery = `
      INSERT INTO itinerary.itineraries
      (title, content, location, banner_image, price, agency_name, start_date, end_date, tags, author_uid, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
    `

    // 這裡使用 req.user.uid (來自 authenticate 中間件解析後的結果)
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
      req.user.uid,
      'published',
    ]

    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    // 每日行程
    if (itinerary && itinerary.days) {
      const dayInsertQuery = `INSERT INTO itinerary.itinerary_days (itinerary_id, day_number, activities, created_at) VALUES ($1, $2, $3, NOW())`
      for (const day of itinerary.days) {
        // 確保 activities 是正確的 JSON 格式
        const activitiesJson =
          typeof day.activities === 'string' ? day.activities : JSON.stringify(day.activities)

        await client.query(dayInsertQuery, [newItineraryId, day.day, activitiesJson])
      }
    }

    // 打包清單
    if (packingList) {
      const packingInsertQuery = `INSERT INTO itinerary.itinerary_packing_lists (itinerary_id, category, items, created_at) VALUES ($1, $2, $3, NOW())`
      for (const list of packingList) {
        const itemsJson = typeof list.items === 'string' ? list.items : JSON.stringify(list.items)

        await client.query(packingInsertQuery, [newItineraryId, list.category, itemsJson])
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
