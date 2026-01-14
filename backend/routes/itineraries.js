const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 1. 取得所有行程 (GET)
router.get('/', async (req, res) => {
  try {
    const { region } = req.query

    // ★ 關鍵修改：使用 AS 將 DB 欄位轉為前端看得懂的名稱
    let query = `
      SELECT
        id,
        title,
        0 as price,                       -- DB 沒 price，暫時給 0
        'TripMate 精選' as agency_name,    -- DB 沒 agency_name，給預設值
        5 as duration_days,               -- DB 沒天數，暫時給 5
        banner_image as cover_image,      -- ★ 將 banner_image 轉為 cover_image
        location as destinations,         -- ★ 將 location 轉為 destinations
        content as description,           -- ★ 將 content 轉為 description
        0 as total_views,
        0 as total_saves,
        NOW() as created_at
      FROM itineraries
      WHERE 1=1
    `

    // 如果你有篩選功能，這裡可以加回去
    // if (region) { ... }

    query += ` ORDER BY id DESC`

    const result = await pool.query(query)

    // 轉換資料格式回傳給前端 (注意 key 要對應前端需要的 camelCase)
    const data = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      price: row.price,
      agencyName: row.agency_name,
      durationDays: row.duration_days,
      coverImage: row.cover_image, // 這裡其實是 banner_image
      destinations: [row.destinations], // 前端如果是陣列，把字串包起來
      description: row.description,
      totalViews: row.total_views,
      totalSaves: row.total_saves,
    }))

    res.json({ success: true, data })
  } catch (err) {
    console.error('查詢行程失敗:', err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 2. 取得單一行程詳細資料 (GET /:id)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // 同樣做欄位映射
    const query = `
      SELECT
        id, title,
        0 as price,
        'TripMate 精選' as agency_name,
        5 as duration_days,
        banner_image as cover_image,
        location,
        content as description
      FROM itineraries WHERE id = $1
    `
    const itineraryResult = await pool.query(query, [id])

    if (itineraryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' })
    }

    const itinerary = itineraryResult.rows[0]

    // 為了不報錯，即使 DB 沒有這兩張表，也先回傳空陣列
    // (如果你之後建立了 itinerary_days 表，再把註解解開)
    /*
    const daysResult = await pool.query(
      'SELECT day_number, activities FROM itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC',
      [id]
    )
    */

    const fullData = {
      id: itinerary.id,
      title: itinerary.title,
      description: itinerary.description,
      price: itinerary.price,
      agencyName: itinerary.agency_name,
      durationDays: itinerary.duration_days,
      coverImage: itinerary.cover_image,
      location: itinerary.location,
      itinerary: { days: [] }, // 暫時回傳空行程
      packingList: [], // 暫時回傳空清單
    }

    res.json({ success: true, data: fullData })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 3. 建立新行程 (POST)
router.post('/', async (req, res) => {
  // 注意：這裡只寫入你 DB 有的欄位，忽略 price 等欄位
  const { title, description, location, coverImage } = req.body

  try {
    const insertQuery = `
      INSERT INTO itineraries (title, content, location, banner_image)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `
    // 這裡要把前端傳來的 description 對應到 content，coverImage 對應到 banner_image
    const values = [title, description, location, coverImage]

    const result = await pool.query(insertQuery, values)

    res.json({ success: true, message: '建立成功', id: result.rows[0].id })
  } catch (err) {
    console.error('建立行程失敗:', err)
    res.status(500).json({ success: false, message: 'Create failed' })
  }
})

module.exports = router
