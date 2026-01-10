const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// ============================================
// GET ALL - 獲取所有旅伴貼文（列表頁用）
// ============================================
router.get('/', async (req, res) => {
  try {
    console.log('收到獲取旅伴列表請求')
    const { status, location, limit = 20, offset = 0 } = req.query

    // ▼▼▼ 修改重點：10分鐘內顯示「剛剛」與日期範圍邏輯 ▼▼▼
    let query = `
      SELECT
        id,
        title,
        content,
        location,
        status,
        tags,

        -- 1. 行程日期：判斷是否跨天
        CASE
          WHEN start_date = end_date THEN TO_CHAR(start_date, 'YYYY/MM/DD')
          ELSE TO_CHAR(start_date, 'YYYY/MM/DD') || ' - ' || TO_CHAR(end_date, 'YYYY/MM/DD')
        END AS "date",

        -- 2. 發布時間：10分鐘內顯示「剛剛」，否則顯示格式化時間
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) < 600 THEN '剛剛'
          ELSE TO_CHAR(created_at AT TIME ZONE 'Asia/Taipei', 'YYYY/MM/DD HH24:MI')
        END AS "created_at",

        current_people::text || '/' || max_people::text AS "people",
        banner_image AS "image",
        author_uid,
        author_name AS "author",
        author_avatar AS "avatar",
        spirit_animal AS "spiritAnimal",
        likes_count AS "likes",
        comments_count,
        saves_count,
        views_count,
        updated_at
      FROM travelers
      WHERE deleted_at IS NULL
    `
    // ▲▲▲ 修改結束 ▲▲▲

    const params = []
    let paramIndex = 1

    // 篩選條件
    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (location) {
      query += ` AND location = $${paramIndex}`
      params.push(location)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(parseInt(limit), parseInt(offset))

    console.log('執行查詢:', query)

    const result = await pool.query(query, params)

    console.log('查詢成功，找到', result.rows.length, '筆資料')

    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount,
    })
  } catch (error) {
    console.error('獲取旅伴列表錯誤：', error)
    res.status(500).json({
      success: false,
      message: '獲取旅伴列表失敗',
      error: error.message,
    })
  }
})

// ============================================
// GET BY ID - 獲取單個旅伴詳情（含行程、打包清單、留言）
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { user_uid } = req.query

    console.log('獲取旅伴詳情，ID:', id)

    // ▼▼▼ 修改重點：詳情頁同步修改 ▼▼▼
    const travelerQuery = `
      SELECT
        id,
        title,
        content,
        location,
        status,
        tags,

        -- 1. 行程日期
        CASE
          WHEN start_date = end_date THEN TO_CHAR(start_date, 'YYYY/MM/DD')
          ELSE TO_CHAR(start_date, 'YYYY/MM/DD') || ' - ' || TO_CHAR(end_date, 'YYYY/MM/DD')
        END AS "date",

        -- 2. 發布時間：10分鐘內顯示「剛剛」
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) < 600 THEN '剛剛'
          ELSE TO_CHAR(created_at AT TIME ZONE 'Asia/Taipei', 'YYYY/MM/DD HH24:MI')
        END AS "created_at",

        current_people::text || '/' || max_people::text AS "people",
        banner_image AS "image",
        author_uid,
        author_name AS "author",
        author_avatar AS "avatar",
        spirit_animal AS "spiritAnimal",
        likes_count AS "likes",
        views_count
      FROM travelers
      WHERE id = $1 AND deleted_at IS NULL
    `
    // ▲▲▲ 修改結束 ▲▲▲

    const travelerResult = await pool.query(travelerQuery, [id])

    if (travelerResult.rows.length === 0) {
      console.log('找不到旅伴 ID:', id)
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文',
      })
    }

    const traveler = travelerResult.rows[0]
    console.log('找到旅伴:', traveler.title)

    // 2. 獲取行程規劃
    const itineraryResult = await pool.query(
      'SELECT day_number, date, activities FROM traveler_itineraries WHERE traveler_id = $1 ORDER BY day_number',
      [id],
    )

    // 3. 獲取打包清單
    const packingResult = await pool.query(
      'SELECT category, items, sort_order FROM traveler_packing_lists WHERE traveler_id = $1 ORDER BY sort_order',
      [id],
    )

    // 4. 獲取留言（簡化版）
    const commentsResult = await pool.query(
      `SELECT
        id, author_uid, author_name, author_avatar, content,
        likes_count, created_at
      FROM comments
      WHERE post_type = 'traveler'
        AND post_id = $1
        AND parent_comment_id IS NULL
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50`,
      [id],
    )

    // 5. 檢查是否按讚
    let isLiked = false
    if (user_uid) {
      const likeResult = await pool.query(
        'SELECT id FROM likes WHERE post_type = $1 AND post_id = $2 AND user_uid = $3',
        ['traveler', id, user_uid],
      )
      isLiked = likeResult.rows.length > 0
    }

    // 6. 增加瀏覽數
    await pool.query('UPDATE travelers SET views_count = views_count + 1 WHERE id = $1', [id])

    // 7. 組裝完整資料
    const fullData = {
      ...traveler,
      itinerary: {
        days: itineraryResult.rows.map((day) => ({
          day: day.day_number,
          date: day.date,
          activities: day.activities,
        })),
      },
      packingList: packingResult.rows.map((pack) => ({
        category: pack.category,
        items: pack.items,
      })),
      commentsData: commentsResult.rows.map((comment) => ({
        id: comment.id,
        author: comment.author_name,
        author_uid: comment.author_uid,
        avatar: comment.author_avatar,
        content: comment.content,
        likes: comment.likes_count,
        time: formatTime(comment.created_at),
        isLiked: false,
        replies: [],
      })),
      isLiked,
    }

    res.json({
      success: true,
      data: fullData,
    })
  } catch (error) {
    console.error('獲取旅伴詳情錯誤：', error)
    res.status(500).json({
      success: false,
      message: '獲取旅伴詳情失敗',
      error: error.message,
    })
  }
})

