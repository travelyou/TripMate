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

    // 1) 後端查 itinerary
    const it = await pool.query('SELECT id, title, price, status FROM itineraries WHERE id = $1', [
      itineraryId,
    ])

    if (it.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'itinerary not found or not active' })
    }

    const itinerary = it.rows[0]
    const unitPrice = Number(itinerary.price)
    const amount = unitPrice * p

    // 2) 建立訂單（這裡假設你有 orders 表；若還沒建，先回傳也可以）
    const orderNo = generateOrderNo()

    // ⚠️ 你們如果還沒做登入/uid，user_uid 先存 null
    const userUid = null

    const insert = await pool.query(
      `INSERT INTO orders (order_no, user_uid, itinerary_id, persons, unit_price, amount, status, contact_json, emergency_contact_json)
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

module.exports = router
