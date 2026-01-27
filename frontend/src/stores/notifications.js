import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
  deleteNotification,
} from '@/api/notifications'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    lastFetchTime: null,
  }),

  getters: {
    unreadNotifications: (state) => {
      return state.notifications.filter((n) => !n.is_read)
    },
    readNotifications: (state) => {
      return state.notifications.filter((n) => n.is_read)
    },
    displayCount: (state) => {
      return Math.min(state.unreadCount, 99)
    },
  },

  actions: {
    async fetchNotifications(uid, limit = 50, offset = 0) {
      if (this.isLoading) return
      if (!uid) return
      
      this.isLoading = true
      try {
        const response = await getNotifications(uid, limit, offset)
        if (response.success) {
          this.notifications = response.data || []
          this.lastFetchTime = Date.now()
        }
      } catch (error) {
        this.notifications = []
      } finally {
        this.isLoading = false
      }
    },

    async fetchUnreadCount(uid) {
      if (!uid) return
      
      try {
        const response = await getUnreadCount(uid)
        if (response.success) {
          this.unreadCount = response.count || 0
        }
      } catch (error) {
        this.unreadCount = 0
      }
    },

    async markAsRead(notificationId) {
      try {
        const response = await markNotificationAsRead(notificationId)
        if (response.success) {
          const notification = this.notifications.find((n) => n.id === notificationId)
          if (notification) {
            notification.is_read = true
          }
          if (this.unreadCount > 0) {
            this.unreadCount--
          }
        }
      } catch (error) {
      }
    },

    async markAllAsRead(uid) {
      try {
        const response = await markAllNotificationsAsRead(uid)
        if (response.success) {
          this.notifications.forEach((n) => {
            n.is_read = true
          })
          this.unreadCount = 0
        }
      } catch (error) {
      }
    },

    async deleteNotification(notificationId) {
      try {
        const response = await deleteNotification(notificationId)
        if (response.success) {
          const index = this.notifications.findIndex((n) => n.id === notificationId)
          if (index !== -1) {
            // 先保存通知資訊，再刪除
            const notification = this.notifications[index]
            this.notifications.splice(index, 1)
            // 如果刪除的是未讀通知，減少未讀數量
            if (notification && !notification.is_read && this.unreadCount > 0) {
              this.unreadCount--
            }
          }
        }
      } catch (error) {
      }
    },

    // 刷新通知（用於輪詢）
    async refreshNotifications(uid) {
      await Promise.all([
        this.fetchNotifications(uid),
        this.fetchUnreadCount(uid),
      ])
    },
  },
})

