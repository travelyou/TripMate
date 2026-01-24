/* eslint-env node */
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
 * 創建通知
 * @param {Object} notificationData - 通知資料
 * @returns {Promise<Object>} 創建的通知
 */
async function createNotification(notificationData) {
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

    console.log(`[通知] 成功創建通知：type=${type}, user_uid=${user_uid}, title=${title}`)
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error('創建通知失敗：', error.message)
    console.error('創建通知失敗詳情：', error)
    // 不拋出錯誤，避免影響主流程
    return null
  }
}

/**
 * 創建按讚通知
 */
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
      ? `/discussion?postId=${post_id}` 
      : board === 'traveler' 
      ? `/travelers?postId=${post_id}` 
      : null,
  })
}

/**
 * 創建回覆通知
 */
async function createCommentNotification({ 
  user_uid, 
  post_id, 
  board, 
  commenter_uid, 
  commenter_name, 
  commenter_avatar, 
  comment_content,
  post_title 
}) {
  const boardName = board === 'discussion' ? '討論' : board === 'traveler' ? '找旅伴' : '貼文'
  const contentPreview = comment_content?.substring(0, 50) || '回覆了你的貼文'
  
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
  })
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

