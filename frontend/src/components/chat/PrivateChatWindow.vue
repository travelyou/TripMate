<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { X as XIcon, MessageCircle as MessageCircleIcon, Send as SendIcon, User as UserIcon, ArrowLeft as ArrowLeftIcon, Smile as SmileIcon, Plus as PlusIcon, Loader2 as LoaderIcon, Check as CheckIcon, Download as DownloadIcon } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getProfile } from '@/api/profile'
import { uploadImage } from '@/api/storage'
import { useRouter } from 'vue-router'

// 定義事件：通知父層關閉視窗和打開聊天室
const emit = defineEmits(['close', 'open-chat-room'])

const props = defineProps({
  openChatWithUser: {
    type: Object,
    default: null // { uid, name, nickname, avatar }
  }
})

const userStore = useUserStore()
const router = useRouter()
const activeTab = ref('chatrooms') // 'chatrooms' 或 'friends'
const activeChatRoom = ref(null) // 當前打開的聊天室 { type, uid, name, avatar, messages, ... }
const avatarErrors = ref({}) // 記錄哪些頭像載入失敗

// 聊天室列表（動態創建的聊天室）
const chatRoomsList = ref([])

// 載入好友列表和好友請求
const friendRequests = ref({ received: [], sent: [] })

// 訊息列表（根據當前聊天室）
const messages = ref([])
const messageInput = ref('')
const messagesContainer = ref(null)
const showStickerPicker = ref(false)
const fileInputRef = ref(null)
const isUploadingFile = ref(false)
const uploadProgress = ref(0)
const showFriendRequestsList = ref(false)
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageName = ref('')
let messagePollingInterval = null // 訊息輪詢定時器

// 文件類型限制
const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const maxFileSize = 10 * 1024 * 1024 // 10MB

