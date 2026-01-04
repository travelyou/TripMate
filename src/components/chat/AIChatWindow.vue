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

// 1. 引入剛剛建立的設定檔
import { GEMINI_MODEL_NAME, TRIPMATE_SYSTEM_PROMPT } from '@/config/aiConfig'

defineEmits(['close'])

const messageInput = ref('')
const messagesContainer = ref(null)
const isLoading = ref(false)

// 2. 初始化 Google AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })

const chat = model.startChat({
  history: TRIPMATE_SYSTEM_PROMPT,
})

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

  messages.value.push({
    id: Date.now(),
    type: 'user',
    content: text,
  })

  messageInput.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const result = await chat.sendMessage(text)
    const responseText = result.response.text()
    const htmlContent = marked(responseText)

    messages.value.push({
      id: Date.now() + 1,
      type: 'bot',
      content: htmlContent,
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

<template></template>
