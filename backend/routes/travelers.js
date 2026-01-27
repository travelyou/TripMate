/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { createTravelerApplicationNotification } = require('../utils/notifications')
const { getUserInfo } = require('../utils/userInfo')

let bannerPositionYAvailable = null
const checkBannerPositionYAvailable = async () => {
  if (bannerPositionYAvailable !== null) return bannerPositionYAvailable
  try {
    const result = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'travelers'
         AND table_name = 'travelers'
         AND column_name = 'banner_position_y'`,
    )
    bannerPositionYAvailable = result.rowCount > 0
  } catch (error) {
    console.error('[Backend Travelers] 檢查 banner_position_y 欄位失敗:', error)
    bannerPositionYAvailable = false
  }
  return bannerPositionYAvailable
}

router.get('/', async (req, res) => {
  try {
    const { status, location, category, author_uid, limit = 20, offset = 0 } = req.query

    let query = `
      SELECT
        t.id,
        t.title,
        t.content,
        t.location,
        t.category,
        t.status,
        t.tags,
        t.start_date,
        t.end_date,
        t.current_people,
        t.max_people,
        t.banner_image,
        t.author_uid,
        -- 一律使用 users 表的最新數據，不使用 travelers 表的舊值
        NULLIF(TRIM(u.nickname), '') as author_name,
        NULLIF(TRIM(u.avatar), '') as author_avatar,
        NULLIF(TRIM(u.spirit_animal), '') as spirit_animal,
        t.likes_count,
        t.saves_count,
        t.views_count,
        t.created_at,
        t.updated_at,
        COALESCE((
          SELECT COUNT(*)
          FROM public.comments c
          WHERE c.post_id = t.id AND c.post_type = 'traveler' AND c.deleted_at IS NULL
        ), 0) as comments_count
      FROM travelers.travelers t
      LEFT JOIN public.users u ON t.author_uid = u.uid
      WHERE t.deleted_at IS NULL
    `

    const params = []
    let paramIndex = 1

    if (author_uid) {
      query += ` AND t.author_uid = $${paramIndex}`
      params.push(author_uid)
      paramIndex++
    }

    if (status) {
      query += ` AND t.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (location) {
      query += ` AND t.location = $${paramIndex}`
      params.push(location)
      paramIndex++
    }

    if (category) {
      query += ` AND t.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)

    const formattedData = result.rows.map((row) => {
      const startDate = new Date(row.start_date)
      const endDate = new Date(row.end_date)
      const dateStr =
        row.start_date === row.end_date
          ? startDate
              .toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
              .replace(/\//g, '/')
          : `${startDate
              .toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
              .replace(/\//g, '/')} - ${endDate
              .toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
              .replace(/\//g, '/')}`

      const now = new Date()
      const created = new Date(row.created_at)
      const diffSeconds = Math.floor((now - created) / 1000)
      const timeStr =
        diffSeconds < 600
          ? '剛剛'
          : created.toLocaleString('zh-TW', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        location: row.location,
        category: row.category,
        status: row.status,
        tags: row.tags,
        date: dateStr,
        start_date: row.start_date,
        end_date: row.end_date,
        created_at: timeStr,
        people: `${row.current_people || 0}/${row.max_people || 2}`,
        image: row.banner_image,
        author_uid: row.author_uid,
        author: row.author_name,
        avatar: row.author_avatar,
        spiritAnimal: row.spirit_animal,
        likes: row.likes_count || 0,
        comments: row.comments_count || 0,
        saves_count: row.saves_count || 0,
        views_count: row.views_count || 0,
        updated_at: row.updated_at,
      }
    })

    res.json({
      success: true,
      data: formattedData,
      total: result.rowCount,
    })
  } catch (error) {
    console.error('獲取旅伴列表錯誤：', error)
    res.status(500).json({
      success: false,
      message: '獲取旅伴列表失敗',
      error: error.message,
    })
  }
})

router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params
    const idNum = Number(id)

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID 格式錯誤',
        details: 'id 必須是正整數',
      })
    }

    const updateResult = await pool.query(
      'UPDATE travelers.travelers SET views_count = views_count + 1 WHERE id = $1 AND deleted_at IS NULL',
      [idNum],
    )

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文',
      })
    }

    res.json({
      success: true,
      message: '瀏覽次數已更新',
    })
  } catch (error) {
    console.error('更新瀏覽次數錯誤：', error)
    res.status(500).json({
      success: false,
      message: '更新瀏覽次數失敗',
      error: error.message,
    })
  }
})

const ensureApplicationsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS travelers.traveler_applications (
      id SERIAL PRIMARY KEY,
      traveler_id INTEGER NOT NULL REFERENCES travelers.travelers(id) ON DELETE CASCADE,
      author_uid VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_traveler_applications_traveler_id
     ON travelers.traveler_applications(traveler_id)`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_traveler_applications_author_uid
     ON travelers.traveler_applications(author_uid)`,
  )
}

const ensureChatSchema = async () => {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS chat`)
}

const ensureGroupChatRoomsTable = async () => {
  await ensureChatSchema()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat.group_chat_rooms (
      id SERIAL PRIMARY KEY,
      traveler_id INTEGER REFERENCES travelers.travelers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `ALTER TABLE chat.group_chat_rooms
     ADD COLUMN IF NOT EXISTS avatar TEXT`,
  )
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat.group_chat_members (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES chat.group_chat_rooms(id) ON DELETE CASCADE,
      user_uid VARCHAR(255) NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, user_uid)
    )`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_group_chat_members_room_id
     ON chat.group_chat_members(room_id)`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_group_chat_members_user_uid
     ON chat.group_chat_members(user_uid)`,
  )
}

const ensureGroupChatMessagesTable = async () => {
  await ensureChatSchema()
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat.group_chat_messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES chat.group_chat_rooms(id) ON DELETE CASCADE,
      sender_uid VARCHAR(255) NOT NULL,
      sender_name VARCHAR(255),
      sender_avatar TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_group_chat_messages_room_id
     ON chat.group_chat_messages(room_id, created_at)`,
  )
}

const ensureUsersTable = async () => {
  try {
    await pool.query(`SELECT 1 FROM public.users LIMIT 1`)
  } catch (error) {
    console.warn('users 表不存在或無法訪問：', error.message)
  }
}

router.post('/:id/applications', async (req, res) => {
  try {
    await ensureApplicationsTable()

    const { id } = req.params
    const { message, author_uid } = req.body

    if (!message || !author_uid) {
      return res.status(400).json({ success: false, message: '缺少必填欄位' })
    }

    if (message.length > 200) {
      return res.status(400).json({ success: false, message: '訊息長度不能超過200字' })
    }

    const existingApp = await pool.query(
      `SELECT id, status FROM travelers.traveler_applications
       WHERE traveler_id = $1 AND author_uid = $2 AND status IN ('pending', 'accepted')`,
      [id, author_uid]
    )

    if (existingApp.rows.length > 0) {
      const status = existingApp.rows[0].status
      if (status === 'pending') {
        return res.status(400).json({ success: false, message: '您已經報名過了，請等待作者審核' })
      } else if (status === 'accepted') {
        return res.status(400).json({ success: false, message: '您已經被接受報名了' })
      }
    }

    const rejectedApp = await pool.query(
      `SELECT id FROM travelers.traveler_applications
       WHERE traveler_id = $1 AND author_uid = $2 AND status = 'rejected'`,
      [id, author_uid]
    )

    if (rejectedApp.rows.length > 0) {
      await pool.query(
        `DELETE FROM travelers.traveler_applications WHERE id = $1`,
        [rejectedApp.rows[0].id]
      )
    }

    const result = await pool.query(
      `INSERT INTO travelers.traveler_applications (traveler_id, author_uid, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [id, author_uid, message]
    )

    try {
      const travelerResult = await pool.query(
        `SELECT author_uid, title FROM travelers.travelers WHERE id = $1`,
        [id]
      )

      if (travelerResult.rows.length > 0) {
        const travelerAuthor = travelerResult.rows[0].author_uid
        const travelerTitle = travelerResult.rows[0].title

        if (travelerAuthor && travelerAuthor !== author_uid) {
          const applicantInfo = await getUserInfo(author_uid, '匿名用戶')
          const applicantAvatar = applicantInfo.avatar || null

          await createTravelerApplicationNotification({
            user_uid: travelerAuthor,
            traveler_id: id,
            applicant_uid: author_uid,
            applicant_name: applicantInfo.name,
            applicant_avatar: applicantAvatar,
            traveler_title: travelerTitle,
          })
        }
      }
    } catch (notifError) {
      console.error('創建找旅伴申請通知失敗（不影響主流程）：', notifError)
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('提交報名失敗:', error)
    res.status(500).json({ success: false, message: '提交報名失敗', error: error.message })
  }
})

