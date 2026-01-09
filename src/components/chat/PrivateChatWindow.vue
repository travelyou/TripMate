<script setup>
  import { ref, nextTick, onMounted, onUnmounted } from 'vue'
  import { X as XIcon, Send as SendIcon, User as UserIcon, Paperclip as PaperclipIcon } from 'lucide-vue-next'
  import { auth } from '@/firebase/config'
  import { createOrGetDm, getMessages, sendMessage as sendChatMessage, markRead } from '@/api/chat'
  import { uploadAnyFile } from '@/api/storage'

  defineEmits(['close'])

  // TODO：把這個換成「另一個帳號」的 uid（不能跟自己一樣）
  const OTHER_UID = 'SHt45rZ9WGcRtbozk8easqEphJf1'

  const messageInput = ref('')
  const messagesContainer = ref(null)
  const fileInput = ref(null)

  const myUid = ref(null)
  const conversationId = ref(null)
  const isLoading = ref(false)

  const messages = ref([]) // {id, text, isUser, attachments[]}
  let pollTimer = null

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

  async function refreshMessages() {
    if (!conversationId.value || !myUid.value) return
    const { messages: rows } = await getMessages(conversationId.value, myUid.value, null, 50)
    messages.value = rows.map(normalizeMsg)

    const last = rows[rows.length - 1]
    if (last?.id) {
      await markRead(conversationId.value, { uid: myUid.value, lastReadMessageId: last.id })
    }
    scrollToBottom()
  }

  async function initDm() {
    const u = auth.currentUser?.uid
    if (!u) {
      alert('請先登入後再使用聊天室')
      return
    }
    myUid.value = u

    if (!OTHER_UID || OTHER_UID === myUid.value) {
      alert('請把 OTHER_UID 換成「另一個帳號」的 uid（不能跟自己一樣）')
      return
    }

    const { conversation } = await createOrGetDm(myUid.value, OTHER_UID)
    conversationId.value = conversation.id

    await refreshMessages()

    // 先用輪詢簡單做即時（之後要更即時再改 websocket）
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => {
      refreshMessages().catch(() => {})
    }, 1500)
  }

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
    } finally {
      isLoading.value = false
    }
  }

  const pickFile = () => {
    fileInput.value?.click?.()
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允許同檔案重選
    if (!file || !conversationId.value || !myUid.value) return

    isLoading.value = true
    try {
      // 上傳到 /api/files（檔案本體存 Neon）
      const { publicUrl } = await uploadAnyFile(file, 'chat', `conversations/${conversationId.value}`)

      const kind = file.type?.startsWith('image/')
        ? 'image'
        : file.type?.startsWith('video/')
          ? 'video'
          : 'file'

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
    } catch (err) {
      alert('上傳/送出失敗：' + (err?.message || err))
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    initDm().catch((e) => alert('初始化聊天室失敗：' + (e?.message || e)))
  })

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer)
  })
  </script>

  <template>
    <div
      class="fixed bottom-20 md:bottom-24 right-2 md:right-8 w-[calc(100vw-1rem)] md:w-96 max-w-md h-[calc(100vh-5rem)] md:h-[600px] max-h-[600px] bg-white border-4 border-amber-700 shadow-[4px_4px_0px_0px_rgba(139,111,71,0.3)] z-50 flex flex-col animate-slide-up"
    >
      <div class="bg-green-300 text-amber-900 p-4 flex items-center justify-between border-b-4 border-green-400">
        <div class="flex items-center space-x-3">
          <div>
            <h3 class="font-bold text-lg">私人聊天</h3>
            <p class="text-xs opacity-80">DM：{{ conversationId || '未建立' }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="p-1 hover:bg-green-400 rounded-full transition">
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
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

      <div class="p-4 border-t-2 border-gray-200 bg-white">
        <form @submit.prevent="sendText" class="flex items-center space-x-2">
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
            :disabled="isLoading"
            @click="pickFile"
            class="p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition border-2 border-gray-400 shadow-sm"
            title="傳送附件"
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

        <p class="text-[11px] text-gray-500 mt-2">
          檔案上傳上限預設 25MB（後端可用 MAX_FILE_BYTES 調整）
        </p>
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
