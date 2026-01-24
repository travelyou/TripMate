<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationsStore } from '@/stores/notifications'
import { Bell as BellIcon, X as XIcon } from 'lucide-vue-next'
import { formatTime } from '@/utils/time'

const router = useRouter()
const userStore = useUserStore()
const notificationsStore = useNotificationsStore()

const isOpen = ref(false)
const notificationRef = ref(null)
const isNavigating = ref(false)
let refreshInterval = null
let unreadCountInterval = null
const REFRESH_INTERVAL = 15000 // 每15秒刷新一次（可調整）

// 獲取當前用戶UID
const currentUid = computed(() => {
  return userStore.currentUser?.uid || userStore.currentUser?.id
})

// 未讀通知數量（最多顯示99）
const unreadCount = computed(() => notificationsStore.displayCount)

// 通知列表
const notifications = computed(() => notificationsStore.notifications)

// 未讀通知
const unreadNotifications = computed(() => notificationsStore.unreadNotifications)

// 已讀通知
const readNotifications = computed(() => notificationsStore.readNotifications)

// 切換通知面板
const toggleNotifications = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && currentUid.value) {
    // 打開面板時立即刷新通知
    notificationsStore.refreshNotifications(currentUid.value)
  }
}

// 關閉通知面板
const closeNotifications = () => {
  isOpen.value = false
}

// 點擊通知處理
const handleNotificationClick = async (notification) => {
  if (isNavigating.value) return // 防止重複點擊
  
  try {
    isNavigating.value = true
    
    // 標記為已讀
    if (!notification.is_read) {
      await notificationsStore.markAsRead(notification.id)
    }
    
    // 關閉通知面板
    closeNotifications()
    
    // 跳轉到對應頁面
    if (notification.link) {
      await router.push(notification.link)
    } else {
      // 根據類型生成默認連結
      switch (notification.type) {
        case 'like':
          // 按讚通知：跳轉到貼文但不滾動到留言
          if (notification.related_type === 'discussion') {
            await router.push(`/discussion?postId=${notification.related_id}`)
          } else if (notification.related_type === 'traveler') {
            await router.push(`/travelers?travelerId=${notification.related_id}`)
          }
          break
        case 'comment':
          // 留言通知：跳轉到貼文並滾動到留言區
          if (notification.related_type === 'discussion') {
            await router.push(`/discussion?postId=${notification.related_id}&scrollToComments=true`)
          } else if (notification.related_type === 'traveler') {
            await router.push(`/travelers?travelerId=${notification.related_id}&scrollToComments=true`)
          }
          break
        case 'friend_request':
          // 好友申請通知：跳轉到個人頁面並打開好友列表
          await router.push('/profile?openFriends=true')
          break
        case 'traveler_application':
        case 'traveler_reminder':
          // 旅伴申請/提醒通知：跳轉到旅伴貼文
          await router.push(`/travelers?travelerId=${notification.related_id}`)
          break
      }
    }
  } catch (error) {
    console.error('跳轉失敗：', error)
  } finally {
    // 延遲重置狀態，確保頁面已完全跳轉
    setTimeout(() => {
      isNavigating.value = false
    }, 1000)
  }
}

// 標記所有為已讀
const handleMarkAllAsRead = async () => {
  if (currentUid.value) {
    await notificationsStore.markAllAsRead(currentUid.value)
  }
}

// 刪除通知
const handleDeleteNotification = async (notificationId, event) => {
  event.stopPropagation()
  await notificationsStore.deleteNotification(notificationId)
}

// 獲取通知類型圖標和顏色
const getNotificationTypeInfo = (type) => {
  switch (type) {
    case 'like':
      return { icon: '👍', color: 'text-red-500' }
    case 'comment':
      return { icon: '💬', color: 'text-blue-500' }
    case 'friend_request':
      return { icon: '👤', color: 'text-green-500' }
    case 'traveler_application':
      return { icon: '✈️', color: 'text-purple-500' }
    case 'traveler_reminder':
      return { icon: '⏰', color: 'text-orange-500' }
    default:
      return { icon: '🔔', color: 'text-gray-500' }
  }
}

