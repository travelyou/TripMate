const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 1. 取得所有行程 (列表頁用)
router.get('/', async (req, res) => {
  try {
    // 這裡我們用 SQL 直接計算天數，並把欄位別名(AS)轉成前端要的名字
    const query = `
      SELECT
        id,
        title,
        price,
        agency_name as "agencyName",
        -- 計算天數：如果沒有日期預設 1 天
        COALESCE(end_date - start_date + 1, 1) as "durationDays",
        banner_image as "coverImage",
        location as destinations, -- 前端可能需要處理字串轉陣列
        content as description,
        views_count as "totalViews",
        saves_count as "totalSaves",
        likes_count as likes,
        created_at
      FROM itineraries
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)

    // 簡單處理資料格式
    const data = result.rows.map((row) => ({
      ...row,
      // 如果你的 location 是存 "台北, 台中" 這種字串，前端 ItineraryCard 支援字串，
      // 但如果你想轉陣列也可以在這裡做： destinations: row.destinations ? [row.destinations] : []
      destinations: row.destinations ? [row.destinations] : [],
    }))

    res.json({ success: true, data })
  } catch (err) {
    console.error('查詢行程列表失敗:', err)
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

// 2. 取得單一行程詳細資料 (包含 Days 和 PackingLists)
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    // A. 查詢主表
    const itineraryQuery = `
      SELECT
        id, title, price, agency_name as "agencyName",
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

    // B. 查詢每日行程 (依照 day_number 排序)
    const daysResult = await pool.query(
      'SELECT day_number as day, activities FROM itinerary_days WHERE itinerary_id = $1 ORDER BY day_number ASC',
      [id],
    )

    // C. 查詢打包清單
    const packingResult = await pool.query(
      'SELECT category, items FROM itinerary_packing_lists WHERE itinerary_id = $1',
      [id],
    )

    // D. 組裝回傳
    const fullData = {
      ...itinerary,
      itinerary: {
        days: daysResult.rows.map((row) => ({
          day: row.day,
          // 如果 DB 存的是 JSON 字串就不用動，如果是純文字可能要 parse，這邊假設 pg 自動處理 JSONB
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

// 3. 建立新行程 (寫入 3 張表)
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
      durationDays,
      itinerary, // { days: [...] }
      packingList, // [ { category:..., items:[...] } ]
      tags,
    } = req.body

    // 計算日期 (為了填入 start_date / end_date)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + (durationDays || 1) - 1)

    await client.query('BEGIN') // 開始交易

    // 1. 寫入 itineraries 主表
    const insertItineraryQuery = `
      INSERT INTO itineraries
      (title, content, location, banner_image, price, agency_name, start_date, end_date, tags, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `
    // 注意：這裡假設 tags 前端傳來是陣列，pg 可以直接存 ARRAY
    const itineraryValues = [
      title,
      description,
      location,
      coverImage,
      price || 0,
      agencyName || '未命名廠商',
      startDate,
      endDate,
      tags || [],
    ]
    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    // 2. 寫入 itinerary_days (每日行程)
    if (itinerary && itinerary.days && itinerary.days.length > 0) {
      const dayInsertQuery = `
        INSERT INTO itinerary_days (itinerary_id, day_number, activities, created_at)
        VALUES ($1, $2, $3, NOW())
      `
      for (const day of itinerary.days) {
        // day.activities 是 JSON 物件陣列，pg node套件會自動轉 stringify 或需要手動
        // 建議這裡顯式轉成 JSON string 以防萬一
        await client.query(dayInsertQuery, [
          newItineraryId,
          day.day,
          JSON.stringify(day.activities),
        ])
      }
    }

    // 3. 寫入 itinerary_packing_lists (打包清單)
    if (packingList && packingList.length > 0) {
      const packingInsertQuery = `
        INSERT INTO itinerary_packing_lists (itinerary_id, category, items, created_at)
        VALUES ($1, $2, $3, NOW())
      `
      for (const list of packingList) {
        await client.query(packingInsertQuery, [
          newItineraryId,
          list.category,
          JSON.stringify(list.items),
        ])
      }
    }

    await client.query('COMMIT') // 提交交易
    res.json({ success: true, message: '建立成功', id: newItineraryId })
  } catch (err) {
    await client.query('ROLLBACK') // 失敗則回滾
    console.error('建立行程失敗 Transaction Error:', err)
    res.status(500).json({ success: false, message: 'Create failed' })
  } finally {
    client.release()
  }
})

module.exports = router
