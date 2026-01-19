const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const crypto = require('crypto')
const axios = require('axios')

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

// 測試 router 是否有正常運作
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'payments 路由運作中' })
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
  const client = await pool.connect()
  try {
    const { orderId, paymentMethod = 'mock' } = req.body || {}

    if (!orderId) {
      return res.status(400).json({ ok: false, message: '需要提供 orderId' })
    }

    await client.query('BEGIN')

    // 1) 確認訂單存在（並鎖定，避免同時付款/重複付款）
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

    // 若已付款，避免重複建立付款單
    if (order.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: '訂單已付款' })
    }

    // 2) 建立 payment（INIT）
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

    // ===== LINE PAY 分流 =====
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

      // 1) 先用正則「以字串」抓 transactionId（不經 JSON.parse → 不會變 number）
      const mTid = raw.match(/"transactionId"\s*:\s*(\d{10,30})/)
      const transactionId = mTid ? mTid[1] : ''

      // 2) 其他欄位可以再 JSON.parse（就算 transactionId 會失真也沒關係，我們不用它）
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

      console.log('[linepay request]', transactionId, transactionId.length)

      if (!transactionId || !webUrl) {
        await client.query('ROLLBACK')
        return res
          .status(500)
          .json({ ok: false, message: 'LINE Pay 回傳缺少 transactionId 或 paymentUrl' })
      }

      // 把 transactionId 存回 payment
      await client.query(
        `UPDATE commerce.payments
        SET transaction_id=$1, updated_at=NOW()
        WHERE id=$2`,
        [transactionId, paymentId],
      )
      await client.query('COMMIT')

      console.log(
        '[linepay request]',
        `交易id：${transactionId}`,
        `id字元長度：${transactionId.length}`,
      )

      return res.json({
        ok: true,
        provider: 'linepay',
        paymentId,
        orderId,
        transactionId,
        paymentUrl: webUrl,
      })
    }

    // ===== 非 LINE PAY（mock / credit / bank ...）=====
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
    } catch {}
    console.error('[POST /api/payments/create] error:', err)
    return res.status(500).json({ ok: false, message: err?.message || '伺服器錯誤' })
  } finally {
    client.release()
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
    if (!paymentId) return res.status(400).json({ ok: false, message: '需要提供 paymentId' })

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
      return res.status(404).json({ ok: false, message: '找不到付款資料' })
    }

    const payment = p.rows[0]

    // 已付款就不重複
    if (payment.status === 'PAID') {
      await client.query('ROLLBACK')
      return res.status(409).json({ ok: false, message: '付款已完成', paymentId })
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
      return res.status(404).json({ ok: false, message: '此付款找不到對應的訂單' })
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
      message: '模擬付款成功',
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
    return res.status(500).json({ ok: false, message: '伺服器錯誤' })
  } finally {
    client.release()
  }
})

/**
 * GET /api/payments/linepay/confirm?orderId=xxx&paymentId=yyy
 * 使用者從 LINE Pay 付款頁面完成付款後會被導回這裡
 *
 * 這裡會：
 * 1) 呼叫 LINE Pay confirm API
 * 2) 把 commerce.payments 改成 PAID
 * 3) 把 commerce.orders.status 改成 PAID
 * 4) 導回前端 Step5
 */

router.get('/linepay/confirm', async (req, res) => {
  const client = await pool.connect()
  try {
    const { orderId, paymentId } = req.query || {}
    if (!orderId || !paymentId) return res.status(400).send('遺失 orderId/paymentId')

    await client.query('BEGIN')

    // 鎖 payment + 取 transaction_id
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

    // Confirm
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
    // 更新 payment + order
    await client.query(
      `UPDATE commerce.payments
    SET status = 'PAID'
    WHERE id = $1`,
      [paymentId],
    )

    await client.query(
      `UPDATE commerce.orders
    SET status = 'PAID'
    WHERE id = $1`,
      [pay.orderId],
    )

    // 導回前端 Step5
    return res.redirect(
      `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/checkout/step5?orderId=${encodeURIComponent(pay.orderId)}`,
    )
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    console.error(e)
    return res.status(500).send('server error')
  } finally {
    client.release()
  }
})

/**
 * GET /api/payments/linepay/cancel?orderId=xxx&paymentId=yyy
 * 使用者從 LINE Pay 付款頁面取消付款會被導回這裡
 *
 * 這裡會：
 * 1) 導回前端 Step4
 */

router.get('/linepay/cancel', async (req, res) => {
  const { orderId } = req.query || {}
  return res.redirect(
    `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/checkout/step4?orderId=${encodeURIComponent(orderId || '')}`,
  )
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
