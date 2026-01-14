const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 1. 取得所有行程 (支援簡單篩選)
router.get('/', async (req, res) => {
  try {
    const { region, min_days, max_days } = req.query

    let query = `
      SELECT id, title, price, agency_name, duration_days, cover_image,
             destinations, total_views, total_saves, created_at
      FROM itineraries
      WHERE 1=1
    `
    const params = []

    // 簡單的動態 SQL 組裝 (建議依實際需求擴充)
    // if (region) {
    //   params.push(`%${region}%`);
    //   query += ` AND location LIKE $${params.length}`;
    // }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // 將 snake_case 轉為 camelCase 回傳給前端
    const data = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      price: row.price,
      agencyName: row.agency_name,
      durationDays: row.duration_days,
      coverImage: row.cover_image,
      destinations: row.destinations, // 假設 DB 存的是 array 或 string
      totalViews: row.total_views,
      totalSaves: row.total_saves,
    }))

    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 2. 取得單一行程詳細資料 (包含 days 和 packing_lists)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // 查詢主表
    const itineraryResult = await pool.query('SELECT * FROM itineraries WHERE id = $1', [id])

    if (itineraryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' })
    }

    const itinerary = itineraryResult.rows[0]

    // 查詢每日行程 (依照天數排序)
    const daysResult = await pool.query(
      'SELECT day_number, activities FROM itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC',
      [id],
    )

    // 查詢打包清單
    const packingResult = await pool.query(
      'SELECT category, items FROM itinerary_packing_lists WHERE itinerary_id = $1',
      [id],
    )

    // 組裝資料回傳 (轉換為前端需要的格式)
    const fullData = {
      id: itinerary.id,
      title: itinerary.title,
      description: itinerary.description, // 假設 DB 有 description
      price: itinerary.price,
      agencyName: itinerary.agency_name,
      durationDays: itinerary.duration_days,
      coverImage: itinerary.cover_image,
      location: itinerary.location,
      tags: itinerary.tags,
      totalViews: itinerary.total_views,
      totalSaves: itinerary.total_saves,
      itinerary: {
        days: daysResult.rows.map((d) => ({
          day: d.day_number,
          activities: d.activities, // 假設 DB 欄位類型是 JSONB，pg 會自動解析
        })),
      },
      packingList: packingResult.rows.map((p) => ({
        category: p.category,
        items: p.items, // JSONB 自動解析
      })),
    }

    res.json({ success: true, data: fullData })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 3. 建立新行程 (使用 Transaction 確保資料一致性)
router.post('/', async (req, res) => {
  const client = await pool.connect()

  try {
    const {
      title,
      description,
      price,
      agencyName,
      location,
      durationDays,
      coverImage,
      tags,
      itinerary, // { days: [...] }
      packingList, // [ { category:..., items:[...] } ]
    } = req.body

    await client.query('BEGIN') // 開始交易

    // 1. 插入主表 itineraries
    const insertItineraryQuery = `
      INSERT INTO itineraries
      (title, description, price, agency_name, location, duration_days, cover_image, tags, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `
    const itineraryValues = [
      title,
      description,
      price,
      agencyName,
      location,
      durationDays,
      coverImage,
      tags,
    ]
    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    // 2. 插入每日行程 itinerary_days
    if (itinerary && itinerary.days && itinerary.days.length > 0) {
      const dayInsertQuery = `
        INSERT INTO itinerary_days (itinerary_id, day_number, activities)
        VALUES ($1, $2, $3)
      `
      for (const day of itinerary.days) {
        // day.activities 是 JSON 物件/陣列
        await client.query(dayInsertQuery, [
          newItineraryId,
          day.day,
          JSON.stringify(day.activities),
        ])
      }
    }

    // 3. 插入打包清單 itinerary_packing_lists
    if (packingList && packingList.length > 0) {
      const packingInsertQuery = `
        INSERT INTO itinerary_packing_lists (itinerary_id, category, items)
        VALUES ($1, $2, $3)
      `
      for (const list of packingList) {
        // list.items 是 JSON 物件/陣列
        await client.query(packingInsertQuery, [
          newItineraryId,
          list.category,
          JSON.stringify(list.items),
        ])
      }
    }

    await client.query('COMMIT') // 提交交易

    res.json({ success: true, message: 'Itinerary created successfully', id: newItineraryId })
  } catch (err) {
    await client.query('ROLLBACK') // 發生錯誤回滾
    console.error('Transaction Error:', err)
    res.status(500).json({ success: false, message: 'Create failed' })
  } finally {
    client.release() // 釋放連線
  }
})

module.exports = router
