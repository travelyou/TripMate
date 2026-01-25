<script setup>
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  Briefcase as BriefcaseIcon,
  X as XIcon,
} from 'lucide-vue-next'

// 定義 Emit，讓父層知道要開哪個視窗
const emit = defineEmits(['close', 'open-discussion', 'open-traveler'])

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
  cleanupPreviews() // 清理 blob URL
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
  cleanupPreviews() // 清理 blob URL
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
  cleanupPreviews() // 清理 blob URL
// 1. 發起討論：通知父層開啟「討論區發文彈窗」
const handleOpenDiscussion = () => {
  emit('close')
  emit('open-discussion')
}

const openItineraryDirectly = () => {
  cleanupPreviews() // 清理 blob URL
// 2. 尋找旅伴：通知父層開啟「找旅伴發文彈窗」
const handleOpenTraveler = () => {
  emit('close')
  emit('open-traveler')
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
  cleanupPreviews() // 清理 blob URL
  emit('close')
}

// 清理所有預覽 URL
const cleanupPreviews = () => {
  imagePreviews.value.forEach((url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  imagePreviews.value = []
  imageFiles.value = []
}

// 處理關閉 Modal（包含清理）
const handleClose = () => {
  cleanupPreviews()
  emit('close')
}

// 清理預覽 URL（組件卸載時）
onUnmounted(() => {
  cleanupPreviews()
})

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((t) => t.includes(tagSearch.value))
})
// (移除 handleOpenItinerary 函式，因為我們改用 template 直接跳轉)
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div
      class="w-full max-w-sm bg-white relative animate-pop-in flex flex-col rounded-2xl shadow-xl overflow-hidden mx-4"
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
          @click="handleClose"
        >
          取消
        </button>
      </div>

      <div class="p-4 space-y-3">
        <button
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
          @click="handleOpenDiscussion"
        >
          <div
            class="p-3 bg-blue-100 text-blue-600 rounded-full mr-4 group-hover:bg-blue-500 group-hover:text-white transition-colors"
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
            class="w-full text-lg font-bold text-black placeholder-gray-400 border-none focus:ring-0 p-0 mb-3 bg-transparent"
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
            class="w-full h-40 resize-none border-none focus:ring-0 p-0 text-base text-black bg-transparent placeholder-gray-400"
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
            <MessageSquareIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
              發起討論
            </p>
            <p class="text-xs text-gray-500">分享經驗或尋求建議</p>
          </div>
        </button>

        <button
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm hover:shadow-md"
          @click="handleOpenTraveler"
        >
          <div
            class="p-3 bg-green-100 text-green-600 rounded-full mr-4 group-hover:bg-green-500 group-hover:text-white transition-colors"
          >
            <UsersIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-green-700 transition-colors">
              尋找旅伴
            </p>
            <p class="text-xs text-gray-500">找到志同道合的夥伴</p>
          </div>
        </button>

        <RouterLink
          :to="{ name: 'my_itinerary' }"
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group shadow-sm hover:shadow-md"
          @click="$emit('close')"
        >
          <div
            class="p-3 bg-purple-100 text-purple-600 rounded-full mr-4 group-hover:bg-purple-500 group-hover:text-white transition-colors"
          >
            <BriefcaseIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
              規劃行程
            </p>
            <p class="text-xs text-gray-500">這周末想做什麼?</p>
          </div>
        </RouterLink>
      </div>

      <div class="p-3 bg-gray-50 border-t border-gray-100">
        <button
          class="w-full py-2 text-sm text-gray-500 font-bold hover:text-gray-700 transition"
          @click="$emit('close')"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-pop-in {
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
