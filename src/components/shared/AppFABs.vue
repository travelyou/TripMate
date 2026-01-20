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

// 计算未读消息总数
const calculateUnreadCount = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    unreadMessageCount.value = 0
    return
  }

  try {
    let totalUnread = 0

    // 检查好友请求
    const friendRequestsKey = `friend_requests_${currentUid}`
    const friendRequestsData = localStorage.getItem(friendRequestsKey)
    if (friendRequestsData) {
      try {
        const requests = JSON.parse(friendRequestsData)
        if (requests.received && Array.isArray(requests.received)) {
          totalUnread += requests.received.length
        }
      } catch (e) {
        console.warn('解析好友请求失败:', e)
      }
    }

    // 检查聊天室和未读消息
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
        console.warn('解析聊天室数据失败:', e)
      }
    }

    // 检查新建的聊天室
    const newChatRoomsKey = `new_chat_rooms_${currentUid}`
    const newChatRoomsData = localStorage.getItem(newChatRoomsKey)
    if (newChatRoomsData) {
      try {
        const newRooms = JSON.parse(newChatRoomsData)
        if (Array.isArray(newRooms)) {
          totalUnread += newRooms.length
        }
      } catch (e) {
        console.warn('解析新建聊天室数据失败:', e)
      }
    }

    // 限制最多显示9
    unreadMessageCount.value = Math.min(totalUnread, 9)
  } catch (error) {
    console.error('计算未读消息失败:', error)
    unreadMessageCount.value = 0
  }
}

// 监听消息变化
const handleMessageUpdate = () => {
  calculateUnreadCount()
}

// 监听新建聊天室
const handleNewChatRoom = () => {
  calculateUnreadCount()
}

onMounted(() => {
  window.addEventListener('message-updated', handleMessageUpdate)
  window.addEventListener('new-chat-room', handleNewChatRoom)
  calculateUnreadCount()
  const interval = setInterval(calculateUnreadCount, 5000)
  window._unreadMessageInterval = interval
})

onUnmounted(() => {
  window.removeEventListener('message-updated', handleMessageUpdate)
  window.removeEventListener('new-chat-room', handleNewChatRoom)
  if (window._unreadMessageInterval) {
    clearInterval(window._unreadMessageInterval)
    delete window._unreadMessageInterval
  }
})

// 监听用户登录状态
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
      class="p-3 md:p-4 w-14 h-14 bg-primary-500 text-white hover:bg-primary-600 flex items-center justify-center transition-transform hover:-translate-y-1 border-2 border-primary-700 shadow-primary-fab rounded-xl"
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

