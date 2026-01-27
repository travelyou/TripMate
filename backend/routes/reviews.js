/* eslint-env node */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 新增或更新評價 (Upsert)
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    const { author_uid, target_uid, trip_id, content, sentiment } = req.body

    // 基本驗證
    if (!author_uid || !target_uid || !trip_id) {
      return res.status(400).json({ error: '缺少必要欄位 (author_uid, target_uid, trip_id)' })
    }

    if (author_uid === target_uid) {
      return res.status(400).json({ error: '不能評價自己' })
    }

    await client.query('BEGIN')

    // 1. 檢查是否已經對這個行程評價過
    const checkQuery = `
      SELECT id FROM reviews
      WHERE trip_id = $1 AND author_uid = $2 AND target_uid = $3
    `
    const checkResult = await client.query(checkQuery, [trip_id, author_uid, target_uid])

    let result
    if (checkResult.rows.length > 0) {
      // 2. 如果有 -> 更新 (Update)
      const updateQuery = `
        UPDATE reviews
        SET content = $1, sentiment = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `
      result = await client.query(updateQuery, [content, sentiment, checkResult.rows[0].id])
    } else {
      // 3. 如果沒有 -> 新增 (Insert)
      const insertQuery = `
        INSERT INTO reviews (author_uid, target_uid, trip_id, content, sentiment, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `
      result = await client.query(insertQuery, [
        author_uid,
        target_uid,
        trip_id,
        content,
        sentiment,
      ])
    }

    await client.query('COMMIT')
    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('儲存評價失敗:', error)
    res.status(500).json({ error: '儲存評價失敗', details: error.message })
  } finally {
    client.release()
  }
})

// 刪除評價 (選用)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM reviews WHERE id = $1', [id])
    res.json({ success: true, message: '評價已刪除' })
  } catch (error) {
    console.error('刪除評價失敗:', error)
    res.status(500).json({ error: '刪除評價失敗' })
  }
})

module.exports = router
