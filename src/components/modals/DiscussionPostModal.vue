<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Send as SendIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { createPost } from '@/api/posts'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

// 步驟控制
const currentStep = ref('edit') // 'edit', 'tags', 'preview'

// 表單資料
const postData = ref({
  board: '',
  title: '',
  content: '',
  tags: [],
  images: [], // 圖片的 base64 或 URL
})

// 圖片相關
const fileInputRef = ref(null)
const imagePreviews = ref([])

// 錯誤訊息
const errors = ref({
  board: '',
  title: '',
  content: '',
})

// 標籤搜尋
const tagSearch = ref('')

// 模擬看板列表
const boards = [
  '亞洲旅遊',
  '歐洲旅遊',
  '美洲旅遊',
  '窮遊省錢',
  '美食分享',
  '住宿推薦',
  '行程請益',
  '簽證問題',
]

// 推薦標籤
const suggestedTags = [
  '日本',
  '韓國',
  '泰國',
  '獨旅',
  '便宜機票',
  '溫泉',
  '滑雪',
  '美食',
  '拍照',
  '購物',
]

// 過濾標籤
const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((tag) => tag.toLowerCase().includes(tagSearch.value.toLowerCase()))
})

// 清除錯誤
const clearAllErrors = () => {
  errors.value = { board: '', title: '', content: '' }
}

// 驗證表單
const validateForm = () => {
  clearAllErrors()
  let isValid = true

  if (!postData.value.board || postData.value.board.trim() === '') {
    errors.value.board = '請選擇看板'
    isValid = false
  }

  if (!postData.value.title || postData.value.title.trim() === '') {
    errors.value.title = '請輸入標題'
    isValid = false
  }

  if (!postData.value.content || postData.value.content.trim() === '') {
    errors.value.content = '請輸入內容'
    isValid = false
  }

  return isValid
}

// 下一步
const nextStep = () => {
  if (currentStep.value === 'edit') {
    if (!validateForm()) {
      alert('請完整填寫表單')
      return
    }
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value === 'preview') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'edit'
  }
}

// 圖片處理
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleImageSelect = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  const remainingSlots = 5 - imagePreviews.value.length
  const filesToAdd = files.slice(0, remainingSlots)

  filesToAdd.forEach((file) => {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} 不是有效的圖片`)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} 檔案太大，請選擇小於 5MB 的圖片`)
      return
    }

    // 轉換為 base64
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviews.value.push(e.target.result)
      postData.value.images.push(e.target.result)
    }
    reader.readAsDataURL(file)
  })

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const removeImage = (index) => {
  imagePreviews.value.splice(index, 1)
  postData.value.images.splice(index, 1)
}

// 標籤處理
const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (cleanTag && !postData.value.tags.includes(cleanTag)) {
    postData.value.tags.push(cleanTag)
  }
  tagSearch.value = ''
}

const removeTag = (index) => {
  postData.value.tags.splice(index, 1)
}

