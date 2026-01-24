/* eslint-env node */
const pool = require('../database/connection')
const { createNotification } = require('./notifications')

/**
 * 檢查並發送找旅伴到期提醒通知
 * 在到期前7天、3天、當天發送通知
 */
async function checkAndSendTravelerReminders() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 計算7天後、3天後、當天的日期
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    
    // 查詢即將到期的找旅伴貼文（狀態為招募中）
    const query = `
      SELECT 
        t.id,
        t.title,
        t.start_date,
        t.end_date,
        t.author_uid,
        t.author_name,
        t.author_avatar,
        t.status
      FROM travelers.travelers t
      WHERE t.deleted_at IS NULL
        AND t.status IN ('招募中', 'published')
        AND t.end_date >= CURRENT_DATE
        AND (
          t.end_date = CURRENT_DATE
          OR t.end_date = CURRENT_DATE + INTERVAL '3 days'
          OR t.end_date = CURRENT_DATE + INTERVAL '7 days'
        )
    `
    
    const result = await pool.query(query)
    
    for (const traveler of result.rows) {
      const endDate = new Date(traveler.end_date)
      endDate.setHours(0, 0, 0, 0)
      
      const daysUntilEnd = Math.floor((endDate - today) / (1000 * 60 * 60 * 24))
      
      // 只處理7天、3天、當天的提醒
      if (daysUntilEnd !== 0 && daysUntilEnd !== 3 && daysUntilEnd !== 7) {
        continue
      }
      
      // 檢查是否已經發送過這個提醒（避免重複發送）
      const reminderText = daysUntilEnd === 0 ? '今天到期' : `${daysUntilEnd}天後到期`
      const notificationCheck = await pool.query(
        `SELECT id FROM public.notifications
         WHERE user_uid = $1
           AND type = 'traveler_reminder'
           AND related_id = $2
           AND related_type = 'traveler'
           AND (content LIKE $3 OR title LIKE $4)
           AND created_at::date = CURRENT_DATE`,
        [
          traveler.author_uid,
          traveler.id,
          `%${reminderText}%`,
          `%${reminderText}%`
        ]
      )
      
      if (notificationCheck.rows.length > 0) {
        continue // 已經發送過，跳過
      }
      
      let title = ''
      let content = ''
      
      if (daysUntilEnd === 0) {
        title = `你的找旅伴貼文「${traveler.title}」今天到期！`
        content = '記得確認最終的旅伴名單和行程安排'
      } else if (daysUntilEnd === 3) {
        title = `你的找旅伴貼文「${traveler.title}」將在3天後到期`
        content = '還有3天就要出發了，記得確認旅伴名單'
      } else if (daysUntilEnd === 7) {
        title = `你的找旅伴貼文「${traveler.title}」將在一週後到期`
        content = '還有一週就要出發了，記得開始準備行程'
      }
      
      if (title) {
        // 發送通知給貼文作者
        await createNotification({
          user_uid: traveler.author_uid,
          type: 'traveler_reminder',
          title,
          content,
          related_id: traveler.id,
          related_type: 'traveler',
          sender_uid: null,
          sender_name: '系統提醒',
          sender_avatar: null,
          link: `/travelers?postId=${traveler.id}`,
        })
        
        // 發送通知給已接受的申請者
        const acceptedApplications = await pool.query(
          `SELECT author_uid, author_name, author_avatar
           FROM travelers.traveler_applications
           WHERE traveler_id = $1 AND status = 'accepted'`,
          [traveler.id]
        )
        
        for (const applicant of acceptedApplications.rows) {
          // 檢查是否已經發送過
          const applicantCheck = await pool.query(
            `SELECT id FROM public.notifications
             WHERE user_uid = $1
               AND type = 'traveler_reminder'
               AND related_id = $2
               AND related_type = 'traveler'
               AND content LIKE $3
               AND created_at::date = CURRENT_DATE`,
            [
              applicant.author_uid,
              traveler.id,
              `%${reminderText}%`,
              `%${reminderText}%`
            ]
          )
          
          if (applicantCheck.rows.length === 0) {
            await createNotification({
              user_uid: applicant.author_uid,
              type: 'traveler_reminder',
              title: `你申請的找旅伴「${traveler.title}」${daysUntilEnd === 0 ? '今天' : `將在${daysUntilEnd}天後`}到期`,
              content: daysUntilEnd === 0 
                ? '記得確認最終的行程安排' 
                : `還有${daysUntilEnd}天就要出發了，記得開始準備`,
              related_id: traveler.id,
              related_type: 'traveler',
              sender_uid: traveler.author_uid,
              sender_name: traveler.author_name,
              sender_avatar: traveler.author_avatar,
              link: `/travelers?postId=${traveler.id}`,
            })
          }
        }
      }
    }
    
    console.log(`[Traveler Reminders] 檢查完成，處理了 ${result.rows.length} 個找旅伴貼文`)
  } catch (error) {
    console.error('[Traveler Reminders] 檢查失敗：', error)
  }
}

module.exports = {
  checkAndSendTravelerReminders,
}

