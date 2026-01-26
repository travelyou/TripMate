/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

const ensureCollectionTable = async () => {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS public.collection (
        id SERIAL PRIMARY KEY,
        user_uid VARCHAR(255) NOT NULL,
        post_id INTEGER NOT NULL,
        post_type VARCHAR(50) NOT NULL,
        category_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_uid, post_id, post_type)
      )`,
    )

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_collection_user_uid ON public.collection(user_uid)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_collection_post ON public.collection(post_id, post_type)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_collection_category ON public.collection(category_id)`,
    )

    const savesTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'saves'
      )
    `)

    if (savesTableExists.rows[0].exists) {
      await pool.query(`
        INSERT INTO public.collection (user_uid, post_id, post_type, category_id, created_at, updated_at)
        SELECT user_uid, post_id, post_type, category_id, created_at, updated_at
        FROM public.saves
        ON CONFLICT (user_uid, post_id, post_type) DO NOTHING
      `)
    }
  } catch (error) {
    throw error
  }
}

router.post('/', async (req, res) => {
  try {
    await ensureCollectionTable()

    const { user_uid, post_id, post_type, category_id } = req.body

    if (!user_uid || !post_id || !post_type) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位',
        required: ['user_uid', 'post_id', 'post_type'],
      })
    }

    const postIdNum = Number(post_id)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'post_id 格式錯誤',
        details: 'post_id 必須是正整數',
      })
    }

    const validTypes = ['discussion', 'traveler', 'itinerary']
    if (!validTypes.includes(post_type)) {
      return res.status(400).json({
        success: false,
        message: 'post_type 格式錯誤',
        details: `post_type 必須是 ${validTypes.join('、')} 之一`,
      })
    }

    const result = await pool.query(
      `INSERT INTO public.collection (user_uid, post_id, post_type, category_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_uid, post_id, post_type) 
       DO UPDATE SET category_id = COALESCE(EXCLUDED.category_id, collection.category_id), updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_uid, postIdNum, post_type, category_id || null],
    )

    res.json({
      success: true,
      data: result.rows[0],
      message: '收藏成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '收藏失敗',
      error: error.message,
    })
  }
})

router.delete('/', async (req, res) => {
  try {
    await ensureCollectionTable()

    const { user_uid, post_id, post_type } = req.body

    if (!user_uid || !post_id || !post_type) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位',
        required: ['user_uid', 'post_id', 'post_type'],
      })
    }

    const postIdNum = Number(post_id)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'post_id 格式錯誤',
        details: 'post_id 必須是正整數',
      })
    }

    const result = await pool.query(
      `DELETE FROM public.collection
       WHERE user_uid = $1 AND post_id = $2 AND post_type = $3`,
      [user_uid, postIdNum, post_type],
    )

    res.json({
      success: true,
      message: '取消收藏成功',
      deleted: result.rowCount > 0,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '取消收藏失敗',
      error: error.message,
    })
  }
})

router.get('/user/:uid', async (req, res) => {
  try {
    await ensureCollectionTable()

    const { uid } = req.params
    const { category_id } = req.query

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: '缺少 UID',
      })
    }

    let query = `
      SELECT id, user_uid, post_id, post_type, category_id, created_at, updated_at
      FROM public.collection
      WHERE user_uid = $1
    `
    const params = [uid]

    if (category_id) {
      query += ` AND category_id = $2`
      params.push(category_id)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取收藏列表失敗',
      error: error.message,
    })
  }
})

router.get('/check', async (req, res) => {
  try {
    await ensureCollectionTable()

    const { user_uid, post_id, post_type } = req.query

    if (!user_uid || !post_id || !post_type) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位',
        required: ['user_uid', 'post_id', 'post_type'],
      })
    }

    const postIdNum = Number(post_id)
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'post_id 格式錯誤',
        details: 'post_id 必須是正整數',
      })
    }

    const result = await pool.query(
      `SELECT id, category_id FROM public.collection
       WHERE user_uid = $1 AND post_id = $2 AND post_type = $3`,
      [user_uid, postIdNum, post_type],
    )

    res.json({
      success: true,
      isCollected: result.rows.length > 0,
      category_id: result.rows[0]?.category_id || null,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '檢查收藏狀態失敗',
      error: error.message,
    })
  }
})

module.exports = router

