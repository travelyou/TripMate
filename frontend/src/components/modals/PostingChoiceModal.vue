<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  Briefcase as BriefcaseIcon,
  MapPin as MapPinIcon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { useEscapeKey } from '@/composables/useEscapeKey'

const emit = defineEmits(['close', 'open-discussion', 'open-traveler', 'submit-post'])

const router = useRouter()
const itineraryStore = useMyItineraryStore()

const imageFiles = ref([])
const imagePreviews = ref([])
const fileInputRef = ref(null)

const suggestedTags = ref([
  '台灣',
  '日本',
  '韓國',
  '泰國',
  '歐洲',
  '美國',
  '自由行',
  '跟團',
  '背包客',
  '美食',
  '攝影',
  '購物',
])

const currentStep = ref('menu')

const postData = ref({
  board: '',
  title: '',
  content: '',
  tags: [],
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

const tagSearch = ref('')

const showItineraryModal = ref(false)

const attachedItinerary = ref(null)

// eslint-disable-next-line no-unused-vars
const handleItinerarySave = (itineraryData) => {
  itineraryStore.saveItinerary(itineraryData)
  showItineraryModal.value = false
  cleanupPreviews()
  emit('close')
  router.push({ name: 'my_itinerary' })
}

// eslint-disable-next-line no-unused-vars
const handleItineraryDraftSave = (itineraryData) => {
  itineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '規劃行程',
    title: itineraryData.title || '(未命名行程)',
    content: `日期: ${itineraryData.startDate || '?'} ~ ${itineraryData.endDate || '?'}`,
    rawItinerary: itineraryData,
  })
  alert('✨ 行程已存入草稿夾！')
  showItineraryModal.value = false
  cleanupPreviews()
  emit('close')
  router.push({ name: 'my_itinerary' })
}

// eslint-disable-next-line no-unused-vars
const handleSaveDraft = () => {
  const isTraveler = postData.value.board === '找旅伴'
  itineraryStore.addDraft({
    type: isTraveler ? 'traveler' : 'discussion',
    typeLabel: postData.value.board || '討論區',
    title: postData.value.title || '(無標題)',
    content: postData.value.content || '(無內容)',
    tags: postData.value.tags,
  })
  alert('✨ 文章已存入草稿夾！')
  cleanupPreviews()
}

// eslint-disable-next-line no-unused-vars
const handleOpenDiscussion = () => {
  emit('close')
  emit('open-discussion')
}

const openItineraryDirectly = () => {
  cleanupPreviews()
  emit('close')
  router.push({ name: 'my_itinerary' })
}

// eslint-disable-next-line no-unused-vars
const handleOpenTraveler = () => {
  emit('close')
  emit('open-traveler')
}

const startPosting = (board = '') => {
  if (board) {
    postData.value.board = board
  }
  currentStep.value = 'edit'
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

// eslint-disable-next-line no-unused-vars
const handleImageSelect = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  const remainingSlots = 5 - imageFiles.value.length
  const filesToAdd = files.slice(0, remainingSlots)

  filesToAdd.forEach((file) => {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} 不是有效的圖片文件`)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} 檔案太大，請選擇小於 5MB 的圖片`)
      return
    }

    imageFiles.value.push(file)
    const previewUrl = URL.createObjectURL(file)
    imagePreviews.value.push(previewUrl)
  })

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// eslint-disable-next-line no-unused-vars
const removeImage = (index) => {
  URL.revokeObjectURL(imagePreviews.value[index])
  imageFiles.value.splice(index, 1)
  imagePreviews.value.splice(index, 1)
}

