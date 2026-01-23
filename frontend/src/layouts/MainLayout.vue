<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { auth } from '@/firebase/config'
import { getChatMessages } from '@/api/profile'
import { API_BASE_URL } from '@/api/config'

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppFABs from '@/components/shared/AppFABs.vue'
import PostingChoiceCard from '@/components/cards/PostingChoiceCard.vue'
import PrivateChatWindow from '@/components/chat/PrivateChatWindow.vue'
import AIChatWindow from '@/components/chat/AIChatWindow.vue'
import RightSidebarAd from '@/components/shared/RightSidebarAd.vue'
import AddToCollectionModal from '@/components/modals/AddToCollectionModal.vue'
import SwipeMatchModal from '@/components/modals/SwipeMatchModal.vue'

import {
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  MessageCircle as MessageCircleIcon,
  Bot as BotIcon,
  X as XIcon,
} from 'lucide-vue-next'

const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const route = useRoute()
const router = useRouter()
const isSearchPage = computed(() => route.name === 'search')
const hideLayout = computed(() => route.meta.hideLayout === true)
const hideSidebar = computed(() => route.meta.hideSidebar === true)
const showRightAd = computed(() => !hideLayout.value && !route.meta.hideAd)

// 動態設定 grid 模板欄位
const gridClass = computed(() => {
  if (hideSidebar.value && showRightAd.value) {
    return 'lg:[grid-template-columns:4fr_1fr] xl:[grid-template-columns:4fr_1fr]'
  }
  if (hideSidebar.value && !showRightAd.value) {
    return 'lg:[grid-template-columns:1fr]'
  }
  if (isSearchPage.value && showRightAd.value) {
    return 'lg:[grid-template-columns:4fr_1fr] xl:[grid-template-columns:4fr_1fr]'
  }
  return showRightAd.value
    ? 'lg:[grid-template-columns:1fr_3fr_1fr]'
    : 'lg:[grid-template-columns:1fr_4fr]'
})

const isMobileMenuOpen = ref(false)
const isPostingModalOpen = ref(false)
const isPrivateChatOpen = ref(false)
const isAiChatOpen = ref(false)
const isMobileActionMenuOpen = ref(false)
const isSwipeModalOpen = ref(false)
const openChatWithUser = ref(null) // 要開啟聊天的用戶資訊
const unreadMessageCount = ref(0) // 未讀訊息總數
const incomingMessageToasts = ref([])
let incomingToastTimer = null
let chatSyncTimer = null
let chatSocket = null
let chatSocketUid = null
let chatSocketReconnectTimer = null
const isChatSyncing = ref(false)


const getFriendIds = () => {
  const friends = userStore.currentUser?.friends || []
  return friends
    .map(friend => friend.uid || friend.id)
    .filter(Boolean)
}

const CHAT_STORAGE_PREFIX = 'tripmate-private-chats-'
const CHAT_MESSAGES_STORAGE_PREFIX = 'tripmate-private-chat-messages-'
const getChatStorageKey = (uid) => `${CHAT_STORAGE_PREFIX}${uid}`
const getChatMessagesStorageKey = (uid, friendUid) =>
  `${CHAT_MESSAGES_STORAGE_PREFIX}${uid}-${friendUid}`

