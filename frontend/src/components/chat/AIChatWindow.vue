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

// 引入設定檔 (請確保您的 aiConfig.js 已改為使用 gemini-pro)
import { GEMINI_MODEL_NAME, TRIPMATE_SYSTEM_PROMPT } from '@/config/aiConfig'
import { searchFeatureLocations, searchDiscussionPosts } from '@/api/AiPrompt'

defineEmits(['close'])

const messageInput = ref('')
const messagesContainer = ref(null)
const isLoading = ref(false)

// 初始化變數
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
let chat = null

// 初始化聊天室函數 (相容性修正版：解決 404 與 SDK 版本問題)
const initChat = async () => {
  if (!apiKey) {
    console.error('❌ 沒有 VITE_GEMINI_API_KEY ！')
    return
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    // 1. 獲取模型 (使用設定檔中的名稱，建議先用 'gemini-pro')
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL_NAME,
    })

    // 2. 使用 history 來注入您的 50 題業務規則
    // 這種寫法對所有版本的 Gemini 模型都通用，不會報錯
    chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: TRIPMATE_SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: '收到，我是 TripMate 小幫手，我已熟讀所有業務規則，請隨時問我！' }],
        },
      ],
    })
    console.log(`✅ AI 初始化成功，使用模型: ${GEMINI_MODEL_NAME}`)
  } catch (error) {
    console.error('❌ AI 初始化失敗:', error)
  }
}

// 執行初始化
initChat()

// 預設歡迎訊息

const messages = ref([
  {
    id: 1,
    type: 'bot',
    content: `
      <p>您好！我是 <b>TripMate 小幫手</b> 🐬</p>
      <p>我可以回答您關於<b>旅遊規劃</b>與<b>網站操作</b>的相關問題。</p>
      <p class="mt-2">請問有什麼我可以幫您的嗎？</p>
    `,
  },
])

const sendMessage = async () => {
  const text = messageInput.value.trim()
  if (!text || isLoading.value) return

  // 1. 加入使用者訊息到畫面
  messages.value.push({
    id: Date.now(),
    type: 'user',
    content: text,
  })

  const currentInput = text
  messageInput.value = ''
  isLoading.value = true
  scrollToBottom()

  // 確保聊天室已初始化
  if (!chat) {
    await initChat()
    if (!chat) {
      messages.value.push({
        id: Date.now() + 1,
        type: 'bot',
        content: '⚠️ 系統連線異常，請檢查 API Key 設定。',
      })
      isLoading.value = false
      return
    }
  }

  try {
    // 2. 檢查是否需要查詢功能位置
    const featureKeywords = [
      '在哪裡', '哪裡', '如何', '怎麼', '功能', '頁面', '位置', '找到',
      '討論區', '找旅伴', '行程', '個人', '購物車', '訂單', '收藏', '配對',
      '滑卡', '許願池', '護照', '聊天', '好友', '發文', '貼文'
    ]
    
    const needsFeatureSearch = featureKeywords.some(keyword => 
      currentInput.toLowerCase().includes(keyword)
    )

    // 2.5. 檢查是否需要搜尋文章
    const searchKeywords = [
      '有沒有', '有沒有相關', '有沒有關於', '搜尋', '找', '查', '相關的文', '相關文章',
      '相關貼文', '相關討論', '關於', '的討論', '的文章', '的貼文'
    ]
    
    const needsPostSearch = searchKeywords.some(keyword => 
      currentInput.toLowerCase().includes(keyword)
    )

    let enhancedInput = currentInput
    let featureContext = ''
    let postSearchContext = ''

    // 如果問題可能涉及功能位置，先查詢相關功能
    if (needsFeatureSearch) {
      try {
        const features = await searchFeatureLocations(currentInput)
        if (features && features.length > 0) {
          featureContext = '\n\n【相關功能位置資訊】\n'
          features.forEach(feature => {
            featureContext += `* **${feature.feature_name_zh}** (${feature.category})：${feature.description}\n`
            featureContext += `  - 路徑：${feature.route_path}\n`
            if (feature.keywords && feature.keywords.length > 0) {
              featureContext += `  - 關鍵字：${feature.keywords.join(', ')}\n`
            }
          })
          featureContext += '\n請根據以上資訊指引使用者找到相關功能。'
        }
      } catch (error) {
        console.warn('[AI Chat] 查詢功能位置失敗，繼續使用原始問題:', error)
      }
    }

    // 如果問題可能涉及搜尋文章，先搜尋相關文章
    if (needsPostSearch) {
      try {
        // 從問題中提取搜尋關鍵字（移除搜尋相關的詞彙）
        const searchQuery = currentInput
          .replace(/有沒有|有沒有相關|有沒有關於|搜尋|找|查|相關的|關於|的討論|的文章|的貼文/gi, '')
          .trim()
        
        if (searchQuery) {
          const posts = await searchDiscussionPosts(searchQuery, 5)
          if (posts && posts.length > 0) {
            postSearchContext = '\n\n【搜尋到的相關文章】\n'
            posts.forEach((post, index) => {
              postSearchContext += `${index + 1}. **${post.title}**\n`
              postSearchContext += `   - 分類：${post.category || '未分類'}\n`
              postSearchContext += `   - 作者：${post.author_name || '匿名'}\n`
              postSearchContext += `   - 內容預覽：${(post.content || '').substring(0, 100)}${post.content && post.content.length > 100 ? '...' : ''}\n`
              if (post.tags && post.tags.length > 0) {
                postSearchContext += `   - 標籤：${post.tags.join(', ')}\n`
              }
              postSearchContext += `   - 連結：/discussion/${post.id}\n\n`
            })
            postSearchContext += '請根據以上搜尋結果回答使用者，並提供文章連結。如果沒有找到相關文章，請告訴使用者。'
          } else {
            postSearchContext = '\n\n【搜尋結果】\n目前沒有找到相關的文章。請告訴使用者沒有找到相關內容，並建議他們可以到討論區發文詢問。'
          }
        }
      } catch (error) {
        console.warn('[AI Chat] 搜尋文章失敗，繼續使用原始問題:', error)
      }
    }

    // 3. 將功能位置資訊和文章搜尋結果加入問題中
    enhancedInput = currentInput + featureContext + postSearchContext

    // 4. 呼叫 AI API
    const result = await chat.sendMessage(enhancedInput)
    const responseText = result.response.text()

    // 5. 轉 HTML 並消毒
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

    // 錯誤判斷
    if (error.message?.includes('API key')) {
      errorMessage = '⚠️ API Key 無效或已過期'
    } else if (error.message?.includes('404')) {
      errorMessage = '⚠️ 找不到模型，請檢查 aiConfig.js 中的模型名稱'
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
    class="fixed inset-0 w-full h-full max-w-none max-h-none border-0 bg-white z-50 flex flex-col rounded-none overflow-hidden animate-slide-up lg:inset-auto lg:bottom-4 lg:right-[80px] lg:w-80 lg:max-w-80 lg:h-[480px] lg:max-h-[480px] lg:border-4 lg:border-primary-600 lg:shadow-primary-strong lg:rounded-xl"
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