// 獲取頭像 URL（如果沒有則使用默認頭像）
const getAvatarUrl = (notification) => {
  if (notification.sender_avatar && notification.sender_avatar.trim() !== '') {
    return notification.sender_avatar
  }
  // 如果沒有頭像，使用默認頭像（基於 sender_uid）
  if (notification.sender_uid) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.sender_uid}`
  }
  // 如果連 sender_uid 都沒有，使用通知類型圖標
  return null
}

// 獲取發送者名稱（優先使用 nickname）
const getSenderName = (notification) => {
  return notification.sender_name || '匿名用戶'
}

// 點擊外部關閉
const handleClickOutside = (event) => {
  if (notificationRef.value && !notificationRef.value.contains(event.target)) {
    closeNotifications()
  }
}

// 清理所有定時器
const clearAllIntervals = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (unreadCountInterval) {
    clearInterval(unreadCountInterval)
    unreadCountInterval = null
  }
}

// 啟動自動刷新
const startAutoRefresh = (uid) => {
  if (!uid) return
  
  // 清理舊的定時器
  clearAllIntervals()
  
  // 立即刷新一次
  notificationsStore.refreshNotifications(uid)
  
  // 設置定時刷新（每15秒刷新完整通知，每10秒只刷新未讀數量）
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      notificationsStore.refreshNotifications(uid)
    }
  }, REFRESH_INTERVAL)
  
  // 更頻繁地刷新未讀數量（每10秒）
  unreadCountInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      notificationsStore.fetchUnreadCount(uid)
    }
  }, 10000)
}

// 監聽用戶登入狀態
watch(
  () => currentUid.value,
  (uid) => {
    if (uid) {
      startAutoRefresh(uid)
    } else {
      clearAllIntervals()
    }
  },
  { immediate: true }
)

// 處理頁面可見性變化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && currentUid.value) {
    // 頁面重新可見時立即刷新
    notificationsStore.refreshNotifications(currentUid.value)
  }
}

onMounted(() => {
  if (currentUid.value) {
    startAutoRefresh(currentUid.value)
  }
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  clearAllIntervals()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 當組件被激活時（使用 keep-alive 時）
onActivated(() => {
  if (currentUid.value) {
    startAutoRefresh(currentUid.value)
  }
})

// 當組件被停用時（使用 keep-alive 時）
onDeactivated(() => {
  clearAllIntervals()
})
</script>

<template>
  <div ref="notificationRef" class="relative">
    <!-- 通知鈴鐺按鈕 -->
    <button
      class="relative p-2 hover:bg-primary-600 rounded-full transition text-secondary-50"
      @click="toggleNotifications"
    >
      <BellIcon class="w-6 h-6" />
      <!-- 未讀通知徽章 -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full border-2 border-primary-700"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- 加載動畫遮罩 -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isNavigating"
        class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[100]"
      >
        <div class="bg-white rounded-lg p-6 shadow-2xl flex flex-col items-center gap-3">
          <div class="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p class="text-secondary-700 font-medium">跳轉中...</p>
        </div>
      </div>
    </Transition>

    <!-- 通知面板 -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-4"
    >
      <div
        v-if="isOpen"
        class="fixed right-4 top-16 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-secondary-100 overflow-hidden z-50 max-h-[calc(100vh-5rem)] flex flex-col"
      >
        <!-- 標題欄 -->
        <div class="p-4 border-b border-secondary-100 flex items-center justify-between bg-primary-50">
          <h3 class="text-lg font-bold text-secondary-900 leading-none">通知</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="unreadCount > 0"
              class="text-sm text-primary-600 hover:text-primary-700 font-medium leading-none"
              @click="handleMarkAllAsRead"
            >
              全部標記為已讀
            </button>
            <button
              class="p-1 hover:bg-secondary-100 rounded-full transition"
              @click="closeNotifications"
            >
              <XIcon class="w-4 h-4 text-secondary-600" />
            </button>
          </div>
        </div>

        <!-- 通知列表 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="notifications.length === 0" class="p-8 text-center text-secondary-500">
            <BellIcon class="w-12 h-12 mx-auto mb-2 text-secondary-300" />
            <p>暫無通知</p>
          </div>

          <div v-else>
            <!-- 未讀通知 -->
            <div v-if="unreadNotifications.length > 0" class="border-b border-secondary-100">
              <div
                v-for="notification in unreadNotifications"
                :key="notification.id"
                class="p-4 hover:bg-secondary-50 cursor-pointer border-l-4 border-primary-500 transition relative"
                :class="{ 'pointer-events-none opacity-50': isNavigating }"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex items-start gap-3">
                  <!-- 發送者頭像 -->
                  <div class="shrink-0">
                    <img
                      v-if="getAvatarUrl(notification)"
                      :src="getAvatarUrl(notification)"
                      class="w-10 h-10 rounded-full object-cover border border-secondary-200"
                      :alt="getSenderName(notification)"
                      @error="(e) => {
                        // 如果圖片載入失敗，使用默認頭像
                        if (notification.sender_uid) {
                          e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.sender_uid}`
                        } else {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling.style.display = 'flex'
                        }
                      }"
                    />
                    <div
                      v-else
                      class="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center border border-secondary-200"
                    >
                      <span class="text-lg">{{ getNotificationTypeInfo(notification.type).icon }}</span>
                    </div>
                  </div>

                  <!-- 通知內容 -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-secondary-900 mb-1">
                      {{ notification.title }}
                    </p>
                    <p v-if="notification.content" class="text-xs text-secondary-600 mb-2 line-clamp-2">
                      {{ notification.content }}
                    </p>
                    <p class="text-xs text-secondary-400">
                      {{ formatTime(notification.created_at) }}
                    </p>
                  </div>

                  <!-- 操作按鈕 -->
                  <button
                    class="shrink-0 p-1 hover:bg-secondary-200 rounded transition"
                    @click.stop="handleDeleteNotification(notification.id, $event)"
                  >
                    <XIcon class="w-4 h-4 text-secondary-400" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 已讀通知 -->
            <div v-if="readNotifications.length > 0">
              <div
                v-for="notification in readNotifications"
                :key="notification.id"
                class="p-4 hover:bg-secondary-50 cursor-pointer transition opacity-75 relative"
                :class="{ 'pointer-events-none opacity-50': isNavigating }"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex items-start gap-3">
                  <!-- 發送者頭像 -->
                  <div class="shrink-0">
                    <img
                      v-if="getAvatarUrl(notification)"
                      :src="getAvatarUrl(notification)"
                      class="w-10 h-10 rounded-full object-cover border border-secondary-200"
                      :alt="getSenderName(notification)"
                      @error="(e) => {
                        // 如果圖片載入失敗，使用默認頭像
                        if (notification.sender_uid) {
                          e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.sender_uid}`
                        } else {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling.style.display = 'flex'
                        }
                      }"
                    />
                    <div
                      v-else
                      class="w-10 h-10 rounded-full bg-secondary-200 flex items-center justify-center border border-secondary-200"
                    >
                      <span class="text-lg">{{ getNotificationTypeInfo(notification.type).icon }}</span>
                    </div>
                  </div>

                  <!-- 通知內容 -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-secondary-700 mb-1">
                      {{ notification.title }}
                    </p>
                    <p v-if="notification.content" class="text-xs text-secondary-500 mb-2 line-clamp-2">
                      {{ notification.content }}
                    </p>
                    <p class="text-xs text-secondary-400">
                      {{ formatTime(notification.created_at) }}
                    </p>
                  </div>

                  <!-- 操作按鈕 -->
                  <button
                    class="shrink-0 p-1 hover:bg-secondary-200 rounded transition"
                    @click.stop="handleDeleteNotification(notification.id, $event)"
                  >
                    <XIcon class="w-4 h-4 text-secondary-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

