const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 先不做登入：固定 user_id=1（之後再換成 req.user.id）
const getUserId = (req) => 1

async function getOrCreateActiveCartId(userId) {
  // 先找 active cart
  const found = await pool.query(
    `SELECT id FROM commerce.carts WHERE user_id=$1 AND status='active' LIMIT 1`,
    [userId],
  )
  if (found.rows.length) return found.rows[0].id

  // 沒有就建一台
  const created = await pool.query(
    `INSERT INTO commerce.carts(user_id,status) VALUES($1,'active') RETURNING id`,
    [userId],
  )
  return created.rows[0].id
}

// GET /api/cart/items -> 回購物車 items（只有 itineraryId + persons）
router.get('/items', async (req, res) => {
  try {
    const userId = getUserId(req)
    const cartId = await getOrCreateActiveCartId(userId)

    const r = await pool.query(
      `SELECT itinerary_id AS "itineraryId", persons
      FROM commerce.cart_items
      WHERE cart_id=$1
      ORDER BY id ASC`,
      [cartId],
    )

    return res.json({ ok: true, items: r.rows })
  } catch (err) {
    console.error('[GET /api/cart/items] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

// POST /api/cart/items { itineraryId, persons? } -> 加入/累加
router.post('/items', async (req, res) => {
  try {
    const userId = getUserId(req)
    const cartId = await getOrCreateActiveCartId(userId)
    const { itineraryId, persons = 1 } = req.body || {}
    const p = Number(persons)

    if (!itineraryId) return res.status(400).json({ ok: false, message: 'itineraryId required' })
    if (!Number.isInteger(p) || p < 1) {
      return res.status(400).json({ ok: false, message: '人數要是正數' })
    }

    // upsert：同 itinerary 就累加 persons
    await pool.query(
      `INSERT INTO commerce.cart_items(cart_id, itinerary_id, persons)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, itinerary_id)
      DO UPDATE SET persons = commerce.cart_items.persons + EXCLUDED.persons,
                    updated_at = NOW()`,
      [cartId, itineraryId, p],
    )

    return res.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/cart/items] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

// PATCH /api/cart/items/:itineraryId { persons } -> 改人數
router.patch('/items/:itineraryId', async (req, res) => {
  try {
    const userId = getUserId(req)
    const cartId = await getOrCreateActiveCartId(userId)
    const itineraryId = Number(req.params.itineraryId)
    const { persons } = req.body || {}

    if (!Number.isFinite(itineraryId))
      return res.status(400).json({ ok: false, message: 'bad itineraryId' })
    if (!Number.isInteger(persons) || persons < 1)
      return res.status(400).json({ ok: false, message: 'persons must be >= 1' })

    const r = await pool.query(
      `UPDATE commerce.cart_items
      SET persons=$1, updated_at=NOW()
      WHERE cart_id=$2 AND itinerary_id=$3`,
      [persons, cartId, itineraryId],
    )

    return res.json({ ok: true, updated: r.rowCount })
  } catch (err) {
    console.error('[PATCH /api/cart/items/:itineraryId] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

// DELETE /api/cart/items/:itineraryId -> 移除
router.delete('/items/:itineraryId', async (req, res) => {
  try {
    const userId = getUserId(req)
    const cartId = await getOrCreateActiveCartId(userId)
    const itineraryId = Number(req.params.itineraryId)

    if (!Number.isFinite(itineraryId))
      return res.status(400).json({ ok: false, message: 'bad itineraryId' })

    const r = await pool.query(
      `DELETE FROM commerce.cart_items WHERE cart_id=$1 AND itinerary_id=$2`,
      [cartId, itineraryId],
    )

    return res.json({ ok: true, deleted: r.rowCount })
  } catch (err) {
    console.error('[DELETE /api/cart/items/:itineraryId] error:', err)
    return res.status(500).json({ ok: false, message: 'server error' })
  }
})

module.exports = router
