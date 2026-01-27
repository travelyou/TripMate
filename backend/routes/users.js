/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

async function queryWithSearchPath(queryText, params) {
  try {
    await pool.query('SET search_path TO public, travelers, discussion')
    return await pool.query(queryText, params)
  } catch (error) {
    console.warn('⚠️ 設置 search_path 失敗，直接執行查詢:', error.message)
    return await pool.query(queryText, params)
  }
}

router.post('/', async (req, res) => {
  try {
    const uid = req.body.uid
    const email = req.body.email
    let nickname = req.body.nickname
    let avatar = req.body.avatar
    let bio = req.body.bio
    let spirit_animal = req.body.spirit_animal
    let role = req.body.role
    let vendor_id = req.body.vendor_id

    if (!uid || !email) {
      return res.status(400).json({
        error: '缺少必填欄位',
        message: 'uid 和 email 為必填欄位',
        required: ['uid', 'email'],
      })
    }

    if (bio === '') {
      bio = null
    }
    if (spirit_animal === '') {
      spirit_animal = null
    }

    let finalRole = 'user'
    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      finalRole = role
    }

    console.log('🔍 [Backend] 收到的 role:', role)
    console.log('🔍 [Backend] 最終 finalRole:', finalRole)

    let finalVendorId = vendor_id

    // 根據角色決定是否需要 vendor_id
    if (finalRole === 'user' || finalRole === 'admin') {
      finalVendorId = null
    } else if (finalRole === 'vendor') {
      // 使用重構後的 vendor 創建邏輯
      try {
        const { createVendor } = require('../utils/vendorHelper')

        finalVendorId = await createVendor({
          name: nickname,
          avatar: avatar,
          email: email
        })
      } catch (vendorCreateError) {
        console.error('❌ [Backend] Vendor 創建錯誤:', vendorCreateError)

        // 安全的錯誤回應（不暴露內部細節）
        const errorResponse = {
          error: '創建廠商記錄失敗',
          message: '無法創建廠商記錄，請稍後再試'
        }

        // 僅開發環境回傳詳細錯誤
        if (process.env.NODE_ENV === 'development') {
          errorResponse.details = vendorCreateError.message
          errorResponse.code = vendorCreateError.code
        }

        return res.status(500).json(errorResponse)
      }
    }


    const existingUser = await pool.query('SELECT uid, role, vendor_id FROM users WHERE uid = $1', [
      uid,
    ])

    if (existingUser.rows.length > 0) {
      let updateVendorId
      if (finalRole === 'user' || finalRole === 'admin') {
        updateVendorId = null
      } else if (finalRole === 'vendor') {
        const currentVendorId = existingUser.rows[0].vendor_id
        if (!currentVendorId) {
          updateVendorId = finalVendorId
        } else {
          updateVendorId = currentVendorId
        }
      } else {
        updateVendorId = existingUser.rows[0].vendor_id || null
      }

      const updateQuery = `
        UPDATE users
        SET
          email = COALESCE($2, email),
          nickname = COALESCE($3, nickname),
          avatar = COALESCE($4, avatar),
          bio = COALESCE($5, bio),
          spirit_animal = COALESCE($6, spirit_animal),
          role = $7,
          vendor_id = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE uid = $1
        RETURNING *
      `
      const result = await pool.query(updateQuery, [
        uid,
        email,
        nickname,
        avatar,
        bio,
        spirit_animal,
        finalRole,
        updateVendorId,
      ])
      res.json({ data: result.rows[0] })
    } else {
      const insertQuery = `
        INSERT INTO users (uid, email, nickname, avatar, bio, spirit_animal, role, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `

      const insertParams = [
        uid,
        email,
        nickname || null,
        avatar || null,
        bio || null,
        spirit_animal || null,
        finalRole,
        finalVendorId,
      ]

      console.log('📝 [Backend] 準備 INSERT users，參數:', {
        uid,
        email,
        nickname,
        role: finalRole,
        vendor_id: finalVendorId
      })

      const result = await pool.query(insertQuery, insertParams)

      console.log('✅ [Backend] INSERT 成功，返回:', result.rows[0])

      res.status(201).json({ data: result.rows[0] })
    }
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message,
      })
    }

    if (error.code === '23503') {
      const constraintName = error.constraint || ''
      const errorDetail = error.detail || ''

      if (
        constraintName.toLowerCase().includes('vendor') ||
        constraintName.toLowerCase().includes('users_vendor') ||
        errorDetail.toLowerCase().includes('vendor')
      ) {
        return res.status(400).json({
          error: '無效的廠商 ID',
          message: '指定的 vendor_id 不存在於 vendors 表中，請確認 vendor_id 是否正確',
          constraint: error.constraint,
          detail: error.detail,
        })
      }

      if (
        constraintName.toLowerCase().includes('conversation') ||
        errorDetail.toLowerCase().includes('conversation')
      ) {
        return res.status(400).json({
          error: '外鍵約束錯誤',
          message: 'conversation 外鍵約束失敗，請確認相關資料是否存在',
          constraint: error.constraint,
          detail: error.detail,
        })
      }

      return res.status(400).json({
        error: '外鍵約束錯誤',
        message: error.detail || '外鍵約束失敗，請確認相關資料是否存在',
        constraint: error.constraint,
        detail: error.detail,
      })
    }

    if (error.code === '23505') {
      return res.status(400).json({
        error: '用戶已存在',
        message: error.detail || '該 UID 或 Email 已被使用',
      })
    }

    if (error.code && error.code.startsWith('23')) {
      return res.status(400).json({
        error: '資料庫約束錯誤',
        message: error.detail || error.message,
        code: error.code,
        constraint: error.constraint,
      })
    }

    res.status(500).json({
      error: '創建/更新用戶失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
      code: error.code,
      constraint: error.constraint,
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = `
      SELECT
        u.uid,
        u.email,
        u.nickname,
        u.real_name,
        u.avatar,
        u.role,
        u.vendor_id,
        u.created_at,
        u.location,
        u.bio,
        u.spirit_animal,
        u.tags,
        u.card_bio,
        u.card_photo,
        u.card_tags,
        u.gallery,
        u.is_matching_enabled,
        COALESCE(
          ARRAY_AGG(w.item ORDER BY w.created_at DESC) FILTER (WHERE w.item IS NOT NULL),
          '{}'
        ) AS wishlist
      FROM users u
      LEFT JOIN wishlist w ON w.user_uid = u.uid
    `
    const params = []

    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      query += ' WHERE u.role = $1'
      params.push(role)
    }

    // Add GROUP BY to support ARRAY_AGG
    query += ` GROUP BY u.uid ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), offset)

    const result = await queryWithSearchPath(query, params)

    const usersWithVisitedPlaces = await Promise.all(
      result.rows.map(async (user) => {
        const visitedPlacesResult = await queryWithSearchPath(
          'SELECT name, date, type, icon FROM visited_places WHERE user_uid = $1 ORDER BY date DESC',
          [user.uid],
        )

        const visitedPlaces = {
          domestic: visitedPlacesResult.rows
            .filter((p) => p.type === 'domestic')
            .map((p) => ({
              name: p.name,
              date: p.date,
              icon: p.icon,
            })),
          international: visitedPlacesResult.rows
            .filter((p) => p.type === 'international')
            .map((p) => ({
              name: p.name,
              date: p.date,
              icon: p.icon,
            })),
        }

        return {
          ...user,
          visitedPlaces,
        }
      }),
    )

    res.json(usersWithVisitedPlaces)
  } catch (error) {
    res.status(500).json({
      error: '獲取用戶列表失敗',
      message: error?.message || '無法獲取用戶列表',
      details: String(error),
    })
  }
})

// 修复API：为已存在的Firebase用户创建Neon记录
router.post('/:uid/fix', async (req, res) => {
  try {
    const { uid } = req.params
    const { email, nickname, avatar, bio, spirit_animal, role, vendor_id } = req.body

    if (!email) {
      return res.status(400).json({
        error: '缺少必填欄位',
        message: 'email 為必填欄位',
      })
    }

    // 检查用户是否已存在
    const existingUser = await pool.query('SELECT uid FROM users WHERE uid = $1', [uid])

    if (existingUser.rows.length > 0) {
      return res.json({
        message: '用戶已存在於 Neon 資料庫',
        user: existingUser.rows[0],
      })
    }

    // 创建新用户
    const finalRole = role && ['user', 'vendor', 'admin'].includes(role) ? role : 'user'
    let finalVendorId = vendor_id

    if (finalRole === 'user' || finalRole === 'admin') {
      finalVendorId = null
    }

    const insertQuery = `
      INSERT INTO users (uid, email, nickname, avatar, bio, spirit_animal, role, vendor_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const insertParams = [
      uid,
      email,
      nickname || null,
      avatar || null,
      bio || null,
      spirit_animal || null,
      finalRole,
      finalVendorId,
    ]

    const result = await pool.query(insertQuery, insertParams)

    res.status(201).json({
      message: '用戶已成功修復並創建',
      user: result.rows[0],
    })
  } catch (error) {
    console.error('修復用戶失敗：', error)
    res.status(500).json({
      error: '修復用戶失敗',
      message: error?.message || '無法修復用戶',
      details: String(error),
    })
  }
})

