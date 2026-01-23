<script setup>
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from './MyItineraryDetailModal.vue'
import { useRouter } from 'vue-router'
import { ref, computed, onUnmounted } from 'vue'
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  ArrowLeft,
  Image as ImageIcon,
  Briefcase as BriefcaseIcon,
  Smile,
  BarChart2,
  FileVideo,
  X,
  Hash,
  MapPin,
} from 'lucide-vue-next'

const emit = defineEmits(['close', 'submit-post'])
const router = useRouter()

// --- 狀態管理 ---
const currentStep = ref('menu') // 'menu', 'edit', 'tags', 'preview'

// 發文資料
const postData = ref({
  board: '', // 看板
  title: '', // 標題
  content: '', // 內文
  tags: [], // 標籤
})

const errors = ref({
  board: '',
  title: '',
  content: '',
})

const clearError = (field) => {
  errors.value[field] = ''
}

const clearAllErrors = () => {
  errors.value = {
    board: '',
    title: '',
    content: '',
  }
}

const itineraryStore = useMyItineraryStore()

const tagSearch = ref('')

const showItineraryModal = ref(false)

const attachedItinerary = ref(null)

// 🟢 1. 行程規劃彈窗 -> 按下「儲存」 (變成正式行程)
const handleItinerarySave = (itineraryData) => {
  console.log('收到行程資料，準備存檔:', itineraryData)

  // 呼叫 Store 存入行程列表
  itineraryStore.saveItinerary(itineraryData)

  showItineraryModal.value = false
  emit('close')
  router.push({ name: 'my_itinerary' }) // 跳轉去看結果
}

// 🟢 2. 行程規劃彈窗 -> 按下「暫存草稿」
const handleItineraryDraftSave = (itineraryData) => {
  // 呼叫 Store 存入草稿
  itineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '規劃行程',
    title: itineraryData.title || '(未命名行程)',
    content: `日期: ${itineraryData.startDate || '?'} ~ ${itineraryData.endDate || '?'}`,
    rawItinerary: itineraryData,
  })

  alert('✨ 行程已存入草稿夾！')
  showItineraryModal.value = false
  emit('close')
  router.push({ name: 'my_itinerary' })
} // 🔥 注意這裡！這個大括號是用來結束 handleItineraryDraftSave 的

// 🟢 3. 發起討論/找旅伴 -> 按下「存入草稿」
// (把它搬到外面來，不要放在上面那個函式裡面)
const handleSaveDraft = () => {
  // 判斷目前的類型
  const isTraveler = postData.value.board === '找旅伴'

  // 呼叫 Store 存入草稿
  itineraryStore.addDraft({
    type: isTraveler ? 'traveler' : 'discussion',
    typeLabel: postData.value.board || '討論區',
    title: postData.value.title || '(無標題)',
    content: postData.value.content || '(無內容)',
    tags: postData.value.tags,
  })

  alert('✨ 文章已存入草稿夾！')
  emit('close')
  router.push({ name: 'my_itinerary' })
}

// 🟢 準備一個空白的行程物件，傳給組員的彈窗使用
const getBlankItinerary = () => ({
  id: null, // 設為 null，讓 Store 自己去產生 ID
  title: '',
  startDate: '',
  endDate: '',
  days: [
    { day: 1, date: '', activities: [] }, // 🟢 貼心設計：預設給他第一天，不然使用者會不知道怎麼開始
  ],
  packingList: [],
})
// --- 圖片相關狀態 ---
const fileInputRef = ref(null)
const imageFiles = ref([]) // 存儲選中的圖片文件
const imagePreviews = ref([]) // 存儲預覽 URL

// --- 模擬資料 ---
const boards = ['亞洲旅遊', '找旅伴', '窮遊省錢', '美食分享', '住宿推薦', '行程請益']
const suggestedTags = ['#北海道', '#獨旅', '#便宜機票', '#溫泉', '#滑雪']

// --- 功能邏輯 ---

// 切換到編輯模式
const startPosting = (initialBoard = '') => {
  if (initialBoard) {
    postData.value.board = initialBoard
  } else {
    postData.value.board = ''
  }
  currentStep.value = 'edit'
}

const openItineraryDirectly = () => {
  emit('close')
  router.push({ path: '/my-itinerary' })
}

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '')
  if (!postData.value.tags.includes(cleanTag)) {
    postData.value.tags.push(cleanTag)
  }
  tagSearch.value = ''
}