router.get('/:id/applications', async (req, res) => {
  try {
    const { id } = req.params
    const { user_uid } = req.query

    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }

    const travelerResult = await pool.query(
      `SELECT author_uid FROM travelers.travelers WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )

    if (travelerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到此貼文' })
    }

    const authorUid = travelerResult.rows[0].author_uid

    if (user_uid === authorUid) {
      const result = await pool.query(
        `SELECT
          a.id,
          a.author_uid,
          NULLIF(TRIM(u.nickname), '') as author_name,
          NULLIF(TRIM(u.avatar), '') as author_avatar,
          NULLIF(TRIM(u.spirit_animal), '') as author_spirit_animal,
          a.message,
          a.status,
          a.created_at
         FROM travelers.traveler_applications a
         LEFT JOIN public.users u ON a.author_uid = u.uid
         WHERE a.traveler_id = $1
         ORDER BY a.created_at DESC`,
        [id]
      )
      return res.json({ success: true, data: result.rows })
    } else {
      const result = await pool.query(
        `SELECT
          a.id,
          a.author_uid,
          NULLIF(TRIM(u.nickname), '') as author_name,
          NULLIF(TRIM(u.avatar), '') as author_avatar,
          NULLIF(TRIM(u.spirit_animal), '') as author_spirit_animal,
          a.message,
          a.status,
          a.created_at
         FROM travelers.traveler_applications a
         LEFT JOIN public.users u ON a.author_uid = u.uid
         WHERE a.traveler_id = $1 AND a.author_uid = $2
         ORDER BY a.created_at DESC`,
        [id, user_uid]
      )
      return res.json({ success: true, data: result.rows })
    }
  } catch (error) {
    console.error('獲取報名列表失敗:', error)
    res.status(500).json({ success: false, message: '獲取報名列表失敗', error: error.message })
  }
})

// 接受报名
router.post('/:id/applications/:applicationId/accept', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await ensureGroupChatRoomsTable()

    const { id, applicationId } = req.params
    const { user_uid } = req.body

    const travelerResult = await client.query(
      `SELECT author_uid, title, max_people, status
       FROM travelers.travelers
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    if (travelerResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: '找不到此貼文' })
    }

    const traveler = travelerResult.rows[0]
    if (user_uid !== traveler.author_uid) {
      await client.query('ROLLBACK')
      return res.status(403).json({ success: false, message: '只有作者可以接受報名' })
    }

    // 更新报名状态
    const updateResult = await client.query(
      `UPDATE travelers.traveler_applications
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1 AND traveler_id = $2 AND status = 'pending'
       RETURNING *`,
      [applicationId, id]
    )

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: '找不到此報名或已被處理' })
    }

    const application = updateResult.rows[0]

    const maxPeopleNum = Number(traveler.max_people) || 2
    const acceptedCountResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM travelers.traveler_applications
       WHERE traveler_id = $1 AND status = 'accepted'`,
      [id],
    )
    const acceptedCount = acceptedCountResult.rows[0]?.count || 0
    const currentPeople = Math.max(1, acceptedCount + 1)
    const shouldFull = currentPeople >= maxPeopleNum

    await client.query(
      `UPDATE travelers.travelers
       SET current_people = $1,
           status = CASE WHEN $2 THEN '已額滿' ELSE status END,
           updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL`,
      [currentPeople, shouldFull, id],
    )

    let roomResult = await client.query(
      `SELECT id FROM chat.group_chat_rooms WHERE traveler_id = $1`,
      [id]
    )

    let roomId
    if (roomResult.rows.length === 0) {
      const newRoomResult = await client.query(
        `INSERT INTO chat.group_chat_rooms (traveler_id, name, created_by)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [id, traveler.title || '旅行群組', user_uid]
      )
      roomId = newRoomResult.rows[0].id

      await client.query(
        `INSERT INTO chat.group_chat_members (room_id, user_uid)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_uid) DO NOTHING`,
        [roomId, user_uid]
      )
    } else {
      roomId = roomResult.rows[0].id
    }

    await client.query(
      `INSERT INTO chat.group_chat_members (room_id, user_uid)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_uid) DO NOTHING`,
      [roomId, application.author_uid]
    )

    // 获取所有已接受的报名者，确保他们都在群组中
    const acceptedApps = await client.query(
      `SELECT author_uid FROM travelers.traveler_applications
       WHERE traveler_id = $1 AND status = 'accepted'`,
      [id]
    )

    for (const app of acceptedApps.rows) {
      await client.query(
        `INSERT INTO chat.group_chat_members (room_id, user_uid)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_uid) DO NOTHING`,
        [roomId, app.author_uid]
      )
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      data: application,
      room_id: roomId,
      message: '已接受報名，群組聊天室已創建',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('接受報名失敗:', error)
    res.status(500).json({ success: false, message: '接受報名失敗', error: error.message })
  } finally {
    client.release()
  }
})

