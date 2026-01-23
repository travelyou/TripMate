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
const groupChatRooms = ref([])

// 載入好友列表和好友請求
const friendRequests = ref({ received: [], sent: [] })
const showGroupMembersModal = ref(false)
const groupMembers = ref([])
const groupMembersLoading = ref(false)
const groupMembersError = ref('')
const groupMembersOwnerUid = ref('')
const groupMemberSearch = ref('')
const friendCandidateSearch = ref('')
const isEditingGroupName = ref(false)
const groupNameDraft = ref('')
const groupNameInputRef = ref(null)
const groupAvatarInputRef = ref(null)
const isSavingGroupName = ref(false)
const isSavingGroupAvatar = ref(false)
const memberActionLoading = ref(new Set())

// 訊息列表（根據當前聊天室）
const messages = ref([])
const messageInput = ref('')
const messagesContainer = ref(null)
const showStickerPicker = ref(false)
const fileInputRef = ref(null)
const isUploadingFile = ref(false)
const uploadProgress = ref(0)
const showFriendRequestsList = ref(false)
const isFriendRequestsListOpening = ref(false) // 標誌位：防止在開啟過程中被關閉
const friendRequestsToggleAt = ref(0) // 記錄開啟時間，防止立即關閉
const friendRequestsListContainer = ref(null)
const friendRequestsPopupPosition = ref({
  position: 'fixed',
  top: '50%',
  bottom: 'auto',
  left: '50%',
  right: 'auto',
  width: '320px',
  maxWidth: '384px',
  maxHeight: '70vh',
  transform: 'translate(-50%, -50%)'
})
const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageName = ref('')
let messagePollingInterval = null // 訊息輪詢定時器

// 文件類型限制
const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const maxFileSize = 10 * 1024 * 1024 // 10MB

// 對話次數限制
const chatInteractionCount = ref({ count: 0, remaining: 3, canSend: true, isFriend: false })
const isGroupChat = computed(() => activeChatRoom.value?.type === 'group')
const currentUserUid = computed(() => userStore.currentUser?.uid || userStore.currentUser?.id)
const isGroupOwner = computed(() =>
  Boolean(isGroupChat.value && currentUserUid.value && groupMembersOwnerUid.value === currentUserUid.value),
)
const isFriendChat = computed(() => {
  if (isGroupChat.value) return true
  const targetUid = activeChatRoom.value?.uid
  if (!targetUid) return false
  const friendList = userStore.currentUser?.friends || []
  return friendList.some(friend => (friend.uid || friend.id) === targetUid)
})
const canSendMessage = computed(() =>
  isGroupChat.value ? true : (chatInteractionCount.value.canSend && isFriendChat.value),
)

const updateUnreadCount = (friendUid, mappedMessages) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !Array.isArray(mappedMessages)) return

  const room = chatRoomsList.value.find(r => r.uid === friendUid)
  if (!room) return

  const unreadKey = `unread_${currentUid}_${friendUid}`
  const isActiveRoom = activeChatRoom.value?.uid === friendUid

  if (isActiveRoom) {
    room.unreadCount = 0
    localStorage.setItem(unreadKey, JSON.stringify({
      lastReadTime: new Date().toISOString()
    }))
    persistChatRooms()
    return
  }

  let lastReadTime = null
  const unreadData = localStorage.getItem(unreadKey)
  if (unreadData) {
    try {
      const unreadInfo = JSON.parse(unreadData)
      lastReadTime = unreadInfo.lastReadTime
    } catch {
      // ignore
    }
  }

  const lastReadMs = lastReadTime ? new Date(lastReadTime).getTime() : null
  const unreadCount = mappedMessages.reduce((count, message) => {
    if (message.type === 'user') return count
    const messageTime = new Date(message.timestamp || message.created_at).getTime()
    if (!lastReadMs || messageTime > lastReadMs) {
      return count + 1
    }
    return count
  }, 0)

  room.unreadCount = unreadCount
  persistChatRooms()
}

const emitChatSend = (payload) => {
  window.dispatchEvent(new CustomEvent('chat-send', { detail: payload }))
}

const incrementChatInteractionCount = async (currentUid, targetUid, logPrefix = '') => {
  try {
    const { incrementChatInteraction } = await import('@/api/profile')
    const data = await incrementChatInteraction(currentUid, targetUid)

    if (logPrefix) {
      console.log(`[${logPrefix}] API 返回資料:`, data)
      console.log(`[${logPrefix}] 發送前狀態:`, {
        count: chatInteractionCount.value.count,
        remaining: chatInteractionCount.value.remaining,
        canSend: chatInteractionCount.value.canSend,
      })
    }

    if (data && data.success !== false) {
      const newCount =
        typeof data.count === 'number'
          ? parseInt(data.count)
          : (parseInt(chatInteractionCount.value.count) || 0) + 1
      const newRemaining =
        typeof data.remaining === 'number' ? parseInt(data.remaining) : Math.max(0, 3 - newCount)
      const newCanSend =
        typeof data.canSend === 'boolean' ? data.canSend : newRemaining > 0
      const newIsFriend =
        typeof data.isFriend === 'boolean' ? data.isFriend : chatInteractionCount.value.isFriend || false

      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newCanSend,
        isFriend: newIsFriend,
      }

      if (logPrefix) {
        console.log(`[${logPrefix}] 發送後狀態:`, {
          count: newCount,
          remaining: newRemaining,
          canSend: newCanSend,
          isFriend: newIsFriend,
        })
      }
    } else {
      const newCount = (chatInteractionCount.value.count || 0) + 1
      const newRemaining = Math.max(0, 3 - newCount)
      chatInteractionCount.value = {
        count: newCount,
        remaining: newRemaining,
        canSend: newRemaining > 0,
        isFriend: chatInteractionCount.value.isFriend || false,
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
      isFriend: chatInteractionCount.value.isFriend || false,
    }
  }
}

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