// eslint-disable-next-line no-unused-vars
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const nextStep = () => {
  if (currentStep.value === 'edit') {
    clearAllErrors()
    let hasError = false

    if (!postData.value.board || postData.value.board.trim() === '') {
      errors.value.board = '請選擇發文看板'
      hasError = true
    }
    if (!postData.value.title || postData.value.title.trim() === '') {
      errors.value.title = '請輸入標題'
      hasError = true
    }
    if (!postData.value.content || postData.value.content.trim() === '') {
      errors.value.content = '請輸入文章內容'
      hasError = true
    }

    if (hasError) {
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

  emit('submit-post', {
    ...postData.value,
    imageFiles: imageFiles.value,
  })
  cleanupPreviews()
  emit('close')
}

const cleanupPreviews = () => {
  imagePreviews.value.forEach((url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  imagePreviews.value = []
  imageFiles.value = []
}

const handleClose = () => {
  cleanupPreviews()
  emit('close')
}

useEscapeKey(() => {
  handleClose()
})

onUnmounted(() => {
  cleanupPreviews()
})

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags.value
  return suggestedTags.value.filter((t) => t.includes(tagSearch.value))
})
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

      <!-- 編輯步驟 -->
      <div v-if="currentStep === 'edit'" class="p-4 flex-1 overflow-y-auto">
        <div class="flex items-center gap-3 mb-6">
          <div
            class="w-10 h-10 rounded-full bg-gray-300 border-2 border-secondary-200 flex items-center justify-center overflow-hidden"
          >
            <UsersIcon class="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p class="font-bold text-sm text-gray-800">Yuan</p>
            <p class="text-xs text-gray-500">2025年12月16日</p>
          </div>
        </div>

        <div class="mb-4">
          <label for="postTitle" class="sr-only">標題</label>
          <input
            v-model="postData.title"
            type="text"
            placeholder="標題 (0/80)"
            class="w-full text-lg font-bold text-black placeholder-gray-400 border-none focus:ring-0 p-0 bg-transparent transition-colors"
            :class="errors.title ? 'border-b-2 border-red-500 mb-2' : 'mb-3'"
            maxlength="80"
            id="postTitle"
            name="postTitle"
            @input="clearError('title')"
          />
          <div
            v-if="errors.title"
            class="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-2 flex items-start gap-2 animate-in fade-in duration-200"
          >
            <AlertCircleIcon class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p class="text-red-700 text-xs font-bold flex-1 leading-relaxed">
              {{ errors.title }}
            </p>
          </div>
        </div>

        <div class="mb-4">
          <label for="postContent" class="sr-only">文章內容</label>
          <textarea
            v-model="postData.content"
            placeholder="請輸入你的內文..."
            class="w-full h-40 resize-none border-none focus:ring-0 p-0 text-base text-black bg-transparent placeholder-gray-400 transition-colors"
            :class="errors.content ? 'border-b-2 border-red-500 mb-2' : ''"
            id="postContent"
            name="postContent"
            @input="clearError('content')"
          ></textarea>
          <div
            v-if="errors.content"
            class="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-2 flex items-start gap-2 animate-in fade-in duration-200 mt-2"
          >
            <AlertCircleIcon class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p class="text-red-700 text-xs font-bold flex-1 leading-relaxed">
              {{ errors.content }}
            </p>
          </div>
        </div>
        <div v-if="postData.board === '找旅伴' || attachedItinerary" class="mb-6">
          <div
            v-if="attachedItinerary"
            class="w-full p-3 bg-primary-50 border-2 border-primary-200 rounded-lg flex items-center justify-between"
          >
            <div class="text-sm font-bold text-primary-800">已加入行程規劃</div>
          </div>

          <button
            v-else
            class="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-50 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            @click="showItineraryModal = true"
          >
            <MapPinIcon class="w-4 h-4" />
            ＋ 加入行程規劃
          </button>
        </div>

        <div class="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            class="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
            @click="prevStep"
          >
            返回
          </button>
          <button
            class="flex-1 py-2 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition"
            @click="nextStep"
          >
            下一步
          </button>
        </div>
      </div>

      <!-- 標籤步驟 -->
      <div v-if="currentStep === 'tags'" class="p-4 flex-1 overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">選擇標籤</h3>
        <label for="tagSearch" class="sr-only">搜尋標籤</label>
        <input
          v-model="tagSearch"
          type="text"
          placeholder="搜尋標籤..."
          class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg mb-4"
          id="tagSearch"
          name="tagSearch"
        />
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="tag in filteredTags"
            :key="tag"
            class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-primary-500 hover:text-white transition"
            @click="addTag(tag)"
          >
            #{{ tag }}
          </button>
        </div>
        <div v-if="postData.tags.length > 0" class="mb-4">
          <p class="text-sm font-bold mb-2">已選擇的標籤：</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(tag, index) in postData.tags"
              :key="index"
              class="px-3 py-1 bg-primary-500 text-white rounded-full flex items-center gap-2"
            >
              #{{ tag }}
              <button class="text-white hover:text-red-200" @click="removeTag(index)">
                ×
              </button>
            </span>
          </div>
        </div>
        <div class="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            class="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
            @click="prevStep"
          >
            返回
          </button>
          <button
            class="flex-1 py-2.5 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition"
            @click="nextStep"
          >
            下一步
          </button>
        </div>
      </div>

      <!-- 預覽步驟 -->
      <div v-if="currentStep === 'preview'" class="p-4 flex-1 overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-4">預覽</h3>
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <p class="font-bold text-lg mb-2">{{ postData.title || '(無標題)' }}</p>
          <p class="text-gray-700 mb-4">{{ postData.content || '(無內容)' }}</p>
          <div v-if="postData.tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="(tag, index) in postData.tags"
              :key="index"
              class="px-2 py-1 bg-primary-500 text-white rounded text-sm"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
        <div class="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            class="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
            @click="prevStep"
          >
            返回
          </button>
          <button
            class="flex-1 py-2.5 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition shadow-md"
            @click="handleFinalSubmit"
          >
            發布
          </button>
        </div>
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
