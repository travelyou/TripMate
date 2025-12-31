<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { X as XIcon, Send as SendIcon, User as UserIcon } from 'lucide-vue-next'

// 定義事件：通知父層關閉視窗
defineEmits(['close'])

const messageInput = ref('')
const messagesContainer = ref(null)

// 避免訊息無限累積導致記憶體爆掉
let replyTimeoutId = null

// 假資料：預設訊息
const messages = ref([
  { id: 1, text: '歡迎來到私人聊天室！', isUser: false },
  { id: 2, text: '您可以在這裡與其他用戶進行私人對話。', isUser: false },
])


// 發送訊息的功能
const sendMessage = () => {
  const text = messageInput.value.trim()
  if (!text) return

  // 1. 加入使用者的訊息
  messages.value.push({
    id: Date.now(),
    text: text,
    isUser: true,
  })


  // 清空輸入框
  messageInput.value = ''

  // 2. 模擬對方回覆 (延遲 0.5 秒)
  if (replyTimeoutId) clearTimeout(replyTimeoutId)
  replyTimeoutId = setTimeout(() => {
    messages.value.push({
      id: Date.now() + 1,
      text: '已收到您的訊息！這是一個示範回應。',
      isUser: false,
    })

    scrollToBottom()
  }, 500)

  scrollToBottom()
}

// 自動捲動到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onUnmounted(() => {
  if (replyTimeoutId) {
    clearTimeout(replyTimeoutId)
    replyTimeoutId = null
  }
})
</script>

<template>
  <div
    class="fixed bottom-20 md:bottom-24 right-2 md:right-8 w-[calc(100vw-1rem)] md:w-96 max-w-md h-[calc(100vh-5rem)] md:h-[600px] max-h-[600px] bg-white pixel-border-thick z-50 flex flex-col animate-slide-up"
  >
    <div
      class="bg-green-300 text-amber-900 p-4 flex items-center justify-between border-b-4 border-green-400"
    >
      <div class="flex items-center space-x-3">
        <div>
          <h3 class="font-bold text-lg">私人聊天</h3>
        </div>
      </div>
      <button @click="$emit('close')" class="p-1 hover:bg-green-400 rounded-full transition">
        <XIcon class="w-6 h-6" />
      </button>
    </div>

    <div
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
          class="p-3 shadow-sm max-w-[80%] text-sm font-medium"
          :class="[
            msg.isUser
              ? 'bg-green-500 text-white rounded-2xl rounded-tr-sm border-2 border-green-600'
              : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border-2 border-gray-200',
          ]"
        >
          {{ msg.text }}
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
      <form @submit.prevent="sendMessage" class="flex items-center space-x-2">
        <input
          v-model="messageInput"
          type="text"
          placeholder="輸入訊息..."
          class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:border-green-500 focus:outline-none text-sm bg-gray-50"
        />
        <button
          type="submit"
          class="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition border-2 border-green-700 shadow-sm active:translate-y-0.5"
        >
          <SendIcon class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* 像素風格邊框 */
.pixel-border-thick {
  border: 4px solid #8b6f47;
  box-shadow: 4px 4px 0px 0px rgba(139, 111, 71, 0.3);
}

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