const loadGroupChatRooms = async () => {
  try {
    const { getGroupChatRooms } = await import('@/api/travelers')
    const response = await getGroupChatRooms()
    if (response?.success) {
      groupChatRooms.value = response.data || []
    }
  } catch (error) {
    console.warn('載入群組聊天室失敗:', error)
  }
}

const updateGroupRoomLocal = (roomId, updates) => {
  const groupRoom = groupChatRooms.value.find((room) => room.id === roomId)
  if (groupRoom) {
    Object.assign(groupRoom, updates)
  }
  if (activeChatRoom.value?.roomId === roomId) {
    Object.assign(activeChatRoom.value, updates)
  }
}

const setMemberActionLoading = (uid, active) => {
  const nextSet = new Set(memberActionLoading.value)
  if (active) nextSet.add(uid)
  else nextSet.delete(uid)
  memberActionLoading.value = nextSet
}

const loadGroupMembers = async (silent = false) => {
  if (!isGroupChat.value || !activeChatRoom.value?.roomId) return
  if (!silent) {
    groupMembersLoading.value = true
    groupMembersError.value = ''
  }
  try {
    const { getGroupChatMembers } = await import('@/api/travelers')
    const response = await getGroupChatMembers(activeChatRoom.value.roomId)
    if (response?.success) {
      const data = response.data || {}
      groupMembersOwnerUid.value = data.created_by || ''
      groupMembers.value = Array.isArray(data.members) ? data.members : []
    }
  } catch (error) {
    console.warn('載入群組成員失敗:', error)
    if (!silent) groupMembersError.value = '載入群組成員失敗'
  } finally {
    if (!silent) groupMembersLoading.value = false
  }
}

const openGroupMembersModal = async () => {
  if (!isGroupChat.value) return
  showGroupMembersModal.value = true
  await loadGroupMembers()
}

const closeGroupMembersModal = () => {
  showGroupMembersModal.value = false
  groupMemberSearch.value = ''
  friendCandidateSearch.value = ''
}

const startEditGroupName = async () => {
  if (!isGroupOwner.value || !activeChatRoom.value) return
  groupNameDraft.value = activeChatRoom.value.name || ''
  isEditingGroupName.value = true
  await nextTick()
  groupNameInputRef.value?.focus()
}

const cancelEditGroupName = () => {
  isEditingGroupName.value = false
  groupNameDraft.value = activeChatRoom.value?.name || ''
}

const saveGroupName = async () => {
  if (!isGroupOwner.value || !activeChatRoom.value || isSavingGroupName.value) return
  const nextName = groupNameDraft.value.trim()
  if (!nextName) {
    alert('群組名稱不可為空')
    return
  }
  if (nextName === activeChatRoom.value.name) {
    cancelEditGroupName()
    return
  }
  isSavingGroupName.value = true
  try {
    const { updateGroupChatRoom } = await import('@/api/travelers')
    const response = await updateGroupChatRoom(activeChatRoom.value.roomId, { name: nextName })
    if (response?.success && response.data) {
      updateGroupRoomLocal(activeChatRoom.value.roomId, { name: response.data.name })
      groupNameDraft.value = response.data.name
      isEditingGroupName.value = false
    }
  } catch (error) {
    console.error('更新群組名稱失敗：', error)
    alert('更新群組名稱失敗，請稍後再試')
  } finally {
    isSavingGroupName.value = false
  }
}

const handleGroupAvatarClick = () => {
  if (!isGroupOwner.value) return
  groupAvatarInputRef.value?.click()
}

const handleGroupAvatarChange = async (event) => {
  if (!isGroupOwner.value || !activeChatRoom.value?.roomId) return
  const file = event.target.files?.[0]
  if (!file) return

  if (!allowedFileTypes.includes(file.type)) {
    alert('僅支援 JPG、PNG、GIF、WEBP 格式')
    event.target.value = ''
    return
  }
  if (file.size > maxFileSize) {
    alert('檔案大小不可超過 10MB')
    event.target.value = ''
    return
  }

  isSavingGroupAvatar.value = true
  try {
    const avatarUrl = await uploadImage(file, 'group-avatars')
    if (!avatarUrl) throw new Error('未取得圖片網址')
    const { updateGroupChatRoom } = await import('@/api/travelers')
    const response = await updateGroupChatRoom(activeChatRoom.value.roomId, { avatar: avatarUrl })
    if (response?.success && response.data) {
      updateGroupRoomLocal(activeChatRoom.value.roomId, { avatar: response.data.avatar })
    }
  } catch (error) {
    console.error('更新群組頭像失敗：', error)
    alert('更新群組頭像失敗，請稍後再試')
  } finally {
    isSavingGroupAvatar.value = false
    event.target.value = ''
  }
}

const filteredGroupMembers = computed(() => {
  const keyword = groupMemberSearch.value.trim().toLowerCase()
  const members = Array.isArray(groupMembers.value) ? groupMembers.value : []
  if (!keyword) return members
  return members.filter((member) => {
    const name = member.name || member.nickname || member.user_uid || ''
    return String(name).toLowerCase().includes(keyword)
  })
})

const filteredFriendCandidates = computed(() => {
  const friends = Array.isArray(userStore.currentUser?.friends) ? userStore.currentUser.friends : []
  const memberUids = new Set(
    (Array.isArray(groupMembers.value) ? groupMembers.value : []).map((member) => member.user_uid),
  )
  const keyword = friendCandidateSearch.value.trim().toLowerCase()
  return friends
    .map((friend) => ({
      uid: friend.uid || friend.id,
      name: friend.name || friend.nickname,
      nickname: friend.nickname || friend.name,
      avatar: friend.avatar || '',
    }))
    .filter((friend) => friend.uid && !memberUids.has(friend.uid))
    .filter((friend) => {
      if (!keyword) return true
      const name = friend.name || friend.nickname || ''
      return String(name).toLowerCase().includes(keyword)
    })
})