// 對話次數限制
const chatInteractionCount = ref({ count: 0, remaining: 3, canSend: true, isFriend: false })

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

  // 只添加收到的好友請求（不顯示已發送的）
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
const loadChatHistory = async (uid, friendUid, silent = false) => {
  try {
    const { getChatMessages } = await import('@/api/profile')
    const historyMessages = await getChatMessages(uid, friendUid)

    // 轉換為前端格式
    const mappedMessages = historyMessages.map(msg => {
      // 檢查是否為圖片訊息
      const isImage = msg.content && typeof msg.content === 'string' &&
        (msg.content.startsWith('[IMAGE]') || msg.content.includes('[/IMAGE]'))

      let content = msg.content
      if (isImage) {
        // 提取圖片 URL
        const match = msg.content.match(/\[IMAGE\](.*?)\[\/IMAGE\]/)
        content = match ? match[1] : msg.content
      }

      return {
      id: msg.id,
      type: msg.type || (msg.sender_uid === uid ? 'user' : 'friend'),
        content: content,
        isImage: isImage,
      timestamp: msg.timestamp || msg.created_at
      }
    })

    // 檢查是否有新訊息（比較訊息數量）
    const hasNewMessages = mappedMessages.length > messages.value.length
    const previousMessageCount = messages.value.length

    const localMessages = loadMessagesFromStorage(friendUid)
    messages.value = mappedMessages.length > 0 ? mappedMessages : localMessages

    if (mappedMessages.length > 0) {
      saveMessagesToStorage(friendUid, mappedMessages)

      // 如果有新訊息，自動滾動到底部
      if (hasNewMessages && previousMessageCount > 0) {
        await nextTick()
        scrollToBottom()
      }

      // 檢查是否有新訊息（未讀）
      const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
      if (currentUid) {
        const unreadKey = `unread_${currentUid}_${friendUid}`
        const unreadData = localStorage.getItem(unreadKey)
        let lastReadTime = null
        if (unreadData) {
          try {
            const unreadInfo = JSON.parse(unreadData)
            lastReadTime = unreadInfo.lastReadTime
          } catch {
            // ignore
          }
        }
        const lastMessage = mappedMessages[mappedMessages.length - 1]
        if (lastMessage && lastMessage.type !== 'user') {
          const lastMessageTime = new Date(lastMessage.timestamp || lastMessage.created_at).getTime()
          if (!lastReadTime || lastMessageTime > new Date(lastReadTime).getTime()) {
            // 有新訊息，觸發更新事件
            window.dispatchEvent(new CustomEvent('message-updated'))
          }
        }
      }
    }

    // 更新聊天室的訊息列表
    const room = chatRoomsList.value.find(r => r.uid === friendUid)
    if (room) {
      room.messages = messages.value
    }
    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    persistChatRooms()

    if (!silent) {
      console.log('[loadChatHistory] 載入聊天記錄:', messages.value.length, '條訊息')
    }
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
      chatInteractionCount.value = { count: 0, remaining: 3, canSend: true, isFriend: false }
      return
    }

    // 確保所有必要的字段都存在，並且 canSend 基於 remaining 計算
    const count = typeof data.count === 'number' ? data.count : 0
    const remaining = typeof data.remaining === 'number' ? data.remaining : Math.max(0, 3 - count)
    const canSend = typeof data.canSend === 'boolean' ? data.canSend : (remaining > 0)
    const isFriend = typeof data.isFriend === 'boolean' ? data.isFriend : false

    chatInteractionCount.value = {
      count,
      remaining,
      canSend: canSend && remaining > 0,  // 雙重確保 canSend 正確
      isFriend
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
      chatInteractionCount.value = { count: 0, remaining: 3, canSend: true, isFriend: false }
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
  if (!user) return

  const targetUid = user.uid || user.id
  if (!targetUid) return

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  // 切換到聊天室列表標籤
  activeTab.value = 'chatrooms'

  // 檢查是否已存在聊天室
  const existingRoom = chatRoomsList.value.find(r => r.uid === targetUid)

  if (existingRoom) {
    // 打開現有聊天室
    activeChatRoom.value = {
      type: 'chat',
      uid: targetUid,
      name: user.name || user.nickname || '未知用戶',
      avatar: user.avatar || '',
      messages: existingRoom.messages || []
    }
  } else {
    // 創建新聊天室
    const newRoom = {
      uid: targetUid,
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
      uid: targetUid,
      name: newRoom.name,
      avatar: newRoom.avatar,
      messages: []
    }

    // 觸發新建聊天室事件
    window.dispatchEvent(new CustomEvent('new-chat-room'))
  }

  // 載入對話次數
  await loadChatInteractionCount(currentUid, targetUid)

  // 從數據庫載入聊天記錄
  await loadChatHistory(currentUid, targetUid)

  // 開始輪詢新訊息
  startMessagePolling(currentUid, targetUid)

  // 標記為已讀（打開聊天室時）
  const unreadKey = `unread_${currentUid}_${targetUid}`
  localStorage.setItem(unreadKey, JSON.stringify({
    lastReadTime: new Date().toISOString()
  }))

  scrollToBottom()

  // 觸發訊息更新事件（清除未讀計數）
  window.dispatchEvent(new CustomEvent('message-updated'))
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

// 貼圖列表
const stickers = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
  '👿', '💀', '☠️', '💋', '💌', '💘', '💝', '💖', '💗', '💓',
  '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙',
  '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨',
  '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚',
  '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
  '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊',
  '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '👶', '👧',
  '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴', '🙍', '🙎',
  '🙅', '🙆', '💁', '🙋', '🧏', '🤦', '🤷', '🙇', '🤦', '🤷',
]

// 選擇貼圖
const selectSticker = (sticker) => {
  messageInput.value += sticker
  showStickerPicker.value = false
}

// 切換貼圖選擇器
const toggleStickerPicker = () => {
  showStickerPicker.value = !showStickerPicker.value
}

// 打開圖片預覽
const openImagePreview = (imageUrl, imageName = '') => {
  previewImageUrl.value = imageUrl
  previewImageName.value = imageName
  showImagePreview.value = true
}

// 關閉圖片預覽
const closeImagePreview = () => {
  showImagePreview.value = false
  previewImageUrl.value = ''
  previewImageName.value = ''
}

// 跳轉到對方個人檔案
const goToFriendProfile = (friendUid) => {
  if (!friendUid) {
    console.warn('無法跳轉：缺少用戶 ID')
    return
  }
  // 關閉聊天窗口
  emit('close')
  // 跳轉到對方個人檔案
  router.push({ name: 'profile', params: { uid: friendUid } })
}

// 下載圖片
const downloadImage = async (imageUrl, fileName = 'image') => {
  try {
    if (!imageUrl) {
      throw new Error('圖片網址無效')
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`下載失敗：${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || 'image.jpg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下載圖片失敗：', error)
    const errorMessage = error.message || '未知錯誤'
    alert(`下載圖片失敗：${errorMessage}\n請稍後再試或檢查網路連線`)
  }
}

// 打開文件選擇器
const openFilePicker = () => {
  if (!chatInteractionCount.value.canSend) {
    alert('⚠️ 已達到對話次數上限\n\n您已發送 3 次訊息，等待對方同意好友請求後才能繼續聊天。')
    return
  }
  if (!fileInputRef.value) {
    console.error('文件選擇器未初始化')
    return
  }
  fileInputRef.value.click()
}

// 處理文件選擇和上傳
const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 驗證文件類型
  if (!allowedFileTypes.includes(file.type)) {
    alert('❌ 不支援的檔案格式！\n\n請選擇以下格式的圖片：\n• JPG / JPEG\n• PNG\n• GIF\n• WebP')
    event.target.value = ''
    return
  }

  // 驗證文件大小
  if (file.size > maxFileSize) {
    const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(0)
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
    alert(`❌ 檔案大小超過限制！\n\n檔案大小：${fileSizeMB} MB\n最大限制：${maxSizeMB} MB\n\n請選擇較小的圖片檔案。`)
    event.target.value = ''
    return
  }

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !activeChatRoom.value) {
    alert('❌ 無法取得用戶資訊或聊天室資訊\n\n請重新整理頁面後再試。')
    event.target.value = ''
    return
  }

  // 檢查對話次數
  if (!chatInteractionCount.value.canSend) {
    alert('⚠️ 已達到對話次數上限\n\n您已發送 3 次訊息，等待對方同意好友請求後才能繼續聊天。')
    event.target.value = ''
    return
  }

  // 確認是否傳送檔案
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
  const confirmMessage = `📤 確定要傳送此檔案嗎？\n\n檔案名稱：${file.name}\n檔案大小：${fileSizeMB} MB`
  if (!confirm(confirmMessage)) {
    event.target.value = ''
    return
  }

  try {
    isUploadingFile.value = true
    uploadProgress.value = 0

    // 上傳圖片到 Firebase Storage
    const imageUrl = await uploadImage(file, 'chat-images', (progress) => {
      uploadProgress.value = progress
    })

    // 記錄對話次數
    try {
      const { incrementChatInteraction } = await import('@/api/profile')
      const data = await incrementChatInteraction(currentUid, activeChatRoom.value.uid)

      if (data && data.success !== false) {
        const newCount = typeof data.count === 'number' ? parseInt(data.count) : (parseInt(chatInteractionCount.value.count) || 0) + 1
        const newRemaining = typeof data.remaining === 'number' ? parseInt(data.remaining) : Math.max(0, 3 - newCount)
        const newCanSend = typeof data.canSend === 'boolean' ? data.canSend : (newRemaining > 0)
        const newIsFriend = typeof data.isFriend === 'boolean' ? data.isFriend : (chatInteractionCount.value.isFriend || false)

        chatInteractionCount.value = {
          count: newCount,
          remaining: newRemaining,
          canSend: newCanSend,
          isFriend: newIsFriend
        }
      } else {
        const newCount = (chatInteractionCount.value.count || 0) + 1
        const newRemaining = Math.max(0, 3 - newCount)
        chatInteractionCount.value = {
          count: newCount,
          remaining: newRemaining,
          canSend: newRemaining > 0,
          isFriend: chatInteractionCount.value.isFriend || false
        }
      }
    } catch (error) {
      console.error('記錄對話次數失敗：', error)
      const newCount = (chatInteractionCount.value.count || 0) + 1
      const newRemaining = Math.max(0, 3 - newCount)
      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newRemaining > 0,
        isFriend: chatInteractionCount.value.isFriend || false
      }
    }

    // 保存圖片訊息到資料庫（使用特殊格式標記為圖片訊息）
    try {
      const { saveChatMessage } = await import('@/api/profile')
      const imageMessageText = `[IMAGE]${imageUrl}[/IMAGE]`
      const savedMessage = await saveChatMessage(currentUid, activeChatRoom.value.uid, imageMessageText)

      // 加入使用者的圖片訊息
      const imageMessage = {
        id: savedMessage.message?.id || Date.now(),
        type: 'user',
        content: imageUrl,
        isImage: true,
        timestamp: savedMessage.message?.created_at || new Date().toISOString()
      }

      messages.value.push(imageMessage)

      // 更新聊天室的最後訊息
      const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
      if (room) {
        room.lastMessage = '[圖片]'
        room.lastMessageTime = '剛剛'
        room.messages = messages.value
      }

      if (activeChatRoom.value) {
        activeChatRoom.value.messages = messages.value
      }

      persistChatRooms()
      saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
      window.dispatchEvent(new CustomEvent('message-updated'))

      scrollToBottom()
    } catch (error) {
      console.error('保存圖片訊息失敗：', error)
      const errorMessage = error.message || '未知錯誤'
      alert(`❌ 保存圖片訊息失敗：${errorMessage}\n\n圖片已顯示在聊天室，但可能無法保存。請檢查網路連線。`)

      // 即使保存失敗，也顯示圖片（但不會持久化）
      const imageMessage = {
        id: Date.now(),
        type: 'user',
        content: imageUrl,
        isImage: true,
        timestamp: new Date().toISOString()
      }

      messages.value.push(imageMessage)

      const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
      if (room) {
        room.lastMessage = '[圖片]'
        room.lastMessageTime = '剛剛'
        room.messages = messages.value
      }

      if (activeChatRoom.value) {
        activeChatRoom.value.messages = messages.value
      }

      persistChatRooms()
      saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
      window.dispatchEvent(new CustomEvent('message-updated'))
      scrollToBottom()
    }
  } catch (error) {
    console.error('上傳圖片失敗：', error)
    const errorMessage = error.message || '未知錯誤'
    alert(`上傳失敗：${errorMessage}\n請檢查網路連線或稍後再試`)
  } finally {
    isUploadingFile.value = false
    uploadProgress.value = 0
    if (event.target) {
      event.target.value = ''
    }
  }
}

// 發送訊息
const sendMessage = async () => {
  const text = messageInput.value.trim()
  if (!text) return

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !activeChatRoom.value) return

  // 檢查對話次數（在發送前檢查）
  if (!chatInteractionCount.value.canSend) {
    alert('⚠️ 已達到對話次數上限\n\n您已發送 3 次訊息，等待對方同意好友請求後才能繼續聊天。')
    return
  }

  // 1. 先記錄對話次數（發送前更新，確保即時反映）
  try {
    const { incrementChatInteraction } = await import('@/api/profile')
    const data = await incrementChatInteraction(currentUid, activeChatRoom.value.uid)

    console.log('[sendMessage] API 返回資料:', data)
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
      const newIsFriend = typeof data.isFriend === 'boolean' ? data.isFriend : (chatInteractionCount.value.isFriend || false)

      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newCanSend,
        isFriend: newIsFriend
      }

      console.log('[sendMessage] 發送後狀態:', {
        count: newCount,
        remaining: newRemaining,
        canSend: newCanSend,
        isFriend: newIsFriend
      })

    } else {
      // API 返回異常，使用本地計算
      const newCount = (chatInteractionCount.value.count || 0) + 1
      const newRemaining = Math.max(0, 3 - newCount)
      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newRemaining > 0,
        isFriend: chatInteractionCount.value.isFriend || false
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
      canSend: newCanSend,
      isFriend: chatInteractionCount.value.isFriend || false
    }

  }

  // 2. 保存訊息到資料庫
  try {
    const { saveChatMessage } = await import('@/api/profile')
    const savedMessage = await saveChatMessage(currentUid, activeChatRoom.value.uid, text)

    // 3. 加入使用者的訊息（使用資料庫返回的訊息ID）
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
    // 觸發訊息更新事件
    window.dispatchEvent(new CustomEvent('message-updated'))

    scrollToBottom()
  } catch (error) {
    console.error('保存訊息失敗：', error)
    const errorMessage = error.message || '未知錯誤'
    alert(`❌ 發送訊息失敗：${errorMessage}\n\n訊息已顯示在聊天室，但可能無法保存。請檢查網路連線。`)

    // 即使保存失敗，也顯示訊息（但不會持久化）
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
    // 觸發訊息更新事件
    window.dispatchEvent(new CustomEvent('message-updated'))
    scrollToBottom()
  }
}

// 開始輪詢新訊息
const startMessagePolling = (uid, friendUid) => {
  // 清除現有的輪詢
  stopMessagePolling()

  // 每 3 秒檢查一次新訊息
  messagePollingInterval = setInterval(async () => {
    if (activeChatRoom.value && activeChatRoom.value.uid === friendUid) {
      await loadChatHistory(uid, friendUid, true) // silent = true，不輸出日誌
    }
  }, 3000) // 3 秒輪詢一次
}

// 停止輪詢新訊息
const stopMessagePolling = () => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval)
    messagePollingInterval = null
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
      // 拒絕好友請求：只是刪除記錄，不發送回應
      try {
        const { rejectFriendRequest } = await import('@/api/profile')
        const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
        await rejectFriendRequest(currentUid, room.uid)
        await loadFriends()
        // 重新載入好友請求列表
        const { getFriendRequests } = await import('@/api/profile')
        const requests = await getFriendRequests(currentUid)
        friendRequests.value = requests || { received: [], sent: [] }
      } catch (error) {
        console.error('拒絕好友請求失敗：', error)
      }
    }
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
      // 開始輪詢新訊息
      startMessagePolling(currentUid, room.uid)
    }

    scrollToBottom()
  }
}

// 返回聊天室列表
const backToChatRooms = () => {
  // 停止輪詢
  stopMessagePolling()
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


watch(chatRoomsList, () => {
  persistChatRooms()
}, { deep: true })

// 點擊外部關閉貼圖選擇器和好友請求列表
const handleClickOutside = (event) => {
  if (showStickerPicker.value && !event.target.closest('.sticker-picker-container')) {
    showStickerPicker.value = false
  }
  if (showFriendRequestsList.value && !event.target.closest('.friend-requests-list-container')) {
    showFriendRequestsList.value = false
  }
}

// 切換好友請求列表顯示
const toggleFriendRequestsList = () => {
  showFriendRequestsList.value = !showFriendRequestsList.value
  if (showFriendRequestsList.value) {
    // 重新載入好友請求列表
    loadFriends()
  }
}

// 處理接受好友請求
const handleAcceptFriendRequest = async (request) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  try {
    const { acceptFriendRequest } = await import('@/api/profile')
    await acceptFriendRequest(currentUid, request.uid)
    await loadFriends()

    // 如果接受成功，可以選擇打開聊天室
    const acceptAndChat = confirm(`已接受 ${request.name || request.nickname || '用戶'} 的好友請求！是否開始聊天？`)
    if (acceptAndChat) {
      openOrCreateChatRoom({
        uid: request.uid,
        name: request.name || request.nickname,
        nickname: request.nickname || request.name,
        avatar: request.avatar || ''
      })
    }
  } catch (error) {
    console.error('接受好友請求失敗：', error)
    alert('接受好友請求失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理拒絕好友請求
const handleRejectFriendRequest = async (request) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  try {
    const { rejectFriendRequest } = await import('@/api/profile')
    await rejectFriendRequest(currentUid, request.uid)
    await loadFriends()
  } catch (error) {
    console.error('拒絕好友請求失敗：', error)
    alert('拒絕好友請求失敗：' + (error.message || '未知錯誤'))
  }
}

onMounted(() => {
  loadFriends()
  loadChatRoomsFromStorage()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 清除輪詢定時器
  stopMessagePolling()
})
</script>

<template>
  <div
    class="fixed bottom-4 md:bottom-8 right-[80px] md:right-[96px] w-80 md:w-80 max-w-80 h-[480px] md:h-[480px] max-h-[480px] border-4 border-primary shadow-xl z-50 flex flex-col rounded-2xl overflow-hidden bg-white/90 backdrop-blur animate-slide-up"
  >
    <div
      class="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white p-4 flex items-center justify-between border-b border-primary-800/40"
    >
      <div class="flex items-center space-x-3">
        <button
          v-if="activeChatRoom"
          class="mr-2 p-1 hover:bg-primary-600 rounded-full transition"
          @click="backToChatRooms"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <button
          v-if="activeChatRoom"
          class="flex-shrink-0"
          @click="goToFriendProfile(activeChatRoom.uid)"
        >
          <div
            v-if="activeChatRoom.avatar && !avatarErrors[`chat-${activeChatRoom.uid}`]"
            class="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden cursor-pointer hover:opacity-80 transition"
          >
            <img
              :src="activeChatRoom.avatar"
              :alt="activeChatRoom.name"
              class="w-full h-full object-cover"
              @error="avatarErrors[`chat-${activeChatRoom.uid}`] = true"
            />
          </div>
          <div
            v-else
            class="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
          >
            <UserIcon class="w-5 h-5 text-white" />
          </div>
        </button>
        <div>
          <h3 class="font-bold text-lg">
            {{ activeChatRoom ? activeChatRoom.name : '私人聊天' }}
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- 好友請求列表按鈕 -->
        <div class="relative friend-requests-list-container">
          <button
            class="p-1 hover:bg-primary-600 rounded-full transition relative"
            title="好友邀請"
            @click="toggleFriendRequestsList"
          >
            <PlusIcon class="w-6 h-6" />
            <!-- 未讀邀請數量提示 -->
            <span
              v-if="friendRequests.received && friendRequests.received.length > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            >
              {{ friendRequests.received.length }}
            </span>
          </button>

          <!-- 好友請求列表彈窗 -->
          <div
            v-if="showFriendRequestsList"
            class="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-primary-200 z-[100] max-h-96 overflow-hidden flex flex-col"
          >
            <div class="p-3 sm:p-4 border-b border-gray-200 bg-primary-50 flex-shrink-0">
              <h3 class="font-bold text-primary-700 text-sm sm:text-base">好友邀請</h3>
              <p class="text-xs text-gray-500 mt-1 break-words whitespace-normal">
                {{ friendRequests.received && friendRequests.received.length > 0 ? `${friendRequests.received.length} 個待處理邀請` : '目前沒有邀請' }}
              </p>
            </div>
            <div class="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0 custom-scrollbar">
              <div
                v-if="!friendRequests.received || friendRequests.received.length === 0"
                class="text-center text-gray-400 py-8 text-sm"
              >
                目前沒有好友邀請
              </div>
              <div
                v-for="request in friendRequests.received"
                :key="request.uid"
                class="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg hover:bg-gray-50 transition border border-gray-100 mb-2 last:mb-0"
              >
                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 border-2 border-primary-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    v-if="request.avatar && request.avatar.trim() && !avatarErrors[`request-${request.uid}`]"
                    :src="request.avatar"
                    :alt="request.name || request.nickname"
                    class="w-full h-full object-cover"
                    @error="avatarErrors[`request-${request.uid}`] = true"
                  />
                  <UserIcon
                    v-else
                    class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600"
                  />
                </div>
                <div class="flex-1 min-w-0 pr-2 sm:pr-3 overflow-hidden">
                  <div class="font-bold text-gray-800 text-sm sm:text-base truncate break-words">
                    {{ request.name || request.nickname || '未知用戶' }}
                  </div>
                  <div class="text-xs text-gray-500 truncate break-words">
                    @{{ request.nickname || request.name || 'user' }}
                  </div>
                </div>
                <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    class="p-1.5 sm:p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-sm flex-shrink-0 flex items-center justify-center"
                    title="接受"
                    @click.stop="handleAcceptFriendRequest(request)"
                  >
                    <CheckIcon class="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    class="p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-sm flex-shrink-0 flex items-center justify-center"
                    title="拒絕"
                    @click.stop="handleRejectFriendRequest(request)"
                  >
                    <XIcon class="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="p-1 hover:bg-primary-600 rounded-full transition" @click="$emit('close')">
          <XIcon class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- 聊天界面 -->
    <template v-if="activeChatRoom && activeChatRoom.type === 'chat'">
      <!-- 訊息列表 -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white via-slate-50 to-slate-100 custom-scrollbar"
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
          class="flex items-end gap-2"
          :class="{ 'justify-end': msg.type === 'user' }"
        >
          <button
            v-if="msg.type !== 'user' && activeChatRoom"
            class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-white/80 shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition"
            @click="goToFriendProfile(activeChatRoom.uid)"
          >
            <img
              v-if="activeChatRoom.avatar && !avatarErrors[`msg-${activeChatRoom.uid}`]"
              :src="activeChatRoom.avatar"
              :alt="activeChatRoom.name"
              class="w-full h-full object-cover"
              @error="avatarErrors[`msg-${activeChatRoom.uid}`] = true"
            />
            <UserIcon
              v-else
              class="w-5 h-5 text-white"
            />
          </button>

          <div
            class="p-3 shadow-sm max-w-[80%] text-sm font-medium"
            :class="[
              msg.type === 'user'
                ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm border border-primary-700/60 shadow-lg shadow-primary-900/10'
                : 'bg-white text-secondary-800 rounded-2xl rounded-tl-sm border border-secondary-100 shadow-sm',
            ]"
          >
            <img
              v-if="msg.isImage"
              :src="msg.content"
              alt="傳送的圖片"
              class="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition"
              @error="(e) => { console.error('圖片載入失敗：', msg.content); e.target.style.display = 'none' }"
              @click.stop="openImagePreview(msg.content, '圖片')"
            />
            <span v-else>{{ msg.content }}</span>
          </div>

          <div
            v-if="msg.type === 'user'"
            class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 border-2 border-white/80 shadow-sm overflow-hidden"
          >
            <img
              v-if="userStore.currentUser && userStore.currentUser.avatar && !avatarErrors['current-user']"
              :src="userStore.currentUser.avatar"
              :alt="userStore.currentUser.name || userStore.currentUser.nickname"
              class="w-full h-full object-cover"
              @error="avatarErrors['current-user'] = true"
            />
            <UserIcon
              v-else
              class="w-5 h-5 text-gray-600"
            />
          </div>
        </div>

        <div
          v-if="!chatInteractionCount.canSend"
          class="text-center text-xs text-gray-600 py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          ⚠️ 已達到對話次數上限（3次），等待對方同意好友請求後才能繼續
        </div>
      </div>

      <!-- 輸入框 -->
      <div class="p-4 border-t border-secondary-200 bg-white/90">
        <form class="flex items-center space-x-2" @submit.prevent="sendMessage">
          <div class="relative flex-1 sticker-picker-container">
            <input
              v-model="messageInput"
              type="text"
              :disabled="!chatInteractionCount.canSend"
              placeholder="輸入訊息..."
              class="w-full px-4 py-2.5 border border-secondary-200 rounded-full focus:border-primary-500 focus:outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            <!-- 貼圖選擇器 -->
            <div
              v-if="showStickerPicker"
              class="absolute bottom-full left-0 mb-2 w-80 h-64 bg-white border-2 border-primary-200 rounded-xl shadow-xl overflow-y-auto z-50 p-4 grid grid-cols-8 gap-2"
              style="scrollbar-width: none; -ms-overflow-style: none;"
            >
              <button
                v-for="sticker in stickers"
                :key="sticker"
                type="button"
                class="text-2xl hover:bg-primary-50 rounded-lg p-2 transition"
                @click="selectSticker(sticker)"
              >
                {{ sticker }}
              </button>
            </div>
          </div>
          <button
            type="submit"
            :disabled="!chatInteractionCount.canSend || isUploadingFile"
            class="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition border border-primary-700/70 shadow-md active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </form>
        <!-- 隱藏的文件選擇器 -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          class="hidden"
          @change="handleFileSelect"
        />
        <div class="flex items-center justify-start gap-4 mt-1.5">
          <button
            type="button"
            :disabled="!chatInteractionCount.canSend || isUploadingFile"
            class="p-0 text-primary-600 hover:text-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 shadow-none"
            :title="isUploadingFile ? `上傳中... ${uploadProgress}%` : '上傳圖片'"
            @click.stop="openFilePicker"
          >
            <LoaderIcon v-if="isUploadingFile" class="w-3.5 h-3.5 animate-spin" />
            <PlusIcon v-else class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            :disabled="!chatInteractionCount.canSend || isUploadingFile"
            class="p-0 text-primary-600 hover:text-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 shadow-none"
            title="表情符號"
            @click.stop="toggleStickerPicker"
          >
            <SmileIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </template>

    <!-- 聊天室列表和好友列表 -->
    <template v-else>
      <!-- 標籤頁切換 -->
      <div class="flex border-b border-primary-200 bg-primary-50/70">
        <button
          class="flex-1 px-4 py-3 font-bold text-sm transition"
          :class="
            activeTab === 'chatrooms'
              ? 'bg-white text-primary-700 border-b-2 border-primary-600'
              : 'text-primary-700 hover:bg-primary-100'
          "
          @click="activeTab = 'chatrooms'"
        >
          聊天室列表
        </button>
        <button
          class="flex-1 px-4 py-3 font-bold text-sm transition"
          :class="
            activeTab === 'friends'
              ? 'bg-white text-primary-700 border-b-2 border-primary-600'
              : 'text-primary-700 hover:bg-primary-100'
          "
          @click="activeTab = 'friends'"
        >
          好友列表
        </button>
      </div>

      <!-- 聊天室列表 -->
      <div v-if="activeTab === 'chatrooms'" class="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
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
            class="flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer border bg-white shadow-sm"
            :class="room.type === 'friend-request-received'
              ? 'border-yellow-400 bg-yellow-50 hover:border-yellow-500'
              : 'border-transparent hover:border-primary-200'"
            @click="handleChatRoomClick(room)"
          >
            <div class="w-12 h-12 rounded-full bg-gray-200 border-2 border-primary-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
              <img
                v-if="room.avatar && !avatarErrors[room.id]"
                :src="room.avatar"
                :alt="room.name"
                class="w-full h-full object-cover"
                @error="avatarErrors[room.id] = true"
              />
              <MessageCircleIcon
                v-if="!room.avatar || !room.avatar.trim() || avatarErrors[room.id]"
                class="w-6 h-6 text-primary-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <div class="font-bold text-gray-800 text-sm truncate">
                  {{ room.name }}
                  <span v-if="room.type === 'friend-request-received'" class="text-yellow-600">（好友請求）</span>
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
      <div v-if="activeTab === 'friends'" class="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
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
            class="flex items-center justify-between p-3 bg-white rounded-2xl transition cursor-pointer border border-transparent hover:border-primary-200 shadow-sm group"
            @click="handleFriendClick(friend)"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-12 h-12 rounded-full bg-gray-200 border-2 border-primary-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  v-if="friend.avatar && friend.avatar.trim() && !avatarErrors[friend.id || friend.uid]"
                  :src="friend.avatar"
                  :alt="friend.name || friend.nickname"
                  class="w-full h-full object-cover"
                  @error="avatarErrors[friend.id || friend.uid] = true"
                />
                <UserIcon
                  v-if="!friend.avatar || !friend.avatar.trim() || avatarErrors[friend.id || friend.uid]"
                  class="w-6 h-6 text-primary-600"
                />
              </div>
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
              class="p-2 text-white bg-primary-600 hover:bg-primary-700 rounded-full transition ml-2 flex-shrink-0 shadow-sm"
              title="聊聊"
              @click.stop="handleFriendClick(friend)"
            >
              <MessageCircleIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 圖片預覽模态框 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showImagePreview"
          class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          @click="closeImagePreview"
        >
          <div class="relative max-w-5xl max-h-[95vh] w-full flex items-center justify-center" @click.stop>
            <!-- 關閉按鈕 -->
            <button
              class="absolute top-4 right-4 z-20 p-2.5 bg-white/95 hover:bg-white rounded-full transition shadow-xl hover:scale-110"
              title="關閉"
              @click.stop="closeImagePreview"
            >
              <XIcon class="w-6 h-6 text-gray-800" />
            </button>

            <!-- 圖片容器 -->
            <div class="relative w-full h-full flex flex-col items-center justify-center">
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                alt="預覽圖片"
                class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                @error="(e) => { console.error('預覽圖片載入失敗'); e.target.style.display = 'none' }"
                @click.stop
              />
              <div
                v-else
                class="text-white text-center p-8"
              >
                <p class="text-lg mb-2">無法載入圖片</p>
                <p class="text-sm opacity-75">圖片網址無效或已失效</p>
              </div>

              <!-- 下載按鈕 -->
              <div v-if="previewImageUrl" class="mt-4 flex items-center gap-3">
                <button
                  class="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!previewImageUrl"
                  @click.stop="downloadImage(previewImageUrl, previewImageName || 'image')"
                >
                  <DownloadIcon class="w-5 h-5" />
                  <span>下載</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* 隱藏貼圖選擇器的滾動條 */
.sticker-picker-container > div::-webkit-scrollbar {
  display: none;
}
</style>