const loadChatRoomsFromStorage = (uid) => {
  try {
    const raw = localStorage.getItem(getChatStorageKey(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('讀取聊天室資料失敗:', error)
    return []
  }
}

const saveChatRoomsToStorage = (uid, rooms) => {
  try {
    localStorage.setItem(getChatStorageKey(uid), JSON.stringify(rooms || []))
  } catch (error) {
    console.warn('保存聊天室資料失敗:', error)
  }
}

const saveChatMessagesToStorage = (uid, friendUid, messages) => {
  try {
    localStorage.setItem(
      getChatMessagesStorageKey(uid, friendUid),
      JSON.stringify(messages || []),
    )
  } catch (error) {
    console.warn('保存聊天訊息失敗:', error)
  }
}

const mapChatMessages = (uid, historyMessages) => {
  return (historyMessages || []).map(msg => {
    const contentRaw = msg.content || ''
    const isImage = typeof contentRaw === 'string' &&
      (contentRaw.startsWith('[IMAGE]') || contentRaw.includes('[/IMAGE]'))
    let content = contentRaw
    if (isImage) {
      const match = contentRaw.match(/\[IMAGE\](.*?)\[\/IMAGE\]/)
      content = match ? match[1] : contentRaw
    }
    return {
      id: msg.id,
      type: msg.type || (msg.sender_uid === uid ? 'user' : 'friend'),
      content,
      isImage,
      timestamp: msg.timestamp || msg.created_at,
    }
  })
}

const getUnreadCountForRoom = (currentUid, friendUid, mappedMessages) => {
  if (!currentUid || !friendUid || !Array.isArray(mappedMessages)) return 0
  const unreadKey = `unread_${currentUid}_${friendUid}`
  let lastReadMs = null
  const unreadData = localStorage.getItem(unreadKey)
  if (unreadData) {
    try {
      const unreadInfo = JSON.parse(unreadData)
      if (unreadInfo.lastReadTime) {
        lastReadMs = new Date(unreadInfo.lastReadTime).getTime()
      }
    } catch {
      // ignore
    }
  }
  return mappedMessages.reduce((count, message) => {
    if (message.type === 'user') return count
    const messageTime = new Date(message.timestamp || message.created_at).getTime()
    if (!lastReadMs || messageTime > lastReadMs) {
      return count + 1
    }
    return count
  }, 0)
}

const getChatSocketUrl = () => {
  const base = API_BASE_URL.replace(/\/api\/?$/, '')
  try {
    const url = new URL(base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/ws'
    url.search = ''
    return url.toString()
  } catch (error) {
    console.warn('無法解析 WS URL:', error)
    return ''
  }
}

const disconnectChatSocket = () => {
  if (chatSocketReconnectTimer) {
    clearTimeout(chatSocketReconnectTimer)
    chatSocketReconnectTimer = null
  }
  if (chatSocket) {
    chatSocket.close()
    chatSocket = null
  }
  chatSocketUid = null
}

const connectChatSocket = (uid) => {
  if (!uid) return
  if (chatSocket && chatSocketUid === uid) return
  disconnectChatSocket()
  const wsUrl = getChatSocketUrl()
  if (!wsUrl) return
  chatSocketUid = uid
  chatSocket = new WebSocket(`${wsUrl}?uid=${encodeURIComponent(uid)}`)
  chatSocket.onopen = () => {
    try {
      chatSocket.send(JSON.stringify({ type: 'register', uid }))
    } catch (error) {
      console.warn('WS 註冊失敗:', error)
    }
  }
  chatSocket.onmessage = (event) => {
    if (!event?.data) return
    let data = null
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return
    if (data.type === 'chat_message') {
      handleIncomingChatMessage(data)
    }
  }
  chatSocket.onclose = () => {
    if (chatSocketUid === uid) {
      chatSocketReconnectTimer = setTimeout(() => {
        connectChatSocket(uid)
      }, 2000)
    }
  }
  chatSocket.onerror = () => {
    if (chatSocket) {
      chatSocket.close()
    }
  }
}

const sendChatSocketMessage = (payload) => {
  if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) return false
  try {
    chatSocket.send(JSON.stringify(payload))
    return true
  } catch (error) {
    console.warn('WS 傳送失敗:', error)
    return false
  }
}

const handleIncomingChatMessage = (payload) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  const fromUid = payload.fromUid
  if (!fromUid) return
  const mappedMessage = {
    id: payload.clientId || payload.id || Date.now(),
    type: 'friend',
    content: payload.content || '',
    isImage: Boolean(payload.isImage),
    timestamp: payload.timestamp || new Date().toISOString(),
  }
  const rooms = loadChatRoomsFromStorage(currentUid)
  let room = rooms.find(r => r.uid === fromUid)
  if (!room) {
    room = {
      uid: fromUid,
      name: payload.senderName || '未知用戶',
      nickname: payload.senderName || '',
      avatar: payload.senderAvatar || '',
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
      messages: [],
    }
    rooms.unshift(room)
  }
  const storedMessages = Array.isArray(room.messages) ? room.messages : []
  storedMessages.push(mappedMessage)
  room.messages = storedMessages
  const preview = mappedMessage.isImage ? '傳送了圖片' : mappedMessage.content
  room.lastMessage = preview || room.lastMessage || '新訊息'
  room.lastMessageTime = '剛剛'
  room.lastMessageTimestamp = new Date(mappedMessage.timestamp).getTime()
  room.unreadCount = getUnreadCountForRoom(currentUid, fromUid, storedMessages)
  saveChatMessagesToStorage(currentUid, fromUid, storedMessages)
  saveChatRoomsToStorage(currentUid, rooms)
  window.dispatchEvent(new CustomEvent('message-updated'))
  window.dispatchEvent(new CustomEvent('incoming-message', {
    detail: {
      uid: fromUid,
      name: room.name || '新訊息',
      avatar: room.avatar || '',
      content: room.lastMessage,
    },
  }))
  window.dispatchEvent(new CustomEvent('chat-received', {
    detail: {
      fromUid,
      message: mappedMessage,
      senderName: payload.senderName || '',
      senderAvatar: payload.senderAvatar || '',
    },
  }))
}

const syncChatRoomsInBackground = async () => {
  if (isChatSyncing.value || isPrivateChatOpen.value) return
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  const rooms = loadChatRoomsFromStorage(currentUid)
  if (rooms.length === 0) return
  isChatSyncing.value = true
  try {
    for (const room of rooms) {
      if (!room?.uid) continue
      const history = await getChatMessages(currentUid, room.uid)
      const mappedMessages = mapChatMessages(currentUid, history)
      if (mappedMessages.length === 0) {
        room.unreadCount = room.unreadCount || 0
        continue
      }
      const lastMessage = mappedMessages[mappedMessages.length - 1]
      const lastMessageTimeMs = new Date(lastMessage.timestamp || lastMessage.created_at).getTime()
      const previousTimestamp = typeof room.lastMessageTimestamp === 'number'
        ? room.lastMessageTimestamp
        : room.lastMessageTimestamp
          ? new Date(room.lastMessageTimestamp).getTime()
          : 0
      const hasNewLastMessage = lastMessageTimeMs && lastMessageTimeMs > previousTimestamp
      if (hasNewLastMessage) {
        room.lastMessage = lastMessage.isImage ? '傳送了圖片' : (lastMessage.content || '')
        room.lastMessageTime = '剛剛'
        room.lastMessageTimestamp = lastMessageTimeMs
        if (lastMessage.type !== 'user') {
          window.dispatchEvent(new CustomEvent('incoming-message', {
            detail: {
              uid: room.uid,
              name: room.name || room.nickname || '未知用戶',
              avatar: room.avatar || '',
              content: room.lastMessage,
            },
          }))
        }
      }
      room.messages = mappedMessages
      room.unreadCount = getUnreadCountForRoom(currentUid, room.uid, mappedMessages)
      saveChatMessagesToStorage(currentUid, room.uid, mappedMessages)
    }
    saveChatRoomsToStorage(currentUid, rooms)
    window.dispatchEvent(new CustomEvent('message-updated'))
  } catch (error) {
    console.error('背景同步聊天訊息失敗:', error)
  } finally {
    isChatSyncing.value = false
  }
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

const ensureLoggedIn = () => {
  if (userStore.isLoggedIn) return true
  alert('請先登入後才可使用')
  return false
}

const handleOpenPosting = () => {
  if (!ensureLoggedIn()) {
    isPostingModalOpen.value = false
    isMobileActionMenuOpen.value = false
    return
  }
  isPostingModalOpen.value = true
  isMobileActionMenuOpen.value = false
}
const handleSelectDiscussion = () => {
  isPostingModalOpen.value = false
}
const handleSelectFindTraveler = () => {
  isPostingModalOpen.value = false
}
const handleQuickAction = () => {
  if (!ensureLoggedIn()) {
    isSwipeModalOpen.value = false
    isMobileActionMenuOpen.value = false
    return
  }
  isSwipeModalOpen.value = true
  isMobileActionMenuOpen.value = false
}
const handleTogglePrivateChat = (user = null) => {
  if (!ensureLoggedIn()) {
    isPrivateChatOpen.value = false
    isAiChatOpen.value = false
    isMobileActionMenuOpen.value = false
    openChatWithUser.value = null
    return
  }
  if (user) {
    openChatWithUser.value = user
  }
  isPrivateChatOpen.value = !isPrivateChatOpen.value
  isAiChatOpen.value = false
  isMobileActionMenuOpen.value = false
}

// 監聽全局事件來開啟聊天（從 ProfilePage 觸發）
const handleOpenChat = (event) => {
  if (!ensureLoggedIn()) {
    isPrivateChatOpen.value = false
    isAiChatOpen.value = false
    isMobileActionMenuOpen.value = false
    openChatWithUser.value = null
    return
  }
  if (event.detail && event.detail.user) {
    openChatWithUser.value = event.detail.user
    isPrivateChatOpen.value = true
    isAiChatOpen.value = false
    isMobileActionMenuOpen.value = false
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
              // 如果沒有unreadCount，檢查最後一條訊息是否是自己發送的
              const lastMessage = room.messages[room.messages.length - 1]
              if (lastMessage && lastMessage.type !== 'user') {
                // 檢查是否有未讀標記
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

    // 檢查新建的聊天室（透過檢查是否有新訊息但未打開過）
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
      // 初次沒有快照，避免直接計入未讀
      saveFriendSnapshot()
    }

    // 限制最多顯示9
    unreadMessageCount.value = Math.min(totalUnread, 9)
  } catch (error) {
    console.error('計算未讀訊息失敗:', error)
    unreadMessageCount.value = 0
  }
}


const handleIncomingMessage = (event) => {
  const detail = event.detail || {}
  const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  incomingMessageToasts.value.unshift({
    id: toastId,
    avatar: detail.avatar || '',
    name: detail.name || '新訊息',
    content: detail.content || '',
    uid: detail.uid || '',
  })
  setTimeout(() => {
    incomingMessageToasts.value = incomingMessageToasts.value.filter((t) => t.id !== toastId)
  }, 10000)
}

const handleIncomingToastClick = (toast) => {
  if (!toast?.uid) return
  window.dispatchEvent(
    new CustomEvent('open-chat', {
      detail: {
        user: {
          uid: toast.uid,
          name: toast.name,
          nickname: toast.name,
          avatar: toast.avatar,
        },
      },
    }),
  )
  incomingMessageToasts.value = incomingMessageToasts.value.filter((t) => t.id !== toast.id)
}

const handleChatSend = (event) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return
  const detail = event.detail || {}
  const toUid = detail.toUid
  if (!toUid) return
  sendChatSocketMessage({
    type: 'chat_message',
    fromUid: currentUid,
    toUid,
    content: detail.content || '',
    isImage: Boolean(detail.isImage),
    timestamp: detail.timestamp || new Date().toISOString(),
    clientId: detail.clientId || null,
    senderName: userStore.currentUser?.name || userStore.currentUser?.nickname || '',
    senderAvatar: userStore.currentUser?.avatar || '',
  })
}

// 監聽訊息變化
const handleMessageUpdate = () => {
  calculateUnreadCount()
}

// 監聽新建聊天室
const handleNewChatRoom = () => {
  calculateUnreadCount()
}

// 在組件掛載時監聽全局事件
onMounted(() => {
  window.addEventListener('open-chat', handleOpenChat)
  window.addEventListener('message-updated', handleMessageUpdate)
  window.addEventListener('new-chat-room', handleNewChatRoom)
  window.addEventListener('friends-viewed', saveFriendSnapshot)
  window.addEventListener('incoming-message', handleIncomingMessage)
  window.addEventListener('chat-send', handleChatSend)
  // 初始計算未讀訊息
  calculateUnreadCount()
  syncChatRoomsInBackground()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (currentUid) {
    connectChatSocket(currentUid)
  }
  // 定期檢查未讀訊息（每5秒）
  const interval = setInterval(() => {
    calculateUnreadCount()
  }, 5000)
  // 存储interval以便清理
  window._unreadMessageInterval = interval
  chatSyncTimer = setInterval(() => {
    syncChatRoomsInBackground()
  }, 6000)
})
onUnmounted(() => {
  window.removeEventListener('open-chat', handleOpenChat)
  window.removeEventListener('message-updated', handleMessageUpdate)
  window.removeEventListener('new-chat-room', handleNewChatRoom)
  window.removeEventListener('friends-viewed', saveFriendSnapshot)
  window.removeEventListener('incoming-message', handleIncomingMessage)
  window.removeEventListener('chat-send', handleChatSend)
  if (window._unreadMessageInterval) {
    clearInterval(window._unreadMessageInterval)
    delete window._unreadMessageInterval
  }
  if (chatSyncTimer) {
    clearInterval(chatSyncTimer)
    chatSyncTimer = null
  }
  disconnectChatSocket()
  if (incomingToastTimer) {
    clearTimeout(incomingToastTimer)
    incomingToastTimer = null
  }
})

watch(
  () => userStore.currentUser?.uid || userStore.currentUser?.id,
  (uid) => {
    if (!uid) {
      disconnectChatSocket()
      return
    }
    connectChatSocket(uid)
  },
  { immediate: true },
)

// 監聽聊天視窗打開/關閉，更新未讀計數
watch(() => isPrivateChatOpen.value, (isOpen) => {
  if (isOpen) {
    // 打開聊天視窗時，延遲一下再重新計算（給時間載入資料）
    setTimeout(calculateUnreadCount, 500)
  } else {
    // 關閉時也重新計算
    calculateUnreadCount()
  }
})
const handleToggleAiChat = () => {
  isAiChatOpen.value = !isAiChatOpen.value
  isPrivateChatOpen.value = false
  isMobileActionMenuOpen.value = false
}

// 處理發文提交
const handleSubmitPost = async (postData) => {
  try {
    console.log('MainLayout 收到發文請求:', postData)

    // 檢查用戶是否已登入
    const firebaseUser = auth.currentUser
    const uid = firebaseUser?.uid || userStore.firebaseUser?.uid

    if (!uid) {
      alert('請先登入後才能發布貼文')
      console.error('發布貼文失敗：用戶未登入')
      // 導向登入頁面
      router.push('/login')
      return
    }

    console.log('⏳ 準備發布貼文，用戶 UID：', uid)

    // 如果有圖片，先上傳圖片到 Firebase Storage
    let imageUrls = []
    if (postData.imageFiles && postData.imageFiles.length > 0) {
      try {
        const { uploadMultipleImages } = await import('@/api/storage')
        console.log('開始上傳圖片...')
        imageUrls = await uploadMultipleImages(postData.imageFiles, 'posts')
        console.log('圖片上傳成功:', imageUrls)
      } catch (error) {
        console.error('圖片上傳失敗：', error)
        // 詢問用戶是否要繼續發布（不帶圖片）
        const shouldContinue = confirm(
          '圖片上傳失敗：' + error.message + '\n\n是否要繼續發布貼文（不帶圖片）？',
        )
        if (!shouldContinue) {
          return
        }
      }
    }

    // 準備提交的資料
    const submitData = {
      author_uid: uid,
      board: postData.board || 'general',
      title: postData.title,
      content: postData.content,
      tags: postData.tags || [],
      image_urls: imageUrls,
    }

    console.log('提交貼文資料：', {
      author_uid: submitData.author_uid,
      board: submitData.board,
      title: submitData.title?.substring(0, 50),
      contentLength: submitData.content?.length,
      tagsCount: submitData.tags?.length,
      imageUrlsCount: submitData.image_urls?.length,
    })

    // 調用 API 創建貼文
    console.log('調用 addPost API...')
    const newPost = await discussionsStore.addPost(submitData)

    console.log('貼文發布成功：', newPost)

    // 關閉模態框
    isPostingModalOpen.value = false

    // 如果在討論頁面，重新載入貼文列表
    if (route.name === 'discussion') {
      await discussionsStore.loadDiscussions()
    } else {
      // 如果不在討論頁面，導向討論頁面
      router.push('/discussion')
      // 等待路由切換後再載入
      setTimeout(async () => {
        await discussionsStore.loadDiscussions()
      }, 300)
    }

    // 顯示成功訊息
    alert('貼文發布成功！')
  } catch (error) {
    console.error('發布貼文失敗：', error)
    console.error('錯誤詳情：', {
      message: error.message,
      stack: error.stack,
      firebaseUser: auth.currentUser?.uid,
    })
    alert(`發布貼文失敗：${error.message || '請稍後再試'}`)
  }
}
</script>

<template>
  <div
    class="min-h-screen relative transition-all duration-1000"
    :class="
      hideLayout ? 'bg-secondary-50' : 'bg-secondary-50 bg-cover bg-center md:bg-fixed bg-no-repeat'
    "
  >
    <div class="transition-[filter] duration-300">
      <AppHeader v-if="!hideLayout" @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

      <div
        v-if="!hideLayout"
        class="max-w-[1500px] mx-auto grid grid-cols-1 pt-16 min-h-screen items-start gap-2"
        :class="gridClass"
      >
        <div
          v-if="!isSearchPage && !hideSidebar"
          class="contents lg:block shrink-0 sticky top-16 md:top-18 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar"
        >
          <AppSidebar @open-mobile-actions="isMobileActionMenuOpen = true" />
        </div>

        <main
          class="min-w-0 transition-all duration-300"
          :class="[isSearchPage ? 'pb-0' : 'pb-24 md:pb-20 ']"
        >
          <RouterView />
        </main>

        <div
          v-if="showRightAd"
          class="hidden lg:block shrink-0 mr-2"
          :class="{ 'mt-6': !isSearchPage }"
        >
          <RightSidebarAd />
        </div>
      </div>

      <div
        v-else
        class="w-screen h-screen overflow-y-auto overscroll-contain"
        style="-webkit-overflow-scrolling: touch"
      >
        <RouterView />
      </div>

      <div v-if="!hideLayout" class="hidden lg:block">
        <AppFABs
          @open-posting="handleOpenPosting"
          @quick-action="handleQuickAction"
          @toggle-private-chat="handleTogglePrivateChat"
          @toggle-ai-chat="handleToggleAiChat"
        />
      </div>
      <div
        v-for="(toast, idx) in incomingMessageToasts"
        :key="toast.id"
        class="fixed right-4 z-[60] max-w-[90vw] sm:max-w-md bg-primary-600 text-white border-2 border-primary-700 rounded-lg shadow-xl p-5 flex items-center gap-4 cursor-pointer hover:bg-primary-700 transition"
        :style="{ bottom: `${16 + idx * 88}px` }"
        @click="handleIncomingToastClick(toast)"
      >
        <div class="w-12 h-12 rounded-md bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
          <img
            v-if="toast.avatar"
            :src="toast.avatar"
            :alt="toast.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-lg font-bold text-white">
            {{ toast.name.slice(0, 1) }}
          </span>
        </div>
        <div class="min-w-0">
          <div class="text-lg font-bold truncate">{{ toast.name }}</div>
          <div class="text-base text-white/90 truncate">{{ toast.content }}</div>
        </div>
      </div>
    </div>

    <div
      v-if="isMobileActionMenuOpen"
      class="fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm lg:hidden"
      @click="isMobileActionMenuOpen = false"
    ></div>

    <Transition
      enter-active-class="transition-all duration-300 ease"
      enter-from-class="opacity-0 translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-full"
    >
      <div
        v-if="isMobileActionMenuOpen"
        class="fixed inset-0 z-[60] flex items-end justify-center lg:hidden"
      >
        <div class="relative w-full bg-white rounded-t-3xl p-6 pb-24 shadow-2xl border-t border-secondary-100">
          <div class="flex justify-between items-center mb-6 border-b-2 border-secondary-100 pb-2">
            <h3 class="text-xl font-bold text-primary-700">快速功能</h3>
            <button
              class="p-2 bg-secondary-100 rounded-full hover:bg-secondary-200"
              @click="isMobileActionMenuOpen = false"
            >
              <XIcon class="w-5 h-5 text-secondary-600" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-4">
            <button class="flex flex-col items-center gap-2 group" @click="handleOpenPosting">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <PlusIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-lg font-bold text-gray-700">發布</span>
            </button>
            <button class="flex flex-col items-center gap-2 group relative" @click="handleQuickAction">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition relative"
              >
                <SparklesIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-sm font-bold text-gray-700">抽卡</span>
            </button>
            <button class="flex flex-col items-center gap-2 group relative" @click="handleTogglePrivateChat">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <MessageCircleIcon class="w-8 h-8 text-white" />
                <span
                  v-if="unreadMessageCount > 0"
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center border-2 border-white shadow-lg"
                >
                  {{ unreadMessageCount > 9 ? '9+' : unreadMessageCount }}
                </span>
              </div>
              <span class="text-sm font-bold text-gray-700">聊天</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleToggleAiChat">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <BotIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-sm font-bold text-gray-700">AI</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PostingChoiceCard
      v-if="isPostingModalOpen"
      @close="isPostingModalOpen = false"
      @select-discussion="handleSelectDiscussion"
      @select-find-traveler="handleSelectFindTraveler"
      @submit-post="handleSubmitPost"
    />
    <PrivateChatWindow
      v-if="isPrivateChatOpen"
      :open-chat-with-user="openChatWithUser"
      @close="isPrivateChatOpen = false; openChatWithUser = null"
    />
    <AIChatWindow v-if="isAiChatOpen" @close="isAiChatOpen = false" />
    <SwipeMatchModal v-if="isSwipeModalOpen" @close="isSwipeModalOpen = false" />
  </div>

  <Transition name="fade">
    <AddToCollectionModal v-if="userStore.isCollectionModalOpen" />
  </Transition>
</template>
