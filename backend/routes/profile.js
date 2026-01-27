/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { createFriendRequestNotification } = require('../utils/notifications')

// --- Helper Functions ---
const ensureFriendsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_uid VARCHAR(255) NOT NULL,
      friend_uid VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `ALTER TABLE friends ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
  )
  await pool.query(
    `ALTER TABLE friends ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  )
  await pool.query(
    `ALTER TABLE friends ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_friends_pair
     ON friends (user_uid, friend_uid)`,
  )
}

const ensureChatMessagesTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      sender_uid VARCHAR(255) NOT NULL,
      receiver_uid VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_pair
     ON chat_messages (sender_uid, receiver_uid, created_at)`,
  )
}

// --- Routes ---

// 新增去過的地方
router.post('/:uid/visited-places', async (req, res) => {
  try {
    const { uid } = req.params
    const { name, date, type, icon } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: '名稱和類型為必填' })
    }

    if (type !== 'domestic' && type !== 'international') {
      return res.status(400).json({ error: '類型必須是 domestic 或 international' })
    }

    const result = await pool.query(
      `INSERT INTO visited_places (user_uid, name, date, type, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [uid, name, date || null, type, icon || null],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('新增去過的地方失敗：', error)
    res.status(500).json({
      error: '新增去過的地方失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 刪除去過的地方
router.delete('/:uid/visited-places/:id', async (req, res) => {
  try {
    const { uid, id } = req.params

    const result = await pool.query(
      'DELETE FROM visited_places WHERE id = $1 AND user_uid = $2 RETURNING *',
      [id, uid],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到該記錄' })
    }

    res.json({ success: true, message: '已刪除' })
  } catch (error) {
    console.error('刪除去過的地方失敗：', error)
    res.status(500).json({
      error: '刪除去過的地方失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 新增許願池項目
router.post('/:uid/wishlist', async (req, res) => {
  try {
    const { uid } = req.params
    const { item } = req.body

    if (!item) {
      return res.status(400).json({ error: '項目名稱不能為空' })
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_uid, item, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_uid, item) DO NOTHING
       RETURNING *`,
      [uid, item],
    )

    if (result.rows.length === 0) {
      return res.status(409).json({ error: '該項目已存在於許願球池中' })
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('新增許願球池項目失敗：', error)
    res.status(500).json({
      error: '新增許願球池項目失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 刪除許願池項目
router.delete('/:uid/wishlist/:id', async (req, res) => {
  try {
    const { uid, id } = req.params

    const result = await pool.query(
      'DELETE FROM wishlist WHERE id = $1 AND user_uid = $2 RETURNING *',
      [id, uid],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到該記錄' })
    }

    res.json({ success: true, message: '已刪除' })
  } catch (error) {
    console.error('刪除許願球池項目失敗：', error)
    res.status(500).json({
      error: '刪除許願球池項目失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 更新許願池 (整批更新)
router.put('/:uid/wishlist', async (req, res) => {
  const client = await pool.connect()
  try {
    const { uid } = req.params
    let { items } = req.body

    if (!Array.isArray(items)) {
      client.release()
      return res.status(400).json({ error: 'items 必須是陣列' })
    }

    const uniqueItems = []
    const seen = new Set()
    for (const item of items) {
      const trimmedItem = String(item).trim()
      if (trimmedItem && !seen.has(trimmedItem)) {
        seen.add(trimmedItem)
        uniqueItems.push(trimmedItem)
      }
    }

    await client.query('BEGIN')

    await client.query('DELETE FROM wishlist WHERE user_uid = $1', [uid])
    if (uniqueItems.length > 0) {
      const values = uniqueItems
        .map((item, index) => {
          const paramIndex = index * 2 + 1
          return `($${paramIndex}, $${paramIndex + 1}, CURRENT_TIMESTAMP)`
        })
        .join(', ')

      const params = uniqueItems.flatMap((item) => [uid, item])
      const query = `INSERT INTO wishlist (user_uid, item, created_at) VALUES ${values}`

      await client.query(query, params)
    }

    await client.query('COMMIT')
    client.release()

    res.json({ success: true, message: '許願球池已更新', count: uniqueItems.length })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
    console.error('更新許願球池失敗：', error)
    res.status(500).json({
      error: '更新許願球池失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
    })
  }
})

// 加好友 API
router.post('/:uid/friends', async (req, res) => {
  try {
    const { uid } = req.params // 當前用戶的 uid
    const { friend_uid } = req.body // 要添加的好友的 uid

    if (!friend_uid) {
      return res.status(400).json({ error: 'friend_uid 為必填欄位' })
    }

    if (uid === friend_uid) {
      return res.status(400).json({ error: '不能加自己為好友' })
    }

    await ensureFriendsTable()

    // 檢查 friends 表是否有 status 欄位
    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )

    const hasStatus = statusCheck.rows.length > 0

    // 檢查好友關係是否已存在
    let existingCheck
    if (hasStatus) {
      existingCheck = await pool.query(
        `SELECT * FROM friends
         WHERE (user_uid = $1 AND friend_uid = $2)
            OR (user_uid = $2 AND friend_uid = $1)`,
        [uid, friend_uid],
      )
    } else {
      existingCheck = await pool.query(
        `SELECT * FROM friends
         WHERE user_uid = $1 AND friend_uid = $2`,
        [uid, friend_uid],
      )
    }

    // 如果已存在 pending 或 accepted 狀態的請求，返回錯誤或自動接受
    if (existingCheck.rows.length > 0) {
      if (hasStatus) {
        const accepted = existingCheck.rows.find((row) => row.status === 'accepted')
        if (accepted) {
          await pool.query(
            `DELETE FROM friends
             WHERE ((user_uid = $1 AND friend_uid = $2)
                OR (user_uid = $2 AND friend_uid = $1))
               AND status = 'pending'`,
            [uid, friend_uid],
          )
          return res.status(200).json({
            success: true,
            message: '你們已經是好友了，已清除待處理的好友邀請',
            accepted: true,
            cleared_pending: true,
          })
        }

        const outgoingPending = existingCheck.rows.find(
          (row) =>
            row.status === 'pending' && row.user_uid === uid && row.friend_uid === friend_uid,
        )
        if (outgoingPending) {
          return res.status(409).json({ error: '好友請求已發送，請等待對方回應' })
        }

        const incomingPending = existingCheck.rows.find(
          (row) =>
            row.status === 'pending' && row.user_uid === friend_uid && row.friend_uid === uid,
        )
        if (incomingPending) {
          const updatedAtCheck = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_name = 'friends' AND column_name = 'updated_at'`,
          )
          const hasUpdatedAt = updatedAtCheck.rows.length > 0

          const updateQuery = hasUpdatedAt
            ? `UPDATE friends
               SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
               WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
               RETURNING *`
            : `UPDATE friends
               SET status = 'accepted'
               WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
               RETURNING *`

          const updated = await pool.query(updateQuery, [friend_uid, uid])

          // 清除可能存在的反向 pending（避免重複）
          await pool.query(
            `DELETE FROM friends
             WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'`,
            [uid, friend_uid],
          )

          return res.status(200).json({
            success: true,
            message: '已自動接受好友請求',
            friend: updated.rows[0],
            accepted: true,
          })
        }
      } else {
        return res.status(409).json({ error: '好友請求已發送' })
      }
    }

    // 插入好友請求（狀態為 pending）
    let result
    if (hasStatus) {
      result = await pool.query(
        `INSERT INTO friends (user_uid, friend_uid, status, created_at)
         VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
         RETURNING *`,
        [uid, friend_uid],
      )
    } else {
      result = await pool.query(
        `INSERT INTO friends (user_uid, friend_uid, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING *`,
        [uid, friend_uid],
      )
    }

    // 創建好友申請通知
    try {
      const requesterResult = await pool.query(
        `SELECT uid, nickname, avatar FROM users WHERE uid = $1`,
        [uid],
      )

      if (requesterResult.rows.length > 0) {
        const requester = requesterResult.rows[0]
        const requesterName = requester.nickname || requester.uid
        await createFriendRequestNotification({
          user_uid: friend_uid,
          requester_uid: uid,
          requester_name: requesterName,
          requester_avatar: requester.avatar,
        })
      }
    } catch (notifError) {
      console.error('創建好友申請通知失敗（不影響主流程）：', notifError)
    }

    res.status(201).json({
      success: true,
      message: '好友請求已發送',
      friend: result.rows[0],
    })
  } catch (error) {
    console.error('加好友失敗：', error)
    res.status(500).json({
      error: '加好友失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 取消好友請求
router.delete('/:uid/friends/:friend_uid', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    await ensureFriendsTable()

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    let result
    if (hasStatus) {
      result = await pool.query(
        `DELETE FROM friends
         WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
         RETURNING *`,
        [uid, friend_uid],
      )
    } else {
      result = await pool.query(
        `DELETE FROM friends
         WHERE user_uid = $1 AND friend_uid = $2
         RETURNING *`,
        [uid, friend_uid],
      )
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到好友請求' })
    }

    res.json({ success: true, message: '已取消好友請求' })
  } catch (error) {
    console.error('取消好友請求失敗：', error)
    res.status(500).json({
      error: '取消好友請求失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 解除好友關係
router.delete('/:uid/friends/:friend_uid/remove', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    await ensureFriendsTable()

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    let result
    if (hasStatus) {
      result = await pool.query(
        `DELETE FROM friends
         WHERE ((user_uid = $1 AND friend_uid = $2)
            OR (user_uid = $2 AND friend_uid = $1))
           AND status = 'accepted'
         RETURNING *`,
        [uid, friend_uid],
      )
    } else {
      result = await pool.query(
        `DELETE FROM friends
         WHERE (user_uid = $1 AND friend_uid = $2)
            OR (user_uid = $2 AND friend_uid = $1)
         RETURNING *`,
        [uid, friend_uid],
      )
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到好友關係' })
    }

    res.json({ success: true, message: '已解除好友關係' })
  } catch (error) {
    console.error('解除好友關係失敗：', error)
    res.status(500).json({
      error: '解除好友關係失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 接受好友請求
router.patch('/:uid/friends/:friend_uid/accept', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    await ensureFriendsTable()

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    if (!hasStatus) {
      return res.status(400).json({ error: '資料庫不支援好友請求狀態管理' })
    }

    const updatedAtCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'updated_at'`,
    )
    const hasUpdatedAt = updatedAtCheck.rows.length > 0

    const checkRequest = await pool.query(
      `SELECT * FROM friends
       WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'`,
      [friend_uid, uid],
    )

    if (checkRequest.rows.length === 0) {
      return res.status(404).json({ error: '找不到待接受的好友請求' })
    }

    let updateQuery
    if (hasUpdatedAt) {
      updateQuery = `UPDATE friends
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
       RETURNING *`
    } else {
      updateQuery = `UPDATE friends
       SET status = 'accepted'
       WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
       RETURNING *`
    }

    const result = await pool.query(updateQuery, [friend_uid, uid])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '更新好友請求狀態失敗' })
    }

    try {
      const tableCheck = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'chat_interactions'`,
      )
      if (tableCheck.rows.length > 0) {
        await pool.query(
          `DELETE FROM chat_interactions
           WHERE (user_uid = $1 AND friend_uid = $2)
              OR (user_uid = $2 AND friend_uid = $1)`,
          [uid, friend_uid],
        )
      }
    } catch (clearError) {
      console.warn(`[acceptFriendRequest] ⚠️ 清除聊天次數失敗:`, clearError.message)
    }

    res.json({ success: true, message: '已接受好友請求' })
  } catch (error) {
    console.error('接受好友請求失敗：', error)
    res.status(500).json({
      error: '接受好友請求失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 拒絕好友請求
router.patch('/:uid/friends/:friend_uid/reject', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    await ensureFriendsTable()

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    if (!hasStatus) {
      return res.status(400).json({ error: '資料庫不支援好友請求狀態管理' })
    }

    const result = await pool.query(
      `DELETE FROM friends
       WHERE user_uid = $1 AND friend_uid = $2 AND status = 'pending'
       RETURNING *`,
      [friend_uid, uid],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到待拒絕的好友請求' })
    }

    res.json({ success: true, message: '已拒絕好友請求' })
  } catch (error) {
    console.error('拒絕好友請求失敗：', error)
    res.status(500).json({
      error: '拒絕好友請求失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 獲取或記錄聊天對話次數
router.get('/:uid/chat-interactions/:friend_uid', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    const vendorCheck = await pool.query(`SELECT role FROM public.users WHERE uid = $1`, [
      friend_uid,
    ])
    const isVendor = vendorCheck.rows.length > 0 && vendorCheck.rows[0].role === 'vendor'

    if (isVendor) {
      return res.json({ count: 0, remaining: 999, canSend: true, isFriend: false, isVendor: true })
    }

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    let isFriend = false
    if (hasStatus) {
      const friendCheck = await pool.query(
        `SELECT * FROM friends
         WHERE ((user_uid = $1 AND friend_uid = $2) OR (user_uid = $2 AND friend_uid = $1))
           AND status = 'accepted'`,
        [uid, friend_uid],
      )
      isFriend = friendCheck.rows.length > 0
    } else {
      const friendCheck = await pool.query(
        `SELECT * FROM friends
         WHERE (user_uid = $1 AND friend_uid = $2) OR (user_uid = $2 AND friend_uid = $1)`,
        [uid, friend_uid],
      )
      isFriend = friendCheck.rows.length > 0
    }

    if (isFriend) {
      return res.json({ count: 0, remaining: 999, canSend: true, isFriend: true })
    }

    const tableCheck = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'chat_interactions'`,
    )

    if (tableCheck.rows.length === 0) {
      return res.json({ count: 0, remaining: 3, canSend: true })
    }

    const result = await pool.query(
      `SELECT message_count FROM chat_interactions
       WHERE user_uid = $1 AND friend_uid = $2`,
      [uid, friend_uid],
    )

    const count = result.rows.length > 0 ? parseInt(result.rows[0].message_count) || 0 : 0
    const remaining = Math.max(0, 3 - count)
    const canSend = remaining > 0

    res.json({ count, remaining, canSend, isFriend: false })
  } catch (error) {
    console.error('獲取對話次數失敗：', error)
    res.json({ count: 0, remaining: 3, canSend: true })
  }
})

// 增加聊天對話次數
router.post('/:uid/chat-interactions/:friend_uid/increment', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    const vendorCheck = await pool.query(`SELECT role FROM public.users WHERE uid = $1`, [
      friend_uid,
    ])
    const isVendor = vendorCheck.rows.length > 0 && vendorCheck.rows[0].role === 'vendor'

    if (isVendor) {
      return res.json({
        success: true,
        count: 0,
        remaining: 999,
        canSend: true,
        isFriend: false,
        isVendor: true,
      })
    }

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    let isFriend = false
    if (hasStatus) {
      const friendCheck = await pool.query(
        `SELECT * FROM friends
         WHERE ((user_uid = $1 AND friend_uid = $2) OR (user_uid = $2 AND friend_uid = $1))
           AND status = 'accepted'`,
        [uid, friend_uid],
      )
      isFriend = friendCheck.rows.length > 0
    } else {
      const friendCheck = await pool.query(
        `SELECT * FROM friends
         WHERE (user_uid = $1 AND friend_uid = $2) OR (user_uid = $2 AND friend_uid = $1)`,
        [uid, friend_uid],
      )
      isFriend = friendCheck.rows.length > 0
    }

    if (isFriend) {
      return res.json({ success: true, count: 0, remaining: 999, canSend: true, isFriend: true })
    }

    const tableCheck = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'chat_interactions'`,
    )

    if (tableCheck.rows.length === 0) {
      return res.status(500).json({
        error: '數據表不存在',
        message: 'chat_interactions 表未創建',
      })
    }

    let result = await pool.query(
      `UPDATE chat_interactions
       SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE user_uid = $1 AND friend_uid = $2
       RETURNING message_count`,
      [uid, friend_uid],
    )

    if (result.rowCount === 0) {
      try {
        result = await pool.query(
          `INSERT INTO chat_interactions (user_uid, friend_uid, message_count, created_at, updated_at)
           VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING message_count`,
          [uid, friend_uid],
        )
      } catch (insertError) {
        result = await pool.query(
          `UPDATE chat_interactions
           SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
           WHERE user_uid = $1 AND friend_uid = $2
           RETURNING message_count`,
          [uid, friend_uid],
        )
      }
    }

    const count = parseInt(result.rows[0]?.message_count) || 0
    const remaining = Math.max(0, 3 - count)
    const canSend = remaining > 0

    res.json({ success: true, count, remaining, canSend })
  } catch (error) {
    console.error('增加對話次數失敗：', error)
    res.status(500).json({
      error: '增加對話次數失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 重置聊天對話次數
router.delete('/:uid/chat-interactions/:friend_uid', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    const tableCheck = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'chat_interactions'`,
    )

    if (tableCheck.rows.length === 0) {
      return res.json({ success: true })
    }

    await pool.query(
      `DELETE FROM chat_interactions
       WHERE (user_uid = $1 AND friend_uid = $2)
          OR (user_uid = $2 AND friend_uid = $1)`,
      [uid, friend_uid],
    )

    res.json({ success: true })
  } catch (error) {
    console.error('重置對話次數失敗：', error)
    res.status(500).json({
      error: '重置對話次數失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 保存聊天消息
router.post('/:uid/chat-messages/:friend_uid', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '消息內容不能為空' })
    }

    await ensureChatMessagesTable()

    const result = await pool.query(
      `INSERT INTO chat_messages (sender_uid, receiver_uid, content, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, sender_uid, receiver_uid, content, created_at`,
      [uid, friend_uid, content.trim()],
    )

    const message = result.rows[0]
    res.json({
      success: true,
      message: {
        id: message.id,
        sender_uid: message.sender_uid,
        receiver_uid: message.receiver_uid,
        content: message.content,
        created_at: message.created_at,
      },
    })
  } catch (error) {
    console.error('保存聊天消息失敗：', error)
    res.status(500).json({
      error: '保存聊天消息失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 獲取聊天記錄
router.get('/:uid/chat-messages/:friend_uid', async (req, res) => {
  try {
    const { uid, friend_uid } = req.params

    await ensureChatMessagesTable()

    const result = await pool.query(
      `SELECT id, sender_uid, receiver_uid, content, created_at
       FROM chat_messages
       WHERE (sender_uid = $1 AND receiver_uid = $2)
          OR (sender_uid = $2 AND receiver_uid = $1)
       ORDER BY created_at ASC`,
      [uid, friend_uid],
    )

    const messages = result.rows.map((row) => ({
      id: row.id,
      type: row.sender_uid === uid ? 'user' : 'friend',
      content: row.content,
      timestamp: row.created_at,
      sender_uid: row.sender_uid,
      receiver_uid: row.receiver_uid,
    }))

    res.json({ messages })
  } catch (error) {
    console.error('獲取聊天記錄失敗：', error)
    res.status(500).json({
      error: '獲取聊天記錄失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 獲取好友請求列表
router.get('/:uid/friend-requests', async (req, res) => {
  try {
    const { uid } = req.params

    await ensureFriendsTable()

    const statusCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'friends' AND column_name = 'status'`,
    )
    const hasStatus = statusCheck.rows.length > 0

    if (!hasStatus) {
      return res.json({ received: [], sent: [] })
    }

    const receivedRequests = await pool.query(
      `SELECT f.*, u.uid, u.nickname, u.avatar, u.email
       FROM friends f
       JOIN users u ON f.user_uid = u.uid
       WHERE f.friend_uid = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [uid],
    )

    const sentRequests = await pool.query(
      `SELECT f.*, u.uid, u.nickname, u.avatar, u.email
       FROM friends f
       JOIN users u ON f.friend_uid = u.uid
       WHERE f.user_uid = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [uid],
    )

    const received = receivedRequests.rows.map((r) => ({
      id: r.user_uid,
      uid: r.user_uid,
      name: r.nickname,
      nickname: r.nickname,
      avatar: r.avatar,
      email: r.email,
      status: r.status,
      created_at: r.created_at,
    }))

    const sent = sentRequests.rows.map((r) => ({
      id: r.friend_uid,
      uid: r.friend_uid,
      name: r.nickname,
      nickname: r.nickname,
      avatar: r.avatar,
      email: r.email,
      status: r.status,
      created_at: r.created_at,
    }))

    res.json({ received, sent })
  } catch (error) {
    console.error('獲取好友請求列表失敗：', error)
    res.status(500).json({
      error: '獲取好友請求列表失敗',
      message: error.message || '未知錯誤',
    })
  }
})

// 獲取個人檔案 (包含評價與行程標題關聯)
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params

    if (!uid) {
      return res.status(400).json({ error: 'UID 不能為空' })
    }

    // 1. 獲取使用者基本資料
    const userResult = await pool.query('SELECT * FROM users WHERE uid = $1', [uid])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用戶不存在' })
    }
    const user = userResult.rows[0]

    // 2. 獲取去過的地方
    const visitedPlacesResult = await pool.query(
      'SELECT id, name, date, type, icon FROM visited_places WHERE user_uid = $1 ORDER BY date DESC',
      [uid],
    )

    const visitedPlaces = {
      domestic: visitedPlacesResult.rows
        .filter((p) => p.type === 'domestic')
        .map((p) => ({ id: p.id, name: p.name, date: p.date, icon: p.icon })),
      international: visitedPlacesResult.rows
        .filter((p) => p.type === 'international')
        .map((p) => ({ id: p.id, name: p.name, date: p.date, icon: p.icon })),
    }

    // 3. 獲取許願清單
    const wishlistResult = await pool.query(
      'SELECT item FROM wishlist WHERE user_uid = $1 ORDER BY created_at DESC',
      [uid],
    )
    const wishlist = wishlistResult.rows.map((row) => row.item)

    // 4. 獲取好友列表
    let friendsResult
    try {
      const checkStatusQuery = `SELECT column_name FROM information_schema.columns WHERE table_name = 'friends' AND column_name = 'status'`
      const statusCheck = await pool.query(checkStatusQuery)

      const friendSelectSQL = `
        SELECT u.uid, u.nickname, u.avatar, u.email
        FROM friends f
        JOIN users u ON (CASE WHEN f.user_uid = $1 THEN f.friend_uid ELSE f.user_uid END) = u.uid
      `

      if (statusCheck.rows.length > 0) {
        friendsResult = await pool.query(
          `${friendSelectSQL} WHERE (f.user_uid = $1 OR f.friend_uid = $1) AND f.status = 'accepted' ORDER BY f.created_at DESC`,
          [uid],
        )
      } else {
        friendsResult = await pool.query(
          `${friendSelectSQL} WHERE (f.user_uid = $1 OR f.friend_uid = $1) ORDER BY f.created_at DESC`,
          [uid],
        )
      }
    } catch (error) {
      if (error.code === '42P01') friendsResult = { rows: [] }
      else throw error
    }
    const friends = friendsResult.rows.map((f) => ({
      id: f.uid,
      name: f.nickname,
      nickname: f.nickname,
      avatar: f.avatar,
      email: f.email,
    }))

    // 5. [修正] 獲取評價 (同時獲取「收到的」與「給出的」)
    const reviewsResult = await pool.query(
      `SELECT r.*,
              u1.nickname as author_name, u1.avatar as author_avatar,
              u2.nickname as target_name, u2.avatar as target_avatar,
              t.title as trip_title
       FROM reviews r
       JOIN users u1 ON r.author_uid = u1.uid
       JOIN users u2 ON r.target_uid = u2.uid
       LEFT JOIN travelers.travelers t ON r.trip_id = t.id
       WHERE r.target_uid = $1 OR r.author_uid = $1
       ORDER BY r.created_at DESC`,
      [uid],
    )

    const reviews = reviewsResult.rows.map((r) => ({
      id: r.id,
      authorUid: r.author_uid,
      targetUid: r.target_uid,
      author: r.author_name,
      target: r.target_name,
      avatar: r.author_avatar,
      targetAvatar: r.target_avatar,
      sentiment: r.sentiment,
      tripTitle: r.trip_title || (r.trip_id ? `行程 #${r.trip_id}` : null),
      tripId: r.trip_id,
      content: r.content,
      date: r.created_at,
    }))

    // 6. 統計數據
    let friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE user_uid = $1 OR friend_uid = $1) as friends_count`
    try {
      const statusCheck = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'friends' AND column_name = 'status'`,
      )
      if (statusCheck.rows.length > 0) {
        friendsCountQuery = `(SELECT COUNT(*) FROM friends WHERE (user_uid = $1 OR friend_uid = $1) AND status = 'accepted') as friends_count`
      }
    } catch {
      friendsCountQuery = `(SELECT 0) as friends_count`
    }

    const statsResult = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM travelers.travelers WHERE author_uid = $1 AND deleted_at IS NULL) as hosted_trips,
        (SELECT COUNT(*) FROM discussion.discussion WHERE author_uid = $1 AND deleted_at IS NULL) as posts,
        (SELECT COUNT(*) FROM reviews WHERE target_uid = $1) as reviews_count,
        ${friendsCountQuery}`,
      [uid],
    )

    const stats = statsResult.rows[0] || {
      hosted_trips: 0,
      posts: 0,
      reviews_count: 0,
      friends_count: 0,
    }

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        location: user.location || '台灣',
        avatar: user.avatar,
        bio: user.bio,
        spirit_animal: user.spirit_animal,
        role: user.role,
        vendor_id: user.vendor_id,
        tags: Array.isArray(user.tags) ? user.tags : user.tags ? [user.tags] : [],
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      visitedPlaces,
      wishlist,
      friends,
      reviews,
      stats: {
        hosted: parseInt(stats.hosted_trips) || 0,
        posts: parseInt(stats.posts) || 0,
        reviews: parseInt(stats.reviews_count) || 0,
        friends: parseInt(stats.friends_count) || 0,
      },
    })
  } catch (error) {
    console.error('獲取個人檔案失敗：', error)
    res.status(500).json({
      error: '獲取個人檔案失敗',
      message: error.message || '未知錯誤',
      details: error.detail || String(error),
    })
  }
})

module.exports = router
