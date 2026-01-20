<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { X as XIcon, MessageCircle as MessageCircleIcon, Send as SendIcon, User as UserIcon, ArrowLeft as ArrowLeftIcon } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getProfile } from '@/api/profile'

// 定義事件：通知父層關閉視窗和打開聊天室
defineEmits(['close', 'open-chat-room'])

const props = defineProps({
  openChatWithUser: {
    type: Object,
    default: null // { uid, name, nickname, avatar }
  }
})

const userStore = useUserStore()
const activeTab = ref('chatrooms') // 'chatrooms' 或 'friends'
const activeChatRoom = ref(null) // 當前打開的聊天室 { type, uid, name, avatar, messages, ... }

// 聊天室列表（動態創建的聊天室）
const chatRoomsList = ref([])

// 載入好友列表和好友請求
const friendRequests = ref({ received: [], sent: [] })

// 訊息列表（根據當前聊天室）
const messages = ref([])
const messageInput = ref('')
const messagesContainer = ref(null)

// 對話次數限制
const chatInteractionCount = ref({ count: 0, remaining: 3, canSend: true })

const CHAT_STORAGE_PREFIX = 'tripmate-private-chats-'
const getChatStorageKey = (uid) => `${CHAT_STORAGE_PREFIX}${uid}`
const CHAT_MESSAGES_STORAGE_PREFIX = 'tripmate-private-chat-messages-'
const getChatMessagesStorageKey = (uid, friendUid) =>
  `${CHAT_MESSAGES_STORAGE_PREFIX}${uid}-${friendUid}`

const persistChatRooms = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  try {
    localStorage.setItem(getChatStorageKey(currentUid), JSON.stringify(chatRoomsList.value))
  } catch (error) {
    console.warn('Persist chat rooms failed:', error)
  }
}

const loadChatRoomsFromStorage = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  try {
    const raw = localStorage.getItem(getChatStorageKey(currentUid))
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      chatRoomsList.value = parsed
    }
  } catch (error) {
    console.warn('Load chat rooms failed:', error)
  }
}

const saveMessagesToStorage = (friendUid, messageList) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !friendUid) return
  try {
    localStorage.setItem(
      getChatMessagesStorageKey(currentUid, friendUid),
      JSON.stringify(messageList || [])
    )
  } catch (error) {
    console.warn('Persist chat messages failed:', error)
  }
}

