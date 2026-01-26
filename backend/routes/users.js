/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 輔助函數：確保 search_path 已設置並執行查詢
async function queryWithSearchPath(queryText, params) {
  try {
    // 確保 search_path 已設置
    await pool.query('SET search_path TO public, travelers, discussion')
    // 執行查詢
    return await pool.query(queryText, params)
  } catch (error) {
    // 如果設置 search_path 失敗，仍然嘗試執行查詢
    console.warn('⚠️ 設置 search_path 失敗，直接執行查詢:', error.message)
    return await pool.query(queryText, params)
  }
}

router.post('/', async (req, res) => {
  console.log('🚀 [POST /api/users] 收到請求')
  console.log('🚀 [POST /api/users] 請求 URL:', req.url)
  console.log('🚀 [POST /api/users] 請求路徑:', req.path)
  console.log('🚀 [POST /api/users] 請求原始 URL:', req.originalUrl)
  console.log('🚀 [POST /api/users] 請求方法:', req.method)
  console.log('🚀 [POST /api/users] 請求標頭 Content-Type:', req.headers['content-type'])
  console.log('🚀 [POST /api/users] 請求標頭 Origin:', req.headers.origin)
  try {
    const {
      uid,
      email,
      nickname,
      real_name,
      avatar,
      bio,
      spirit_animal,
      role,
      vendor_id,
      location,
      is_matching_enabled,
    } = req.body

    // 調試日誌：記錄接收到的所有資料
    console.log('📥 [POST /api/users] 接收到的完整用戶資料：', JSON.stringify({
      uid,
      email,
      nickname,
      real_name,
      avatar,
      bio,
      spirit_animal,
      role,
      vendor_id,
      location,
      is_matching_enabled
    }, null, 2))
    console.log('📥 [POST /api/users] 原始 req.body：', JSON.stringify(req.body, null, 2))
    console.log('📥 [POST /api/users] 值類型檢查：', {
      nickname: { value: nickname, type: typeof nickname, isString: typeof nickname === 'string', length: nickname?.length },
      real_name: { value: real_name, type: typeof real_name, isString: typeof real_name === 'string', length: real_name?.length },
      role: { value: role, type: typeof role }
    })

    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing required fields: uid and email' })
    }

    const existing = await queryWithSearchPath('SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at FROM users WHERE uid=$1', [uid])

    console.log('🔍 檢查用戶是否存在：', {
      uid,
      exists: existing.rows.length > 0,
      existingRole: existing.rows[0]?.role,
      incomingRole: role
    })

    if (existing.rows.length > 0) {
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (nickname !== undefined) {
        updateFields.push(`nickname = $${paramIndex}`)
        updateValues.push(nickname || null)
        paramIndex++
        console.log('🔄 將更新 nickname:', nickname || '(null)')
      }
      if (real_name !== undefined) {
        updateFields.push(`real_name = $${paramIndex}`)
        updateValues.push(real_name || null)
        paramIndex++
        console.log('🔄 將更新 real_name:', real_name || '(null)')
      }
      if (avatar !== undefined) {
        updateFields.push(`avatar = $${paramIndex}`)
        updateValues.push(avatar)
        paramIndex++
      }
      if (bio !== undefined) {
        updateFields.push(`bio = $${paramIndex}`)
        updateValues.push(bio || null)
        paramIndex++
      }
      if (spirit_animal !== undefined) {
        updateFields.push(`spirit_animal = $${paramIndex}`)
        updateValues.push(spirit_animal || null)
        paramIndex++
      }
      if (role !== undefined) {
        // 確保 role 是有效的值（vendor、user 或 admin）
        const validRole = (role === 'vendor' || role === 'user' || role === 'admin') ? role : 'user'
        console.log('🔄 準備更新用戶 role：', {
          uid,
          originalRole: role,
          validRole: validRole,
          currentRole: existing.rows[0]?.role
        })
        updateFields.push(`role = $${paramIndex}`)
        updateValues.push(validRole)
        paramIndex++
      }
      if (vendor_id !== undefined) {
        updateFields.push(`vendor_id = $${paramIndex}`)
        updateValues.push(vendor_id)
        paramIndex++
      }
      if (location !== undefined) {
        updateFields.push(`location = $${paramIndex}`)
        updateValues.push(location || null)
        paramIndex++
      }
      if (is_matching_enabled !== undefined) {
        updateFields.push(`is_matching_enabled = $${paramIndex}`)
        updateValues.push(is_matching_enabled)
        paramIndex++
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
        updateValues.push(uid)
        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE uid = $${paramIndex} RETURNING uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at`
        console.log('🔄 執行更新 SQL:', updateQuery)
        console.log('🔄 更新值陣列:', updateValues)
        const result = await queryWithSearchPath(updateQuery, updateValues)
        const updatedUser = result.rows[0]

        // 詳細檢查返回的資料
        console.log('✅ 資料庫更新結果：', {
          rowCount: result.rowCount,
          fields: result.fields?.map(f => f.name) || [],
          updatedUserKeys: Object.keys(updatedUser || {}),
          updatedUser: JSON.stringify(updatedUser, null, 2)
        })
        console.log('✅ 更新後的 role:', updatedUser?.role)
        console.log('✅ 更新後的 nickname:', updatedUser?.nickname)
        console.log('✅ 更新後的 real_name:', updatedUser?.real_name)

        // 確保返回的資料包含所有必要欄位
        const responseData = {
          uid: updatedUser.uid,
          email: updatedUser.email,
          nickname: updatedUser.nickname,
          real_name: updatedUser.real_name,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          spirit_animal: updatedUser.spirit_animal,
          role: updatedUser.role,
          vendor_id: updatedUser.vendor_id,
          location: updatedUser.location,
          is_matching_enabled: updatedUser.is_matching_enabled,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }

        console.log('✅ 準備返回的資料：', JSON.stringify({ data: responseData }, null, 2))
        return res.json({ data: responseData })
      }

      const existingUser = existing.rows[0]
      console.log('⚠️ 用戶已存在且無需更新，返回現有資料：', JSON.stringify(existingUser, null, 2))
      console.log('⚠️ 現有用戶的 role:', existingUser?.role)
      console.log('⚠️ 現有用戶的 nickname:', existingUser?.nickname)
      console.log('⚠️ 現有用戶的 real_name:', existingUser?.real_name)
      return res.json({ data: existingUser })
    }

    const insertQuery = `
      INSERT INTO users (
        uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, true), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at
    `

    // 確保 role 是有效的值（vendor 或 user）
    const validRole = (role === 'vendor' || role === 'user' || role === 'admin') ? role : 'user'

    console.log('💾 準備插入用戶到 Neon：', {
      uid,
      email,
      nickname: nickname || '(null)',
      real_name: real_name || '(null)',
      avatar: avatar || '(null)',
      bio: bio || '(null)',
      spirit_animal: spirit_animal || '(null)',
      originalRole: role,
      validRole: validRole,
      vendor_id: vendor_id || '(null)',
      location: location || '(null)',
      is_matching_enabled
    })

    // 處理值：保留非空字串，空字串轉為 null，undefined 轉為 null
    const processValue = (value) => {
      if (value === undefined) return null
      if (value === null) return null
      if (typeof value === 'string' && value.trim() === '') return null
      return value
    }

    const insertValues = [
      uid,
      email,
      processValue(nickname),
      processValue(real_name),
      processValue(avatar),
      processValue(bio),
      processValue(spirit_animal),
      validRole,
      processValue(vendor_id),
      processValue(location),
      is_matching_enabled,
    ]

    console.log('💾 插入值詳細檢查：', {
      nickname: {
        original: nickname,
        type: typeof nickname,
        isUndefined: nickname === undefined,
        isNull: nickname === null,
        isEmpty: nickname === '',
        processed: insertValues[2]
      },
      real_name: {
        original: real_name,
        type: typeof real_name,
        isUndefined: real_name === undefined,
        isNull: real_name === null,
        isEmpty: real_name === '',
        processed: insertValues[3]
      },
      role: {
        original: role,
        type: typeof role,
        validRole: validRole,
        processed: insertValues[7]
      }
    })

    console.log('💾 插入值陣列：', insertValues)

    const result = await queryWithSearchPath(insertQuery, insertValues)
    const insertedUser = result.rows[0]

    // 詳細檢查返回的資料
    console.log('✅ 資料庫查詢結果：', {
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name) || [],
      insertedUserKeys: Object.keys(insertedUser || {}),
      insertedUser: JSON.stringify(insertedUser, null, 2)
    })
    console.log('✅ 插入後的 role:', insertedUser?.role)
    console.log('✅ 插入後的 nickname:', insertedUser?.nickname)
    console.log('✅ 插入後的 real_name:', insertedUser?.real_name)
    console.log('✅ 插入後的 created_at:', insertedUser?.created_at)

    // 確保返回的資料包含所有必要欄位
    const responseData = {
      uid: insertedUser.uid,
      email: insertedUser.email,
      nickname: insertedUser.nickname,
      real_name: insertedUser.real_name,
      avatar: insertedUser.avatar,
      bio: insertedUser.bio,
      spirit_animal: insertedUser.spirit_animal,
      role: insertedUser.role,
      vendor_id: insertedUser.vendor_id,
      location: insertedUser.location,
      is_matching_enabled: insertedUser.is_matching_enabled,
      created_at: insertedUser.created_at,
      updated_at: insertedUser.updated_at
    }

    console.log('✅ [POST /api/users] 準備返回的資料：', JSON.stringify({ data: responseData }, null, 2))
    console.log('✅ [POST /api/users] 返回資料的鍵：', Object.keys(responseData))
    console.log('✅ [POST /api/users] 返回資料的 role:', responseData.role)
    console.log('✅ [POST /api/users] 返回資料的 nickname:', responseData.nickname)
    console.log('✅ [POST /api/users] 返回資料的 real_name:', responseData.real_name)

    // 確保所有欄位都存在，即使是 null
    const finalResponse = { data: responseData }
    console.log('✅ [POST /api/users] 最終回應物件：', JSON.stringify(finalResponse, null, 2))
    console.log('✅ [POST /api/users] 最終回應物件的鍵：', Object.keys(finalResponse))
    console.log('✅ [POST /api/users] 最終回應物件 data 的鍵：', Object.keys(finalResponse.data))

    res.status(201).json(finalResponse)
  } catch (e) {
    console.error('❌ [POST /api/users] Create/Update User Error:', e)
    console.error('❌ [POST /api/users] 錯誤堆疊:', e.stack)
    res.status(500).json({ error: e.message })
  }
})

// GET: 獲取所有用戶 (抽卡列表)
// [修正] 加入 gallery
router.get('/', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    // [修正] 加上 gallery
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
      query += `
        GROUP BY
          u.uid, u.email, u.nickname, u.real_name, u.avatar, u.role, u.vendor_id, u.created_at,
          u.location, u.bio, u.spirit_animal, u.tags,
          u.card_bio, u.card_photo, u.card_tags, u.gallery, u.is_matching_enabled
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `
      params.push(parseInt(limit), offset)
    } else {
      query += `
        GROUP BY
          u.uid, u.email, u.nickname, u.real_name, u.avatar, u.role, u.vendor_id, u.created_at,
          u.location, u.bio, u.spirit_animal, u.tags,
          u.card_bio, u.card_photo, u.card_tags, u.gallery, u.is_matching_enabled
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `
      params.push(parseInt(limit), offset)
    }

    const result = await queryWithSearchPath(query, params)

    // 為每個用戶獲取 visitedPlaces 數據
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
    res.status(500).json({ error: '獲取用戶列表失敗', details: error.message })
  }
})

// GET: 獲取單一用戶
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    console.log('🔍 [GET /api/users/:uid] 查詢用戶:', uid)

    // 使用 SELECT * 確保抓到所有欄位
    const result = await queryWithSearchPath('SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at, tags, card_bio, card_photo, card_tags, gallery FROM users WHERE uid = $1', [uid])

    if (result.rows.length === 0) {
      console.log('❌ [GET /api/users/:uid] 用戶不存在:', uid)
      return res.status(404).json({ error: '用戶不存在' })
    }

    const user = result.rows[0]
    console.log('✅ [GET /api/users/:uid] 找到用戶:', {
      uid: user.uid,
      email: user.email,
      nickname: user.nickname,
      real_name: user.real_name,
      role: user.role,
      hasAllFields: !!user.uid && !!user.email && user.role !== undefined
    })

    // 返回統一格式 { data: ... }
    res.json({ data: user })
  } catch (error) {
    console.error('❌ [GET /api/users/:uid] 獲取用戶資料失敗:', error)
    res.status(500).json({ error: '獲取用戶資料失敗', details: error.message })
  }
})

// PUT: 更新用戶資料
// [修正] 加入 gallery 更新邏輯
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    let {
      nickname,
      location,
      avatar,
      bio,
      spirit_animal,
      tags,
      card_bio,
      card_photo,
      card_tags,
      gallery, // [NEW] 接收 gallery
      is_matching_enabled,
    } = req.body

    if (bio === '') bio = null
    if (spirit_animal === '') spirit_animal = null
    if (location === '') location = null

    const setClauses = []
    const params = [uid]
    let paramIndex = 2

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        setClauses.push(`${field} = COALESCE($${paramIndex}, ${field})`)
        params.push(value)
        paramIndex++
      }
    }

    addUpdate('nickname', nickname)
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

    // 卡片資料
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

    // [NEW] Gallery
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

    setClauses.push('updated_at = CURRENT_TIMESTAMP')

    const updateQuery = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE uid = $1
      RETURNING *
    `

    const result = await queryWithSearchPath(updateQuery, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update Error:', error)
    res.status(500).json({ error: '更新失敗', details: error.message })
  }
})

// PATCH role (保持原樣)
router.patch('/:uid/role', async (req, res) => {
  // ... 原本邏輯
  try {
    const { uid } = req.params
    const { role, vendor_id } = req.body
    await queryWithSearchPath('UPDATE users SET role=$2, vendor_id=$3 WHERE uid=$1', [uid, role, vendor_id])
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