// ============================================
// CREATE - 建立旅伴貼文 (POST)
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      banner_image,
      location,
      start_date,
      end_date,
      max_people,
      author_uid,
      author_name,
      author_avatar,
      spirit_animal,
      tags,
      itinerary,
      packingList,
    } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const travelerResult = await client.query(
        `INSERT INTO travelers (
          title, content, banner_image, location, start_date, end_date,
          max_people, author_uid, author_name, author_avatar, spirit_animal, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          title,
          content,
          banner_image,
          location,
          start_date,
          end_date,
          max_people,
          author_uid,
          author_name,
          author_avatar,
          spirit_animal,
          tags,
        ],
      )

      const travelerId = travelerResult.rows[0].id

      if (itinerary && itinerary.days) {
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
            [travelerId, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
      }

      if (packingList) {
        for (let i = 0; i < packingList.length; i++) {
          await client.query(
            `INSERT INTO traveler_packing_lists (traveler_id, category, sort_order, items) VALUES ($1, $2, $3, $4)`,
            [travelerId, packingList[i].category, i, JSON.stringify(packingList[i].items)],
          )
        }
      }

      await client.query('COMMIT')
      res.status(201).json({ success: true, message: '旅伴貼文建立成功', data: { id: travelerId } })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('建立旅伴貼文錯誤：', error)
    res.status(500).json({ success: false, message: '建立旅伴貼文失敗', error: error.message })
  }
})

// ============================================
// UPDATE - 更新旅伴貼文 (PUT)
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      content,
      banner_image,
      location,
      start_date,
      end_date,
      current_people,
      max_people,
      status,
      tags,
      itinerary,
      packingList,
    } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      const addField = (col, val) => {
        if (val !== undefined) {
          updateFields.push(`${col} = $${paramIndex++}`)
          updateValues.push(val)
        }
      }

      addField('title', title)
      addField('content', content)
      addField('banner_image', banner_image)
      addField('location', location)
      addField('start_date', start_date)
      addField('end_date', end_date)
      addField('current_people', current_people)
      addField('max_people', max_people)
      addField('status', status)
      addField('tags', tags)

      updateFields.push(`updated_at = NOW()`)
      updateValues.push(id)

      if (updateFields.length > 1) {
        const updateQuery = `UPDATE travelers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`
        const result = await client.query(updateQuery, updateValues)
        if (result.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({ success: false, message: '找不到此旅伴貼文' })
        }
      }

      if (itinerary && itinerary.days) {
        await client.query('DELETE FROM traveler_itineraries WHERE traveler_id = $1', [id])
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
            [id, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
      }

      if (packingList) {
        await client.query('DELETE FROM traveler_packing_lists WHERE traveler_id = $1', [id])
        for (let i = 0; i < packingList.length; i++) {
          await client.query(
            `INSERT INTO traveler_packing_lists (traveler_id, category, sort_order, items) VALUES ($1, $2, $3, $4)`,
            [id, packingList[i].category, i, JSON.stringify(packingList[i].items)],
          )
        }
      }

      await client.query('COMMIT')
      res.json({ success: true, message: '旅伴貼文更新成功', data: { id } })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '更新失敗', error: error.message })
  }
})

// ============================================
// DELETE - 刪除旅伴貼文
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `UPDATE travelers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: '找不到此貼文' })
    res.json({ success: true, message: '已刪除', data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, message: '刪除失敗', error: error.message })
  }
})

function formatTime(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = Math.floor((now - time) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return time.toLocaleDateString('zh-TW')
}

module.exports = router