const loadMessagesFromStorage = (friendUid) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !friendUid) return []
  try {
    const raw = localStorage.getItem(getChatMessagesStorageKey(currentUid, friendUid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Load chat messages failed:', error)
    return []
  }
}

// 聊天室列表（包含好友請求和動態創建的聊天室）
const chatRooms = computed(() => {
  const rooms = []

  // 添加收到的好友請求
  friendRequests.value.received.forEach(request => {
    rooms.push({
      id: `request-received-${request.uid}`,
      type: 'friend-request-received',
      uid: request.uid,
      name: request.name || request.nickname || '未知用戶',
      avatar: request.avatar || '',
      lastMessage: '好友請求待處理',
      lastMessageTime: '',
      unreadCount: 1,
      request: request
    })
  })

  // 添加發送的好友請求
  friendRequests.value.sent.forEach(request => {
    rooms.push({
      id: `request-sent-${request.uid}`,
      type: 'friend-request-sent',
      uid: request.uid,
      name: request.name || request.nickname || '未知用戶',
      avatar: request.avatar || '',
      lastMessage: '等待對方回應',
      lastMessageTime: '',
      unreadCount: 0,
      request: request
    })
  })

  // 添加動態創建的聊天室
  chatRoomsList.value.forEach(room => {
    rooms.push({
      id: `chat-${room.uid}`,
      type: 'chat',
      uid: room.uid,
      name: room.name || room.nickname || '未知用戶',
      avatar: room.avatar || '',
      lastMessage: room.lastMessage || '開始聊天',
      lastMessageTime: room.lastMessageTime || '',
      unreadCount: 0,
      messages: room.messages || []
    })
  })

  return rooms
})

// 載入聊天記錄
const loadChatHistory = async (uid, friendUid) => {
  try {
    const { getChatMessages } = await import('@/api/profile')
    const historyMessages = await getChatMessages(uid, friendUid)

    // 轉換為前端格式
    const mappedMessages = historyMessages.map(msg => ({
      id: msg.id,
      type: msg.type || (msg.sender_uid === uid ? 'user' : 'friend'),
      content: msg.content,
      timestamp: msg.timestamp || msg.created_at
    }))

    const localMessages = loadMessagesFromStorage(friendUid)
    messages.value = mappedMessages.length > 0 ? mappedMessages : localMessages

    if (mappedMessages.length > 0) {
      saveMessagesToStorage(friendUid, mappedMessages)
    }

    // 更新聊天室的消息列表
    const room = chatRoomsList.value.find(r => r.uid === friendUid)
    if (room) {
      room.messages = messages.value
    }
    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    persistChatRooms()

    console.log('[loadChatHistory] 載入聊天記錄:', messages.value.length, '條消息')
  } catch (error) {
    console.error('載入聊天記錄失敗：', error)
    // 失敗時不重置，保持當前狀態
  }
}

// 載入對話次數
const loadChatInteractionCount = async (uid, friendUid) => {
  try {
    const { getChatInteractionCount } = await import('@/api/profile')
    const data = await getChatInteractionCount(uid, friendUid)

    // 確保數據格式正確，如果數據缺失或格式不正確，使用默認值
    if (!data || typeof data !== 'object') {
      chatInteractionCount.value = { count: 0, remaining: 3, canSend: true }
      return
    }

    // 確保所有必要的字段都存在，並且 canSend 基於 remaining 計算
    const count = typeof data.count === 'number' ? data.count : 0
    const remaining = typeof data.remaining === 'number' ? data.remaining : Math.max(0, 3 - count)
    const canSend = typeof data.canSend === 'boolean' ? data.canSend : (remaining > 0)

    chatInteractionCount.value = {
      count,
      remaining,
      canSend: canSend && remaining > 0  // 雙重確保 canSend 正確
    }

    console.log('[loadChatInteractionCount] 載入對話次數:', {
      uid,
      friendUid,
      count,
      remaining,
      canSend: chatInteractionCount.value.canSend,
      rawData: data
    })
  } catch (error) {
    console.error('載入對話次數失敗：', error)
    // 錯誤時不重置，保持當前狀態（避免刷新頁面後重置計數）
    // 只有當沒有有效數據時才使用默認值
    if (!chatInteractionCount.value || !chatInteractionCount.value.count) {
      chatInteractionCount.value = { count: 0, remaining: 3, canSend: true }
    }
  }
}

// 自動捲動到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 打開或創建聊天室
const openOrCreateChatRoom = async (user) => {
  if (!user || !user.uid) return

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  // 切換到聊天室列表標籤
  activeTab.value = 'chatrooms'

  // 檢查是否已存在聊天室
  const existingRoom = chatRoomsList.value.find(r => r.uid === user.uid)

  if (existingRoom) {
    // 打開現有聊天室
    activeChatRoom.value = {
      type: 'chat',
      uid: user.uid,
      name: user.name || user.nickname || '未知用戶',
      avatar: user.avatar || '',
      messages: existingRoom.messages || []
    }
  } else {
    // 創建新聊天室
    const newRoom = {
      uid: user.uid,
      name: user.name || user.nickname || '未知用戶',
      nickname: user.nickname || user.name || '',
      avatar: user.avatar || '',
      lastMessage: '',
      lastMessageTime: '',
      messages: []
    }
    chatRoomsList.value.push(newRoom)
    persistChatRooms()

    activeChatRoom.value = {
      type: 'chat',
      uid: user.uid,
      name: newRoom.name,
      avatar: newRoom.avatar,
      messages: []
    }
  }

  // 載入對話次數
  await loadChatInteractionCount(currentUid, user.uid)

  // 從數據庫載入聊天記錄
  await loadChatHistory(currentUid, user.uid)

  scrollToBottom()
}

const loadFriends = async () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  try {
    const profileData = await getProfile(currentUid)
    if (profileData && profileData.friends) {
      userStore.currentUser.friends = profileData.friends
    }

    const { getFriendRequests } = await import('@/api/profile')
    const requests = await getFriendRequests(currentUid)
    friendRequests.value = requests || { received: [], sent: [] }
  } catch (error) {
    console.error('載入好友列表失敗：', error)
  }
}

