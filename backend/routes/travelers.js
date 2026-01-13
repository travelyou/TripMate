/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

router.get('/', async (req, res) => {
  try {
    console.log('收到獲取旅伴列表請求')
    const { status, location, limit = 20, offset = 0 } = req.query

    let query = `
      SELECT
        id,
        title,
        content,
        location,
        status,
        tags,
        start_date,
        end_date,
        current_people,
        max_people,
        banner_image,
        author_uid,
        author_name,
        author_avatar,
        spirit_animal,
        likes_count,
        saves_count,
        views_count,
        created_at,
        updated_at
      FROM travelers.travelers
      WHERE deleted_at IS NULL
    `

    const params = []
    let paramIndex = 1

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
    console.log('查詢參數:', params)

    const result = await pool.query(query, params)

    console.log('查詢成功，找到', result.rows.length, '筆資料')

    const formattedData = result.rows.map((row) => {
      const startDate = new Date(row.start_date)
      const endDate = new Date(row.end_date)
      const dateStr =
        row.start_date === row.end_date
          ? startDate.toLocaleDateString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\//g, '/')
          : `${startDate.toLocaleDateString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\//g, '/')} - ${endDate.toLocaleDateString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).replace(/\//g, '/')}`

      const now = new Date()
      const created = new Date(row.created_at)
      const diffSeconds = Math.floor((now - created) / 1000)
      const timeStr = diffSeconds < 600 ? '剛剛' : created.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        location: row.location,
        status: row.status,
        tags: row.tags,
        date: dateStr,
        created_at: timeStr,
        people: `${row.current_people || 0}/${row.max_people || 2}`,
        image: row.banner_image,
        author_uid: row.author_uid,
        author: row.author_name,
        avatar: row.author_avatar,
        spiritAnimal: row.spirit_animal,
        likes: row.likes_count || 0,
        saves_count: row.saves_count || 0,
        views_count: row.views_count || 0,
        updated_at: row.updated_at,
      }
    })

    res.json({
      success: true,
      data: formattedData,
      total: result.rowCount,
    })
  } catch (error) {
    console.error('❌ 獲取旅伴列表錯誤：', error)
    console.error('❌ 錯誤代碼:', error.code)
    console.error('❌ 錯誤位置:', error.position)
    console.error('❌ 錯誤詳情:', error.detail)
    console.error('❌ 錯誤提示:', error.hint)

    res.status(500).json({
      success: false,
      message: '獲取旅伴列表失敗',
      error: error.message,
      code: error.code,
      position: error.position,
      detail: error.detail,
      hint: error.hint,
    })
  }
})

router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID 格式錯誤',
        details: 'id 必須是正整數',
      })
    }

    const updateResult = await pool.query(
      'UPDATE travelers.travelers SET views_count = views_count + 1 WHERE id = $1 AND deleted_at IS NULL',
      [idNum]
    )

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文',
      })
    }

    res.json({
      success: true,
      message: '瀏覽次數已更新',
    })
  } catch (error) {
    console.error('更新瀏覽次數錯誤：', error)
    res.status(500).json({
      success: false,
      message: '更新瀏覽次數失敗',
      error: error.message,
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { user_uid } = req.query

    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID 格式錯誤',
        details: 'id 必須是正整數',
      })
    }

    console.log('獲取旅伴詳情，ID:', idNum)

    const travelerQuery = `
      SELECT
        id,
        title,
        content,
        location,
        status,
        tags,
        CASE
          WHEN start_date = end_date THEN TO_CHAR(start_date, 'YYYY/MM/DD')
          ELSE TO_CHAR(start_date, 'YYYY/MM/DD') || ' - ' || TO_CHAR(end_date, 'YYYY/MM/DD')
        END AS "date",
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - created_at)) < 600 THEN '剛剛'
          ELSE TO_CHAR(created_at, 'YYYY/MM/DD HH24:MI')
        END AS "created_at",
        current_people::text || '/' || max_people::text AS "people",
        banner_image AS "image",
        author_uid,
        author_name AS "author",
        author_avatar AS "avatar",
        spirit_animal AS "spiritAnimal",
        likes_count AS "likes",
        views_count
      FROM travelers.travelers
      WHERE id = $1 AND deleted_at IS NULL
    `

    const travelerResult = await pool.query(travelerQuery, [idNum])

    if (travelerResult.rows.length === 0) {
      console.log('找不到旅伴 ID:', idNum)
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文',
      })
    }

    const traveler = travelerResult.rows[0]
    console.log('找到旅伴:', traveler.title)

    const itineraryResult = await pool.query(
      'SELECT day_number, date, activities FROM travelers.traveler_itineraries WHERE traveler_id = $1 ORDER BY day_number',
      [idNum],
    )

    const packingResult = await pool.query(
      'SELECT category, items FROM travelers.traveler_packing_lists WHERE traveler_id = $1 ORDER BY id',
      [idNum],
    )

    const commentsResult = await pool.query(
      `SELECT
        id, author_uid, author_name, author_avatar, content,
        likes_count, created_at
      FROM public.comments
      WHERE post_type = 'traveler'
        AND post_id = $1
        AND parent_comment_id IS NULL
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50`,
      [idNum],
    )

    let isLiked = false
    if (user_uid) {
      const likeResult = await pool.query(
        'SELECT id FROM public.likes WHERE post_id = $1 AND author_uid = $2 AND board = $3',
        [idNum, user_uid, 'traveler'],
      )
      isLiked = likeResult.rows.length > 0
    }

    await pool.query('UPDATE travelers.travelers SET views_count = views_count + 1 WHERE id = $1 AND deleted_at IS NULL', [idNum])

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