router.post('/group-chat-rooms', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()

    const { user_uid, name, member_uids } = req.body
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '群組名稱不能為空' })
    }
    if (!Array.isArray(member_uids) || member_uids.length === 0) {
      return res.status(400).json({ success: false, message: '至少需要選擇一個好友' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const roomResult = await client.query(
        `INSERT INTO chat.group_chat_rooms (traveler_id, name, created_by)
         VALUES (NULL, $1, $2)
         RETURNING id, name, avatar, created_by, created_at`,
        [name.trim(), user_uid]
      )

      const room = roomResult.rows[0]

      await client.query(
        `INSERT INTO chat.group_chat_members (room_id, user_uid)
         VALUES ($1, $2)
         ON CONFLICT (room_id, user_uid) DO NOTHING`,
        [room.id, user_uid]
      )

      for (const memberUid of member_uids) {
        if (memberUid !== user_uid) {
          await client.query(
            `INSERT INTO chat.group_chat_members (room_id, user_uid)
             VALUES ($1, $2)
             ON CONFLICT (room_id, user_uid) DO NOTHING`,
            [room.id, memberUid]
          )
        }
      }

      await client.query('COMMIT')

      res.json({
        success: true,
        data: {
          id: room.id,
          name: room.name,
          avatar: room.avatar,
          created_by: room.created_by,
          created_at: room.created_at,
          traveler_id: null,
        },
        message: '群組聊天室創建成功',
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('創建群組聊天室失敗:', error)
    res.status(500).json({ success: false, message: '創建群組聊天室失敗', error: error.message })
  }
})

router.get('/group-chat-rooms', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()

    const { user_uid } = req.query
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }

    const result = await pool.query(
      `SELECT
        r.id,
        r.traveler_id,
        r.name,
        r.avatar,
        r.created_by,
        r.created_at,
        t.title as traveler_title
      FROM chat.group_chat_rooms r
      LEFT JOIN travelers.travelers t ON r.traveler_id = t.id
      WHERE EXISTS (
        SELECT 1 FROM chat.group_chat_members m
        WHERE m.room_id = r.id AND m.user_uid = $1
      )
      ORDER BY r.created_at DESC`,
      [user_uid]
    )

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('獲取群組聊天室列表失敗:', error)
    res.status(500).json({ success: false, message: '獲取群組聊天室列表失敗', error: error.message })
  }
})

router.patch('/group-chat-rooms/:roomId', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()

    const { roomId } = req.params
    const { user_uid, name, avatar } = req.body
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }
    if (name === undefined && avatar === undefined) {
      return res.status(400).json({ success: false, message: '缺少更新內容' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const roomResult = await pool.query(
      `SELECT id, created_by FROM chat.group_chat_rooms WHERE id = $1`,
      [roomIdNum],
    )
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到群組聊天室' })
    }

    if (roomResult.rows[0].created_by !== user_uid) {
      return res.status(403).json({ success: false, message: '只有作者可以更新群組' })
    }

    const updates = []
    const values = []
    let idx = 1

    if (name !== undefined) {
      updates.push(`name = $${idx++}`)
      values.push(name && typeof name === 'string' ? name.trim() || '旅伴群組' : '旅伴群組')
    }
    if (avatar !== undefined) {
      updates.push(`avatar = $${idx++}`)
      values.push(avatar || null)
    }

    values.push(roomIdNum)

    const updateResult = await pool.query(
      `UPDATE chat.group_chat_rooms
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, avatar, created_by`,
      values,
    )

    res.json({ success: true, data: updateResult.rows[0] })
  } catch (error) {
    console.error('更新群組聊天室失敗：', error)
    res.status(500).json({ success: false, message: '更新群組聊天室失敗', error: error.message })
  }
})

