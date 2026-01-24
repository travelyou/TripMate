/* eslint-env node */
/* global require, module */
const pool = require('../database/connection')

/**
 * 確保通知表存在
 */
async function ensureNotificationsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS public.notifications (
      id SERIAL PRIMARY KEY,
      user_uid VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      related_id INTEGER,
      related_type VARCHAR(50),
      sender_uid VARCHAR(255),
      sender_name VARCHAR(255),
      sender_avatar TEXT,
      link TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )
}

/**
 * 查找現有通知（用於合併）
 * @param {Object} params - 查找參數
 * @param {Boolean} onlyUnread - 是否只查找未讀通知（默認 false，查找所有通知）
 * @returns {Promise<Object|null>} 現有通知或 null
 */
async function findExistingNotification({ user_uid, type, related_id, related_type }, onlyUnread = false) {
  try {
    let query = `SELECT * FROM public.notifications
       WHERE user_uid = $1
         AND type = $2
         AND related_id = $3
         AND related_type = $4`

    const params = [user_uid, type, related_id, related_type]

    if (onlyUnread) {
      query += ` AND is_read = false`
    }

    query += ` ORDER BY created_at DESC LIMIT 1`

    const result = await pool.query(query, params)

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('查找現有通知失敗：', error.message)
    return null
  }
}

/**
 * 更新現有通知
 * @param {Number} notificationId - 通知 ID
 * @param {Object} updateData - 更新資料
 * @returns {Promise<Object>} 更新後的通知
 */
