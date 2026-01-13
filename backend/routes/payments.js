const express = require('express');
const router = express.Router();

// 測試 router 是否有正常運作
router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'payments router working' });
});

/**
 * POST /api/payments/create
 * 前端會帶：orderId（以及可能的 paymentMethod）
 * 後端回：paymentUrl / 或給前端的付款參數（先用 mock）
 */
router.post('/create', async (req, res) => {
  const { orderId, paymentMethod = 'mock' } = req.body || {};

  if (!orderId) {
    return res.status(400).json({ ok: false, message: 'orderId is required' });
  }

  // TODO: 之後串真金流時，這裡會改成呼叫金流 API 建立付款
  // 目前先回傳 mock 的 paymentUrl，讓前端可以「假裝導向付款」
  return res.json({
    ok: true,
    orderId,
    paymentMethod,
    paymentUrl: `http://localhost:3000/api/payments/mock-pay?orderId=${encodeURIComponent(orderId)}`
  });
});

/**
 * GET /api/payments/mock-pay?orderId=xxx
 * 模擬使用者完成付款後回來
 * 之後真金流會是導回你前端的成功頁，或由 webhook 驗證付款結果
 */
router.get('/mock-pay', (req, res) => {
  const { orderId } = req.query || {};
  if (!orderId) return res.status(400).send('orderId is required');

  // 這裡先用最簡單的方式回傳
  // TODO: 之後改成：更新資料庫 orders 狀態 -> PAID
  res.json({ ok: true, message: 'mock payment success', orderId });
});

/**
 * POST /api/payments/webhook
 * 真金流會呼叫這支（server-to-server）
 * 目前先印出來確認「收得到」
 */
router.post('/webhook', (req, res) => {
  // TODO: 真金流要驗簽名、核對金額、更新訂單狀態
  console.log('[payments webhook] body:', req.body);
  res.json({ ok: true });
});

module.exports = router;