router.post('/group-chat-rooms/:roomId/members', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()
    await ensureUsersTable()

    const { roomId } = req.params
    const { user_uid, member_uid } = req.body
    if (!user_uid || !member_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid或member_uid參數' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const roomResult = await pool.query(
      `SELECT id, created_by FROM chat.group_chat_rooms WHERE id = $1`,
      [roomIdNum],
    )
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到群組聊天室' })
    }

    if (roomResult.rows[0].created_by !== user_uid) {
      return res.status(403).json({ success: false, message: '只有作者可以新增成員' })
    }

    await pool.query(
      `INSERT INTO chat.group_chat_members (room_id, user_uid)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_uid) DO NOTHING`,
      [roomIdNum, member_uid],
    )

    const memberResult = await pool.query(
      `SELECT
        $1::varchar AS user_uid,
        COALESCE(u.nickname, $1) AS name,
        u.nickname,
        u.avatar
       FROM public.users u
       WHERE u.uid = $1`,
      [member_uid],
    )

    res.json({
      success: true,
      data: memberResult.rows[0] || { user_uid: member_uid, name: member_uid, nickname: null, avatar: null },
    })
  } catch (error) {
    console.error('新增群組成員失敗：', error)
    res.status(500).json({ success: false, message: '新增群組成員失敗', error: error.message })
  }
})

router.get('/group-chat-rooms/:roomId/messages', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()
    await ensureGroupChatMessagesTable()

    const { roomId } = req.params
    const { user_uid } = req.query
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM chat.group_chat_members WHERE room_id = $1 AND user_uid = $2`,
      [roomIdNum, user_uid],
    )
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: '非群組成員，無法查看訊息' })
    }

    const messagesResult = await pool.query(
      `SELECT id, sender_uid, sender_name, sender_avatar, content, created_at
       FROM chat.group_chat_messages
       WHERE room_id = $1
       ORDER BY created_at ASC`,
      [roomIdNum],
    )

    res.json({ success: true, data: messagesResult.rows })
  } catch (error) {
    console.error('獲取群組聊天記錄失敗：', error)
    res.status(500).json({ success: false, message: '獲取群組聊天記錄失敗', error: error.message })
  }
})

router.get('/group-chat-rooms/:roomId/members', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()
    await ensureUsersTable()

    const { roomId } = req.params
    const { user_uid } = req.query
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const roomResult = await pool.query(
      `SELECT id, created_by FROM chat.group_chat_rooms WHERE id = $1`,
      [roomIdNum],
    )
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到群組聊天室' })
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM chat.group_chat_members WHERE room_id = $1 AND user_uid = $2`,
      [roomIdNum, user_uid],
    )
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: '非群組成員，無法查看成員' })
    }

    const membersResult = await pool.query(
      `SELECT
        m.user_uid,
        COALESCE(u.nickname, m.user_uid) AS name,
        u.nickname,
        u.avatar
       FROM chat.group_chat_members m
       LEFT JOIN public.users u ON u.uid = m.user_uid
       WHERE m.room_id = $1
       ORDER BY m.joined_at ASC`,
      [roomIdNum],
    )

    res.json({
      success: true,
      data: {
        room_id: roomIdNum,
        created_by: roomResult.rows[0].created_by,
        members: membersResult.rows,
      },
    })
  } catch (error) {
    console.error('獲取群組成員失敗：', error)
    res.status(500).json({ success: false, message: '獲取群組成員失敗', error: error.message })
  }
})

// 移除群組成員（作者權限）
router.post('/group-chat-rooms/:roomId/members/:memberUid/remove', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()

    const { roomId, memberUid } = req.params
    const { user_uid } = req.body
    if (!user_uid) {
      return res.status(400).json({ success: false, message: '缺少user_uid參數' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const roomResult = await pool.query(
      `SELECT id, created_by FROM chat.group_chat_rooms WHERE id = $1`,
      [roomIdNum],
    )
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到群組聊天室' })
    }

    const createdBy = roomResult.rows[0].created_by
    if (user_uid !== createdBy) {
      return res.status(403).json({ success: false, message: '只有作者可以移除成員' })
    }
    if (memberUid === createdBy) {
      return res.status(400).json({ success: false, message: '不可移除作者' })
    }

    const deleteResult = await pool.query(
      `DELETE FROM chat.group_chat_members
       WHERE room_id = $1 AND user_uid = $2
       RETURNING user_uid`,
      [roomIdNum, memberUid],
    )

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '成員不存在' })
    }

    res.json({ success: true, data: { user_uid: memberUid } })
  } catch (error) {
    console.error('移除群組成員失敗：', error)
    res.status(500).json({ success: false, message: '移除群組成員失敗', error: error.message })
  }
})

