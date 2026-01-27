const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const crypto = require('crypto')
const axios = require('axios')

function getFrontendBaseUrl() {
  return process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
}

function linepayHeaders({ channelSecret, uri, body }) {
  if (!channelSecret || typeof channelSecret !== 'string') {
    throw new Error('遺失 LINEPAY_CHANNEL_SECRET (檢查 backend/.env 和 dotenv config)')
  }
  if (!process.env.LINEPAY_CHANNEL_ID) {
    throw new Error('遺失 LINEPAY_CHANNEL_ID (檢查 backend/.env 和 dotenv config)')
  }

  const nonce = crypto.randomUUID()
  const bodyStr = body ? JSON.stringify(body) : ''
  const signTarget = channelSecret + uri + bodyStr + nonce
  const signature = crypto.createHmac('sha256', channelSecret).update(signTarget).digest('base64')

  return {
    'Content-Type': 'application/json',
    'X-LINE-ChannelId': process.env.LINEPAY_CHANNEL_ID,
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': signature,
  }
}

router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'payments 路由運作中' })
})

router.post('/report-bank', async (req, res) => {
  const client = await pool.connect()
  try {
    const { orderId, last5 } = req.body || {}
    const id = Number(orderId)
    const last5Str = String(last5 || '').trim()

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: 'orderId 無效' })
    }
    if (!/^\d{5}$/.test(last5Str)) {
      return res.status(400).json({ ok: false, message: '末 5 碼格式錯誤' })
    }

    await client.query('BEGIN')

    const p = await client.query(
      `SELECT id, status
      FROM commerce.payments
      WHERE order_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE`,
      [id],
    )

    if (p.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: '找不到付款紀錄' })
    }

    const paymentId = p.rows[0].id

    await client.query(
      `UPDATE commerce.payments
      SET payer_meta = jsonb_build_object('last5', $1::text),
          status = 'REVIEW',
          updated_at = NOW()
      WHERE id = $2`,
      [last5Str, paymentId],
    )

    await client.query(
      `UPDATE commerce.orders
      SET status = 'REVIEW',
          updated_at = NOW()
      WHERE id = $1`,
      [id],
    )

    await client.query('COMMIT')

    return res.json({ ok: true, orderId: id, paymentId, last5: last5Str })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
    }
    return res.status(500).json({ ok: false, message: '伺服器錯誤' })
  } finally {
    client.release()
  }
})

router.post('/create', async (req, res) => {
  const client = await pool.connect()
  try {
    const { orderId, paymentMethod = 'mock' } = req.body || {}

    if (!orderId) {
      return res.status(400).json({ ok: false, message: '需要提供 orderId' })
    }

    await client.query('BEGIN')

    const o = await client.query(
      `SELECT id, amount, status
        FROM commerce.orders
        WHERE id = $1
        FOR UPDATE`,
      [orderId],
    )

    if (o.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: '找不到訂單' })
    }

    const order = o.rows[0]

    if (order.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: '訂單已付款' })
    }

    const pay = await client.query(
      `INSERT INTO commerce.payments (order_id, provider, method, amount, status)
        VALUES ($1, $2, $3, $4, 'INIT')
        RETURNING id`,
      [orderId, paymentMethod, paymentMethod, Number(order.amount)],
    )

    const paymentId = pay.rows[0]?.id
    if (!paymentId) {
      await client.query('ROLLBACK')
      return res.status(500).json({ ok: false, message: '建立付款單失敗' })
    }

    if (paymentMethod === 'bank') {
      await client.query(
        `UPDATE commerce.payments
        SET status='PENDING', updated_at=NOW()
        WHERE id=$1`,
        [paymentId],
      )
      await client.query(
        `UPDATE commerce.orders
        SET status='PENDING', updated_at=NOW()
        WHERE id=$1`,
        [orderId],
      )

      await client.query('COMMIT')

      return res.json({
        ok: true,
        orderId,
        paymentId,
        paymentMethod,
        status: 'PENDING',
      })
    }

    if (paymentMethod === 'linepay') {
      const publicBase = process.env.PUBLIC_BASE_URL
      const apiBase = process.env.LINEPAY_API_BASE || 'https://sandbox-api-pay.line.me'

      if (!publicBase) {
        await client.query('ROLLBACK')
        return res
          .status(500)
          .json({ ok: false, message: 'PUBLIC_BASE_URL 未設定（需要用 ngrok https 網址）' })
      }

      const orderIdStr = String(orderId)
      const amount = Number(order.amount)

      const requestBody = {
        amount,
        currency: 'TWD',
        orderId: orderIdStr,
        packages: [
          {
            id: 'pkg-1',
            amount,
            products: [
              {
                name: `Order ${orderIdStr}`,
                quantity: 1,
                price: amount,
              },
            ],
          },
        ],
        redirectUrls: {
          confirmUrl: `${publicBase}/api/payments/linepay/confirm?orderId=${encodeURIComponent(orderIdStr)}&paymentId=${encodeURIComponent(paymentId)}`,
          cancelUrl: `${publicBase}/api/payments/linepay/cancel?orderId=${encodeURIComponent(orderIdStr)}&paymentId=${encodeURIComponent(paymentId)}`,
        },
      }

      const uri = '/v3/payments/request'
      const headers = linepayHeaders({
        channelSecret: process.env.LINEPAY_CHANNEL_SECRET,
        uri,
        body: requestBody,
      })
      const lpRes = await axios.post(`${apiBase}${uri}`, requestBody, {
        headers,
        responseType: 'text',
        transformResponse: [(d) => d], // 保留原始字串
      })

      const raw = lpRes.data

      const mTid = raw.match(/"transactionId"\s*:\s*(\d{10,30})/)
      const transactionId = mTid ? mTid[1] : ''

      let lp
      try {
        lp = JSON.parse(raw)
      } catch (e) {
        await client.query('ROLLBACK')
        return res.status(500).json({ ok: false, message: 'LINE Pay response parse failed', raw })
      }

      if (lp?.returnCode !== '0000') {
        await client.query('ROLLBACK')
        return res.status(400).json({
          ok: false,
          message: lp?.returnMessage || 'LINE Pay request failed',
          raw: lp,
        })
      }

      const webUrl = lp?.info?.paymentUrl?.web

      if (!transactionId || !webUrl) {
        await client.query('ROLLBACK')
        return res.status(500).json({
          ok: false,
          message: 'LINE Pay 回傳缺少 transactionId 或 paymentUrl',
          debug: { transactionId, webUrl },
        })
      }

      await client.query(
        `UPDATE commerce.payments
        SET transaction_id=$1, updated_at=NOW()
        WHERE id=$2`,
        [transactionId, paymentId],
      )
      await client.query('COMMIT')

      return res.json({
        ok: true,
        provider: 'linepay',
        paymentId,
        orderId,
        transactionId,
        paymentUrl: webUrl,
      })
    }

    await client.query('COMMIT')

    return res.json({
      ok: true,
      orderId,
      paymentId,
      paymentMethod,
      paymentUrl: `http://localhost:3000/api/payments/mock-pay?paymentId=${encodeURIComponent(paymentId)}`,
    })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
    }
    return res.status(500).json({ ok: false, message: err?.message || '伺服器錯誤' })
  } finally {
    client.release()
  }
})

