const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// [POST] 新增個人行程 (使用 Transaction 確保資料完整性)
router.post('/', async (req, res) => {
  const { user_uid, title, location, start_date, end_date, itinerary, packing_list } = req.body

  if (!user_uid) {
    return res.status(400).json({ success: false, message: '儲存失敗：缺失使用者 UID' })
  }

  const client = await db.connect() // 取得專用連線

  try {
    await client.query('BEGIN') // 開始交易
    await client.query('SET search_path TO my_itineraries, public') // 設定 Schema

    // 1. 插入主表
    const mainResult = await client.query(
      `INSERT INTO itineraries (user_uid, title, location, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user_uid, title, location, start_date, end_date],
    )
    const newId = mainResult.rows[0].id

    // 2. 插入每日行程點
    if (itinerary && itinerary.length > 0) {
      for (const day of itinerary) {
        await client.query(
          `INSERT INTO days (itinerary_id, day_number, date, activities)
           VALUES ($1, $2, $3, $4)`,
          [newId, day.day, day.date, JSON.stringify(day.activities)],
        )
      }
    }

    // 3. 插入打包清單
    if (packing_list && packing_list.length > 0) {
      for (const cat of packing_list) {
        await client.query(
          `INSERT INTO packing_lists (itinerary_id, category, items)
           VALUES ($1, $2, $3)`,
          [newId, cat.category, JSON.stringify(cat.items)],
        )
      }
    }

    await client.query('COMMIT') // 提交交易
    res.json({ success: true, data: { id: newId, title } })
  } catch (err) {
    await client.query('ROLLBACK') // 發生錯誤則回滾
    console.error('Create itinerary error:', err) // 後端記錄詳細錯誤
    res.status(500).json({ success: false, message: '新增行程失敗' }) // 回傳通用訊息
  } finally {
    client.release() // 釋放連線
  }
})

// [GET] 取得個人規劃行程列表
router.get('/personal/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    const result = await db.query(
      `SELECT * FROM my_itineraries.itineraries
       WHERE user_uid = $1
       ORDER BY created_at DESC`,
      [uid],
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('取得行程列表失敗:', err)
    res.status(500).json({ success: false, message: '資料庫查詢失敗' })
  }
})

// [GET] 取得已參加並通過的找旅伴行程
router.get('/joined/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    const query = `
      SELECT t.* FROM public.travelers t
      JOIN public.applications a ON t.id = a.traveler_id
      WHERE a.applicant_uid = $1 AND a.status = 'accepted'
      ORDER BY t.start_date ASC;
    `
    const result = await db.query(query, [uid])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Get joined itineraries error:', err) // 後端記錄詳細錯誤
    res.status(500).json({ success: false, message: '資料庫查詢失敗' })
  }
})

// [DELETE] 刪除個人行程
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await db.query('DELETE FROM my_itineraries.itineraries WHERE id = $1', [id])
    res.json({ success: true, message: '行程已刪除' })
  } catch (err) {
    console.error('Delete error:', err)
    res.status(500).json({ success: false, message: '資料庫刪除失敗' })
  }
})

module.exports = router
