const express = require('express')
const router = express.Router()
const pool = require('../database/connection') // 你們 connection.js export 的 pool

function generateOrderNo() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '') // HHMMSS
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TM-${date}-${time}-${rand}`
}

/**
 * POST /api/orders/from-cart
 * body: { itineraryId?, contact?, emergencyContact?, paymentMethod? }
 *
 * 流程：
 * 1) 讀取 active cart 的 cart_items（預設 user_id=1）
 * 2) 選擇要結帳的 itinerary（若未提供 itineraryId，取第一筆）
 * 3) 後端查 itinerary.itineraries 拿 price/title
 * 4) 建立 commerce.orders（PENDING）
 * 5) （可選）建立 commerce.payments（INIT）
 * 6) 從購物車移除該項目（或改成清空整車）
 */
router.post('/from-cart', async (req, res) => {
  const client = await pool.connect()
  try {
    const { itineraryId, contact, emergencyContact, paymentMethod = 'mock' } = req.body || {}

    // 先不做登入：固定 user_id=1（之後換成 req.user.id / Firebase uid）
    const userId = 1

    await client.query('BEGIN')

    // 1) 找 active cart（沒有就代表購物車是空的）
    const cartR = await client.query(
      `SELECT id
      FROM commerce.carts
      WHERE user_id=$1 AND status='active'
      LIMIT 1`,
      [userId],
    )

    if (cartR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, message: 'cart is empty (no active cart)' })
    }

    const cartId = cartR.rows[0].id

    // 2) 讀 cart_items：可指定 itineraryId，不指定就取第一筆
    let itemR
    if (itineraryId) {
      itemR = await client.query(
        `SELECT itinerary_id AS "itineraryId", persons
        FROM commerce.cart_items
        WHERE cart_id=$1 AND itinerary_id=$2
        LIMIT 1`,
        [cartId, itineraryId],
      )
    } else {
      itemR = await client.query(
        `SELECT itinerary_id AS "itineraryId", persons
        FROM commerce.cart_items
        WHERE cart_id=$1
        ORDER BY id ASC
        LIMIT 1`,
        [cartId],
      )
    }

    if (itemR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, message: 'cart item not found' })
    }

    const item = itemR.rows[0]
    const p = Number(item.persons)
    if (!Number.isInteger(p) || p <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ ok: false, message: 'invalid persons in cart' })
    }

    // 3) 後端查 itinerary（用你現有 schema：itinerary.itineraries）
    const itR = await client.query(
      `SELECT id, title, price, status
      FROM itinerary.itineraries
      WHERE id=$1`,
      [item.itineraryId],
    )
    if (itR.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'itinerary not found' })
    }

    const itinerary = itR.rows[0]
    const unitPrice = Number(itinerary.price)
    const amount = unitPrice * p

    // 4) 建立訂單
    const orderNo = generateOrderNo()
    const userUid = null // 之後接登入再改

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

    // 5) （可選）建立一筆 payment INIT（方便接你現有 payments flow）
    const payIns = await client.query(
      `INSERT INTO commerce.payments (order_id, provider, method, amount, status)
      VALUES ($1, $2, $3, $4, 'INIT')
      RETURNING id`,
      [order.id, paymentMethod, paymentMethod, Number(order.amount)],
    )
    const paymentId = payIns.rows[0]?.id

    // 6) 從購物車移除該項（你們一次只結帳一個行程，移除該項就好）
    await client.query(
      `DELETE FROM commerce.cart_items
      WHERE cart_id=$1 AND itinerary_id=$2`,
      [cartId, itinerary.id],
    )

    // （可選）如果購物車已空，把 carts.status 改掉，避免一直 active
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
      paymentId,
      item: {
        itineraryId: itinerary.id,
        title: itinerary.title,
        unitPrice,
        persons: p,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /api/orders/from-cart] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/orders
 * body: { itineraryId, persons, contact, emergencyContact }
 * 建單流程：
 * 1) 查 itinerary.itineraries 取得 price/title
 * 2) 後端計算 amount
 * 3) 寫入 commerce.orders
 */

router.post('/', async (req, res) => {
  try {
    const { itineraryId, persons, contact, emergencyContact } = req.body || {}

    if (!itineraryId || !persons) {
      return res.status(400).json({ ok: false, message: 'itineraryId and persons are required' })
    }

    const p = Number(persons)
    if (!Number.isInteger(p) || p <= 0) {
      return res.status(400).json({ ok: false, message: 'persons must be a positive integer' })
    }

    // 1) 後端查 itinerary（注意：你們行程表在 itinerary schema）
    const it = await pool.query(
      'SELECT id, title, price, status FROM itinerary.itineraries WHERE id = $1',
      [itineraryId],
    )

    if (it.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'itinerary not found' })
    }

    const itinerary = it.rows[0]
    const unitPrice = Number(itinerary.price)
    const amount = unitPrice * p

    // 2) 建立訂單（寫入 commerce.orders）
    const orderNo = generateOrderNo()

    // 若尚未接登入，先存 null；之後可以換成 Firebase uid
    const userUid = null

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
    console.error('[POST /api/orders] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

/**
 * GET /api/orders/:id
 * 用途：前端 Step5 Done 查詢訂單狀態/金額/行程資訊
 */

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid order id' })
    }

    // 訂單主檔 + 行程資訊（跨 schema join）
    const q = await pool.query(
      `SELECT
        o.id,
        o.order_no,
        o.status,
        o.amount,
        o.unit_price,
        o.persons,
        o.itinerary_id,
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
      return res.status(404).json({ ok: false, message: 'order not found' })
    }

    const row = q.rows[0]

    // （可選）把付款狀態也帶回來：取最新一筆 payment
    const p = await pool.query(
      `SELECT id, provider, method, amount, status, created_at
      FROM commerce.payments
      WHERE order_id = $1
      ORDER BY created_at DESC
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
    console.error('[GET /api/orders/:id] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

module.exports = router
