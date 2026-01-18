const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 測試 router 是否有正常運作
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'payments router working' })
})

/**
 * POST /api/payments/create
 * 前端帶：orderId, paymentMethod
 * 後端回：paymentUrl（先用 mock）
 *
 * 這裡會：
 * 1) 檢查 commerce.orders 是否存在
 * 2) 建立一筆 commerce.payments（INIT）
 * 3) 回傳 mock 付款網址
 */

router.post('/create', async (req, res) => {
  try {
    const { orderId, paymentMethod = 'mock' } = req.body || {}

    if (!orderId) {
      return res.status(400).json({ ok: false, message: 'orderId is required' })
    }

    // 1) 確認訂單存在
    const o = await pool.query('SELECT id, amount, status FROM commerce.orders WHERE id = $1', [
      orderId,
    ])
    if (o.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'order not found' })
    }

    const order = o.rows[0]

    // 若已付款，避免重複建立付款單（你也可以允許重試，這裡先保守）
    if (order.status === 'PAID') {
      return res.status(409).json({ ok: false, message: 'order already paid' })
    }

    // 2) 建立 payment（INIT）
    // 假設 commerce.payments 欄位至少有：order_id, provider, method, amount, status, created_at
    const pay = await pool.query(
      `INSERT INTO commerce.payments (order_id, provider, method, amount, status)
      VALUES ($1, $2, $3, $4, 'INIT')
      RETURNING id`,
      [orderId, paymentMethod, paymentMethod, Number(order.amount)],
    )

    const paymentId = pay.rows[0]?.id

    // 3) 回傳 mock paymentUrl
    return res.json({
      ok: true,
      orderId,
      paymentId,
      paymentMethod,
      paymentUrl: `http://localhost:3000/api/payments/mock-pay?paymentId=${encodeURIComponent(paymentId)}`,
    })
  } catch (err) {
    console.error('[POST /api/payments/create] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

/**
 * GET /api/payments/mock-pay?paymentId=xxx
 * 模擬使用者完成付款
 *
 * 這裡會：
 * 1) 把最新一筆該訂單的 payment 改成 PAID
 * 2) 把 commerce.orders.status 改成 PAID
 */

router.get('/mock-pay', async (req, res) => {
  const client = await pool.connect()
  try {
    const { paymentId } = req.query || {}
    if (!paymentId) return res.status(400).json({ ok: false, message: 'paymentId is required' })

    await client.query('BEGIN')

    // 1) 鎖定這筆 payment，並取得 orderId
    const p = await client.query(
      `SELECT id, order_id AS "orderId", status
        FROM commerce.payments
        WHERE id = $1
        FOR UPDATE`,
      [paymentId],
    )
    if (p.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'payment not found' })
    }

    const payment = p.rows[0]

    // 已付款就不重複
    if (payment.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: 'payment already paid', paymentId })
    }

    // 2) 鎖定訂單
    const o = await client.query(
      `SELECT id, status
        FROM commerce.orders
        WHERE id = $1
        FOR UPDATE`,
      [payment.orderId],
    )
    if (o.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'order not found for this payment' })
    }

    // 3) 更新 payment 為 PAID
    await client.query(
      `UPDATE commerce.payments
        SET status='PAID', updated_at=NOW()
        WHERE id=$1`,
      [paymentId],
    )

    // 4) 更新 order 為 PAID
    await client.query(
      `UPDATE commerce.orders
        SET status='PAID', updated_at=NOW()
        WHERE id=$1`,
      [payment.orderId],
    )

    await client.query('COMMIT')

    return res.json({
      ok: true,
      message: 'mock payment success',
      orderId: payment.orderId,
      paymentId,
    })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (e) {
      console.error('[mock-pay] rollback error:', e)
    }
    console.error('[GET /api/payments/mock-pay] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/payments/webhook
 * 真金流會呼叫這支（server-to-server）
 * 目前先印出來確認「收得到」
 */

router.post('/webhook', (req, res) => {
  console.log('[payments webhook] body:', req.body)
  res.json({ ok: true })
})

module.exports = router