const handleAddGroupMember = async (member) => {
  if (!isGroupOwner.value || !activeChatRoom.value?.roomId || !member?.uid) return
  if (memberActionLoading.value.has(member.uid)) return
  setMemberActionLoading(member.uid, true)
  try {
    const { addGroupChatMember } = await import('@/api/travelers')
    const response = await addGroupChatMember(activeChatRoom.value.roomId, member.uid)
    if (response?.success && response.data) {
      groupMembers.value = [...groupMembers.value, response.data]
    }
  } catch (error) {
    console.error('新增群組成員失敗：', error)
    alert('新增群組成員失敗，請稍後再試')
  } finally {
    setMemberActionLoading(member.uid, false)
  }
}

const handleRemoveGroupMember = async (member) => {
  if (!isGroupOwner.value || !activeChatRoom.value?.roomId || !member?.user_uid) return
  if (member.user_uid === groupMembersOwnerUid.value) return
  if (memberActionLoading.value.has(member.user_uid)) return
  setMemberActionLoading(member.user_uid, true)
  try {
    const { removeGroupChatMember } = await import('@/api/travelers')
    const response = await removeGroupChatMember(activeChatRoom.value.roomId, member.user_uid)
    if (response?.success) {
      groupMembers.value = groupMembers.value.filter((item) => item.user_uid !== member.user_uid)
    }
  } catch (error) {
    console.error('移除群組成員失敗：', error)
    alert('移除群組成員失敗，請稍後再試')
  } finally {
    setMemberActionLoading(member.user_uid, false)
  }
}

