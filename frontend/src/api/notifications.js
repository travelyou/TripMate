import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

/**
 * 獲取用戶通知列表
 */
export async function getNotifications(uid, limit = 50, offset = 0) {
  try {
    const response = await http.get(`/notifications/${uid}`, {
      params: { limit, offset },
    })
    return response.data
  } catch (error) {
    console.error('獲取通知列表失敗：', error)
    throw error
  }
}

/**
 * 獲取未讀通知數量
 */
export async function getUnreadCount(uid) {
  try {
    const response = await http.get(`/notifications/${uid}/unread-count`)
    return response.data
  } catch (error) {
    console.error('獲取未讀通知數量失敗：', error)
    throw error
  }
}

/**
 * 標記通知為已讀
 */
export async function markAsRead(notificationId) {
  try {
    const response = await http.patch(`/notifications/${notificationId}/read`)
    return response.data
  } catch (error) {
    console.error('標記通知已讀失敗：', error)
    throw error
  }
}

/**
 * 標記所有通知為已讀
 */
export async function markAllAsRead(uid) {
  try {
    const response = await http.patch(`/notifications/${uid}/read-all`)
    return response.data
  } catch (error) {
    console.error('標記所有通知已讀失敗：', error)
    throw error
  }
}

/**
 * 刪除通知
 */
export async function deleteNotification(notificationId) {
  try {
    const response = await http.delete(`/notifications/${notificationId}`)
    return response.data
  } catch (error) {
    console.error('刪除通知失敗：', error)
    throw error
  }
}

