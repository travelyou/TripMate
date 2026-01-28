const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

const { authenticate } = require('../middleware/auth')

router.get('/', async (req, res) => {
  try {
    const { ids, board } = req.query || {}

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
        location,
        category,
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
      destinations: row.location ? [row.location] : [],
    }))

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  if (!id || (isNaN(Number(id)) && !id.match(/^[0-9a-f-]{36}$/i))) {
    return res.status(400).json({
      success: false,
      message: '無效的行程 ID'
    })
  }

  try {
    const itineraryQuery = `
      SELECT
        i.id, i.title, i.price, i.agency_name as "agencyName",
        i.start_date,
        i.end_date,
        COALESCE(i.end_date - i.start_date + 1, 1) as "durationDays",
        i.banner_image as "coverImage",
        i.location,
        i.content as description,
        i.tags,
        i.views_count as "totalViews",
        i.saves_count as "totalSaves",
        i.likes_count as likes,
        i.author_uid,
        COALESCE(u.nickname, i.author_name) as author_name,
        COALESCE(u.avatar, i.author_avatar) as author_avatar,
        u.spirit_animal as author_spirit_animal
      FROM itinerary.itineraries i
      LEFT JOIN public.users u ON i.author_uid = u.uid
      WHERE i.id = $1
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
    res.status(500).json({ success: false, message: 'Server Error' })
  }
})

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
      category,
      max_people,
    } = req.body

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: '請提供開始與結束日期' })
    }

    await client.query('BEGIN')

    const insertItineraryQuery = `
      INSERT INTO itinerary.itineraries
      (title, content, location, banner_image, price, agency_name, start_date, end_date, tags, category, max_people, author_uid, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING id
    `

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
      category || null,
      max_people || 20,
      req.user.uid,
      'published',
    ]

    const itineraryResult = await client.query(insertItineraryQuery, itineraryValues)
    const newItineraryId = itineraryResult.rows[0].id

    if (itinerary && itinerary.days) {
      const dayInsertQuery = `INSERT INTO itinerary.itinerary_days (itinerary_id, day_number, activities, created_at) VALUES ($1, $2, $3, NOW())`
      for (const day of itinerary.days) {
        const activitiesJson =
          typeof day.activities === 'string' ? day.activities : JSON.stringify(day.activities)

        await client.query(dayInsertQuery, [newItineraryId, day.day, activitiesJson])
      }
    }

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
    res.status(500).json({ success: false, message: 'Create failed', error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
