/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

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
    let finalVendorId = vendor_id

    if (finalRole === 'user' || finalRole === 'admin') {
      finalVendorId = null
    } else if (finalRole === 'vendor') {
      try {
        const vendorName = nickname || email?.split('@')[0] || '未命名廠商'
        const vendorAvatar = avatar || null

        await pool.query(`
          CREATE SEQUENCE IF NOT EXISTS vendor_id_seq;
        `)

        const initSeqResult = await pool.query(`
          SELECT last_value, is_called FROM vendor_id_seq;
        `)

        if (!initSeqResult.rows[0].is_called || initSeqResult.rows[0].last_value <= 1) {
          const maxIdResult = await pool.query(`
            SELECT MAX(CAST(SUBSTRING(id FROM 'vendor-(\\d+)') AS INTEGER)) as max_num
            FROM vendors
            WHERE id ~ '^vendor-\\d+$'
          `)
          const maxNum = maxIdResult.rows[0]?.max_num || 0
          if (maxNum > 0) {
            await pool.query(`SELECT setval('vendor_id_seq', $1, true)`, [maxNum])
          }
        }

        const maxRetries = 5
        let retryCount = 0
        let createdVendorId = null

        while (retryCount < maxRetries && !createdVendorId) {
          try {
            const seqResult = await pool.query("SELECT nextval('vendor_id_seq') AS next_val")
            const nextNumber = parseInt(seqResult.rows[0].next_val, 10)
            const newVendorId = `vendor-${String(nextNumber).padStart(3, '0')}`

            const insertVendorQuery = `
              INSERT INTO vendors (id, name, avatar, created_at, updated_at)
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING id
            `

            await pool.query(insertVendorQuery, [newVendorId, vendorName, vendorAvatar])
            createdVendorId = newVendorId
            finalVendorId = newVendorId
          } catch (insertError) {
            if (insertError.code === '23505') {
              retryCount++
              if (retryCount >= maxRetries) {
                throw new Error('無法生成唯一的 vendor_id，請稍後再試')
              }
              await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, retryCount - 1)))
            } else {
              throw insertError
            }
          }
        }

        if (!createdVendorId) {
          return res.status(500).json({
            error: '創建廠商記錄失敗',
            message: '無法生成唯一的 vendor_id，請稍後再試',
          })
        }
      } catch (vendorCreateError) {
        return res.status(500).json({
          error: '創建廠商記錄失敗',
          message: vendorCreateError.message || '無法創建廠商記錄',
          details: vendorCreateError.detail || String(vendorCreateError),
          code: vendorCreateError.code,
        })
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
      res.json(result.rows[0])
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

      const result = await pool.query(insertQuery, insertParams)

      res.status(201).json(result.rows[0])
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

    let query =
      'SELECT uid, email, nickname, real_name, avatar, role, vendor_id, created_at FROM users'
    const params = []

    if (role && ['user', 'vendor', 'admin'].includes(role)) {
      query += ' WHERE role = $1'
      params.push(role)
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(parseInt(limit), offset)
    } else {
      query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`
      params.push(parseInt(limit), offset)
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({
      error: '獲取用戶列表失敗',
      message: error?.message || '無法獲取用戶列表',
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

    const result = await pool.query('SELECT * FROM users WHERE uid = $1', [uid])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: '用戶不存在',
        message: '找不到指定的用戶',
      })
    }

    res.json(result.rows[0])
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: '資料庫連接失敗',
        message: '無法連接到資料庫，請稍後再試',
        details: error.message,
      })
    }

    res.status(500).json({
      error: '獲取用戶資料失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
      code: error.code,
    })
  }
})

router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    let { nickname, location, avatar, bio, spirit_animal, tags, email } = req.body

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

    setClauses.push(`nickname = COALESCE($${paramIndex}, nickname)`)
    params.push(nickname)
    paramIndex++

    setClauses.push(`location = COALESCE($${paramIndex}, location, '台灣')`)
    params.push(location)
    paramIndex++

    setClauses.push(`avatar = COALESCE($${paramIndex}, avatar)`)
    params.push(avatar)
    paramIndex++

    setClauses.push(`bio = COALESCE($${paramIndex}, bio)`)
    params.push(bio)
    paramIndex++

    setClauses.push(`spirit_animal = COALESCE($${paramIndex}, spirit_animal)`)
    params.push(spirit_animal)
    paramIndex++

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
    const queryParams = params

    const result = await pool.query(updateQuery, queryParams)

    if (result.rows.length === 0) {
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

      if (location) {
        insertClauses.push('location')
        insertParams.push(location)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      if (tags && Array.isArray(tags)) {
        insertClauses.push('tags')
        insertParams.push(tags)
        insertPlaceholders.push(`$${paramIndex}`)
        paramIndex++
      }

      const insertQuery = `
        INSERT INTO users (${insertClauses.join(', ')}, created_at, updated_at)
        VALUES (${insertPlaceholders.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `

      try {
        const insertResult = await pool.query(insertQuery, insertParams)

        const userData = insertResult.rows[0]
        if (userData.tags === null || userData.tags === undefined) {
          userData.tags = []
        } else if (!Array.isArray(userData.tags)) {
          userData.tags =
            typeof userData.tags === 'string' ? JSON.parse(userData.tags) : [userData.tags]
        }

        return res.json(userData)
      } catch (insertError) {
        return res.status(500).json({
          error: '創建用戶失敗',
          message: insertError?.message || '無法創建用戶',
          details: String(insertError),
        })
      }
    }

    const userData = result.rows[0]
    if (userData.tags === null || userData.tags === undefined) {
      userData.tags = []
    } else if (!Array.isArray(userData.tags)) {
      userData.tags =
        typeof userData.tags === 'string' ? JSON.parse(userData.tags) : [userData.tags]
    }

    res.json(userData)
  } catch (error) {
    res.status(500).json({
      error: '更新用戶資料失敗',
      message: error?.message || '無法更新用戶資料',
      details: String(error),
    })
  }
})

router.patch('/:uid/role', async (req, res) => {
  try {
    const { uid } = req.params
    const role = req.body.role
    const vendor_id = req.body.vendor_id

    if (!role || !['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({
        error: '無效的角色',
        message: '角色必須是 user、vendor 或 admin 其中之一',
        validRoles: ['user', 'vendor', 'admin'],
      })
    }

    const userCheck = await pool.query('SELECT role, vendor_id FROM users WHERE uid = $1', [uid])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: '用戶不存在',
        message: '找不到指定的用戶',
      })
    }

    let finalVendorId = null
    if (role === 'user' || role === 'admin') {
      finalVendorId = null
    } else if (role === 'vendor') {
      if (vendor_id) {
        const vendorCheck = await pool.query('SELECT id FROM vendors WHERE id = $1', [vendor_id])
        if (vendorCheck.rows.length === 0) {
          return res.status(400).json({
            error: '無效的廠商 ID',
            message: '指定的 vendor_id 不存在於 vendors 表中',
          })
        }
        finalVendorId = vendor_id
      } else {
        finalVendorId = userCheck.rows[0].vendor_id
      }
    }

    const updateQuery = `
      UPDATE users
      SET
        role = $2,
        vendor_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE uid = $1
      RETURNING *
    `

    const result = await pool.query(updateQuery, [uid, role, finalVendorId])

    res.json({
      message: '角色更新成功',
      user: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23503' && error.constraint === 'fk_users_vendor') {
      return res.status(400).json({
        error: '無效的廠商 ID',
        message: '指定的 vendor_id 不存在於 vendors 表中',
      })
    }

    res.status(500).json({
      error: '更新用戶角色失敗',
      message: error?.message || '無法更新用戶角色',
      details: String(error),
    })
  }
})

module.exports = router
