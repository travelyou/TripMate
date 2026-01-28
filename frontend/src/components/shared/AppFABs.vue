<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Bot as BotIcon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  Zap as ZapIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getStorageItem, setStorageItem } from '@/utils/storage'

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
  setStorageItem(friendSnapshotKey, getFriendIds())
}

const calculateUnreadCount = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    unreadMessageCount.value = 0
    return
  }

  try {
    let totalUnread = 0

    const friendRequestsKey = `friend_requests_${currentUid}`
    const requests = getStorageItem(friendRequestsKey, null)
    if (requests && requests.received && Array.isArray(requests.received)) {
      totalUnread += requests.received.length
    }

    const chatRoomsKey = `tripmate-private-chats-${currentUid}`
    const rooms = getStorageItem(chatRoomsKey, [])
    if (Array.isArray(rooms)) {
      rooms.forEach(room => {
        if (room.unreadCount) {
          totalUnread += room.unreadCount
        } else if (room.messages && Array.isArray(room.messages)) {
          const lastMessage = room.messages[room.messages.length - 1]
          if (lastMessage && lastMessage.type !== 'user') {
            const unreadKey = `unread_${currentUid}_${room.uid}`
            const unreadInfo = getStorageItem(unreadKey, null)
            if (unreadInfo && unreadInfo.lastReadTime) {
              const lastReadTime = new Date(unreadInfo.lastReadTime).getTime()
              const lastMessageTime = new Date(lastMessage.timestamp || lastMessage.created_at).getTime()
              if (lastMessageTime > lastReadTime) {
                totalUnread += 1
              }
            } else {
              totalUnread += 1
            }
          }
        }
      })
    }

    const newChatRoomsKey = `new_chat_rooms_${currentUid}`
    const newRooms = getStorageItem(newChatRoomsKey, [])
    if (Array.isArray(newRooms)) {
      totalUnread += newRooms.length
    }

    const friendSnapshotKey = `friends_seen_${currentUid}`
    const snapshot = getStorageItem(friendSnapshotKey, null)
    const currentFriendIds = getFriendIds()
    if (Array.isArray(snapshot)) {
      const newFriends = currentFriendIds.filter(id => !snapshot.includes(id))
      totalUnread += newFriends.length
    } else {
      saveFriendSnapshot()
    }
    unreadMessageCount.value = Math.min(totalUnread, 9)
  } catch (error) {
    console.error('計算未讀訊息失敗:', error)
    unreadMessageCount.value = 0
  }
}

const handleMessageUpdate = () => {
  calculateUnreadCount()
}

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

watch(() => userStore.currentUser, () => {
  calculateUnreadCount()
}, { deep: true })

watch(() => userStore.isVendor, () => {
  // 觸發響應式更新
})

defineEmits(['open-posting', 'quick-action', 'toggle-private-chat', 'toggle-ai-chat'])
</script>

<template>
  <div
    class="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col space-y-2 md:space-y-3 z-50"
  >
    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
      aria-label="發布新貼文"
      title="發布新貼文"
      @click="$emit('open-posting')"
    >
      <PlusIcon class="w-6 h-6 md:w-7 md:h-7" aria-hidden="true" />
    </button>

    <button
      v-if="!userStore.isVendor"
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl relative focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
      aria-label="抽卡找旅伴"
      title="抽卡找旅伴"
      @click="$emit('quick-action')"
    >
      <ZapIcon class="w-6 h-6 md:w-7 md:h-7" aria-hidden="true" />
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl relative focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
      :aria-label="`私人訊息${unreadMessageCount > 0 ? `，有 ${unreadMessageCount} 則未讀訊息` : ''}`"
      title="私人訊息"
      @click="$emit('toggle-private-chat')"
    >
      <MessageSquareIcon class="w-6 h-6 md:w-7 md:h-7" aria-hidden="true" />
      <span
        v-if="unreadMessageCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-lg"
        :aria-label="`未讀訊息數量：${unreadMessageCount}`"
      >
        {{ unreadMessageCount > 9 ? '9+' : unreadMessageCount }}
      </span>
    </button>

    <button
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2"
      aria-label="TripMate 助手"
      title="TripMate 助手"
      @click="$emit('toggle-ai-chat')"
    >
      <BotIcon class="w-6 h-6 md:w-7 md:h-7" aria-hidden="true" />
    </button>
  </div>
</template>

