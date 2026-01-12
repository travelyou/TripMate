<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { createPost } from '@/api/discussions'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const myItineraryStore = useMyItineraryStore()

// 步驟控制
const currentStep = ref('edit') // 'edit', 'tags', 'preview'
const formError = ref('') // 通用錯誤訊息

// 表單資料
const postData = ref({
  category: '',
  title: '',
  content: '',
  tags: [],
})

// 圖片相關
const fileInputRef = ref(null)
const imagePreviews = ref([])

// 錯誤訊息欄位驗證
const errors = ref({
  category: '',
  title: '',
  content: '',
})

// 標籤搜尋
const tagSearch = ref('')

// 分類選項
const categories = [
  '有圖',
  '新貼文',
  '找旅伴',
  '找話題',
  '旅遊攻略',
  '景點推薦',
  '美食分享',
  '住宿心得',
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
  errors.value = { category: '', title: '', content: '' }
  formError.value = ''
}

// 驗證表單
const validateForm = () => {
  clearAllErrors()
  let isValid = true

  if (!postData.value.category || postData.value.category.trim() === '') {
    errors.value.category = '請選擇分類'
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

  if (!isValid) {
    formError.value = '請檢查紅色必填欄位'
  }

  return isValid
}

// 下一步
const nextStep = () => {
  if (currentStep.value === 'edit') {
    if (!validateForm()) return
    currentStep.value = 'tags'
    formError.value = ''
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

// 上一步
const prevStep = () => {
  formError.value = ''
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

    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviews.value.push(e.target.result)
    }
    reader.readAsDataURL(file)
  })

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const removeImage = (index) => {
  imagePreviews.value.splice(index, 1)
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

const handleSaveDraft = () => {
  if (!postData.value.title.trim()) {
    formError.value = '請至少輸入標題才能儲存草稿'
    return
  }

  const draftData = {
    id: Date.now(),
    type: 'discussion',
    typeLabel: '討論區',
    title: postData.value.title,
    content: postData.value.content || '無內容',
    saveTime: new Date().toISOString(),
    data: JSON.parse(
      JSON.stringify({
        ...postData.value,
        imagePreviews: imagePreviews.value,
      }),
    ),
  }

  myItineraryStore.addDraft(draftData)

  alert('📦 已儲存至「我的行程」草稿夾！')
  emit('close')
}

// 最終發布
const handleFinalSubmit = async () => {
  if (!validateForm()) return

  if (!auth.currentUser) {
    formError.value = '請先登入'
    return
  }

  try {
    const payload = {
      board: 'discussion',
      category: postData.value.category,
      title: postData.value.title,
      content: postData.value.content,
      tags: postData.value.tags,
      banner: imagePreviews.value.length > 0 ? imagePreviews.value[0] : null,
      image_urls: imagePreviews.value.slice(1),
      author_uid: auth.currentUser.uid,
    }

    console.log('發布討論貼文：', payload)

    const response = await createPost(payload)

    if (response) {
      alert('✨ 發文成功！')
      emit('success')
      emit('close')
    }
  } catch (error) {
    console.error('發文錯誤：', error)
    formError.value = '發文失敗：' + (error.message || '請稍後再試')
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary to-blue-600"
      >
        <button
          v-if="currentStep !== 'edit'"
          class="p-2 hover:bg-white/20 rounded-full transition"
          @click="prevStep"
        >
          <ArrowLeftIcon class="w-5 h-5 text-white" />
        </button>
        <div v-else class="w-9"></div>

        <h3 class="text-xl font-black text-white">
          {{
            currentStep === 'edit' ? '編輯貼文' : currentStep === 'tags' ? '添加標籤' : '預覽貼文'
          }}
        </h3>

        <button class="p-2 hover:bg-white/20 rounded-full transition" @click="emit('close')">
          <XIcon class="w-5 h-5 text-white" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div v-if="currentStep === 'edit'" class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              分類 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="postData.category"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
              :class="{ 'border-red-500': errors.category }"
            >
              <option value="" disabled selected>請選擇分類</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
            <p v-if="errors.category" class="text-red-500 text-xs mt-1">{{ errors.category }}</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              標題 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="postData.title"
              type="text"
              placeholder="輸入一個吸引人的標題..."
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
              :class="{ 'border-red-500': errors.title }"
              maxlength="100"
            />
            <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              內容 <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="postData.content"
              placeholder="分享你的旅遊經驗或提出問題..."
              rows="8"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition"
              :class="{ 'border-red-500': errors.content }"
            ></textarea>
            <p v-if="errors.content" class="text-red-500 text-xs mt-1">{{ errors.content }}</p>
          </div>

          <div v-if="imagePreviews.length > 0" class="space-y-2">
            <label class="block text-sm font-bold text-gray-700">已選擇的圖片</label>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(url, index) in imagePreviews"
                :key="index"
                class="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200"
              >
                <img :src="url" alt="預覽" class="w-full h-full object-cover" />
                <span
                  v-if="index === 0"
                  class="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded-full"
                >
                  封面
                </span>
                <button
                  class="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
                  @click="removeImage(index)"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400">
              已選擇 {{ imagePreviews.length }}/5 張圖片（第一張為封面）
            </p>
          </div>

          <button
            class="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2"
            @click="triggerFileSelect"
          >
            <ImageIcon class="w-6 h-6" />
            點擊上傳圖片
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

        <div v-else-if="currentStep === 'tags'" class="p-6 space-y-6">
          <div class="relative">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="搜尋或建立新標籤..."
              class="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <div v-if="postData.tags.length > 0">
            <h4 class="text-sm font-bold text-gray-700 mb-2">已選標籤：</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in postData.tags"
                :key="index"
                class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold border border-blue-100 flex items-center gap-1"
              >
                #{{ tag }}
                <button class="hover:text-red-500 transition" @click="removeTag(index)">
                  <XIcon class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <button
            v-if="tagSearch"
            class="w-full text-left p-3 hover:bg-blue-50 rounded-xl flex items-center gap-3 transition group"
            @click="addTag(tagSearch)"
          >
            <div
              class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition"
            >
              <span class="font-bold text-lg">+</span>
            </div>
            <p class="font-bold text-blue-600">新增「{{ tagSearch }}」</p>
          </button>

          <div>
            <h4 class="text-sm font-bold text-gray-700 mb-3">推薦標籤</h4>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tag in filteredTags"
                :key="tag"
                class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition"
                @click="addTag(tag)"
              >
                #{{ tag }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'preview'" class="bg-white h-full relative">
          <div class="p-6">
            <div class="mb-6 pb-4 border-b-2 border-primary-200">
              <div class="flex items-center space-x-3 mb-3">
                <img
                  :src="
                    userStore.currentUser?.photoURL ||
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                  "
                  class="w-10 h-10 rounded-full object-cover border-2 border-secondary-200"
                />
                <div>
                  <span class="font-bold text-secondary-800">{{
                    userStore.currentUser?.displayName || '你'
                  }}</span>
                  <div class="text-xs text-secondary-400">
                    剛剛 • {{ userStore.currentUser?.spiritAnimal || '🦁 樂天派' }}
                    <span class="text-blue-600 font-bold ml-1"> @ {{ postData.category }} </span>
                  </div>
                </div>
              </div>

              <!-- 封面圖（第一張） -->
              <div
                v-if="imagePreviews.length > 0"
                class="w-full max-h-96 object-cover rounded-lg overflow-hidden mb-4 bg-secondary-100"
              >
                <img :src="imagePreviews[0]" class="w-full h-full object-cover" alt="封面" />
              </div>

              <h4 class="text-xl font-bold text-secondary-900 mb-3">{{ postData.title }}</h4>

              <p class="text-secondary-700 text-base mb-4 leading-relaxed whitespace-pre-wrap">
                {{ postData.content }}
              </p>

              <!-- 內文圖片（第二張之後） -->
              <div v-if="imagePreviews.length > 1" class="grid grid-cols-4 gap-2 mb-4">
                <img
                  v-for="(img, idx) in imagePreviews.slice(1)"
                  :key="idx"
                  :src="img"
                  class="w-full h-20 object-cover rounded-lg border border-gray-100"
                  alt="內文圖片"
                />
              </div>

              <div class="flex flex-wrap gap-2 mb-4">
                <span
                  v-for="tag in postData.tags"
                  :key="tag"
                  class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full"
                >
                  #{{ tag }}
                </span>
              </div>

              <div
                class="flex items-center text-secondary-400 text-sm mt-4 border-t border-secondary-100 pt-3 opacity-50 cursor-not-allowed"
              >
                <div class="flex items-center space-x-1 mr-6">
                  <HeartIcon class="w-4 h-4" /> <span>0</span>
                </div>
                <div class="flex items-center space-x-1 mr-6">
                  <MessageCircleIcon class="w-4 h-4" /> <span>0 留言</span>
                </div>
                <div class="flex items-center space-x-1 mr-6">
                  <BookmarkIcon class="w-4 h-4" />
                </div>
                <div class="ml-auto">
                  <Repeat2Icon class="w-4 h-4" />
                </div>
              </div>
            </div>

            <div
              class="text-center text-secondary-400 py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200"
            >
              預覽模式無法查看留言區塊
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex flex-col gap-2 z-10">
        <p v-if="formError" class="text-red-500 font-bold text-sm text-center">{{ formError }}</p>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex items-center justify-center px-4 py-3 text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded-xl font-bold transition"
            @click="handleSaveDraft"
          >
            <SaveIcon class="w-5 h-5 mr-2" /> 暫存草稿
          </button>

          <template v-if="currentStep === 'preview'">
            <button
              class="flex-1 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
              @click="handleFinalSubmit"
            >
              <SendIcon class="w-4 h-4" />
              確認發布
            </button>
          </template>

          <button
            v-else
            class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md"
            @click="nextStep"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
