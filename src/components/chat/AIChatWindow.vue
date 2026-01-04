<script setup>
import { ref, nextTick, onMounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Bot as BotIcon,
  User as UserIcon,
  Loader2 as LoaderIcon,
} from 'lucide-vue-next'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 引入設定檔
import { GEMINI_MODEL_NAME, TRIPMATE_SYSTEM_PROMPT } from '@/config/aiConfig'

defineEmits(['close'])

const messageInput = ref('')
const messagesContainer = ref(null)
const isLoading = ref(false)

// 初始化 Google AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })

const chat = model.startChat({
  history: TRIPMATE_SYSTEM_PROMPT,
})

// 預設歡迎訊息
const messages = ref([
  {
    id: 1,
    type: 'bot',
    content: `
      <p class="mb-2">您好！我是 TripMate 助手，很高興為您服務！</p>
      <p class="mb-2">我可以協助您：</p>
      <ul class="list-disc list-inside space-y-1 ml-1">
        <li>規劃旅遊行程</li>
        <li>推薦景點與美食</li>
        <li>解答旅遊相關問題</li>
      </ul>
      <p class="mt-2">請告訴我您需要什麼協助？</p>
    `,
  },
])

const sendMessage = async () => {
  const text = messageInput.value.trim()
  if (!text || isLoading.value) return

  // 1. 加入使用者訊息
  messages.value.push({
    id: Date.now(),
    type: 'user',
    content: text,
  })

  messageInput.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    // 2. 呼叫 AI
    const result = await chat.sendMessage(text)
    const responseText = result.response.text()

    // 3. 轉 HTML 並消毒
    const rawHtml = await marked(responseText)
    const sanitizedHtml = DOMPurify.sanitize(rawHtml)

    messages.value.push({
      id: Date.now() + 1,
      type: 'bot',
      content: sanitizedHtml,
    })
  } catch (error) {
    console.error('AI Error:', error)
    messages.value.push({
      id: Date.now() + 1,
      type: 'bot',
      content: '抱歉，我目前有點忙碌，請稍後再試一次 😵‍💫',
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div
    class="fixed bottom-20 md:bottom-24 right-2 md:right-8 w-[calc(100vw-1rem)] md:w-96 max-w-md h-[calc(100vh-5rem)] md:h-[600px] max-h-[600px] bg-white pixel-border-thick z-50 flex flex-col animate-slide-up"
  >
    <div
      class="bg-pink-300 text-amber-900 p-4 flex items-center justify-between border-b-4 border-amber-400"
    >
      <div class="flex items-center space-x-3">
        <BotIcon class="w-6 h-6" />
        <div>
          <h3 class="font-bold text-lg">TripMate 助手</h3>
          <p class="text-xs text-orange-800 font-bold opacity-80">AI 智能行程顧問</p>
        </div>
      </div>
      <button @click="$emit('close')" class="p-1 hover:bg-orange-400/50 rounded-full transition">
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
        :class="{ 'justify-end': msg.type === 'user' }"
      >
        <div
          v-if="msg.type === 'bot'"
          class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 border-2 border-orange-600"
        >
          <BotIcon class="w-5 h-5 text-white" />
        </div>

        <div
          class="p-3 shadow-sm max-w-[85%] text-sm overflow-hidden"
          :class="[
            msg.type === 'user'
              ? 'bg-orange-500 text-white rounded-2xl rounded-tr-sm border-2 border-orange-600 font-medium'
              : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border-2 border-gray-200 markdown-body',
          ]"
        >
          <div v-if="msg.type === 'bot'" v-html="msg.content"></div>
          <div v-else>{{ msg.content }}</div>
        </div>

        <div
          v-if="msg.type === 'user'"
          class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 border-2 border-gray-400"
        >
          <UserIcon class="w-5 h-5 text-gray-600" />
        </div>
      </div>

      <div v-if="isLoading" class="flex items-start space-x-2">
        <div
          class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 border-2 border-orange-600"
        >
          <BotIcon class="w-5 h-5 text-white" />
        </div>
        <div
          class="bg-white p-3 rounded-2xl rounded-tl-sm border-2 border-gray-200 flex items-center space-x-1"
        >
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style="animation-delay: 0s"
          ></div>
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style="animation-delay: 0.2s"
          ></div>
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style="animation-delay: 0.4s"
          ></div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t-2 border-gray-200 bg-white">
      <form @submit.prevent="sendMessage" class="flex items-center space-x-2">
        <input
          v-model="messageInput"
          type="text"
          :disabled="isLoading"
          placeholder="請問您想去哪裡玩？"
          class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:border-orange-500 focus:outline-none text-sm bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          :disabled="isLoading"
          class="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition border-2 border-orange-700 shadow-sm active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LoaderIcon v-if="isLoading" class="w-5 h-5 animate-spin" />
          <SendIcon v-else class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.pixel-border-thick {
  border: 4px solid #8b6f47;
  box-shadow: 4px 4px 0px 0px rgba(139, 111, 71, 0.3);
}

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

/* Markdown Styles */
.markdown-body :deep(p) {
  margin-bottom: 0.5rem;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.2rem;
  margin-bottom: 0.5rem;
  list-style-type: disc;
}
.markdown-body :deep(strong) {
  color: #d97706;
}
</style>
