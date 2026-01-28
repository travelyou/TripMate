import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function getNotifications(uid, limit = 50, offset = 0) {
  try {
    const response = await http.get(`/notifications/${uid}`, {
      params: { limit, offset },
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export async function getUnreadCount(uid) {
  try {
    const response = await http.get(`/notifications/${uid}/unread-count`)
    return response.data
  } catch (error) {
    throw error
  }
}

export async function markAsRead(notificationId) {
  try {
    const response = await http.patch(`/notifications/${notificationId}/read`)
    return response.data
  } catch (error) {
    throw error
  }
}

export async function markAllAsRead(uid) {
  try {
    const response = await http.patch(`/notifications/${uid}/read-all`)
    return response.data
  } catch (error) {
    throw error
  }
}

export async function deleteNotification(notificationId) {
  try {
    const response = await http.delete(`/notifications/${notificationId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

