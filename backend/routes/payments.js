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
      paymentUrl: `http://localhost:3000/api/payments/mock-pay?orderId=${encodeURIComponent(orderId)}`,
    })
  } catch (err) {
    console.error('[POST /api/payments/create] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

/**
 * GET /api/payments/mock-pay?orderId=xxx
 * 模擬使用者完成付款
 *
 * 這裡會：
 * 1) 把最新一筆該訂單的 payment 改成 PAID
 * 2) 把 commerce.orders.status 改成 PAID
 */

router.get('/mock-pay', async (req, res) => {
  const client = await pool.connect()
  try {
    const { orderId } = req.query || {}
    if (!orderId) return res.status(400).json({ ok: false, message: 'orderId is required' })

    await client.query('BEGIN')

    // 1) 鎖定訂單，避免同時有人對同一筆訂單 mock-pay
    const orderResult = await client.query(
      `SELECT id, status
       FROM commerce.orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId],
    )

    if (orderResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'order not found' })
    }

    const order = orderResult.rows[0]

    // 可選：避免重複付款（看你需求）
    if (order.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: 'order already paid', orderId })
    }

    // 2) 更新「最新一筆 payment」為 PAID
    //    用 RETURNING 確認真的有更新到
    const payResult = await client.query(
      `UPDATE commerce.payments
       SET status = 'PAID', updated_at = NOW()
       WHERE id = (
         SELECT id
         FROM commerce.payments
         WHERE order_id = $1
         ORDER BY created_at DESC
         LIMIT 1
       )
       RETURNING id, status`,
      [orderId],
    )

    if (payResult.rowCount === 0) {
      // 代表這個 order 根本沒有 payment 可更新
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: 'payment not found for this order', orderId })
    }

    // 3) 更新訂單狀態為 PAID（同樣檢查）
    const orderUpdate = await client.query(
      `UPDATE commerce.orders
       SET status = 'PAID', updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [orderId],
    )

    if (orderUpdate.rowCount === 0) {
      // 理論上不會發生，因為前面 FOR UPDATE 已確認存在
      throw new Error('order update failed unexpectedly')
    }

    await client.query('COMMIT')

    return res.json({
      ok: true,
      message: 'mock payment success',
      orderId,
      paymentId: payResult.rows[0].id,
    })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (e) {
      // rollback 也可能失敗，但至少不要讓它吃掉原錯誤
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