router.get('/mock-pay', async (req, res) => {
  const client = await pool.connect()
  try {
    const { paymentId } = req.query || {}
    if (!paymentId) return res.status(400).json({ ok: false, message: '需要提供 paymentId' })

    await client.query('BEGIN')

    const p = await client.query(
      `SELECT id, order_id AS "orderId", status
        FROM commerce.payments
        WHERE id = $1
        FOR UPDATE`,
      [paymentId],
    )
    if (p.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: '找不到付款資料' })
    }

    const payment = p.rows[0]

    if (payment.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: '付款已完成', paymentId })
    }

    const o = await client.query(
      `SELECT id, status
        FROM commerce.orders
        WHERE id = $1
        FOR UPDATE`,
      [payment.orderId],
    )
    if (o.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, message: '此付款找不到對應的訂單' })
    }

    await client.query(
      `UPDATE commerce.payments
        SET status='PAID', updated_at=NOW()
        WHERE id=$1`,
      [paymentId],
    )

    await client.query(
      `UPDATE commerce.orders
        SET status='PAID', updated_at=NOW()
        WHERE id=$1`,
      [payment.orderId],
    )

    await client.query('COMMIT')

    return res.json({
      ok: true,
      message: '模擬付款成功',
      orderId: payment.orderId,
      paymentId,
    })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (e) {
    }
    return res.status(500).json({ ok: false, message: '伺服器錯誤' })
  } finally {
    client.release()
  }
})

router.get('/linepay/confirm', async (req, res) => {
  const client = await pool.connect()
  try {
    const { orderId, paymentId } = req.query || {}
    if (!orderId || !paymentId) return res.status(400).send('遺失 orderId/paymentId')

    await client.query('BEGIN')

    const p = await client.query(
      `SELECT id, order_id AS "orderId", amount, status, transaction_id
    FROM commerce.payments
    WHERE id=$1 AND order_id=$2
    FOR UPDATE`,
      [paymentId, orderId],
    )

    if (p.rowCount === 0) throw new Error('找不到付款資料')

    const pay = p.rows[0]
    if (!pay.transaction_id) throw new Error('付款資料缺少 transaction_id')

    const apiBase = process.env.LINEPAY_API_BASE || 'https://sandbox-api-pay.line.me'
    const uri = `/v3/payments/${pay.transaction_id}/confirm`

    const body = { amount: Number(pay.amount), currency: 'TWD' }
    const headers = linepayHeaders({
      channelSecret: process.env.LINEPAY_CHANNEL_SECRET,
      uri,
      body,
    })

    const lpRes = await axios.post(`${apiBase}${uri}`, body, { headers })
    const lp = lpRes.data

    if (lp?.returnCode !== '0000') {
      await client.query('ROLLBACK')
      return res.status(400).send(lp?.returnMessage || 'LINE Pay confirm failed')
    }
    await client.query(
      `UPDATE commerce.payments
    SET status = 'PAID',
        provider = 'linepay',
        method = 'linepay',
        updated_at = NOW()
    WHERE id = $1`,
      [paymentId],
    )

    await client.query(
      `UPDATE commerce.orders
    SET status = 'PAID',
        updated_at = NOW()
    WHERE id = $1`,
      [pay.orderId],
    )

    await client.query('COMMIT')

    return res.redirect(
      `${getFrontendBaseUrl()}/checkout/step5?orderId=${encodeURIComponent(pay.orderId)}`,
    )
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
    }
    return res.status(500).send('server error')
  } finally {
    client.release()
  }
})

router.get('/linepay/cancel', async (req, res) => {
  const { orderId } = req.query || {}
  return res.redirect(
    `${getFrontendBaseUrl()}/checkout/step4?orderId=${encodeURIComponent(orderId || '')}`,
  )
})

router.post('/webhook', (req, res) => {
  res.json({ ok: true })
})

module.exports = router
