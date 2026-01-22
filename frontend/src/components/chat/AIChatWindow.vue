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

// 初始化 Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
let genAI = null
let model = null
let chat = null

if (!apiKey) {
  console.error('❌ 沒有 VITE_GEMINI_API_KEY ！')
  if (import.meta.env.PROD) {
    console.error('⚠️ 生產環境：請檢查 GitHub Secrets 中的 VITE_GEMINI_API_KEY 是否已設置')
  }
}

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })
    chat = model.startChat({
      history: TRIPMATE_SYSTEM_PROMPT,
    })
    console.log('✅ AI 初始化成功，模型:', GEMINI_MODEL_NAME)
  } catch (error) {
    console.error('❌ AI 初始化失敗:', error)
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      console.error('⚠️ API Key 可能無效或過期，請檢查 GitHub Secrets')
    }
  }
}

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

  if (!chat) {
    messages.value.push({
      id: Date.now() + 1,
      type: 'bot',
      content: '聊天功能沒有成功開始',
    })
    return
  }

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
    console.error('❌ AI Error:', error)

    let errorMessage = '抱歉，我目前有點忙碌，請稍後再試一次 😵‍💫'

    // 檢查特定錯誤類型
    if (error.message?.includes('API key expired') || error.message?.includes('API_KEY_INVALID')) {
      errorMessage = '⚠️ API Key 已過期或無效，請聯繫管理員更新'
      console.error('⚠️ API Key 問題：', error.message)
      if (import.meta.env.PROD) {
        console.error('⚠️ 生產環境：請檢查 GitHub Secrets 中的 VITE_GEMINI_API_KEY')
      }
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      errorMessage = '⚠️ 模型名稱錯誤，請檢查配置'
      console.error('⚠️ 模型問題：', error.message)
    } else if (error.message?.includes('502') || error.message?.includes('Bad Gateway')) {
      errorMessage = '⚠️ 網路連線問題，請稍後再試'
      console.error('⚠️ 網路問題：', error.message)
    } else if (error.message?.includes('400')) {
      errorMessage = '⚠️ 請求格式錯誤，請稍後再試'
      console.error('⚠️ 請求錯誤：', error.message)
    }

    messages.value.push({
      id: Date.now() + 1,
      type: 'bot',
      content: errorMessage,
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
    class="fixed bottom-4 md:bottom-8 right-[80px] md:right-[96px] w-80 md:w-80 max-w-80 h-[480px] md:h-[480px] max-h-[480px] border-4 border-primary-600 shadow-primary-strong z-50 flex flex-col rounded-xl overflow-hidden animate-slide-up"
  >
    <div class="bg-primary-600 text-white p-4 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <BotIcon class="w-6 h-6" />
        <div>
          <h3 class="font-bold text-lg">TripMate 助手</h3>
          <p class="text-xs text-white font-bold opacity-80">AI 智能行程顧問</p>
        </div>
      </div>
      <button class="p-1 hover:bg-primary-600 rounded-full transition" @click="$emit('close')">
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
          class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary-700"
        >
          <BotIcon class="w-5 h-5 text-white" />
        </div>

        <div
          class="p-3 shadow-sm max-w-[85%] text-sm overflow-hidden"
          :class="[
            msg.type === 'user'
              ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm border-2 border-primary-700 font-medium'
              : 'bg-white text-secondary-800 rounded-2xl rounded-tl-sm border-2 border-secondary-100 markdown-body',
          ]"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
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
          class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary-700"
        >
          <BotIcon class="w-5 h-5 text-white" />
        </div>
        <div
          class="bg-white p-3 rounded-2xl rounded-tl-sm border-2 border-secondary-100 flex items-center space-x-1"
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
      <form class="flex items-center space-x-2" @submit.prevent="sendMessage">
        <input
          v-model="messageInput"
          type="text"
          :disabled="isLoading"
          placeholder="請問您想去哪裡玩？"
          class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:border-primary-500 focus:outline-none text-sm bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          type="submit"
          :disabled="isLoading"
          class="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition border-2 border-primary-700 shadow-sm active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LoaderIcon v-if="isLoading" class="w-5 h-5 animate-spin" />
          <SendIcon v-else class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  color: #07344c;
}
</style>