// 發送群組訊息
router.post('/group-chat-rooms/:roomId/messages', async (req, res) => {
  try {
    await ensureGroupChatRoomsTable()
    await ensureGroupChatMessagesTable()

    const { roomId } = req.params
    const { user_uid, content, sender_name, sender_avatar } = req.body
    if (!user_uid || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: '缺少必填欄位' })
    }
    if (content.length > 500) {
      return res.status(400).json({ success: false, message: '訊息長度不能超過500字' })
    }

    const roomIdNum = Number(roomId)
    if (!Number.isInteger(roomIdNum) || roomIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'roomId 格式錯誤' })
    }

    const memberCheck = await pool.query(
      `SELECT 1 FROM chat.group_chat_members WHERE room_id = $1 AND user_uid = $2`,
      [roomIdNum, user_uid],
    )
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: '非群組成員，無法發送訊息' })
    }

    const insertResult = await pool.query(
      `INSERT INTO chat.group_chat_messages (room_id, sender_uid, sender_name, sender_avatar, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_uid, sender_name, sender_avatar, content, created_at`,
      [roomIdNum, user_uid, sender_name || null, sender_avatar || null, content.trim()],
    )

    res.json({ success: true, data: insertResult.rows[0] })
  } catch (error) {
    console.error('發送群組訊息失敗：', error)
    res.status(500).json({ success: false, message: '發送群組訊息失敗', error: error.message })
  }
})

