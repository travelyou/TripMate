<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Bot as BotIcon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  Zap as ZapIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const unreadMessageCount = ref(0)


const getFriendIds = () => {
  const friends = userStore.currentUser?.friends || []
  return friends
    .map(friend => friend.uid || friend.id)
    .filter(Boolean)
}

const saveFriendSnapshot = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  const friendSnapshotKey = `friends_seen_${currentUid}`
  try {
    localStorage.setItem(friendSnapshotKey, JSON.stringify(getFriendIds()))
  } catch (error) {
    console.warn('保存好友快照失敗:', error)
  }
}

// 計算未讀訊息總數
const calculateUnreadCount = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    unreadMessageCount.value = 0
    return
  }

  try {
    let totalUnread = 0

    // 檢查好友請求
    const friendRequestsKey = `friend_requests_${currentUid}`
    const friendRequestsData = localStorage.getItem(friendRequestsKey)
    if (friendRequestsData) {
      try {
        const requests = JSON.parse(friendRequestsData)
        if (requests.received && Array.isArray(requests.received)) {
          totalUnread += requests.received.length
        }
      } catch (e) {
        console.warn('解析好友請求失敗:', e)
      }
    }

    // 檢查聊天室和未讀訊息
    const chatRoomsKey = `tripmate-private-chats-${currentUid}`
    const chatRoomsData = localStorage.getItem(chatRoomsKey)
    if (chatRoomsData) {
      try {
        const rooms = JSON.parse(chatRoomsData)
        if (Array.isArray(rooms)) {
          rooms.forEach(room => {
            if (room.unreadCount) {
              totalUnread += room.unreadCount
            } else if (room.messages && Array.isArray(room.messages)) {
              const lastMessage = room.messages[room.messages.length - 1]
              if (lastMessage && lastMessage.type !== 'user') {
                const unreadKey = `unread_${currentUid}_${room.uid}`
                const unreadData = localStorage.getItem(unreadKey)
                if (unreadData) {
                  const unreadInfo = JSON.parse(unreadData)
                  if (unreadInfo.lastReadTime) {
                    const lastReadTime = new Date(unreadInfo.lastReadTime).getTime()
                    const lastMessageTime = new Date(lastMessage.timestamp || lastMessage.created_at).getTime()
                    if (lastMessageTime > lastReadTime) {
                      totalUnread += 1
                    }
                  } else {
                    totalUnread += 1
                  }
                } else {
                  totalUnread += 1
                }
              }
            }
          })
        }
      } catch (e) {
        console.warn('解析聊天室資料失敗:', e)
      }
    }

    // 檢查新建的聊天室
    const newChatRoomsKey = `new_chat_rooms_${currentUid}`
    const newChatRoomsData = localStorage.getItem(newChatRoomsKey)
    if (newChatRoomsData) {
      try {
        const newRooms = JSON.parse(newChatRoomsData)
        if (Array.isArray(newRooms)) {
          totalUnread += newRooms.length
        }
      } catch (e) {
        console.warn('解析新建聊天室資料失敗:', e)
      }
    }

    // 檢查新增加好友
    const friendSnapshotKey = `friends_seen_${currentUid}`
    const friendSnapshotData = localStorage.getItem(friendSnapshotKey)
    const currentFriendIds = getFriendIds()
    if (friendSnapshotData) {
      try {
        const snapshot = JSON.parse(friendSnapshotData)
        if (Array.isArray(snapshot)) {
          const newFriends = currentFriendIds.filter(id => !snapshot.includes(id))
          totalUnread += newFriends.length
        }
      } catch (e) {
        console.warn('解析好友快照失敗:', e)
      }
    } else {
      saveFriendSnapshot()
    }

    // 限制最多顯示9
    unreadMessageCount.value = Math.min(totalUnread, 9)
  } catch (error) {
    console.error('計算未讀訊息失敗:', error)
    unreadMessageCount.value = 0
  }
}

// 監聽訊息變化
const handleMessageUpdate = () => {
  calculateUnreadCount()
}

// 監聽新建聊天室
const handleNewChatRoom = () => {
  calculateUnreadCount()
}


onMounted(() => {
  window.addEventListener('message-updated', handleMessageUpdate)
  window.addEventListener('new-chat-room', handleNewChatRoom)
  window.addEventListener('friends-viewed', saveFriendSnapshot)
  calculateUnreadCount()
  const interval = setInterval(() => {
    calculateUnreadCount()
  }, 5000)
  window._unreadMessageInterval = interval
})

onUnmounted(() => {
  window.removeEventListener('message-updated', handleMessageUpdate)
  window.removeEventListener('new-chat-room', handleNewChatRoom)
  window.removeEventListener('friends-viewed', saveFriendSnapshot)
  if (window._unreadMessageInterval) {
    clearInterval(window._unreadMessageInterval)
    delete window._unreadMessageInterval
  }
})

// 監聽用戶登入狀態
watch(() => userStore.currentUser, () => {
  calculateUnreadCount()
}, { deep: true })

defineEmits(['open-posting', 'quick-action', 'toggle-private-chat', 'toggle-ai-chat'])
</script>

<template>
  <div
    class="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col space-y-2 md:space-y-3 z-50"
  >
    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="發布新貼文"
      @click="$emit('open-posting')"
    >
      <PlusIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl relative"
      title="抽卡找旅伴"
      @click="$emit('quick-action')"
    >
      <ZapIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl relative"
      title="私人訊息"
      @click="$emit('toggle-private-chat')"
    >
      <MessageSquareIcon class="w-6 h-6 md:w-7 md:h-7" />
      <span
        v-if="unreadMessageCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-lg"
      >
        {{ unreadMessageCount > 9 ? '9+' : unreadMessageCount }}
      </span>
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
      title="TripMate 助手"
      @click="$emit('toggle-ai-chat')"
    >
      <BotIcon class="w-6 h-6 md:w-7 md:h-7" />
    </button>
  </div>
</template>

