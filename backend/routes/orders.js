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

    // ⚠️ 若尚未接登入，先存 null；之後可以換成 Firebase uid
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

module.exports = router
