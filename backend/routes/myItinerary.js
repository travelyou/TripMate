/* eslint-env node */
const express = require('express')
const router = express.Router()
const db = require('../database/connection')

// [GET] 取得個人規劃行程
router.get('/personal/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    const result = await db.query(
      'SELECT * FROM public.my_itineraries WHERE user_uid = $1 ORDER BY created_at DESC',
      [uid],
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('❌ Personal Error:', err)
    res.status(500).json({ success: false, message: '讀取個人行程失敗', error: err.message })
  }
})

// [GET] 取得已參加並通過的找旅伴行程 (包含評價狀態)
router.get('/joined/:uid', async (req, res) => {
  const { uid } = req.params
  try {
    // [驗證] 根據您的 JSON 與截圖：
    // 1. 貼文表在 travelers schema 下，叫做 travelers
    // 2. 申請表在 travelers schema 下，叫做 traveler_applications (不是 applications!)
    // 3. 從 users 表獲取最新的作者信息（nickname, avatar, spirit_animal）
    // [修改重點]
    // 1. JOIN users (u): 為了拿到主揪的名字和頭像
    // 2. JOIN reviews (r): 為了拿到「我」對這個行程的評價 (content, sentiment)
    const query = `
      SELECT
        t.id,
        t.title,
        t.content,
        t.location,
        t.category,
        t.status,
        t.tags,
        t.start_date,
        t.end_date,
        t.current_people,
        t.max_people,
        t.banner_image,
        t.author_uid,
        t.likes_count,
        t.saves_count,
        t.views_count,
        t.created_at,
        t.updated_at,
        u.nickname as author_name,
        u.avatar as author_avatar,
        r.content as comment,
        r.sentiment as review_label
      FROM travelers.travelers t
      JOIN travelers.traveler_applications a ON t.id = a.traveler_id
      LEFT JOIN public.users u ON t.author_uid = u.uid
      LEFT JOIN public.reviews r ON r.trip_id = t.id AND r.author_uid = $1
      WHERE a.author_uid = $1 AND a.status = 'accepted'
      ORDER BY t.start_date ASC;
    `
    const result = await db.query(query, [uid])
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('❌ Joined Error:', err)
    res.status(500).json({ success: false, message: '讀取參加行程失敗', error: err.message })
  }
})

// [POST] 新增個人行程
router.post('/', async (req, res) => {
  const { user_uid, title, location, start_date, end_date, itinerary, packing_list } = req.body
  try {
    const result = await db.query(
      `INSERT INTO public.my_itineraries (user_uid, title, location, start_date, end_date, itinerary, packing_list)
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
    console.error('❌ Create Error:', err)
    res.status(500).json({ success: false, message: '新增失敗', error: err.message })
  }
})

// [PUT] 更新個人行程
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { title, location, start_date, end_date, itinerary, packing_list } = req.body
  try {
    const result = await db.query(
      `UPDATE public.my_itineraries
       SET title = $1, location = $2, start_date = $3, end_date = $4, itinerary = $5, packing_list = $6
       WHERE id = $7 RETURNING *`,
      [
        title,
        location,
        start_date,
        end_date,
        JSON.stringify(itinerary),
        JSON.stringify(packing_list),
        id,
      ],
    )
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: '找不到該行程' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('❌ Update Error:', err)
    res.status(500).json({ success: false, message: '更新失敗', error: err.message })
  }
})

// [DELETE] 刪除個人行程
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await db.query('DELETE FROM public.my_itineraries WHERE id = $1 RETURNING id', [
      id,
    ])
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: '找不到該行程' })
    res.json({ success: true, message: '行程已刪除' })
  } catch (err) {
    console.error('❌ Delete Error:', err)
    res.status(500).json({ success: false, message: '刪除失敗', error: err.message })
  }
})

module.exports = router
