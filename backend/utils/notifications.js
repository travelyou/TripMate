/* eslint-env node */
/* global require, module */
const pool = require('../database/connection')

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
    return null
  }
}

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
    return null
  }
}

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
      return null
    }

    if (mergeIfExists && related_id && related_type) {
      const existingNotification = await findExistingNotification({
        user_uid,
        type,
        related_id,
        related_type,
      }, false)

      if (existingNotification) {
        const updateResult = await updateNotification(existingNotification.id, {
          title,
          content,
          sender_uid,
          sender_name,
          sender_avatar,
        })

        if (updateResult?.success && existingNotification.is_read) {
          try {
            await pool.query(
              `UPDATE public.notifications SET is_read = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [existingNotification.id]
            )
          } catch (error) {
          }
        }

        return updateResult
      }
    }

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
    return null
  }
}

async function createLikeNotification({ user_uid, post_id, board, liker_uid, liker_name, liker_avatar, post_title }) {
  const boardName = board === 'discussion' ? '討論' : board === 'traveler' ? '找旅伴' : '貼文'

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
      ? `/discussion/${post_id}`
      : board === 'traveler'
      ? `/travelers/${post_id}`
      : null,
  }, true)
}

function hasMentionAuthor(content, authorName) {
  if (!content || !authorName) return false
  const mentionPattern = new RegExp(`@${authorName}`, 'i')
  return mentionPattern.test(content)
}

async function createCommentNotification({
  user_uid,
  post_id,
  board,
  commenter_uid,
  commenter_name,
  commenter_avatar,
  comment_content,
  post_title,
  author_name
}) {
  const boardName = board === 'discussion' ? '討論' : board === 'traveler' ? '找旅伴' : '貼文'
  const contentPreview = comment_content?.substring(0, 50) || '回覆了你的貼文'

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
      ? `/discussion/${post_id}`
      : board === 'traveler'
      ? `/travelers/${post_id}`
      : null,
  }, !mentionedAuthor)
}

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
    link: `/travelers/${traveler_id}`,
  })
}

module.exports = {
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createFriendRequestNotification,
  createTravelerApplicationNotification,
}
