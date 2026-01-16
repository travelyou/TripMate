const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 1. 獲取特定使用者的詳細資訊 (GET)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [id])

    if (result.rows.length > 0) {
      const user = result.rows[0]

      const responseData = {
        uid: user.firebase_uid,
        displayName: user.display_name || '未命名用戶', // 防止 null
        photoURL: user.photo_url || '',
        bio: user.bio || '',
        location: user.location || '',
        email: user.email || '',
        // 預設統計數據 (如果資料庫沒存，就給 0，確保前端不會壞掉)
        stats: {
          followers: 0,
          following: 0,
          trips: 0,
        },
      }

      res.json({ success: true, data: responseData })
    } else {
      // 如果找不到人 (可能是新註冊還沒存進 DB)，回傳一個預設的空使用者，防止前端 404 崩潰
      res.json({
        success: true,
        data: {
          uid: id,
          displayName: '新用戶',
          photoURL: '',
          bio: '',
          location: '',
          stats: { followers: 0, following: 0, trips: 0 },
        },
      })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// 2. 更新使用者資訊 (PUT)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // 前端傳過來的是駝峰命名 (displayName, photoURL...)
    const { displayName, photoURL, bio, location } = req.body

    // 檢查使用者是否存在
    const checkUser = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [id])

    let savedUser

    if (checkUser.rows.length === 0) {
      // 如果不存在，執行 Insert
      // 注意：SQL 裡面用的是 display_name (資料庫欄位)
      const insertQuery = `
                INSERT INTO users (firebase_uid, display_name, photo_url, bio, location, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING *
            `
      const newUser = await pool.query(insertQuery, [id, displayName, photoURL, bio, location])
      savedUser = newUser.rows[0]
    } else {
      // 如果存在，執行 Update
      const updateQuery = `
                UPDATE users
                SET display_name = $1, photo_url = $2, bio = $3, location = $4
                WHERE firebase_uid = $5
                RETURNING *
            `
      const updatedResult = await pool.query(updateQuery, [
        displayName,
        photoURL,
        bio,
        location,
        id,
      ])
      savedUser = updatedResult.rows[0]
    }

    // 回傳更新後的資料 (一樣要轉成駝峰給前端更新畫面)
    res.json({
      success: true,
      data: {
        uid: savedUser.firebase_uid,
        displayName: savedUser.display_name,
        photoURL: savedUser.photo_url,
        bio: savedUser.bio,
        location: savedUser.location,
        // 更新後 stats 保持不變 (或從 DB 查)
        stats: { followers: 0, following: 0, trips: 0 },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router
