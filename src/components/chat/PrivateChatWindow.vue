<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  User as UserIcon,
  Paperclip as PaperclipIcon,
  Users as UsersIcon,
  MessageCircle as MessageCircleIcon,
  ArrowLeft as ArrowLeftIcon,
} from 'lucide-vue-next'
import { auth } from '@/firebase/config'
import {
  createOrGetDm,
  getMessages,
  getMyConversations,
  markRead,
  sendMessage as sendChatMessage,
} from '@/api/chat'
import { uploadAnyFile } from '@/api/storage'
import { getFriends } from '@/api/friends'

defineEmits(['close'])

const props = defineProps({
  autoOpenUid: {
    type: String,
    default: null,
  },
})

const activeTab = ref('friends') // 'friends' | 'chat'
const chatMode = ref('list') // 'list' | 'room'（聊天分頁內：列表 / 對話內容）

const messageInput = ref('')
const messagesContainer = ref(null)
const fileInput = ref(null)

const myUid = ref(null)
const isLoading = ref(false)

// 列表
const friends = ref([]) // [{uid,nickname,avatar}]
const conversations = ref([]) // from API
const selectedConversation = ref(null) // {id,type,name,dm_key,...}

// 訊息
const messages = ref([]) // {id, text, isUser, attachments[]}
let pollTimer = null

const conversationId = computed(() => selectedConversation.value?.id || null)

const headerTitle = computed(() => {
  if (activeTab.value === 'friends') return '聯絡人'
  if (chatMode.value === 'list') return '聊天'
  if (!selectedConversation.value) return '聊天'
  const c = selectedConversation.value
  if (c.type === 'group') return c.name || `群組 #${c.id}`
  // dm：顯示對方 uid（最小可用版）
  const other = c.other_uid || getOtherUidFromDmKey(c.dm_key, myUid.value)
  // 優先用後端回傳的 other_nickname，其次用好友表 nickname
  const f = other ? friendMap.value.get(other) : null
  return other ? (c.other_nickname || f?.nickname || other) : `私聊 #${c.id}`
})

const friendMap = computed(() => {
  const m = new Map()
  for (const f of friends.value || []) {
    if (f?.uid) m.set(String(f.uid), f)
  }
  return m
})

function getOtherUidFromDmKey(dmKey, me) {
  if (!dmKey || !me) return null
  const parts = String(dmKey).split('|')
  if (parts.length !== 2) return null
  return parts[0] === me ? parts[1] : parts[1] === me ? parts[0] : null
}

function makeDmKey(a, b) {
  if (!a || !b) return null
  return [String(a), String(b)].sort().join('|')
}

const dmConversationMap = computed(() => {
  const map = new Map()
  for (const c of conversations.value || []) {
    if (c?.type === 'dm' && c?.dm_key) {
      map.set(String(c.dm_key), c)
    }
  }
  return map
})

function getFriendLastMessagePreview(friendUid) {
  const key = makeDmKey(myUid.value, friendUid)
  const c = key ? dmConversationMap.value.get(key) : null
  return c?.last_message_body || '（尚未聊天）'
}

async function openDmWithFriend(friendUid) {
  try {
    const { conversation } = await createOrGetDm(myUid.value, friendUid)
    await openConversation(conversation)
  } catch (e) {
    alert('開啟私聊失敗：' + (e?.message || e))
  }
}

function getConversationDisplay(c) {
  if (!c) return { title: '聊天', subtitle: '', avatarUrl: null, avatarText: '?' }
  if (c.type === 'group') {
    return {
      title: c.name || `群組 #${c.id}`,
      subtitle: c.last_message_body || '（沒有訊息）',
      avatarUrl: c.avatar_url || null,
      avatarText: 'G',
    }
  }
  const otherUid = c.other_uid || getOtherUidFromDmKey(c.dm_key, myUid.value)
  const f = otherUid ? friendMap.value.get(otherUid) : null
  return {
    title: c.other_nickname || f?.nickname || otherUid || `私聊 #${c.id}`,
    subtitle: c.last_message_body || '（沒有訊息）',
    avatarUrl: c.other_avatar || f?.avatar || null,
    avatarText: (c.other_nickname || f?.nickname || otherUid || 'D').slice(0, 1).toUpperCase(),
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const normalizeMsg = (m) => ({
  id: m.id,
  text: m.body || '',
  isUser: m.sender_uid === myUid.value,
  attachments: Array.isArray(m.attachments) ? m.attachments : [],
})

async function loadConversationList() {
  if (!myUid.value) return
  const { conversations: rows } = await getMyConversations(myUid.value)
  conversations.value = rows || []
}

async function loadFriends() {
  if (!myUid.value) return
  const { friends: rows } = await getFriends(myUid.value)
  friends.value = rows || []
}

async function refreshMessages() {
  if (!conversationId.value || !myUid.value) return
  const { messages: rows } = await getMessages(conversationId.value, myUid.value, null, 50)
  messages.value = (rows || []).map(normalizeMsg)

  const last = rows?.[rows.length - 1]
  if (last?.id) {
    await markRead(conversationId.value, { uid: myUid.value, lastReadMessageId: last.id })
  }
  scrollToBottom()
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    refreshMessages().catch(() => {})
    loadConversationList().catch(() => {})
    loadFriends().catch(() => {})
  }, 1500)
}