async function updateNotification(notificationId, updateData) {
  try {
    const {
      title,
      content,
      sender_uid,
      sender_name,
      sender_avatar,
    } = updateData

    const result = await pool.query(
      `UPDATE public.notifications
       SET title = $1,
           content = COALESCE($2, content),
           sender_uid = $3,
           sender_name = $4,
           sender_avatar = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        title,
        content || null,
        sender_uid || null,
        sender_name || null,
        sender_avatar || null,
        notificationId,
      ],
    )

    if (result.rows.length > 0) {
      return { success: true, data: result.rows[0] }
    }
    return null
  } catch (error) {
    console.error('更新通知失敗：', error.message)
    return null
  }
}

/**
 * 創建通知
 * @param {Object} notificationData - 通知資料
 * @param {Boolean} mergeIfExists - 如果存在相同通知是否合併（默認 false）
 * @returns {Promise<Object>} 創建的通知
 */
async function createNotification(notificationData, mergeIfExists = false) {
  try {
    await ensureNotificationsTable()

    const {
      user_uid,
      type,
      title,
      content,
      related_id,
      related_type,
      sender_uid,
      sender_name,
      sender_avatar,
      link,
    } = notificationData

    if (!user_uid || !type || !title) {
      console.error('創建通知失敗：缺少必填欄位')
      return null
    }

    // 如果需要合併且存在相同通知，則更新現有通知
    // 對於按讚和回覆，無論是否已讀都應該更新（onlyUnread = false）
    if (mergeIfExists && related_id && related_type) {
      const existingNotification = await findExistingNotification({
        user_uid,
        type,
        related_id,
        related_type,
      }, false) // 查找所有通知，包括已讀的

      if (existingNotification) {
        // 更新現有通知（標記為未讀，因為有新活動）
        const updateResult = await updateNotification(existingNotification.id, {
          title,
          content,
          sender_uid,
          sender_name,
          sender_avatar,
        })

        // 如果更新成功且通知原本是已讀的，標記為未讀
        if (updateResult?.success && existingNotification.is_read) {
          try {
            await pool.query(
              `UPDATE public.notifications SET is_read = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [existingNotification.id]
            )
          } catch (error) {
            console.error('標記通知為未讀失敗：', error.message)
          }
        }

        return updateResult
      }
    }

    // 創建新通知
    const result = await pool.query(
      `INSERT INTO public.notifications
       (user_uid, type, title, content, related_id, related_type, sender_uid, sender_name, sender_avatar, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user_uid,
        type,
        title,
        content || null,
        related_id || null,
        related_type || null,
        sender_uid || null,
        sender_name || null,
        sender_avatar || null,
        link || null,
      ],
    )

    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error('創建通知失敗：', error.message)
    console.error('創建通知失敗詳情：', error)
    // 不拋出錯誤，避免影響主流程
    return null
  }
}

/**
 * 創建按讚通知（會合併同一篇文章的多個按讚）
 */
async function createLikeNotification({ user_uid, post_id, board, liker_uid, liker_name, liker_avatar, post_title }) {
  const boardName = board === 'discussion' ? '討論' : board === 'traveler' ? '找旅伴' : '貼文'

  // 使用 mergeIfExists = true 來合併同一篇文章的多個按讚
  return await createNotification({
    user_uid,
    type: 'like',
    title: `${liker_name} 按讚了你的${boardName}貼文`,
    content: post_title || `你的${boardName}貼文`,
    related_id: post_id,
    related_type: board,
    sender_uid: liker_uid,
    sender_name: liker_name,
    sender_avatar: liker_avatar,
    link: board === 'discussion'
      ? `/discussion?postId=${post_id}`
      : board === 'traveler'
      ? `/travelers?postId=${post_id}`
      : null,
  }, true) // 啟用合併功能
}

/**
 * 檢查評論內容是否 tag 了作者本人
 * @param {String} content - 評論內容
 * @param {String} authorName - 作者名稱
 * @returns {Boolean} 是否 tag 了作者
 */
function hasMentionAuthor(content, authorName) {
  if (!content || !authorName) return false
  // 檢查是否包含 @作者名稱
  const mentionPattern = new RegExp(`@${authorName}`, 'i')
  return mentionPattern.test(content)
}

/**
 * 創建回覆通知（會合併同一篇文章的多個回覆，除非 tag 了作者本人）
 */
async function createCommentNotification({
  user_uid,
  post_id,
  board,
  commenter_uid,
  commenter_name,
  commenter_avatar,
  comment_content,
  post_title, // eslint-disable-line no-unused-vars
  author_name // 作者名稱，用於檢查是否被 tag
}) {
  const boardName = board === 'discussion' ? '討論' : board === 'traveler' ? '找旅伴' : '貼文'
  const contentPreview = comment_content?.substring(0, 50) || '回覆了你的貼文'

  // 如果評論 tag 了作者本人，則創建獨立通知（不合併）
  const mentionedAuthor = hasMentionAuthor(comment_content, author_name)

  return await createNotification({
    user_uid,
    type: 'comment',
    title: `${commenter_name} 回覆了你的${boardName}貼文`,
    content: contentPreview,
    related_id: post_id,
    related_type: board,
    sender_uid: commenter_uid,
    sender_name: commenter_name,
    sender_avatar: commenter_avatar,
    link: board === 'discussion'
      ? `/discussion?postId=${post_id}`
      : board === 'traveler'
      ? `/travelers?postId=${post_id}`
      : null,
  }, !mentionedAuthor) // 如果 tag 了作者，不合併（創建獨立通知）；否則合併
}

/**
 * 創建加好友申請通知
 */
async function createFriendRequestNotification({
  user_uid,
  requester_uid,
  requester_name,
  requester_avatar
}) {
  return await createNotification({
    user_uid,
    type: 'friend_request',
    title: `${requester_name} 想要加你為好友`,
    content: '查看好友申請',
    related_id: null,
    related_type: 'friend',
    sender_uid: requester_uid,
    sender_name: requester_name,
    sender_avatar: requester_avatar,
    link: '/profile?tab=friends',
  })
}

/**
 * 創建找旅伴申請通知
 */
async function createTravelerApplicationNotification({
  user_uid,
  traveler_id,
  applicant_uid,
  applicant_name,
  applicant_avatar,
  traveler_title
}) {
  return await createNotification({
    user_uid,
    type: 'traveler_application',
    title: `${applicant_name} 申請加入你的旅伴招募`,
    content: traveler_title || '查看申請詳情',
    related_id: traveler_id,
    related_type: 'traveler',
    sender_uid: applicant_uid,
    sender_name: applicant_name,
    sender_avatar: applicant_avatar,
    link: `/travelers?postId=${traveler_id}`,
  })
}

module.exports = {
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createFriendRequestNotification,
  createTravelerApplicationNotification,
}