router.post('/', async (req, res) => {
  try {
    console.log('🟢 [Backend Travelers POST] ========== 開始 ==========')
    console.log('🟢 [Backend Travelers POST] 收到請求 Body:', JSON.stringify(req.body, null, 2))

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

    if (!title || !content || !location || !start_date || !end_date || !author_uid) {
      console.log('❌ [Backend Travelers POST] 缺少必填欄位')
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位',
        required: ['title', 'content', 'location', 'start_date', 'end_date', 'author_uid'],
        received: {
          hasTitle: !!title,
          hasContent: !!content,
          hasLocation: !!location,
          hasStartDate: !!start_date,
          hasEndDate: !!end_date,
          hasAuthorUid: !!author_uid,
        },
      })
    }

    console.log('✅ [Backend Travelers POST] 必填欄位驗證通過')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      console.log('🟢 [Backend Travelers POST] 開始資料庫事務')

      console.log('🟢 [Backend Travelers POST] 準備插入主表')
      console.log('📊 [Backend Travelers POST] 插入資料:', {
        title: title?.substring(0, 50),
        contentLength: content?.length,
        location,
        start_date,
        end_date,
        max_people,
        author_uid,
        tagsCount: Array.isArray(tags) ? tags.length : 0,
      })

      const travelerResult = await client.query(
        `INSERT INTO travelers.travelers (
          title, content, banner_image, location, start_date, end_date,
          max_people, author_uid, author_name, author_avatar, spirit_animal, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          title,
          content,
          banner_image || null,
          location,
          start_date,
          end_date,
          max_people || 2,
          author_uid,
          author_name || null,
          author_avatar || null,
          spirit_animal || null,
          Array.isArray(tags) ? tags : [],
        ],
      )

      const travelerId = travelerResult.rows[0].id
      console.log('✅ [Backend Travelers POST] 主表插入成功，ID:', travelerId)

      if (itinerary && itinerary.days && Array.isArray(itinerary.days)) {
        console.log('🟢 [Backend Travelers POST] 插入行程規劃，天數:', itinerary.days.length)
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO travelers.traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
            [
              travelerId,
              day.day || day.day_number,
              day.date,
              Array.isArray(day.activities) ? JSON.stringify(day.activities) : '[]',
            ],
          )
        }
      }

      if (packingList && Array.isArray(packingList)) {
        console.log('🟢 [Backend Travelers POST] 插入打包清單，項目數:', packingList.length)
        for (let i = 0; i < packingList.length; i++) {
          await client.query(
            `INSERT INTO travelers.traveler_packing_lists (traveler_id, category, items) VALUES ($1, $2, $3)`,
            [
              travelerId,
              packingList[i].category,
              Array.isArray(packingList[i].items) ? JSON.stringify(packingList[i].items) : '[]',
            ],
          )
        }
      }

      await client.query('COMMIT')
      console.log('✅ [Backend Travelers POST] 事務提交成功')
      console.log('🟢 [Backend Travelers POST] ========== 完成 ==========')
      res.status(201).json({ success: true, message: '旅伴貼文建立成功', data: { id: travelerId } })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ [Backend Travelers POST] 資料庫錯誤，已回滾')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ [Backend Travelers POST] ========== 失敗 ==========')
    console.error('❌ [Backend Travelers POST] 錯誤類型:', error.name)
    console.error('❌ [Backend Travelers POST] 錯誤訊息:', error.message)
    console.error('❌ [Backend Travelers POST] 錯誤代碼:', error.code)
    console.error('❌ [Backend Travelers POST] 錯誤詳情:', error.detail)
    console.error('❌ [Backend Travelers POST] 錯誤堆疊:', error.stack)
    console.error('❌ [Backend Travelers POST] 請求 Body:', JSON.stringify(req.body, null, 2))

    res.status(500).json({
      success: false,
      message: '建立旅伴貼文失敗',
      error: error.message,
      code: error.code,
      detail: error.detail,
    })
  }
})

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
        const updateQuery = `UPDATE travelers.travelers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`
        const result = await client.query(updateQuery, updateValues)
        if (result.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({ success: false, message: '找不到此旅伴貼文' })
        }
      }

      if (itinerary && itinerary.days) {
        await client.query('DELETE FROM travelers.traveler_itineraries WHERE traveler_id = $1', [id])
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO travelers.traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
            [id, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
      }

      if (packingList) {
        await client.query('DELETE FROM travelers.traveler_packing_lists WHERE traveler_id = $1', [id])
        for (let i = 0; i < packingList.length; i++) {
          await client.query(
            `INSERT INTO travelers.traveler_packing_lists (traveler_id, category, items) VALUES ($1, $2, $3)`,
            [id, packingList[i].category, JSON.stringify(packingList[i].items)],
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

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `UPDATE travelers.travelers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: '找不到此貼文或已被刪除' })
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