const removeTag = (index) => {
  postData.value.tags.splice(index, 1)
}

// --- 圖片處理函數 ---
// 選擇圖片
const handleImageSelect = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  // 限制最多 5 張圖片
  const remainingSlots = 5 - imageFiles.value.length
  const filesToAdd = files.slice(0, remainingSlots)

  filesToAdd.forEach((file) => {
    // 驗證文件類型
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} 不是有效的圖片文件`)
      return
    }

    // 驗證文件大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} 檔案太大，請選擇小於 5MB 的圖片`)
      return
    }

    imageFiles.value.push(file)

    // 創建預覽 URL
    const previewUrl = URL.createObjectURL(file)
    imagePreviews.value.push(previewUrl)
  })

  // 清空 input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 移除圖片
const removeImage = (index) => {
  // 釋放預覽 URL 的記憶體
  URL.revokeObjectURL(imagePreviews.value[index])

  imageFiles.value.splice(index, 1)
  imagePreviews.value.splice(index, 1)
}

// 觸發文件選擇
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const nextStep = () => {
  if (currentStep.value === 'edit') {
    clearAllErrors()
    const validationErrors = []
    if (!postData.value.board || postData.value.board.trim() === '') {
      errors.value.board = '還沒選擇發文看板呢寶'
      validationErrors.push('看板版')
    }
    if (!postData.value.title || postData.value.title.trim() === '') {
      errors.value.title = '寶你的標題呢'
      validationErrors.push('標標題')
    }
    if (!postData.value.content || postData.value.content.trim() === '') {
      errors.value.content = '請加上文章描述'
      validationErrors.push('還是得描述一下的')
    }

    if (validationErrors.length > 0) {
      const errorSummary = `記得喔!:${validationErrors.join('、')}`
      alert(errorSummary)
      return
    }
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

const prevStep = () => {
  if (currentStep.value === 'preview') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'edit'
  } else if (currentStep.value === 'edit') {
    currentStep.value = 'menu'
  }
}

const handleFinalSubmit = () => {
  console.log('🔵 最終發布資料:', postData.value)

  // 基本驗證
  if (!postData.value.title || !postData.value.title.trim()) {
    alert('請輸入標題')
    return
  }

  if (!postData.value.content || !postData.value.content.trim()) {
    alert('請輸入內容')
    return
  }

  if (!postData.value.board) {
    alert('請選擇看板')
    return
  }

  console.log('✅ 驗證通過，提交發文...')
  emit('submit-post', {
    ...postData.value,
    imageFiles: imageFiles.value, // 傳遞圖片文件
  })
  emit('close')
}

// 清理預覽 URL（組件卸載時）
onUnmounted(() => {
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url))
})

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((t) => t.includes(tagSearch.value))
})
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-md bg-white relative animate-pop-in flex flex-col max-h-[90vh] border-2 border-primary shadow-primary-sm"
    >
      <div v-if="currentStep === 'menu'" class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-6 text-shadow">你想發布什麼？</h3>

        <div class="space-y-4">
          <button
            class="w-full flex items-center p-4 bg-white hover:bg-primary-50 transition-transform active:translate-y-1 border-2 border-primary shadow-primary-sm"
            @click="startPosting()"
          >
            <MessageSquareIcon class="w-6 h-6 text-primary-600 mr-4" />
            <div class="text-left">
              <p class="font-bold text-secondary-900">發起討論</p>
              <p class="text-xs text-gray-700">分享經驗或尋求建議</p>
            </div>
          </button>

          <button
            class="w-full flex items-center p-4 bg-white hover:bg-primary-50 transition-transform active:translate-y-1 border-2 border-primary shadow-primary-sm"
            @click="startPosting('找旅伴')"
          >
            <UsersIcon class="w-6 h-6 text-primary-600 mr-4" />
            <div class="text-left">
              <p class="font-bold text-secondary-900">尋找旅伴</p>
              <p class="text-xs text-gray-700">找到志同道合的夥伴</p>
            </div>
          </button>

          <button
            class="w-full flex items-center p-4 bg-white hover:bg-primary-50 pixel-button border-2 border-primary-700 transition-transform active:translate-y-1"
            @click="openItineraryDirectly"
          >
            <BriefcaseIcon class="w-6 h-6 text-primary-600 mr-4" />
            <div class="text-left">
              <p class="font-bold text-secondary-900">規劃行程</p>
              <p class="text-xs text-gray-700">這周末想做什麼?</p>
            </div>
          </button>
        </div>

        <button
          class="mt-6 w-full py-2 text-sm text-gray-600 bg-gray-200 font-bold border-2 border-primary shadow-primary-sm"
          @click="$emit('close')"
        >
          取消
        </button>
      </div>

      <div v-else-if="currentStep === 'edit'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep">
              <ArrowLeft class="w-5 h-5" />
            </button>
            <span class="font-bold text-lg">發文設定</span>
          </div>
          <select
            v-model="postData.board"
            class="bg-gray-100 border-2 border-gray-400 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:border-primary-500"
            :class="errors.board ? 'border-red-500' : 'border-gray-400'"
            @change="clearError('board')"
          >
            <option value="" disabled>點此選擇發文看板 ▼</option>
            <option v-for="b in boards" :key="b" :value="b">{{ b }}</option>
          </select>
          <!-- 加入錯誤訊息 -->
          <span v-if="errors.board" class="text-red-500 text-xs font-bold ml-2">
            {{ errors.board }}
          </span>
        </div>

        <div class="p-4 flex-1 overflow-y-auto">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-full bg-gray-300 border-2 border-secondary-200 flex items-center justify-center overflow-hidden"
            >
              <UsersIcon class="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p class="font-bold text-sm">Yuan</p>
              <p class="text-xs text-gray-500">2025年12月16日</p>
            </div>
          </div>

          <input
            v-model="postData.title"
            type="text"
            placeholder="標題 (0/80)"
            class="w-full text-lg font-bold placeholder-gray-400 border-none focus:ring-0 p-0 mb-3 bg-transparent"
            :class="errors.title ? 'border-b-2 border-red-500' : ''"
            maxlength="80"
            @input="clearError('title')"
          />

          <!-- 加入錯誤訊息 -->
          <p v-if="errors.title" class="text-red-500 text-xs font-bold mb-2">
            {{ errors.title }}
          </p>

          <textarea
            v-model="postData.content"
            placeholder="請輸入你的內文..."
            class="w-full h-40 resize-none border-none focus:ring-0 p-0 text-base bg-transparent placeholder-gray-400"
            :class="errors.content ? 'border-b-2 border-red-500' : ''"
            @input="clearError('content')"
          ></textarea>

          <!-- 在 textarea 下方加入錯誤訊息 -->
          <p v-if="errors.content" class="text-red-500 text-xs font-bold mb-2">
            {{ errors.content }}
          </p>
          <div v-if="postData.board === '找旅伴' || attachedItinerary" class="mb-4">
            <div
              v-if="attachedItinerary"
              class="w-full p-3 bg-primary-50 border-2 border-primary-200 rounded-lg flex items-center justify-between"
            >
              <div class="text-sm font-bold text-primary-800">已加入行程規劃</div>
            </div>

            <button
              v-else
              class="w-full py-2 border-2 border-dashed border-gray-400 text-gray-500 font-bold rounded-lg hover:bg-gray-50 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
              @click="showItineraryModal = true"
            >
              <MapPin class="w-4 h-4" />
              ＋ 加入行程規劃
            </button>
          </div>

          <!-- 圖片預覽區 -->
          <div v-if="imagePreviews.length > 0" class="mt-4 space-y-2">
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(url, index) in imagePreviews"
                :key="index"
                class="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300"
              >
                <img :src="url" alt="預覽圖片" class="w-full h-full object-cover" />
                <button
                  class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  @click="removeImage(index)"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-500">已選擇 {{ imagePreviews.length }}/5 張圖片</p>
          </div>
        </div>

        <div class="p-3 border-t-2 border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between mb-3 px-2">
            <div class="flex gap-4 text-gray-500">
              <button
                type="button"
                class="hover:text-primary-600 transition-colors"
                @click="triggerFileSelect"
              >
                <ImageIcon class="w-6 h-6" />
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleImageSelect"
              />
              <button class="hover:text-primary-600 transition-colors">
                <FileVideo class="w-6 h-6" />
              </button>
              <button class="hover:text-primary-600 transition-colors">
                <Smile class="w-6 h-6" />
              </button>
              <button class="hover:text-primary-600 transition-colors">
                <BarChart2 class="w-6 h-6" />
              </button>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              class="flex-1 py-2 text-sm font-bold text-gray-500 pixel-button bg-white border-2 border-secondary-200"
              @click="handleSaveDraft"
            >
              存入草稿
            </button>
            <button
              class="flex-1 py-2 text-sm font-bold text-white pixel-button bg-primary-600 hover:bg-primary-700 border-2 border-primary-700"
              @click="nextStep"
            >
              下一步
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="currentStep === 'tags'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <span class="font-bold text-lg">新增標籤</span>
        </div>

        <div class="p-6 flex-1 overflow-y-auto">
          <div class="relative mb-6">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="根據文章內容搜尋相關話題..."
              class="w-full pl-10 pr-4 py-3 bg-primary-50 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-500 font-bold text-gray-700"
            />
            <Hash class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <div v-if="postData.tags.length > 0" class="mb-6">
            <h4 class="text-xs font-bold text-gray-500 mb-2">已選標籤：</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in postData.tags"
                :key="index"
                class="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-bold border border-primary-200 flex items-center gap-1"
              >
                #{{ tag }}
                <button class="hover:text-red-500" @click="removeTag(index)">
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-bold text-gray-500 mb-3">推薦話題 / 搜尋結果</h4>
            <button
              v-if="tagSearch"
              class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 mb-2 text-primary-600"
              @click="addTag(tagSearch)"
            >
              <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span class="font-bold text-lg">+</span>
              </div>
              <div>
                <p class="font-bold">新增「{{ tagSearch }}」話題</p>
              </div>
            </button>

            <div class="space-y-2">
              <button
                v-for="tag in filteredTags"
                :key="tag"
                class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 transition-colors border-b border-gray-100"
                @click="addTag(tag)"
              >
                <div
                  class="w-10 h-10 rounded-full bg-gray-200 border-2 border-secondary-200 flex items-center justify-center font-bold text-gray-600"
                >
                  #
                </div>
                <div>
                  <p class="font-bold text-gray-800">{{ tag }}</p>
                  <p class="text-xs text-gray-500">熱門討論話題</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 flex justify-end bg-gray-50 gap-3">
          <button
            class="w-full py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 border-2 border-primary shadow-primary-sm"
            @click="nextStep"
          >
            預覽文章
          </button>
        </div>
      </div>

      <div v-else-if="currentStep === 'preview'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-1 rounded" @click="prevStep">
            <ArrowLeft class="w-5 h-5" />
          </button>
          <span class="font-bold text-lg">預覽文章</span>
        </div>

        <div class="p-6 flex-1 overflow-y-auto bg-gray-50">
          <div class="bg-white p-5 border-2 border-gray-200 rounded-lg shadow-sm">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-300 border border-gray-400"></div>
                <div>
                  <p class="font-bold text-sm">Yuan</p>
                  <p class="text-xs text-gray-500">剛剛</p>
                </div>
              </div>
              <span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded font-bold">{{
                postData.board || '未分類'
              }}</span>
            </div>

            <h2 class="text-xl font-bold mb-3">{{ postData.title || '(無標題)' }}</h2>
            <p class="text-gray-700 whitespace-pre-wrap mb-4">
              {{ postData.content || '(無內容)' }}
            </p>

            <!-- 預覽圖片 -->
            <div v-if="imagePreviews.length > 0" class="mb-4">
              <div class="flex flex-wrap gap-2">
                <img
                  v-for="(url, index) in imagePreviews"
                  :key="index"
                  :src="url"
                  alt="預覽圖片"
                  class="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
                />
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span v-for="tag in postData.tags" :key="tag" class="text-primary-600 text-sm font-bold">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 bg-white flex gap-3">
          <button
            class="flex-1 py-2 text-sm font-bold text-gray-600 bg-gray-200 border-2 border-primary shadow-primary-sm"
            @click="prevStep"
          >
            返回修改
          </button>
          <button
            class="flex-1 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 border-2 border-primary shadow-primary-sm"
            @click="handleFinalSubmit"
          >
            確認發布
          </button>
        </div>
      </div>
    </div>

    <MyItineraryDetailModal
      v-if="showItineraryModal"
      :itinerary="getBlankItinerary()"
      @close="showItineraryModal = false"
      @save="handleItinerarySave"
      @save-draft="handleItineraryDraftSave"
    />
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-pop-in {
  animation: popIn 0.15s ease-out forwards;
}

.text-shadow {
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
}

/* pixel-card and pixel-button replaced by Tailwind-like classes in template */
</style>