router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params

    if (!uid) {
      return res.status(400).json({
        error: 'UID 不能為空',
        message: '請提供有效的用戶 UID',
      })
    }

    const result = await queryWithSearchPath('SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at, tags, card_bio, card_photo, card_tags, gallery FROM users WHERE uid = $1', [uid])

    if (result.rows.length === 0) {
      return res.status(440).json({
        error: '用戶不存在',
        message: '找不到指定的用戶',
      })
    }

    res.json({ data: result.rows[0] })
  } catch (error) {
    console.error('獲取用戶資料失敗:', error)

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message,
      })
    }

    res.status(500).json({
      error: '獲取用戶資料失敗',
      details: error.message,
      message: error.message
    })
  }
})

router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    let {
      nickname,
      real_name,
      realName,
      location,
      avatar,
      bio,
      spirit_animal,
      tags,
      card_bio,
      card_photo,
      card_tags,
      gallery,
      is_matching_enabled,
      email
    } = req.body

    if (bio === '') bio = null
    if (spirit_animal === '') spirit_animal = null

    if (
      location === undefined ||
      location === null ||
      (typeof location === 'string' && location.trim() === '')
    ) {
      location = '台灣'
    } else if (typeof location === 'string') {
      location = location.trim()
    }

    if (tags !== undefined && !Array.isArray(tags)) {
      tags = []
    }
    if (tags === undefined || tags === null) {
      tags = []
    } else {
      tags = Array.isArray(tags) ? [...tags] : []
    }

    const setClauses = []
    const params = [uid]
    let paramIndex = 2

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        // 直接更新，不使用 COALESCE，確保空字符串和 null 都能正確更新
        setClauses.push(`${field} = $${paramIndex}`)
        params.push(value === '' ? null : value)
        paramIndex++
      }
    }

    addUpdate('nickname', nickname)
    addUpdate('real_name', real_name || realName)
    addUpdate('location', location)
    addUpdate('avatar', avatar)
    addUpdate('bio', bio)
    addUpdate('spirit_animal', spirit_animal)

    if (Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
      const val = Array.isArray(tags) ? tags : []
      setClauses.push(`tags = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    if (card_bio !== undefined) {
      setClauses.push(`card_bio = $${paramIndex}`)
      params.push(card_bio)
      paramIndex++
    }
    if (card_photo !== undefined) {
      setClauses.push(`card_photo = $${paramIndex}`)
      params.push(card_photo)
      paramIndex++
    }
    if (card_tags !== undefined) {
      const val = Array.isArray(card_tags) ? card_tags : []
      setClauses.push(`card_tags = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    if (gallery !== undefined) {
      const val = Array.isArray(gallery) ? gallery : []
      setClauses.push(`gallery = $${paramIndex}`)
      params.push(val)
      paramIndex++
    }

    if (is_matching_enabled !== undefined) {
      setClauses.push(`is_matching_enabled = $${paramIndex}`)
      params.push(is_matching_enabled)
      paramIndex++
    }

    const tagsValue = Array.isArray(tags) ? tags : tags ? [tags] : []
    setClauses.push(`tags = $${paramIndex}`)
    params.push(tagsValue)
    paramIndex++

    setClauses.push('updated_at = CURRENT_TIMESTAMP')

    const updateQuery = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE uid = $1
      RETURNING *
    `

    const result = await queryWithSearchPath(updateQuery, params)

    if (result.rows.length === 0) {
      // Logic from Incoming to Insert if not exists (but HEAD didn't have this in PUT?)
      // Incoming HAD Insert logic in PUT.
      // HEAD did NOT.
      // I will keep Incoming's Insert logic if helpful, but HEAD didn't have it.
      // Incoming's PUT had logic to INSERT if update returned 0.
      // I'll add it back.

      if (!email) {
        email = `${uid}@example.com`
      }

      const insertClauses = ['uid', 'email']
      const insertParams = [uid, email]
      const insertPlaceholders = ['$1', '$2']
      let paramIndex = 3

      if (nickname) {
        insertClauses.push('nickname')
        insertParams.push(nickname)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      if (avatar) {
        insertClauses.push('avatar')
        insertParams.push(avatar)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      if (bio) {
        insertClauses.push('bio')
        insertParams.push(bio)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      if (spirit_animal) {
        insertClauses.push('spirit_animal')
        insertParams.push(spirit_animal)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      const insertQuery = `
        INSERT INTO users (${insertClauses.join(', ')})
        VALUES (${insertPlaceholders.join(', ')})
        RETURNING *
      `

      const insertResult = await pool.query(insertQuery, insertParams)
      return res.status(201).json({ data: insertResult.rows[0] })
    }

    res.json({ data: result.rows[0] })
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message,
      })
    }

    res.status(500).json({
      error: '更新用戶失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
    })
  }
})

module.exports = router