// 最終發布
const handleFinalSubmit = async () => {
  if (!validateForm()) {
    alert('請完整填寫表單')
    return
  }

  if (!auth.currentUser) {
    alert('請先登入')
    return
  }

  try {
    const payload = {
      board: postData.value.board,
      title: postData.value.title,
      content: postData.value.content,
      tags: postData.value.tags,
      images: postData.value.images,
      author_uid: auth.currentUser.uid,
      author_name: userStore.currentUser?.displayName || '匿名',
      author_avatar:
        userStore.currentUser?.photoURL ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    }

    console.log('發布討論貼文：', payload)

    const response = await createPost(payload)

    if (response.success) {
      alert('✨ 發文成功！')
      emit('success')
    } else {
      alert('發文失敗：' + (response.message || '請稍後再試'))
    }
  } catch (error) {
    console.error('發文錯誤：', error)
    alert('發文失敗：' + (error.message || '請稍後再試'))
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-4 border-gray-800 rounded-xl animate-pop-in"
    >
      <!-- Step 1: 編輯內容 -->
      <div v-if="currentStep === 'edit'" class="flex flex-col h-full">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b-4 border-gray-800 bg-gradient-to-r from-blue-100 to-indigo-100"
        >
          <h2 class="text-2xl font-black text-gray-800">發起討論</h2>
          <button
            class="p-2 hover:bg-white/80 rounded-full transition border-2 border-gray-800 bg-white"
            @click="emit('close')"
          >
            <XIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- 選擇看板 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              選擇看板 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="postData.board"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold"
              :class="{ 'border-red-500': errors.board }"
            >
              <option value="">請選擇看板</option>
              <option v-for="board in boards" :key="board" :value="board">
                {{ board }}
              </option>
            </select>
            <p v-if="errors.board" class="text-red-500 text-xs mt-1">{{ errors.board }}</p>
          </div>

          <!-- 標題 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              標題 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="postData.title"
              type="text"
              placeholder="輸入一個吸引人的標題..."
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold"
              :class="{ 'border-red-500': errors.title }"
              maxlength="100"
            />
            <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
          </div>

          <!-- 內容 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              內容 <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="postData.content"
              placeholder="分享你的旅遊經驗或提出問題..."
              rows="8"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              :class="{ 'border-red-500': errors.content }"
            ></textarea>
            <p v-if="errors.content" class="text-red-500 text-xs mt-1">{{ errors.content }}</p>
          </div>

          <!-- 圖片預覽 -->
          <div v-if="imagePreviews.length > 0" class="space-y-2">
            <label class="block text-sm font-bold text-gray-700">已選擇的圖片</label>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(url, index) in imagePreviews"
                :key="index"
                class="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300"
              >
                <img :src="url" alt="預覽" class="w-full h-full object-cover" />
                <button
                  class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  @click="removeImage(index)"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-500">已選擇 {{ imagePreviews.length }}/5 張圖片</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t-2 border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between mb-3">
            <button
              class="p-2 hover:bg-gray-200 rounded-full transition"
              @click="triggerFileSelect"
            >
              <ImageIcon class="w-6 h-6 text-gray-600" />
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleImageSelect"
            />
          </div>

          <div class="flex gap-3">
            <button
              class="flex-1 py-3 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg border-4 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]"
              @click="nextStep"
            >
              下一步
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: 新增標籤 -->
      <div v-else-if="currentStep === 'tags'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-2 rounded-full" @click="prevStep">
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <span class="font-bold text-lg">新增標籤</span>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <!-- 搜尋標籤 -->
          <div class="relative mb-6">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="搜尋或建立新標籤..."
              class="w-full pl-10 pr-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 font-bold"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <!-- 已選標籤 -->
          <div v-if="postData.tags.length > 0" class="mb-6">
            <h4 class="text-sm font-bold text-gray-700 mb-2">已選標籤：</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in postData.tags"
                :key="index"
                class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border-2 border-blue-300 flex items-center gap-1"
              >
                #{{ tag }}
                <button class="hover:text-red-500" @click="removeTag(index)">
                  <XIcon class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- 建立新標籤 -->
          <button
            v-if="tagSearch"
            class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 mb-4 border-2 border-dashed border-blue-300"
            @click="addTag(tagSearch)"
          >
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span class="font-bold text-lg text-blue-600">+</span>
            </div>
            <div>
              <p class="font-bold text-blue-600">新增「{{ tagSearch }}」</p>
            </div>
          </button>

          <!-- 推薦標籤 -->
          <div>
            <h4 class="text-sm font-bold text-gray-700 mb-3">推薦標籤</h4>
            <div class="space-y-2">
              <button
                v-for="tag in filteredTags"
                :key="tag"
                class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 border-b border-gray-100"
                @click="addTag(tag)"
              >
                <div
                  class="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-800 flex items-center justify-center font-bold"
                >
                  #
                </div>
                <div>
                  <p class="font-bold text-gray-800">{{ tag }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 bg-gray-50">
          <button
            class="w-full py-3 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg border-4 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]"
            @click="nextStep"
          >
            預覽文章
          </button>
        </div>
      </div>

      <!-- Step 3: 預覽 -->
      <div v-else-if="currentStep === 'preview'" class="flex flex-col h-full">
        <div class="p-4 border-b-2 border-gray-200 flex items-center gap-2">
          <button class="hover:bg-gray-200 p-2 rounded-full" @click="prevStep">
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <span class="font-bold text-lg">預覽文章</span>
        </div>

        <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div class="bg-white p-5 border-2 border-gray-200 rounded-lg shadow-sm">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-300 border-2 border-gray-400"></div>
                <div>
                  <p class="font-bold text-sm">{{ userStore.currentUser?.displayName || '你' }}</p>
                  <p class="text-xs text-gray-500">剛剛</p>
                </div>
              </div>
              <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">
                {{ postData.board }}
              </span>
            </div>

            <h2 class="text-xl font-bold mb-3">{{ postData.title }}</h2>
            <p class="text-gray-700 whitespace-pre-wrap mb-4">{{ postData.content }}</p>

            <!-- 預覽圖片 -->
            <div v-if="imagePreviews.length > 0" class="mb-4 flex flex-wrap gap-2">
              <img
                v-for="(url, index) in imagePreviews"
                :key="index"
                :src="url"
                alt="預覽"
                class="w-24 h-24 rounded-lg object-cover border-2 border-gray-300"
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <span v-for="tag in postData.tags" :key="tag" class="text-blue-500 text-sm font-bold">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-gray-200 bg-white flex gap-3">
          <button
            class="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-200 rounded-lg border-4 border-gray-800"
            @click="prevStep"
          >
            返回修改
          </button>
          <button
            class="flex-1 py-3 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg border-4 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]"
            @click="handleFinalSubmit"
          >
            <SendIcon class="w-4 h-4 inline mr-2" />
            確認發布
          </button>
        </div>
      </div>
    </div>
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
</style>