// 聊天室列表（動態創建的聊天室）
const chatRooms = computed(() => {
  const rooms = []

  const friendList = userStore.currentUser?.friends || []
  const isFriendUid = (uid) => friendList.some(friend => (friend.uid || friend.id) === uid)

  groupChatRooms.value.forEach((room) => {
    rooms.push({
      id: `group-${room.id}`,
      type: 'group',
      roomId: room.id,
      uid: `group-${room.id}`,
      name: room.name || room.traveler_title || '旅伴群組',
      avatar: room.avatar || '',
      lastMessage: room.lastMessage || '群組聊天室',
      lastMessageTime: room.lastMessageTime || '',
      unreadCount: room.unreadCount || 0,
      messages: room.messages || [],
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
      unreadCount: room.unreadCount || 0,
      isStranger: !isFriendUid(room.uid),
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

      if (hasNewMessages && previousMessageCount > 0) {
        const lastMessage = mappedMessages[mappedMessages.length - 1]
        if (lastMessage && lastMessage.type !== 'user') {
          const roomInfo = chatRoomsList.value.find(r => r.uid === friendUid) || activeChatRoom.value
          const preview = lastMessage.isImage ? '傳送了圖片' : lastMessage.content
          window.dispatchEvent(new CustomEvent('incoming-message', {
            detail: {
              uid: friendUid,
              name: roomInfo?.name || '未知用戶',
              avatar: roomInfo?.avatar || '',
              content: preview
            }
          }))
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

    updateUnreadCount(friendUid, mappedMessages)
    persistChatRooms()

    if (!silent) {
      console.log('[loadChatHistory] 載入聊天記錄:', messages.value.length, '條訊息')
    }
  } catch (error) {
    console.error('載入聊天記錄失敗：', error)
    // 失敗時不重置，保持當前狀態
  }
}

const loadGroupChatHistory = async (roomId, silent = false) => {
  try {
    const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
    if (!currentUid) return
    const { getGroupChatMessages } = await import('@/api/travelers')
    const response = await getGroupChatMessages(roomId)
    const rawMessages = response?.data || []
    const mappedMessages = rawMessages.map((msg) => ({
      id: msg.id,
      type: msg.sender_uid === currentUid ? 'user' : 'friend',
      content: msg.content,
      timestamp: msg.created_at,
      senderName: msg.sender_name || '成員',
      senderAvatar: msg.sender_avatar || '',
      senderUid: msg.sender_uid,
    }))

    messages.value = mappedMessages
    saveMessagesToStorage(`group-${roomId}`, messages.value)

    const groupRoom = groupChatRooms.value.find((room) => room.id === roomId)
    if (groupRoom) {
      groupRoom.lastMessage = mappedMessages.length ? mappedMessages[mappedMessages.length - 1].content : ''
      groupRoom.lastMessageTime = mappedMessages.length ? '剛剛' : groupRoom.lastMessageTime
    }

    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    if (!silent) {
      console.log('[loadGroupChatHistory] 載入群組聊天記錄:', messages.value.length, '條訊息')
    }
  } catch (error) {
    console.error('載入群組聊天記錄失敗：', error)
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
    existingRoom.unreadCount = 0
  } else {
    // 創建新聊天室
    const newRoom = {
      uid: targetUid,
      name: user.name || user.nickname || '未知用戶',
      nickname: user.nickname || user.name || '',
      avatar: user.avatar || '',
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
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
  persistChatRooms()

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
  if (isGroupChat.value) {
    alert('⚠️ 群組聊天室暫不支援傳送圖片。')
    return
  }
  if (!isFriendChat.value) {
    alert('⚠️ 目前不是好友，無法傳送訊息或檔案。')
    return
  }
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
  if (isGroupChat.value) {
    event.target.value = ''
    return
  }
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

  if (!isFriendChat.value) {
    alert('⚠️ 目前不是好友，無法傳送訊息或檔案。')
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

    const optimisticId = Date.now()
    const timestamp = new Date().toISOString()
    const imageMessage = {
      id: optimisticId,
      type: 'user',
      content: imageUrl,
      isImage: true,
      timestamp,
    }

    messages.value.push(imageMessage)

    const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
    if (room) {
      room.lastMessage = '[圖片]'
      room.lastMessageTime = '剛剛'
      room.lastMessageTimestamp = new Date(timestamp).getTime()
      room.messages = messages.value
    }

    if (activeChatRoom.value) {
      activeChatRoom.value.messages = messages.value
    }

    persistChatRooms()
    saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
    window.dispatchEvent(new CustomEvent('message-updated'))
    scrollToBottom()

    emitChatSend({
      toUid: activeChatRoom.value.uid,
      content: imageUrl,
      isImage: true,
      timestamp,
      clientId: optimisticId,
    })

    // 記錄對話次數（背景）
    incrementChatInteractionCount(currentUid, activeChatRoom.value.uid)
      .catch(() => {})

    // 保存圖片訊息到資料庫（背景）
    ;(async () => {
      const { saveChatMessage } = await import('@/api/profile')
      const imageMessageText = `[IMAGE]${imageUrl}[/IMAGE]`
      await saveChatMessage(currentUid, activeChatRoom.value.uid, imageMessageText)
    })().catch((error) => {
      console.error('保存圖片訊息失敗：', error)
    })
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

  messageInput.value = ''

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !activeChatRoom.value) return

  if (isGroupChat.value) {
    const optimisticId = Date.now()
    const timestamp = new Date().toISOString()
    const userMessage = {
      id: optimisticId,
      type: 'user',
      content: text,
      timestamp,
      senderName: userStore.currentUser?.name || userStore.currentUser?.nickname || '我',
      senderAvatar: userStore.currentUser?.avatar || '',
      senderUid: currentUid,
    }

    messages.value.push(userMessage)
    saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
    window.dispatchEvent(new CustomEvent('message-updated'))
    scrollToBottom()

    const groupRoom = groupChatRooms.value.find((room) => room.id === activeChatRoom.value.roomId)
    if (groupRoom) {
      groupRoom.lastMessage = text
      groupRoom.lastMessageTime = '剛剛'
    }

    try {
      const { sendGroupChatMessage } = await import('@/api/travelers')
      await sendGroupChatMessage(activeChatRoom.value.roomId, text)
    } catch (error) {
      console.error('發送群組訊息失敗：', error)
    }
    return
  }

  if (!isFriendChat.value) {
    alert('⚠️ 目前不是好友，無法傳送訊息。')
    return
  }

  // 檢查對話次數（在發送前檢查）
  if (!chatInteractionCount.value.canSend) {
    alert('⚠️ 已達到對話次數上限\n\n您已發送 3 次訊息，等待對方同意好友請求後才能繼續聊天。')
    return
  }

  const optimisticId = Date.now()
  const timestamp = new Date().toISOString()
  const userMessage = {
    id: optimisticId,
    type: 'user',
    content: text,
    timestamp,
  }

  messages.value.push(userMessage)

  const room = chatRoomsList.value.find(r => r.uid === activeChatRoom.value.uid)
  if (room) {
    room.lastMessage = text
    room.lastMessageTime = '剛剛'
    room.lastMessageTimestamp = new Date(timestamp).getTime()
    room.messages = messages.value
  }

  if (activeChatRoom.value) {
    activeChatRoom.value.messages = messages.value
  }

  persistChatRooms()
  saveMessagesToStorage(activeChatRoom.value.uid, messages.value)
  window.dispatchEvent(new CustomEvent('message-updated'))
  scrollToBottom()

  emitChatSend({
    toUid: activeChatRoom.value.uid,
    content: text,
    isImage: false,
    timestamp,
    clientId: optimisticId,
  })

  // 背景記錄對話次數與保存訊息
  incrementChatInteractionCount(currentUid, activeChatRoom.value.uid, 'sendMessage')
    .catch(() => {})
  ;(async () => {
    const { saveChatMessage } = await import('@/api/profile')
    await saveChatMessage(currentUid, activeChatRoom.value.uid, text)
  })().catch((error) => {
    console.error('保存訊息失敗：', error)
  })
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

const startGroupMessagePolling = (roomId) => {
  stopMessagePolling()
  messagePollingInterval = setInterval(async () => {
    if (activeChatRoom.value && activeChatRoom.value.roomId === roomId) {
      await loadGroupChatHistory(roomId, true)
    }
  }, 5000)
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
  if (room.type === 'chat') {
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

  if (room.type === 'group') {
    activeChatRoom.value = {
      type: 'group',
      uid: room.uid,
      roomId: room.roomId,
      name: room.name,
      avatar: room.avatar,
      messages: room.messages || [],
    }
    groupNameDraft.value = room.name || ''
    isEditingGroupName.value = false
    const roomKey = `group-${room.roomId}`
    const localMessages = loadMessagesFromStorage(roomKey)
    messages.value = localMessages
    loadGroupMembers(true)
    await loadGroupChatHistory(room.roomId)
    startGroupMessagePolling(room.roomId)
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

watch(
  () => userStore.currentUser?.uid,
  (uid) => {
    if (uid) {
      loadGroupChatRooms()
    }
  },
  { immediate: true },
)

watch(() => activeTab.value, (tab) => {
  if (tab === 'friends') {
    window.dispatchEvent(new CustomEvent('friends-viewed'))
  }
})

watch(
  () => activeChatRoom.value?.uid,
  () => {
    isEditingGroupName.value = false
    showGroupMembersModal.value = false
    groupMembersError.value = ''
    groupMemberSearch.value = ''
    friendCandidateSearch.value = ''
  },
)


watch(chatRoomsList, () => {
  persistChatRooms()
}, { deep: true })

const isClickInsideFriendRequests = (event) => {
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : []
  const container = friendRequestsListContainer.value
  if (container && path.includes(container)) return true
  const target = event?.target instanceof Element ? event.target : null
  if (!target) return false
  return Boolean(target.closest('.friend-requests-popup') || target.closest('.friend-requests-list-container'))
}

// 點擊外部關閉貼圖選擇器和好友請求列表
const handleClickOutside = (event) => {
  const target = event?.target instanceof Element ? event.target : null
  if (showStickerPicker.value && (!target || !target.closest('.sticker-picker-container'))) {
    showStickerPicker.value = false
  }
  // 檢查是否點擊在好友請求列表容器內（包括按鈕和彈窗）
  // 如果正在開啟過程中，不處理關閉
  if (showFriendRequestsList.value && !isFriendRequestsListOpening.value) {
    const now = Date.now()
    if (now - friendRequestsToggleAt.value < 600) return
    if (!isClickInsideFriendRequests(event)) {
      showFriendRequestsList.value = false
    }
  }
}

// 計算好友請求列表彈窗位置
const calculateFriendRequestsPopupPosition = () => {
  const useCenterPopup = true
  if (useCenterPopup) {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const horizontalMargin = 24
    const verticalMargin = 120
    const maxWidth = Math.min(384, Math.max(280, viewportWidth - horizontalMargin * 2))
    const maxHeight = Math.min(384, Math.max(260, viewportHeight - verticalMargin))

    friendRequestsPopupPosition.value = {
      position: 'fixed',
      top: '50%',
      bottom: 'auto',
      left: '50%',
      right: 'auto',
      width: `${maxWidth}px`,
      maxWidth: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`,
      transform: 'translate(-50%, -50%)'
    }
    return
  }
  if (!friendRequestsListContainer.value) {
    console.warn('friendRequestsListContainer 未找到')
    return
  }

  nextTick(() => {
    try {
      const container = friendRequestsListContainer.value
      if (!container) {
        console.warn('container 元素不存在')
        return
      }

      const rect = container.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) {
        console.warn('container 位置信息无效')
        // 使用預設位置
        friendRequestsPopupPosition.value = {
          position: 'fixed',
          top: '60px',
          right: '20px',
          bottom: 'auto',
          left: 'auto',
          width: '320px',
          maxWidth: '384px'
        }
        return
      }

      const popupWidth = 320 // 預設寬度
      const popupMaxWidth = 384 // 最大宽度
      const popupHeight = 384 // max-h-96 = 384px
      const margin = 8 // 边距
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // 使用 fixed 定位，相對於視口計算
      let top = 'auto'
      let bottom = 'auto'

      // 檢查下方空間是否足夠
      const spaceBelow = viewportHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin

      // 垂直位置：優先向下，空間不足則向上
      if (spaceBelow >= popupHeight || spaceBelow >= spaceAbove) {
        // 向下顯示
        top = `${rect.bottom + margin}px`
        bottom = 'auto'
      } else {
        // 向上顯示
        bottom = `${viewportHeight - rect.top + margin}px`
        top = 'auto'
      }

      // 水平位置：優先右對齊，空間不足則左對齊或居中
      const spaceRight = viewportWidth - rect.right
      const spaceLeft = rect.left

      // 計算最終寬度（確保不超出視口）
      let finalWidth = popupWidth
      let finalLeft = 'auto'
      let finalRight = 'auto'

      if (spaceRight >= popupWidth) {
        // 右側空間足夠，右對齊
        finalRight = `${viewportWidth - rect.right}px`
        finalLeft = 'auto'
      } else if (spaceLeft >= popupWidth) {
        // 左側空間足夠，左對齊
        finalLeft = `${rect.left}px`
        finalRight = 'auto'
      } else {
        // 兩側空間都不足，使用較大的一側並調整寬度
        if (spaceRight >= spaceLeft) {
          // 右側空間較大，右對齊但縮小寬度
          finalRight = `${margin}px`
          finalLeft = 'auto'
          finalWidth = Math.min(popupMaxWidth, Math.max(280, spaceRight - margin * 2))
        } else {
          // 左側空間較大，左對齊但縮小寬度
          finalLeft = `${margin}px`
          finalRight = 'auto'
          finalWidth = Math.min(popupMaxWidth, Math.max(280, spaceLeft - margin * 2))
        }
      }

      // 確保最小寬度
      finalWidth = Math.max(280, Math.min(finalWidth, popupMaxWidth))

      // 確保至少有一個有效的位置值
      if (top === 'auto' && bottom === 'auto') {
        top = `${rect.bottom + margin}px`
      }
      if (finalLeft === 'auto' && finalRight === 'auto') {
        // 如果左右都是 auto，使用右對齊
        finalRight = `${viewportWidth - rect.right}px`
      }

      friendRequestsPopupPosition.value = {
        position: 'fixed',
        top,
        bottom,
        left: finalLeft,
        right: finalRight,
        width: `${finalWidth}px`,
        maxWidth: `${finalWidth}px`
      }
    } catch (error) {
      console.error('計算彈窗位置失敗：', error)
      // 使用預設位置作為備援
      friendRequestsPopupPosition.value = {
        position: 'fixed',
        top: '60px',
        right: '20px',
        bottom: 'auto',
        left: 'auto',
        width: '320px',
        maxWidth: '384px'
      }
    }
  })
}

// 切換好友請求列表顯示
const toggleFriendRequestsList = (event) => {
  // 阻止事件冒泡和預設行為
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }

  const wasVisible = showFriendRequestsList.value

  if (!wasVisible) {
    // 開啟彈窗
    friendRequestsToggleAt.value = Date.now()
    isFriendRequestsListOpening.value = true
    showFriendRequestsList.value = true

    // 重新載入好友請求列表
    loadFriends()

    // 在下一個 tick 計算彈窗位置，確保 DOM 已更新
    nextTick(() => {
      // 使用 setTimeout 確保 DOM 完全渲染
      setTimeout(() => {
        calculateFriendRequestsPopupPosition()
        // 延遲後允許關閉檢查
        setTimeout(() => {
          isFriendRequestsListOpening.value = false
        }, 200)
      }, 50)
    })
  } else {
    // 關閉彈窗
    showFriendRequestsList.value = false
    isFriendRequestsListOpening.value = false
  }
}

// 監聽彈窗顯示狀態，動態調整位置
watch(showFriendRequestsList, (isVisible) => {
  if (isVisible && !isFriendRequestsListOpening.value) {
    nextTick(() => {
      // 使用 setTimeout 確保 DOM 完全渲染
      setTimeout(() => {
        calculateFriendRequestsPopupPosition()
      }, 50)
    })
  }
})

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

// 處理窗口大小變化和滾動事件
const handleResize = () => {
  if (showFriendRequestsList.value) {
    calculateFriendRequestsPopupPosition()
  }
}

const handleScroll = () => {
  if (showFriendRequestsList.value) {
    calculateFriendRequestsPopupPosition()
  }
}

const handleChatReceived = (event) => {
  const detail = event.detail || {}
  const fromUid = detail.fromUid
  const incomingMessage = detail.message
  if (!fromUid || !incomingMessage) return

  const room = chatRoomsList.value.find(r => r.uid === fromUid) || {
    uid: fromUid,
    name: detail.senderName || '未知用戶',
    nickname: detail.senderName || '',
    avatar: detail.senderAvatar || '',
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    messages: [],
  }

  if (!chatRoomsList.value.some(r => r.uid === fromUid)) {
    chatRoomsList.value.unshift(room)
  }

  const roomMessages = Array.isArray(room.messages) ? room.messages : []
  const exists = roomMessages.some(msg => msg.id === incomingMessage.id && msg.timestamp === incomingMessage.timestamp)
  if (!exists) {
    roomMessages.push({
      ...incomingMessage,
      type: 'friend',
    })
  }
  room.messages = roomMessages
  room.lastMessage = incomingMessage.isImage ? '傳送了圖片' : (incomingMessage.content || '新訊息')
  room.lastMessageTime = '剛剛'
  room.lastMessageTimestamp = new Date(incomingMessage.timestamp || new Date().toISOString()).getTime()

  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  const isActiveRoom = activeChatRoom.value?.uid === fromUid
  if (isActiveRoom) {
    messages.value = roomMessages
    if (activeChatRoom.value) {
      activeChatRoom.value.messages = roomMessages
    }
    if (currentUid) {
      const unreadKey = `unread_${currentUid}_${fromUid}`
      localStorage.setItem(unreadKey, JSON.stringify({
        lastReadTime: new Date().toISOString(),
      }))
    }
    room.unreadCount = 0
    scrollToBottom()
  } else {
    updateUnreadCount(fromUid, roomMessages)
  }

  persistChatRooms()
  saveMessagesToStorage(fromUid, roomMessages)
  window.dispatchEvent(new CustomEvent('message-updated'))
}

onMounted(() => {
  loadFriends()
  loadChatRoomsFromStorage()
  loadGroupChatRooms()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('chat-received', handleChatReceived)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('chat-received', handleChatReceived)
  // 清除輪詢定時器
  stopMessagePolling()
})
</script>

<template>
  <div
    class="fixed inset-0 w-full h-full max-w-none max-h-none border-0 bg-white z-50 flex flex-col rounded-none overflow-hidden animate-slide-up lg:inset-auto lg:bottom-4 lg:right-[80px] lg:w-80 lg:max-w-80 lg:h-[480px] lg:max-h-[480px] lg:border-4 lg:border-primary lg:shadow-xl lg:rounded-2xl lg:bg-white/90 lg:backdrop-blur"
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
          v-if="activeChatRoom && activeChatRoom.type === 'chat'"
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
        <button
          v-else-if="activeChatRoom && activeChatRoom.type === 'group'"
          class="flex-shrink-0"
          :title="isGroupOwner ? '點擊更換群組頭像' : '群組頭像'"
          @click="handleGroupAvatarClick"
        >
          <div
            v-if="activeChatRoom.avatar && !avatarErrors[`group-${activeChatRoom.roomId}`]"
            class="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden cursor-pointer hover:opacity-80 transition"
          >
            <img
              :src="activeChatRoom.avatar"
              :alt="activeChatRoom.name"
              class="w-full h-full object-cover"
              @error="avatarErrors[`group-${activeChatRoom.roomId}`] = true"
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
          <div v-if="isGroupChat && isEditingGroupName" class="flex items-center gap-2">
            <input
              ref="groupNameInputRef"
              v-model="groupNameDraft"
              class="bg-white/90 text-gray-800 rounded-md px-2 py-1 text-sm font-bold w-40"
              placeholder="輸入群組名稱"
              maxlength="30"
              @keyup.enter="saveGroupName"
              @keyup.esc="cancelEditGroupName"
            />
            <button
              class="p-1 rounded-full bg-white/20 hover:bg-white/30 transition"
              :disabled="isSavingGroupName"
              @click="saveGroupName"
            >
              <CheckIcon class="w-4 h-4" />
            </button>
            <button
              class="p-1 rounded-full bg-white/20 hover:bg-white/30 transition"
              @click="cancelEditGroupName"
            >
              <XIcon class="w-4 h-4" />
            </button>
          </div>
          <h3 v-else class="font-bold text-lg">
            <span
              v-if="isGroupChat && isGroupOwner"
              class="cursor-pointer hover:opacity-80 transition"
              title="點擊編輯群組名稱"
              @click="startEditGroupName"
            >
              {{ activeChatRoom ? activeChatRoom.name : '我的聊天' }}
            </span>
            <span v-else>
              {{ activeChatRoom ? activeChatRoom.name : '我的聊天' }}
            </span>
          </h3>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="activeChatRoom && activeChatRoom.type === 'group'"
          class="p-1 hover:bg-primary-600 rounded-full transition relative"
          title="編輯群組成員"
          @click.stop="openGroupMembersModal"
        >
          <UserIcon class="w-6 h-6" />
        </button>
        <!-- 好友請求列表按鈕 -->
        <div
          v-else
          ref="friendRequestsListContainer"
          class="relative friend-requests-list-container"
        >
          <button
            class="p-1 hover:bg-primary-600 rounded-full transition relative"
            title="好友邀請"
            @click.stop="toggleFriendRequestsList"
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
            class="friend-requests-popup bg-white rounded-xl shadow-2xl border-2 border-primary-200 z-[100] max-h-80 overflow-hidden flex flex-col"
            :style="{
              position: friendRequestsPopupPosition.position || 'fixed',
              top: friendRequestsPopupPosition.top || 'auto',
              bottom: friendRequestsPopupPosition.bottom || 'auto',
              left: friendRequestsPopupPosition.left || 'auto',
              right: friendRequestsPopupPosition.right || 'auto',
              width: friendRequestsPopupPosition.width || '280px',
              maxWidth: friendRequestsPopupPosition.maxWidth || '320px',
              maxHeight: friendRequestsPopupPosition.maxHeight || '55vh',
              minWidth: '240px',
              transform: friendRequestsPopupPosition.transform || 'translate(-50%, 0%)'
            }"
            @click.stop
          >
            <div class="p-2 sm:p-3 border-b border-gray-200 bg-primary-50 flex-shrink-0">
              <h3 class="font-bold text-primary-700 text-sm pl-4 ml-7 sm:text-base">好友邀請</h3>
              <p class="text-xs text-gray-500 mt-1 ml-7 pl-4 break-words whitespace-normal">
                {{ friendRequests.received && friendRequests.received.length > 0 ? `${friendRequests.received.length} 個待處理邀請` : '目前沒有邀請' }}
               </p>
            </div>
            <div class="flex-1 overflow-y-auto p-4 ml-4 space-y-2 min-h-0 custom-scrollbar">
              <div
                v-if="!friendRequests.received || friendRequests.received.length === 0"
                class="text-center text-gray-400 py-8 text-sm"
              >
              </div>
              <div
                v-for="request in friendRequests.received"
                :key="request.uid"
                class="flex items-center gap-3 p-3 rounded-2xl transition border border-gray-100 bg-white shadow-sm hover:bg-gray-50"
              >
                <div class="w-12 h-12 rounded-full bg-gray-200 border-2 border-primary-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
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
                <div class="flex-1 min-w-0 overflow-hidden">
                  <div class="font-bold text-gray-800 text-sm truncate break-words">
                    {{ request.name || request.nickname || '未知用戶' }}
                  </div>
                  <div class="text-xs text-gray-500 truncate break-words">
                    @{{ request.nickname || request.name || 'user' }}
                  </div>
                </div>
                <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    class="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-sm flex-shrink-0 flex items-center justify-center"
                    title="接受"
                    @click.stop="handleAcceptFriendRequest(request)"
                  >
                    <CheckIcon class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-sm flex-shrink-0 flex items-center justify-center"
                    title="拒絕"
                    @click.stop="handleRejectFriendRequest(request)"
                  >
                    <XIcon class="w-4 h-4" />
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
    <input
      ref="groupAvatarInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleGroupAvatarChange"
    />

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
          v-if="!isFriendChat"
          class="text-center text-xs text-gray-600 py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          ⚠️ 目前不是好友，無法傳送訊息
        </div>
        <div
          v-else-if="!chatInteractionCount.canSend"
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
              :disabled="!canSendMessage"
              placeholder="輸入訊息..."
              class="w-full px-4 py-2.5 border border-secondary-200 rounded-full focus:border-primary-500 focus:outline-none text-sm bg-white text-black placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            <!-- 貼圖選擇器 -->
            <div
              v-if="showStickerPicker"
              class="absolute bottom-full left-0 mb-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[50vh] bg-white border-2 border-primary-200 rounded-xl shadow-xl overflow-y-auto overflow-x-hidden z-50 p-3 sm:p-4 grid grid-cols-6 sm:grid-cols-8 gap-2"
              style="scrollbar-width: none; -ms-overflow-style: none;"
            >
              <button
                v-for="sticker in stickers"
                :key="sticker"
                type="button"
                class="text-xl sm:text-2xl hover:bg-primary-50 rounded-lg p-2 transition"
                @click="selectSticker(sticker)"
              >
                {{ sticker }}
              </button>
            </div>
          </div>
          <button
            type="submit"
            :disabled="!canSendMessage || isUploadingFile"
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
            :disabled="!canSendMessage || isUploadingFile"
            class="p-0 text-primary-600 hover:text-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 shadow-none"
            :title="isUploadingFile ? `上傳中... ${uploadProgress}%` : '上傳圖片'"
            @click.stop="openFilePicker"
          >
            <LoaderIcon v-if="isUploadingFile" class="w-3.5 h-3.5 animate-spin" />
            <PlusIcon v-else class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            :disabled="!canSendMessage || isUploadingFile"
            class="p-0 text-primary-600 hover:text-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 shadow-none"
            title="表情符號"
            @click.stop="toggleStickerPicker"
          >
            <SmileIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="activeChatRoom && activeChatRoom.type === 'group'">
      <!-- 群組訊息列表 -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white via-slate-50 to-slate-100 custom-scrollbar"
      >
        <div v-if="messages.length === 0" class="text-center text-gray-400 py-8 text-sm">
          開始在 {{ activeChatRoom.name }} 群組聊天
        </div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex items-end gap-2"
          :class="{ 'justify-end': msg.type === 'user' }"
        >
          <div
            v-if="msg.type !== 'user'"
            class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-white/80 shadow-sm overflow-hidden"
          >
            <img
              v-if="msg.senderAvatar && !avatarErrors[`group-${msg.senderUid}`]"
              :src="msg.senderAvatar"
              :alt="msg.senderName"
              class="w-full h-full object-cover"
              @error="avatarErrors[`group-${msg.senderUid}`] = true"
            />
            <UserIcon v-else class="w-5 h-5 text-white" />
          </div>

          <div
            class="p-3 shadow-sm max-w-[80%] text-sm font-medium"
            :class="[
              msg.type === 'user'
                ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm border border-primary-700/60 shadow-lg shadow-primary-900/10'
                : 'bg-white text-secondary-800 rounded-2xl rounded-tl-sm border border-secondary-100 shadow-sm',
            ]"
          >
            <div v-if="msg.type !== 'user'" class="text-[10px] text-gray-500 mb-1">
              {{ msg.senderName }}
            </div>
            <span>{{ msg.content }}</span>
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
            <UserIcon v-else class="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>

      <!-- 群組輸入框 -->
      <div class="p-4 border-t border-secondary-200 bg-white/90">
        <form class="flex items-center space-x-2" @submit.prevent="sendMessage">
          <div class="relative flex-1">
            <input
              v-model="messageInput"
              type="text"
              placeholder="輸入群組訊息..."
              class="w-full px-4 py-2.5 border border-secondary-200 rounded-full focus:border-primary-500 focus:outline-none text-sm bg-white text-black placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            :disabled="isUploadingFile"
            class="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition border border-primary-700/70 shadow-md active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </form>
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
            class="flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer border bg-white shadow-sm border-transparent hover:border-primary-200"
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
                  <span v-if="room.isStranger" class="text-yellow-600">（申請邀請的好友）</span>
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

    <!-- 群組成員管理 -->
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
          v-if="showGroupMembersModal"
          class="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4"
          @click="closeGroupMembersModal"
        >
          <div
            class="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border-2 border-primary-200 shadow-2xl flex flex-col"
            @click.stop
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-primary-50">
              <div>
                <h3 class="font-bold text-primary-700">群組成員</h3>
                <p class="text-xs text-gray-500">
                  {{ isGroupOwner ? '可新增或移除成員' : '僅群組建立者可編輯成員' }}
                </p>
              </div>
              <button
                class="p-2 rounded-full hover:bg-primary-100 transition"
                title="關閉"
                @click="closeGroupMembersModal"
              >
                <XIcon class="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-bold text-sm text-gray-700">目前成員</h4>
                  <span class="text-xs text-gray-500">{{ groupMembers.length }} 位</span>
                </div>
                <input
                  v-model="groupMemberSearch"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                  placeholder="搜尋成員"
                />
                <div v-if="groupMembersLoading" class="text-center text-gray-400 text-sm py-6">
                  載入中...
                </div>
                <div v-else-if="groupMembersError" class="text-center text-red-500 text-sm py-4">
                  {{ groupMembersError }}
                </div>
                <div v-else-if="filteredGroupMembers.length === 0" class="text-center text-gray-400 text-sm py-4">
                  找不到符合的成員
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="member in filteredGroupMembers"
                    :key="member.user_uid"
                    class="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-white"
                  >
                    <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center">
                      <img
                        v-if="member.avatar && !avatarErrors[`member-${member.user_uid}`]"
                        :src="member.avatar"
                        :alt="member.name || member.nickname"
                        class="w-full h-full object-cover"
                        @error="avatarErrors[`member-${member.user_uid}`] = true"
                      />
                      <UserIcon v-else class="w-5 h-5 text-gray-500" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-sm text-gray-800 truncate">
                        {{ member.name || member.nickname || member.user_uid }}
                      </div>
                      <div class="text-xs text-gray-500 truncate">
                        {{ member.user_uid === groupMembersOwnerUid ? '群組建立者' : '@' + member.user_uid }}
                      </div>
                    </div>
                    <button
                      v-if="isGroupOwner && member.user_uid !== groupMembersOwnerUid"
                      class="px-3 py-1.5 text-xs rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                      :disabled="memberActionLoading.has(member.user_uid)"
                      @click.stop="handleRemoveGroupMember(member)"
                    >
                      移除
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-bold text-sm text-gray-700">新增好友</h4>
                  <span class="text-xs text-gray-500">{{ filteredFriendCandidates.length }} 位</span>
                </div>
                <input
                  v-model="friendCandidateSearch"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
                  placeholder="搜尋好友"
                />
                <div v-if="filteredFriendCandidates.length === 0" class="text-center text-gray-400 text-sm py-4">
                  沒有可加入的好友
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="friend in filteredFriendCandidates"
                    :key="friend.uid"
                    class="flex items-center gap-3 p-3 border border-gray-100 rounded-xl bg-white"
                  >
                    <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex-shrink-0 flex items-center justify-center">
                      <img
                        v-if="friend.avatar && !avatarErrors[`candidate-${friend.uid}`]"
                        :src="friend.avatar"
                        :alt="friend.name || friend.nickname"
                        class="w-full h-full object-cover"
                        @error="avatarErrors[`candidate-${friend.uid}`] = true"
                      />
                      <UserIcon v-else class="w-5 h-5 text-gray-500" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-sm text-gray-800 truncate">
                        {{ friend.name || friend.nickname || friend.uid }}
                      </div>
                      <div class="text-xs text-gray-500 truncate">
                        @{{ friend.nickname || friend.name || friend.uid }}
                      </div>
                    </div>
                    <button
                      v-if="isGroupOwner"
                      class="px-3 py-1.5 text-xs rounded-full bg-primary-600 text-white hover:bg-primary-700 transition disabled:opacity-50"
                      :disabled="memberActionLoading.has(friend.uid)"
                      @click.stop="handleAddGroupMember(friend)"
                    >
                      新增
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