// 從 userStore 獲取好友列表
const friends = computed(() => {
  return userStore.currentUser?.friends || []
})

// 發送訊息
const sendMessage = async () => {
  const text = messageInput.value.trim()
  if (!text) return

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !activeChatRoom.value) return

  // 檢查對話次數（在發送前檢查）
  if (!chatInteractionCount.value.canSend) {
    alert('您已達到對話次數上限（3次），等待對方同意好友請求後才能繼續聊天')
    return
  }

  // 1. 先記錄對話次數（發送前更新，確保即時反映）
  try {
    const { incrementChatInteraction } = await import('@/api/profile')
    const data = await incrementChatInteraction(currentUid, activeChatRoom.value.uid)

    console.log('[sendMessage] API 返回數據:', data)
    console.log('[sendMessage] 發送前狀態:', {
      count: chatInteractionCount.value.count,
      remaining: chatInteractionCount.value.remaining,
      canSend: chatInteractionCount.value.canSend
    })

    if (data && data.success !== false) {
      // 更新對話次數狀態（優先使用 API 返回的準確值）
      const newCount = typeof data.count === 'number' ? parseInt(data.count) : (parseInt(chatInteractionCount.value.count) || 0) + 1
      const newRemaining = typeof data.remaining === 'number' ? parseInt(data.remaining) : Math.max(0, 3 - newCount)
      const newCanSend = typeof data.canSend === 'boolean' ? data.canSend : (newRemaining > 0)

      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newCanSend
      }

      console.log('[sendMessage] 發送後狀態:', {
        count: newCount,
        remaining: newRemaining,
        canSend: newCanSend
      })

    } else {
      // API 返回異常，使用本地計算
      const newCount = (chatInteractionCount.value.count || 0) + 1
      const newRemaining = Math.max(0, 3 - newCount)
      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newRemaining > 0
      }
    }
  } catch (error) {
    console.error('記錄對話次數失敗：', error)
    // 即使 API 失敗，也應該更新本地狀態以避免無限制發送
    const newCount = (chatInteractionCount.value.count || 0) + 1
    const newRemaining = Math.max(0, 3 - newCount)
    const newCanSend = newCount < 3

    chatInteractionCount.value = {
      count: newCount,
      remaining: newRemaining,
      canSend: newCanSend
    }

  }

  // 2. 保存消息到數據庫
  try {
    const { saveChatMessage } = await import('@/api/profile')
    const savedMessage = await saveChatMessage(currentUid, activeChatRoom.value.uid, text)

    // 3. 加入使用者的訊息（使用數據庫返回的消息ID）
    const userMessage = {
      id: savedMessage.message?.id || Date.now(),
      type: 'user',
      content: text,
      timestamp: savedMessage.message?.created_at || new Date().toISOString()
    }

    messages.value.push(userMessage)

    // 更新聊天室的最後訊息
    const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
    if (room) {
      room.lastMessage = text
      room.lastMessageTime = '剛剛'
      room.messages = messages.value
    }

    // 保存到 activeChatRoom
    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    // 清空輸入框
    messageInput.value = ''

    persistChatRooms()
    saveMessagesToStorage(activeChatRoom.value.uid, messages.value)

    scrollToBottom()
  } catch (error) {
    console.error('保存消息失敗：', error)
    // 即使保存失敗，也顯示消息（但不會持久化）
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    messages.value.push(userMessage)

    // 更新聊天室的最後訊息
    const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
    if (room) {
      room.lastMessage = text
      room.lastMessageTime = '剛剛'
      room.messages = messages.value
    }

    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    messageInput.value = ''
    persistChatRooms()
    saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
    scrollToBottom()
  }
}