async function openConversation(c) {
  selectedConversation.value = c
  activeTab.value = 'chat'
  chatMode.value = 'room'
  await refreshMessages()
  startPolling()
}

function backToChatList() {
  chatMode.value = 'list'
  selectedConversation.value = null
  messages.value = []
  messageInput.value = ''
}

// 已改成「好友列表點擊即開聊」，不再使用手動輸入 UID

const sendText = async () => {
  const text = messageInput.value.trim()
  if (!text || !conversationId.value || !myUid.value || isLoading.value) return

  isLoading.value = true
  try {
    await sendChatMessage(conversationId.value, {
      uid: myUid.value,
      body: text,
      attachments: [],
      client_message_id: String(Date.now()),
    })
    messageInput.value = ''
    await refreshMessages()
    await loadConversationList()
  } finally {
    isLoading.value = false
  }
}

const pickFile = () => {
  fileInput.value?.click?.()
}

const onPickFile = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !conversationId.value || !myUid.value) return

  isLoading.value = true
  try {
    const { publicUrl } = await uploadAnyFile(file, 'chat', `conversations/${conversationId.value}`)
    const kind = file.type?.startsWith('image/') ? 'image' : file.type?.startsWith('video/') ? 'video' : 'file'

    await sendChatMessage(conversationId.value, {
      uid: myUid.value,
      body: null,
      attachments: [
        {
          kind,
          url: publicUrl,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      ],
      client_message_id: String(Date.now()),
    })

    await refreshMessages()
    await loadConversationList()
  } catch (err) {
    alert('上傳/送出失敗：' + (err?.message || err))
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const u = auth.currentUser?.uid
  if (!u) {
    alert('請先登入後再使用聊天室')
    return
  }
  myUid.value = u
  await loadConversationList()
  await loadFriends()

  // 若父層指定要自動開某位好友的私聊
  if (props.autoOpenUid && props.autoOpenUid !== myUid.value) {
    try {
      const { conversation } = await createOrGetDm(myUid.value, props.autoOpenUid)
      await openConversation(conversation)
    } catch (e) {
      console.warn('autoOpenUid 開聊失敗：', e?.message || e)
    }
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
  </script>

  <template>
    <div
      class="fixed bottom-20 md:bottom-24 right-2 md:right-8 w-[calc(100vw-1rem)] md:w-96 max-w-md h-[calc(100vh-5rem)] md:h-[600px] max-h-[600px] bg-white border-4 border-amber-700 shadow-[4px_4px_0px_0px_rgba(139,111,71,0.3)] z-50 flex flex-col animate-slide-up"
    >
      <!-- Header -->
      <div class="bg-green-300 text-amber-900 p-4 flex items-center justify-between border-b-4 border-green-400">
        <div class="flex items-center space-x-2 min-w-0">
          <button
            v-if="activeTab === 'chat' && chatMode === 'room'"
            title="返回聊天列表"
            class="p-1 hover:bg-green-400 rounded-full transition"
            @click="backToChatList"
          >
            <ArrowLeftIcon class="w-6 h-6" />
          </button>
          <div class="min-w-0">
            <h3 class="font-bold text-lg truncate">{{ headerTitle }}</h3>
            <p class="text-xs opacity-80 truncate">UID：{{ myUid || '未登入' }}</p>
          </div>
        </div>
        <button class="p-1 hover:bg-green-400 rounded-full transition" @click="$emit('close')">
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="grid grid-cols-2 border-b-2 border-gray-200 bg-white">
        <button
          class="py-3 font-bold flex items-center justify-center gap-2"
          :class="activeTab === 'friends' ? 'bg-green-100 text-amber-900' : 'bg-white text-gray-600'"
          @click="activeTab = 'friends'"
        >
          <UsersIcon class="w-5 h-5" />
          好友列表
        </button>
        <button
          class="py-3 font-bold flex items-center justify-center gap-2"
          :class="activeTab === 'chat' ? 'bg-green-100 text-amber-900' : 'bg-white text-gray-600'"
          @click="activeTab = 'chat'"
        >
          <MessageCircleIcon class="w-5 h-5" />
          聊天室
        </button>
      </div>

      <!-- Friends tab: 聯絡人列表（像截圖，一行一個人） -->
      <div v-if="activeTab === 'friends'" class="flex-1 overflow-y-auto bg-white">
        <div v-if="!friends.length" class="p-4 text-sm text-gray-500">
          目前還沒有好友。請先在「個人頁」加好友後，這裡就會顯示 nickname。
        </div>

        <button
          v-for="f in friends"
          :key="f.uid"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
          @click="openDmWithFriend(f.uid)"
        >
          <img
            v-if="f.avatar"
            :src="f.avatar"
            class="w-12 h-12 rounded-full object-cover bg-gray-200"
            alt="avatar"
          />
          <div
            v-else
            class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold"
          >
            {{ (f.nickname || f.uid).slice(0, 1).toUpperCase() }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-bold text-gray-900 truncate">{{ f.nickname || f.uid }}</p>
            <p class="text-sm text-gray-400 truncate">{{ getFriendLastMessagePreview(f.uid) }}</p>
          </div>
        </button>
      </div>

      <!-- Chat tab: 聊天列表（像截圖，一行一個聊天室/人） -->
      <div v-else class="flex-1 flex flex-col bg-white">
        <!-- 列表模式 -->
        <div v-if="chatMode === 'list'" class="flex-1 overflow-y-auto">
          <div v-if="!conversations.length" class="p-4 text-sm text-gray-500">
            目前沒有聊天室。先去「聯絡人」點一位好友開始聊天。
          </div>

          <button
            v-for="c in conversations"
            :key="c.id"
            class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
            @click="openConversation(c)"
          >
            <img
              v-if="getConversationDisplay(c).avatarUrl"
              :src="getConversationDisplay(c).avatarUrl"
              class="w-12 h-12 rounded-full object-cover bg-gray-200"
              alt="avatar"
            />
            <div
              v-else
              class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold"
            >
              {{ getConversationDisplay(c).avatarText }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-bold text-gray-900 truncate">{{ getConversationDisplay(c).title }}</p>
                <span v-if="c.unread_count" class="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                  {{ c.unread_count }}
                </span>
              </div>
              <p class="text-sm text-gray-400 truncate">{{ getConversationDisplay(c).subtitle }}</p>
            </div>
          </button>
        </div>

        <!-- 對話模式 -->
        <div
          v-else
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar"
        >
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex items-start space-x-2"
            :class="{ 'justify-end': msg.isUser }"
          >
            <div
              v-if="!msg.isUser"
              class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 border-2 border-green-600"
            >
              <UserIcon class="w-5 h-5 text-white" />
            </div>

            <div
              class="p-3 shadow-sm max-w-[80%] text-sm font-medium space-y-2"
              :class="[
                msg.isUser
                  ? 'bg-green-500 text-white rounded-2xl rounded-tr-sm border-2 border-green-600'
                  : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border-2 border-gray-200',
              ]"
            >
              <div v-if="msg.text">{{ msg.text }}</div>

              <div v-for="(att, idx) in msg.attachments" :key="idx" class="space-y-1">
                <img v-if="att.kind === 'image'" :src="att.url" class="max-w-full rounded-lg border" />
                <video v-else-if="att.kind === 'video'" :src="att.url" controls class="max-w-full rounded-lg border" />
                <a
                  v-else
                  :href="att.url"
                  target="_blank"
                  rel="noopener"
                  class="underline break-all"
                >
                  {{ att.fileName || '下載檔案' }}
                </a>
              </div>
            </div>

            <div
              v-if="msg.isUser"
              class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 border-2 border-gray-400"
            >
              <UserIcon class="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div v-if="conversationId && chatMode === 'room'" class="p-4 border-t-2 border-gray-200 bg-white">
          <form class="flex items-center space-x-2" @submit.prevent="sendText">
            <input
              v-model="messageInput"
              type="text"
              :disabled="isLoading"
              placeholder="輸入訊息..."
              class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:border-green-500 focus:outline-none text-sm bg-gray-50 disabled:bg-gray-100"
            />

            <input ref="fileInput" type="file" class="hidden" @change="onPickFile" />

            <button
              type="button"
              class="p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition border-2 border-gray-400 shadow-sm"
              title="傳送附件"
              :disabled="isLoading"
              @click="pickFile"
            >
              <PaperclipIcon class="w-5 h-5" />
            </button>

            <button
              type="submit"
              :disabled="isLoading"
              class="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition border-2 border-green-700 shadow-sm active:translate-y-0.5 disabled:opacity-50"
            >
              <SendIcon class="w-5 h-5" />
            </button>
          </form>

          <p class="text-[11px] text-gray-500 mt-2">檔案上傳上限預設 25MB（後端可用 MAX_FILE_BYTES 調整）</p>
        </div>
      </div>
    </div>
  </template>

  <style scoped>
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-up { animation: slideUp 0.2s ease-out forwards; }
  </style>
