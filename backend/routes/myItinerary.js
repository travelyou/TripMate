const express = require('express')
const router = express.Router()
// 修改這裡：不要直接 const { db } = ...
const db = require('../database/connection')

// [GET] 取得個人規劃行程
router.get('/personal/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    // 確保這裡使用的是 db.query 而不是直接解構出來的變數
    const result = await db.query(
      'SELECT * FROM my_itineraries WHERE user_uid = $1 ORDER BY created_at DESC',
      [uid],
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Database error:', err)
    res.status(500).json({ success: false, message: '資料庫查詢失敗' })
  }
})

// [GET] 取得已參加並通過的找旅伴行程
router.get('/joined/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    const query = `
      SELECT t.* FROM travelers t
      JOIN applications a ON t.id = a.traveler_id
      WHERE a.author_uid = $1 AND a.status = 'accepted'
      ORDER BY t.start_date ASC;
    `
    const result = await db.query(query, [uid])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// [POST] 新增個人行程
router.post('/', async (req, res) => {
  const { user_uid, title, location, start_date, end_date, itinerary, packing_list } = req.body
  try {
    const result = await db.query(
      `INSERT INTO my_itineraries (user_uid, title, location, start_date, end_date, itinerary, packing_list)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        user_uid,
        title,
        location,
        start_date,
        end_date,
        JSON.stringify(itinerary),
        JSON.stringify(packing_list),
      ],
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Create itinerary error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
