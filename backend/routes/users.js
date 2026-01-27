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

    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing required fields: uid and email' })
    }

    const existing = await queryWithSearchPath('SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at FROM users WHERE uid=$1', [uid])

    if (existing.rows.length > 0) {
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (nickname !== undefined) {
        updateFields.push(`nickname = $${paramIndex}`)
        updateValues.push(nickname || null)
        paramIndex++
      }
      if (real_name !== undefined) {
        updateFields.push(`real_name = $${paramIndex}`)
        updateValues.push(real_name || null)
        paramIndex++
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
        const validRole = (role === 'vendor' || role === 'user' || role === 'admin') ? role : 'user'
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
        const result = await queryWithSearchPath(updateQuery, updateValues)
        const updatedUser = result.rows[0]

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

        return res.json({ data: responseData })
      }

      return res.json({ data: existing.rows[0] })
    }

    const insertQuery = `
      INSERT INTO users (
        uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, true), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at
    `

    const validRole = (role === 'vendor' || role === 'user' || role === 'admin') ? role : 'user'

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

    const result = await queryWithSearchPath(insertQuery, insertValues)
    const insertedUser = result.rows[0]

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

    res.status(201).json({ data: responseData })
  } catch (e) {
    console.error('Create/Update User Error:', e)
    res.status(500).json({ error: e.message })
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

router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params
    const result = await queryWithSearchPath('SELECT uid, email, nickname, real_name, avatar, bio, spirit_animal, role, vendor_id, location, is_matching_enabled, created_at, updated_at, tags, card_bio, card_photo, card_tags, gallery FROM users WHERE uid = $1', [uid])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' })
    }

    res.json({ data: result.rows[0] })
  } catch (error) {
    console.error('獲取用戶資料失敗:', error)
    res.status(500).json({ error: '獲取用戶資料失敗', details: error.message })
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
    } = req.body

    if (bio === '') bio = null
    if (spirit_animal === '') spirit_animal = null
    if (location === '') location = null

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

router.patch('/:uid/role', async (req, res) => {
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
