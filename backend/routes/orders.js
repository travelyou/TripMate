const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { authenticate } = require('../middleware/auth')

router.use(authenticate)

function parseJSON(jsonString, fieldName) {
  if (typeof jsonString !== 'string') {
    return jsonString || null
  }
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    return null
  }
}

function generateOrderNo() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '') // HHMMSS
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TM-${date}-${time}-${rand}`
}

router.post('/from-cart', async (req, res) => {
  const client = await pool.connect()
  try {
    const { itineraryId, contact, emergencyContact } = req.body || {}

    const userId = 1

    await client.query('BEGIN')

    const cartR = await client.query(
      `SELECT id
      FROM commerce.carts
      WHERE user_id=$1 AND status='active'
      LIMIT 1
      FOR UPDATE
      `,
      [userId],
    )

    if (cartR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, message: '購物車是空的' })
    }

    const cartId = cartR.rows[0].id

    if (!itineraryId) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        ok: false,
        message: '行程編號 itineraryId 為必填欄位',
      })
    }

    const itemR = await client.query(
      `SELECT itinerary_id AS "itineraryId", persons
    FROM commerce.cart_items
    WHERE cart_id=$1 AND itinerary_id=$2
    LIMIT 1
    FOR UPDATE`,
      [cartId, itineraryId],
    )

    if (itemR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        ok: false,
        message: '找不到購物車內的該行程，無法結帳',
      })
    }

    const item = itemR.rows[0]
    const p = Number(item.persons)
    if (!Number.isInteger(p) || p <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, message: '購物車內的行程人數無效' })
    }

    const itR = await client.query(
      `SELECT id, title, price, status
      FROM itinerary.itineraries
      WHERE id=$1`,
      [item.itineraryId],
    )
    if (itR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: '行程不存在' })
    }

    const itinerary = itR.rows[0]
    const unitPrice = Number(itinerary.price)
    const amount = unitPrice * p

    const orderNo = generateOrderNo()
    const userUid = req.user?.uid || null

    const orderIns = await client.query(
      `INSERT INTO commerce.orders
        (order_no, user_uid, itinerary_id, persons, unit_price, amount, status, contact_json, emergency_contact_json)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, order_no, amount, status`,
      [
        orderNo,
        userUid,
        itinerary.id,
        p,
        unitPrice,
        amount,
        'PENDING',
        contact ? JSON.stringify(contact) : null,
        emergencyContact ? JSON.stringify(emergencyContact) : null,
      ],
    )

    const order = orderIns.rows[0]

    await client.query(
      `DELETE FROM commerce.cart_items
      WHERE cart_id=$1 AND itinerary_id=$2
      RETURNING itinerary_id
      `,
      [cartId, itinerary.id],
    )

    const left = await client.query(`SELECT 1 FROM commerce.cart_items WHERE cart_id=$1 LIMIT 1`, [
      cartId,
    ])
    if (left.rows.length === 0) {
      await client.query(
        `UPDATE commerce.carts SET status='checked_out', updated_at=NOW() WHERE id=$1`,
        [cartId],
      )
    }

    await client.query('COMMIT')

    return res.json({
      ok: true,
      orderId: order.id,
      orderNo: order.order_no,
      amount: Number(order.amount),
      status: order.status,
      item: {
        itineraryId: itinerary.id,
        title: itinerary.title,
        unitPrice,
        persons: p,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /orders/from-cart 錯誤:', err)
    return res.status(500).json({
      ok: false,
      message: '伺服器錯誤',
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    })
  } finally {
    client.release()
  }
})

router.post('/', async (req, res) => {
  try {
    const { itineraryId, persons, contact, emergencyContact } = req.body || {}

    if (!itineraryId || !persons) {
      return res
        .status(400)
        .json({ ok: false, message: '行程編號 itineraryId 與人數 persons 為必填欄位' })
    }

    const p = Number(persons)
    if (!Number.isInteger(p) || p <= 0) {
      return res.status(400).json({ ok: false, message: '人數必須為正整數' })
    }

    const it = await pool.query(
      'SELECT id, title, price, status FROM itinerary.itineraries WHERE id = $1',
      [itineraryId],
    )

    if (it.rows.length === 0) {
      return res.status(404).json({ ok: false, message: '行程不存在' })
    }

    const itinerary = it.rows[0]
    const unitPrice = Number(itinerary.price)
    const amount = unitPrice * p

    const orderNo = generateOrderNo()

    const userUid = req.user?.uid || null

    const insert = await pool.query(
      `INSERT INTO commerce.orders
        (order_no, user_uid, itinerary_id, persons, unit_price, amount, status, contact_json, emergency_contact_json)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, order_no, amount, status`,
      [
        orderNo,
        userUid,
        itinerary.id,
        p,
        unitPrice,
        amount,
        'PENDING',
        contact ? JSON.stringify(contact) : null,
        emergencyContact ? JSON.stringify(emergencyContact) : null,
      ],
    )

    const order = insert.rows[0]

    return res.json({
      ok: true,
      orderId: order.id,
      orderNo: order.order_no,
      amount: Number(order.amount),
      status: order.status,
      item: {
        itineraryId: itinerary.id,
        title: itinerary.title,
        unitPrice,
        persons: p,
      },
    })
  } catch (err) {
    console.error('POST /orders 錯誤:', err)
    return res.status(500).json({
      ok: false,
      message: '伺服器錯誤',
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const { userUid: userUidQuery } = req.query || {}
    const userUid = req.user?.uid || userUidQuery
    const limitRaw = Number(req.query?.limit)
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50

    const params = []
    let whereSql = ''
    if (userUid) {
      params.push(userUid)
      whereSql = `WHERE o.user_uid = $1`
    }

    params.push(limit)
    const limitIndex = params.length

    const sqlQuery = `
      SELECT
        o.id,
        o.order_no,
        o.status,
        o.amount,
        o.unit_price,
        o.persons,
        o.itinerary_id,
        o.contact_json,
        o.emergency_contact_json,
        o.created_at,
        i.title,
        i.start_date,
        i.end_date,
        i.location,
        i.banner_image,
        p.provider AS payment_provider,
        p.method AS payment_method,
        p.payer_meta AS payment_meta
      FROM commerce.orders o
      JOIN itinerary.itineraries i ON i.id = o.itinerary_id
      LEFT JOIN LATERAL (
        SELECT provider, method, status, created_at, payer_meta
        FROM commerce.payments
        WHERE order_id = o.id
        ORDER BY
          CASE status
            WHEN 'PAID' THEN 1
            ELSE 2
          END,
          created_at DESC
        LIMIT 1
      ) p ON true
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${limitIndex}`

    if (process.env.NODE_ENV === 'development') {
      console.log('GET /orders SQL:', sqlQuery)
      console.log('GET /orders params:', params)
    }

    const q = await pool.query(sqlQuery, params)

    const orders = q.rows.map((row) => ({
      id: row.id,
      orderNo: row.order_no,
      status: row.status,
      amount: Number(row.amount),
      unitPrice: Number(row.unit_price),
      persons: Number(row.persons),
      itineraryId: row.itinerary_id,
      createdAt: row.created_at,
      contact: parseJSON(row.contact_json, 'contact_json'),
      emergencyContact: parseJSON(row.emergency_contact_json, 'emergency_contact_json'),
        rating: null,
        comment: null,
        itinerary: {
        id: row.itinerary_id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        bannerImage: row.banner_image,
      },
      paymentMethod: row.payment_method || row.payment_provider || null,
      paymentMeta: row.payment_meta || null,
    }))

    return res.json({ ok: true, orders })
  } catch (err) {
    console.error('GET /orders 錯誤:', err)
    return res.status(500).json({
      ok: false,
      message: '伺服器錯誤',
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: '訂單 ID 無效' })
    }

    const q = await pool.query(
      `SELECT
        o.id,
        o.order_no,
        o.status,
        o.amount,
        o.unit_price,
        o.persons,
        o.itinerary_id,
        o.contact_json,
        o.emergency_contact_json,
        o.created_at,
        i.title,
        i.start_date,
        i.end_date,
        i.location,
        i.banner_image
      FROM commerce.orders o
      JOIN itinerary.itineraries i ON i.id = o.itinerary_id
      WHERE o.id = $1`,
      [id],
    )

    if (q.rows.length === 0) {
      return res.status(404).json({ ok: false, message: '訂單不存在' })
    }

    const row = q.rows[0]
    const contact = parseJSON(row.contact_json, 'contact_json')
    const emergencyContact = parseJSON(row.emergency_contact_json, 'emergency_contact_json')

    const p = await pool.query(
      `SELECT id, provider, method, amount, status, created_at
      FROM commerce.payments
      WHERE order_id = $1
      ORDER BY
        CASE status
          WHEN 'PAID' THEN 1
          ELSE 2
        END,
        created_at DESC
      LIMIT 1`,
      [id],
    )

    return res.json({
      ok: true,
      order: {
        id: row.id,
        orderNo: row.order_no,
        status: row.status,
        amount: Number(row.amount),
        unitPrice: Number(row.unit_price),
        persons: Number(row.persons),
        itineraryId: row.itinerary_id,
        contact,
        emergencyContact,
        rating: null,
        comment: null,
        createdAt: row.created_at,
      },
      itinerary: {
        id: row.itinerary_id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        bannerImage: row.banner_image,
      },
      latestPayment: p.rows[0]
        ? {
            id: p.rows[0].id,
            provider: p.rows[0].provider,
            method: p.rows[0].method,
            amount: Number(p.rows[0].amount),
            status: p.rows[0].status,
            createdAt: p.rows[0].created_at,
          }
        : null,
    })
  } catch (err) {
    console.error('GET /orders/:id 錯誤:', err)
    return res.status(500).json({
      ok: false,
      message: '伺服器錯誤',
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    })
  }
})

router.put('/:id/review', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: '訂單 ID 無效' })
    }

    const { rating, comment } = req.body

    if (rating !== null && rating !== undefined) {
      const ratingNum = Number(rating)
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ ok: false, message: '評分必須是 1-5 之間的整數' })
      }
    }

    const userUid = req.user?.uid
    if (!userUid) {
      return res.status(401).json({ ok: false, message: '未授權' })
    }

    const checkOrder = await pool.query(
      `SELECT id, user_uid, status, itinerary_id
       FROM commerce.orders
       WHERE id = $1`,
      [id],
    )

    if (checkOrder.rows.length === 0) {
      return res.status(404).json({ ok: false, message: '訂單不存在' })
    }

    const order = checkOrder.rows[0]

    if (order.user_uid !== userUid) {
      return res.status(403).json({ ok: false, message: '無權限修改此訂單' })
    }

    const itineraryQuery = await pool.query(
      `SELECT end_date FROM itinerary.itineraries WHERE id = $1`,
      [order.itinerary_id],
    )

    if (itineraryQuery.rows.length === 0) {
      return res.status(404).json({ ok: false, message: '行程不存在' })
    }

    const itinerary = itineraryQuery.rows[0]
    const endDate = new Date(itinerary.end_date)
    const now = new Date()

    if (endDate > now) {
      return res.status(400).json({ ok: false, message: '旅程尚未結束，無法評論' })
    }

    if (order.status !== 'PAID') {
      return res.status(400).json({ ok: false, message: '只有已付款的訂單才能評論' })
    }

    try {
      const updateQuery = await pool.query(
        `UPDATE commerce.orders
         SET rating = $1, comment = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, rating, comment`,
        [rating || null, comment || null, id],
      )

      return res.json({
        ok: true,
        order: {
          id: updateQuery.rows[0].id,
          rating: updateQuery.rows[0].rating ? Number(updateQuery.rows[0].rating) : null,
          comment: updateQuery.rows[0].comment || null,
        },
      })
    } catch (updateErr) {
      if (updateErr.message && updateErr.message.includes('column') &&
          (updateErr.message.includes('rating') || updateErr.message.includes('comment'))) {
        console.error('PUT /orders/:id/review 錯誤: 列不存在，请运行迁移脚本')
        return res.status(500).json({
          ok: false,
          message: '評價功能尚未啟用，請聯繫管理員添加 rating 和 comment 列到 commerce.orders 表',
          ...(process.env.NODE_ENV === 'development' && {
            error: updateErr.message,
            hint: '运行 migrations/add_rating_comment_to_orders.sql 来添加这些列'
          })
        })
      }
      throw updateErr
    }
  } catch (err) {
    console.error('PUT /orders/:id/review 錯誤:', err)
    return res.status(500).json({
      ok: false,
      message: '伺服器錯誤',
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    })
  }
})

module.exports = router
