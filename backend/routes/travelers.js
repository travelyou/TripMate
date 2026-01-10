// backend/routes/travelers.js
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

    let query = `
      SELECT
        id, title, content, banner_image, location,
        start_date, end_date, current_people, max_people, status,
        author_uid, author_name, author_avatar, spirit_animal,
        tags, likes_count, comments_count, saves_count, views_count,
        created_at, updated_at
      FROM travelers
      WHERE deleted_at IS NULL
    `
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
    console.log('參數:', params)

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

    // 1. 獲取旅伴基本資訊
    const travelerResult = await pool.query(
      'SELECT * FROM travelers WHERE id = $1 AND deleted_at IS NULL',
      [id],
    )

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
    console.log('行程數量:', itineraryResult.rows.length)

    // 3. 獲取打包清單
    const packingResult = await pool.query(
      'SELECT category, items, sort_order FROM traveler_packing_lists WHERE traveler_id = $1 ORDER BY sort_order',
      [id],
    )
    console.log('打包清單數量:', packingResult.rows.length)

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
    console.log('留言數量:', commentsResult.rows.length)

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
        replies: [], // 簡化版先不處理回覆
      })),
      isLiked,
    }

    console.log('成功組裝資料，準備回傳')

    res.json({
      success: true,
      data: fullData,
    })
  } catch (error) {
    console.error('獲取旅伴詳情錯誤：', error)
    console.error('錯誤堆疊：', error.stack)
    res.status(500).json({
      success: false,
      message: '獲取旅伴詳情失敗',
      error: error.message,
    })
  }
})

// ============================================
// CREATE - 建立旅伴貼文
// ============================================
router.post('/', async (req, res) => {
  try {
    console.log('收到建立旅伴貼文請求')
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

    // 開始交易
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. 插入旅伴貼文
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
      console.log('建立旅伴成功，ID:', travelerId)

      // 2. 插入行程規劃
      if (itinerary && itinerary.days && itinerary.days.length > 0) {
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO traveler_itineraries (traveler_id, day_number, date, activities)
             VALUES ($1, $2, $3, $4)`,
            [travelerId, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
        console.log('插入行程成功')
      }

      // 3. 插入打包清單
      if (packingList && packingList.length > 0) {
        for (let i = 0; i < packingList.length; i++) {
          const pack = packingList[i]
          await client.query(
            `INSERT INTO traveler_packing_lists (traveler_id, category, sort_order, items)
             VALUES ($1, $2, $3, $4)`,
            [travelerId, pack.category, i, JSON.stringify(pack.items)],
          )
        }
        console.log('插入打包清單成功')
      }

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        message: '旅伴貼文建立成功',
        data: { id: travelerId },
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('建立旅伴貼文錯誤：', error)
    res.status(500).json({
      success: false,
      message: '建立旅伴貼文失敗',
      error: error.message,
    })
  }
})

// ============================================
// UPDATE - 更新旅伴貼文
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log('收到更新旅伴貼文請求，ID:', id)

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

      // 1. 更新旅伴基本資訊
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`)
        updateValues.push(title)
        paramIndex++
      }
      if (content !== undefined) {
        updateFields.push(`content = $${paramIndex}`)
        updateValues.push(content)
        paramIndex++
      }
      if (banner_image !== undefined) {
        updateFields.push(`banner_image = $${paramIndex}`)
        updateValues.push(banner_image)
        paramIndex++
      }
      if (location !== undefined) {
        updateFields.push(`location = $${paramIndex}`)
        updateValues.push(location)
        paramIndex++
      }
      if (start_date !== undefined) {
        updateFields.push(`start_date = $${paramIndex}`)
        updateValues.push(start_date)
        paramIndex++
      }
      if (end_date !== undefined) {
        updateFields.push(`end_date = $${paramIndex}`)
        updateValues.push(end_date)
        paramIndex++
      }
      if (current_people !== undefined) {
        updateFields.push(`current_people = $${paramIndex}`)
        updateValues.push(current_people)
        paramIndex++
      }
      if (max_people !== undefined) {
        updateFields.push(`max_people = $${paramIndex}`)
        updateValues.push(max_people)
        paramIndex++
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`)
        updateValues.push(status)
        paramIndex++
      }
      if (tags !== undefined) {
        updateFields.push(`tags = $${paramIndex}`)
        updateValues.push(tags)
        paramIndex++
      }

      updateFields.push(`updated_at = NOW()`)
      updateValues.push(id)

      if (updateFields.length > 1) {
        // 至少有一個欄位要更新（除了 updated_at）
        const updateQuery = `
          UPDATE travelers
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex} AND deleted_at IS NULL
          RETURNING id
        `
        const result = await client.query(updateQuery, updateValues)

        if (result.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({
            success: false,
            message: '找不到此旅伴貼文',
          })
        }

        console.log('更新旅伴基本資訊成功')
      }

      // 2. 更新行程規劃（刪除舊的，插入新的）
      if (itinerary && itinerary.days) {
        await client.query('DELETE FROM traveler_itineraries WHERE traveler_id = $1', [id])

        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO traveler_itineraries (traveler_id, day_number, date, activities)
             VALUES ($1, $2, $3, $4)`,
            [id, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
        console.log('更新行程成功')
      }

      // 3. 更新打包清單（刪除舊的，插入新的）
      if (packingList) {
        await client.query('DELETE FROM traveler_packing_lists WHERE traveler_id = $1', [id])

        for (let i = 0; i < packingList.length; i++) {
          const pack = packingList[i]
          await client.query(
            `INSERT INTO traveler_packing_lists (traveler_id, category, sort_order, items)
             VALUES ($1, $2, $3, $4)`,
            [id, pack.category, i, JSON.stringify(pack.items)],
          )
        }
        console.log('更新打包清單成功')
      }

      await client.query('COMMIT')

      res.json({
        success: true,
        message: '旅伴貼文更新成功',
        data: { id },
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('更新旅伴貼文錯誤：', error)
    res.status(500).json({
      success: false,
      message: '更新旅伴貼文失敗',
      error: error.message,
    })
  }
})

// ============================================
// DELETE - 刪除旅伴貼文（軟刪除）
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log('收到刪除旅伴貼文請求，ID:', id)

    // 軟刪除：只設定 deleted_at 時間戳記
    const result = await pool.query(
      `UPDATE travelers
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文或已被刪除',
      })
    }

    console.log('刪除旅伴貼文成功，ID:', id)

    res.json({
      success: true,
      message: '旅伴貼文已刪除',
      data: { id },
    })
  } catch (error) {
    console.error('刪除旅伴貼文錯誤：', error)
    res.status(500).json({
      success: false,
      message: '刪除旅伴貼文失敗',
      error: error.message,
    })
  }
})

// ============================================
// 輔助函數：格式化時間
// ============================================
function formatTime(timestamp) {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = Math.floor((now - time) / 1000) // 秒

  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`

  return time.toLocaleDateString('zh-TW')
}

module.exports = router