// 拒绝报名
router.post('/:id/applications/:applicationId/reject', async (req, res) => {
  try {
    const { id, applicationId } = req.params
    const { user_uid } = req.body

    // 验证是否为作者
    const travelerResult = await pool.query(
      `SELECT author_uid FROM travelers.travelers WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )

    if (travelerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到此貼文' })
    }

    if (user_uid !== travelerResult.rows[0].author_uid) {
      return res.status(403).json({ success: false, message: '只有作者可以拒絕報名' })
    }

    // 更新报名状态
    const updateResult = await pool.query(
      `UPDATE travelers.traveler_applications
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND traveler_id = $2 AND status = 'pending'
       RETURNING *`,
      [applicationId, id]
    )

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到此報名或已被處理' })
    }

    res.json({ success: true, data: updateResult.rows[0] })
  } catch (error) {
    console.error('拒絕報名失敗:', error)
    res.status(500).json({ success: false, message: '拒絕報名失敗', error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { user_uid } = req.query

    const idNum = Number(id)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID 格式錯誤',
        details: 'id 必須是正整數',
      })
    }

    const hasBannerPos = await checkBannerPositionYAvailable()
    const bannerPosSelect = hasBannerPos ? 't.banner_position_y AS "banner_position_y",' : ''

    const travelerQuery = `
      SELECT
        t.id,
        t.title,
        t.content,
        t.location,
        t.category,
        t.status,
        t.tags,
        t.start_date,
        t.end_date,
        CASE
          WHEN t.start_date = t.end_date THEN TO_CHAR(t.start_date, 'YYYY/MM/DD')
          ELSE TO_CHAR(t.start_date, 'YYYY/MM/DD') || ' - ' || TO_CHAR(t.end_date, 'YYYY/MM/DD')
        END AS "date",
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - t.created_at)) < 600 THEN '剛剛'
          ELSE TO_CHAR(t.created_at, 'YYYY/MM/DD HH24:MI')
        END AS "created_at",
        t.current_people::text || '/' || t.max_people::text AS "people",
        t.banner_image AS "image",
        ${bannerPosSelect}
        t.author_uid,
        NULLIF(TRIM(u.nickname), '') AS "author",
        NULLIF(TRIM(u.avatar), '') AS "avatar",
        NULLIF(TRIM(u.spirit_animal), '') AS "spiritAnimal",
        t.likes_count AS "likes",
        t.views_count
      FROM travelers.travelers t
      LEFT JOIN public.users u ON t.author_uid = u.uid
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `

    const travelerResult = await pool.query(travelerQuery, [idNum])

    if (travelerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到此旅伴貼文',
      })
    }

    const traveler = travelerResult.rows[0]

    const itineraryResult = await pool.query(
      'SELECT day_number, date, activities FROM travelers.traveler_itineraries WHERE traveler_id = $1 ORDER BY day_number',
      [idNum],
    )

    const packingResult = await pool.query(
      'SELECT category, items FROM travelers.traveler_packing_lists WHERE traveler_id = $1 ORDER BY id',
      [idNum],
    )

    const commentsResult = await pool.query(
      `SELECT
        c.id,
        c.author_uid,
        COALESCE(u.nickname, c.author_name) as author_name,
        COALESCE(u.avatar, c.author_avatar) as author_avatar,
        u.spirit_animal as author_spirit_animal,
        c.content,
        c.likes_count,
        c.created_at
      FROM public.comments c
      LEFT JOIN public.users u ON c.author_uid = u.uid
      WHERE c.post_type = 'traveler'
        AND c.post_id = $1
        AND c.parent_comment_id IS NULL
        AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 50`,
      [idNum],
    )

    let isLiked = false
    if (user_uid) {
      const likeResult = await pool.query(
        'SELECT id FROM public.likes WHERE post_id = $1 AND author_uid = $2 AND board = $3',
        [idNum, user_uid, 'traveler'],
      )
      isLiked = likeResult.rows.length > 0
    }

    await pool.query(
      'UPDATE travelers.travelers SET views_count = views_count + 1 WHERE id = $1 AND deleted_at IS NULL',
      [idNum],
    )

    const fullData = {
      ...traveler,
      banner_position_y: hasBannerPos ? traveler.banner_position_y : 50,
      itinerary: {
        days: itineraryResult.rows.map((day) => ({
          day: day.day_number,
          date: day.date,
          activities: day.activities,
        })),
      },
      packingList: packingResult.rows.map((pack) => ({
        category: pack.category,
        items: pack.items,
      })),
      commentsData: commentsResult.rows.map((comment) => ({
        id: comment.id,
        author: comment.author_name || comment.author_nickname || '匿名用戶',
        author_uid: comment.author_uid,
        avatar: comment.author_avatar || null,
        spiritAnimal: comment.author_spirit_animal || null,
        content: comment.content,
        likes: comment.likes_count,
        time: comment.created_at,
        isLiked: false,
        replies: [],
      })),
      isLiked,
    }

    res.json({
      success: true,
      data: fullData,
    })
  } catch (error) {
    console.error('獲取旅伴詳情錯誤：', error)
    res.status(500).json({
      success: false,
      message: '獲取旅伴詳情失敗',
      error: error.message,
    })
  }
})

router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      banner_image,
      banner_position_y,
      location,
      category,
      start_date,
      end_date,
      max_people,
      author_uid,
      author_name,
      author_avatar,
      spirit_animal,
      tags,
      itinerary,
      packingList,
    } = req.body

    if (!title || !content || !location || !start_date || !end_date || !author_uid || !category) {
      return res.status(400).json({
        success: false,
        message: '缺少必填欄位',
      })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const maxPeopleNum = Number(max_people) || 2
      const bannerPosYNum = Number(banner_position_y) || 50
      const hasBannerPos = await checkBannerPositionYAvailable()

      let finalSpiritAnimal = spirit_animal || null
      if (!finalSpiritAnimal && author_uid) {
        try {
          const userQuery = await client.query('SELECT spirit_animal FROM public.users WHERE uid = $1', [
            author_uid,
          ])
          if (userQuery.rows.length > 0 && userQuery.rows[0].spirit_animal) {
            finalSpiritAnimal = userQuery.rows[0].spirit_animal
          }
        } catch {
          // Silent fail
        }
      }

      const insertColumns = [
        'title',
        'content',
        'banner_image',
        ...(hasBannerPos ? ['banner_position_y'] : []),
        'location',
        'category',
        'start_date',
        'end_date',
        'current_people',
        'max_people',
        'author_uid',
        'author_name',
        'author_avatar',
        'spirit_animal',
        'tags',
      ]

      const insertValues = [
        title,
        content,
        banner_image || null,
        ...(hasBannerPos ? [bannerPosYNum] : []),
        location,
        category,
        start_date,
        end_date,
        1,
        maxPeopleNum,
        author_uid,
        author_name || null,
        author_avatar || null,
        finalSpiritAnimal,
        Array.isArray(tags) ? tags : [],
      ]

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ')
      const travelerResult = await client.query(
        `INSERT INTO travelers.travelers (${insertColumns.join(', ')})
         VALUES (${placeholders})
         RETURNING id`,
        insertValues,
      )

      const travelerId = travelerResult.rows[0].id

      if (itinerary && itinerary.days && Array.isArray(itinerary.days)) {
        for (let i = 0; i < itinerary.days.length; i++) {
          const day = itinerary.days[i]
          const dayNumber = Number(day.day || day.day_number)
          const dayDate = day.date && day.date.trim() !== '' ? day.date : null
          const dayActivities = Array.isArray(day.activities)
            ? JSON.stringify(day.activities)
            : '[]'

          if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 365) {
            throw new Error(
              `行程第 ${i + 1} 天的天數編號無效: ${day.day || day.day_number}，必須是 1-365 之間的整數`,
            )
          }

          try {
            await client.query(
              `INSERT INTO travelers.traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
              [travelerId, dayNumber, dayDate, dayActivities],
            )
          } catch (insertError) {
            console.error(`[Backend Travelers POST] 插入行程第 ${i + 1} 天失敗:`, {
              dayNumber,
              date: dayDate,
              error: insertError.message,
              code: insertError.code,
              detail: insertError.detail,
            })
            throw new Error(`插入行程第 ${i + 1} 天失敗: ${insertError.message}`)
          }
        }
      }

      if (packingList && Array.isArray(packingList)) {
        for (let i = 0; i < packingList.length; i++) {
          const pack = packingList[i]
          const category =
            pack.category && pack.category.trim() !== '' ? pack.category.trim() : null
          const items = Array.isArray(pack.items) ? JSON.stringify(pack.items) : '[]'

          await client.query(
            `INSERT INTO travelers.traveler_packing_lists (traveler_id, category, items) VALUES ($1, $2, $3)`,
            [travelerId, category, items],
          )
        }
      }

      await client.query('COMMIT')
      res.status(201).json({ success: true, message: '旅伴貼文建立成功', data: { id: travelerId } })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[Backend Travelers POST] 資料庫錯誤，已回滾')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('[Backend Travelers POST] 錯誤:', error)
    res.status(500).json({
      success: false,
      message: '建立旅伴貼文失敗',
      error: error.message,
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const {
      title,
      content,
      banner_image,
      banner_position_y,
      location,
      category,
      start_date,
      end_date,
      current_people,
      max_people,
      status,
      tags,
      itinerary,
      packingList,
    } = req.body

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const hasBannerPos = await checkBannerPositionYAvailable()
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      const addField = (col, val) => {
        if (val !== undefined) {
          updateFields.push(`${col} = $${paramIndex++}`)
          updateValues.push(val)
        }
      }

      addField('title', title)
      addField('content', content)
      addField('banner_image', banner_image)
      if (hasBannerPos) {
        addField('banner_position_y', banner_position_y)
      }
      addField('location', location)
      addField('category', category)
      addField('start_date', start_date)
      addField('end_date', end_date)
      addField('current_people', current_people)
      addField('max_people', max_people)
      addField('status', status)
      addField('tags', tags)

      updateFields.push(`updated_at = NOW()`)
      updateValues.push(id)

      if (updateFields.length > 1) {
        const updateQuery = `UPDATE travelers.travelers SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING id`
        const result = await client.query(updateQuery, updateValues)
        if (result.rows.length === 0) {
          await client.query('ROLLBACK')
          return res.status(404).json({ success: false, message: '找不到此旅伴貼文' })
        }
      }

      if (itinerary && itinerary.days) {
        await client.query('DELETE FROM travelers.traveler_itineraries WHERE traveler_id = $1', [
          id,
        ])
        for (const day of itinerary.days) {
          await client.query(
            `INSERT INTO travelers.traveler_itineraries (traveler_id, day_number, date, activities) VALUES ($1, $2, $3, $4)`,
            [id, day.day, day.date, JSON.stringify(day.activities)],
          )
        }
      }

      if (packingList) {
        await client.query('DELETE FROM travelers.traveler_packing_lists WHERE traveler_id = $1', [
          id,
        ])
        for (let i = 0; i < packingList.length; i++) {
          await client.query(
            `INSERT INTO travelers.traveler_packing_lists (traveler_id, category, items) VALUES ($1, $2, $3)`,
            [id, packingList[i].category, JSON.stringify(packingList[i].items)],
          )
        }
      }

      await client.query('COMMIT')
      res.json({ success: true, message: '旅伴貼文更新成功', data: { id } })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '更新失敗', error: error.message })
  }
})

// DELETE /api/travelers/:id - 刪除貼文（必須放在最後，避免與其他路由衝突）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `UPDATE travelers.travelers SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: '找不到此貼文或已被刪除' })
    res.json({ success: true, message: '已刪除', data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, message: '刪除失敗', error: error.message })
  }
})

module.exports = router