// 處理點擊聊天室
const handleChatRoomClick = async (room) => {
  if (room.type === 'friend-request-received') {
    const accept = confirm(`是否接受 ${room.name} 的好友請求？`)
    if (accept) {
      try {
        const { acceptFriendRequest } = await import('@/api/profile')
        const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
        await acceptFriendRequest(currentUid, room.uid)
        await loadFriends()
        alert('已接受好友請求')
      } catch (error) {
        console.error('接受好友請求失敗：', error)
        alert('接受好友請求失敗：' + (error.message || '未知錯誤'))
      }
    } else {
      try {
        const { rejectFriendRequest } = await import('@/api/profile')
        const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
        await rejectFriendRequest(currentUid, room.uid)
        await loadFriends()
      } catch (error) {
        console.error('拒絕好友請求失敗：', error)
      }
    }
  } else if (room.type === 'friend-request-sent') {
    alert(`已向 ${room.name} 發送好友請求，等待對方回應`)
  } else if (room.type === 'chat') {
    // 打開聊天室
    activeChatRoom.value = {
      type: 'chat',
      uid: room.uid,
      name: room.name,
      avatar: room.avatar,
      messages: room.messages || []
    }

    // 載入對話次數和聊天記錄
    const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
    if (currentUid) {
      await loadChatInteractionCount(currentUid, room.uid)
      await loadChatHistory(currentUid, room.uid)
    }

    scrollToBottom()
  }
}

// 返回聊天室列表
const backToChatRooms = () => {
  activeChatRoom.value = null
  messages.value = []
  messageInput.value = ''
}

// 處理點擊好友
const handleFriendClick = (friend) => {
  openOrCreateChatRoom(friend)
}

// 監聽 openChatWithUser prop，自動打開聊天室
watch(() => props.openChatWithUser, (newUser) => {
  if (newUser && newUser.uid) {
    openOrCreateChatRoom(newUser)
  }
}, { immediate: true })

onMounted(() => {
  loadFriends()
  loadChatRoomsFromStorage()
})

watch(chatRoomsList, () => {
  persistChatRooms()
}, { deep: true })
</script>

<template>
  <div
    class="fixed bottom-4 md:bottom-8 right-[80px] md:right-[96px] w-80 md:w-80 max-w-80 h-[480px] md:h-[480px] max-h-[480px] border-4 border-primary-600 shadow-primary-strong z-50 flex flex-col rounded-xl overflow-hidden animate-slide-up"
  >
    <div
      class="bg-primary text-secondary-50 p-4 flex items-center justify-between border-b-4 border-primary-700"
    >
      <div class="flex items-center space-x-3">
        <button
          v-if="activeChatRoom"
          class="mr-2 p-1 hover:bg-primary-600 rounded-full transition"
          @click="backToChatRooms"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <div>
          <h3 class="font-bold text-lg">
            {{ activeChatRoom ? activeChatRoom.name : '私人聊天' }}
          </h3>
        </div>
      </div>
      <button class="p-1 hover:bg-primary-600 rounded-full transition" @click="$emit('close')">
        <XIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- 聊天界面 -->
    <template v-if="activeChatRoom && activeChatRoom.type === 'chat'">
      <!-- 訊息列表 -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
      >
        <div
          v-if="messages.length === 0"
          class="text-center text-gray-400 py-8 text-sm"
        >
          開始與 {{ activeChatRoom.name }} 聊天
        </div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex items-start space-x-2"
          :class="{ 'justify-end': msg.type === 'user' }"
        >
          <div
            v-if="msg.type !== 'user'"
            class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary-700"
          >
            <UserIcon class="w-5 h-5 text-white" />
          </div>

          <div
            class="p-3 shadow-sm max-w-[80%] text-sm font-medium"
            :class="[
              msg.type === 'user'
                ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm border-2 border-primary-700'
                : 'bg-white text-secondary-800 rounded-2xl rounded-tl-sm border-2 border-secondary-100',
            ]"
          >
            {{ msg.content }}
          </div>

          <div
            v-if="msg.type === 'user'"
            class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 border-2 border-gray-400"
          >
            <UserIcon class="w-5 h-5 text-gray-600" />
          </div>
        </div>

        <div
          v-if="!chatInteractionCount.canSend"
          class="text-center text-xs text-gray-500 py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          已達到對話次數上限（3次），等待對方同意好友請求後才能繼續
        </div>
      </div>

      <!-- 輸入框 -->
      <div class="p-4 border-t-2 border-gray-200 bg-white">
        <form class="flex items-center space-x-2" @submit.prevent="sendMessage">
          <input
            v-model="messageInput"
            type="text"
            :disabled="!chatInteractionCount.canSend"
            placeholder="輸入訊息..."
            class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:border-primary-500 focus:outline-none text-sm bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            :disabled="!chatInteractionCount.canSend"
            class="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition border-2 border-primary-700 shadow-sm active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </form>
        <div v-if="chatInteractionCount.remaining > 0" class="text-xs text-gray-500 mt-1 text-center">
          還可發送 {{ chatInteractionCount.remaining }} 次訊息
        </div>
      </div>
    </template>

    <!-- 聊天室列表和好友列表 -->
    <template v-else>
      <!-- 標籤頁切換 -->
      <div class="flex border-b-2 border-primary-700 bg-primary-100">
        <button
          class="flex-1 px-4 py-3 font-bold text-sm transition"
          :class="
            activeTab === 'chatrooms'
              ? 'bg-primary-600 text-white border-b-4 border-primary-800'
              : 'text-primary-700 hover:bg-primary-200'
          "
          @click="activeTab = 'chatrooms'"
        >
          聊天室列表
        </button>
        <button
          class="flex-1 px-4 py-3 font-bold text-sm transition"
          :class="
            activeTab === 'friends'
              ? 'bg-primary-600 text-white border-b-4 border-primary-800'
              : 'text-primary-700 hover:bg-primary-200'
          "
          @click="activeTab = 'friends'"
        >
          好友列表
        </button>
      </div>

      <!-- 聊天室列表 -->
      <div v-if="activeTab === 'chatrooms'" class="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
        <div class="p-4 space-y-2">
          <div
            v-if="chatRooms.length === 0"
            class="text-center text-gray-400 py-8"
          >
            還沒有聊天室
          </div>
          <div
            v-for="room in chatRooms"
            :key="room.id"
            class="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition cursor-pointer border-2"
            :class="room.type === 'friend-request-received'
              ? 'border-yellow-400 bg-yellow-50 hover:border-yellow-500'
              : room.type === 'friend-request-sent'
              ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
              : 'border-transparent hover:border-primary-200'"
            @click="handleChatRoomClick(room)"
          >
            <div
              v-if="room.avatar"
              class="w-12 h-12 rounded-full bg-gray-200 object-cover border-2 border-primary-200 flex-shrink-0 overflow-hidden"
            >
              <img :src="room.avatar" :alt="room.name" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary-700"
            >
              <MessageCircleIcon class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <div class="font-bold text-gray-800 text-sm truncate">
                  {{ room.name }}
                  <span v-if="room.type === 'friend-request-received'" class="text-yellow-600">（好友請求）</span>
                  <span v-if="room.type === 'friend-request-sent'" class="text-blue-600">（已發送）</span>
                </div>
                <div v-if="room.lastMessageTime" class="text-xs text-gray-500 ml-2 flex-shrink-0">{{ room.lastMessageTime }}</div>
              </div>
              <div class="flex items-center justify-between">
                <div class="text-xs text-gray-600 truncate">{{ room.lastMessage }}</div>
                <div
                  v-if="room.unreadCount > 0"
                  class="ml-2 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
                >
                  {{ room.unreadCount }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 好友列表 -->
      <div v-if="activeTab === 'friends'" class="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
        <div class="p-4 space-y-2">
          <div
            v-if="friends.length === 0"
            class="text-center text-gray-400 py-8"
          >
            還沒有加任何好友喔！
          </div>
          <div
            v-for="friend in friends"
            :key="friend.id || friend.uid"
            class="flex items-center justify-between p-3 hover:bg-white rounded-xl transition cursor-pointer border-2 border-transparent hover:border-primary-200 group"
            @click="handleFriendClick(friend)"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <img
                :src="friend.avatar || ''"
                class="w-12 h-12 rounded-full bg-gray-200 object-cover border-2 border-primary-200 flex-shrink-0"
                alt="Avatar"
                @error="$event.target.src = ''"
              />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-gray-800 text-sm truncate">
                  {{ friend.name || friend.nickname || '未知用戶' }}
                </div>
                <div class="text-xs text-gray-500 truncate">
                  @{{ friend.nickname || friend.name || 'user' }}
                </div>
              </div>
            </div>
            <button
              class="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full transition ml-2 flex-shrink-0"
              title="聊聊"
              @click.stop="handleFriendClick(friend)"
            >
              <MessageCircleIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 上滑動畫 */
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slide-up {
  animation: slideUp 0.2s ease-out forwards;
}
</style>
