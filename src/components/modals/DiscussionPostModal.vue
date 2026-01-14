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
import { uploadImage, uploadMultipleImages } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const myItineraryStore = useMyItineraryStore()
const currentStep = ref('edit')
const formError = ref('')

const postData = ref({
  category: '',
  title: '',
  content: '',
  tags: [],
})

const fileInputRef = ref(null)
const imagePreviews = ref([])
const imageFiles = ref([]) // 保存原始 File 對象（用於重新上傳）
const uploadedImageUrls = ref([]) // 保存已上傳的圖片 URL
const uploadProgress = ref(0) // 上傳進度 0-100
const isUploading = ref(false) // 是否正在上傳
const submitProgress = ref(0) // 整體提交進度 0-100
const isSubmitting = ref(false) // 是否正在提交
const submitStatus = ref('') // 提交狀態文字

const errors = ref({
  category: '',
  title: '',
  content: '',
})

const tagSearch = ref('')

const categories = [
  '亞洲旅遊',
  '歐洲旅遊',
  '美洲旅遊',
  '窮遊省錢',
  '美食分享',
  '住宿推薦',
  '行程請益',
  '簽證問題',
]

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

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((tag) => tag.toLowerCase().includes(tagSearch.value.toLowerCase()))
})

const clearAllErrors = () => {
  errors.value = { category: '', title: '', content: '' }
  formError.value = ''
}

const validateForm = () => {
  console.log('🔍 [Step 1] 開始驗證表單')
  clearAllErrors()
  let isValid = true

  if (!postData.value.category || postData.value.category.trim() === '') {
    errors.value.category = '請選擇分類'
    isValid = false
    console.log('❌ [Step 1.1] 分類驗證失敗')
  } else {
    console.log('✅ [Step 1.1] 分類驗證通過:', postData.value.category)
  }

  if (!postData.value.title || postData.value.title.trim() === '') {
    errors.value.title = '請輸入標題'
    isValid = false
    console.log('❌ [Step 1.2] 標題驗證失敗')
  } else {
    console.log('✅ [Step 1.2] 標題驗證通過:', postData.value.title.substring(0, 50))
  }

  if (!postData.value.content || postData.value.content.trim() === '') {
    errors.value.content = '請輸入內容'
    isValid = false
    console.log('❌ [Step 1.3] 內容驗證失敗')
  } else {
    console.log('✅ [Step 1.3] 內容驗證通過，內容長度:', postData.value.content.length)
  }

  if (!isValid) {
    formError.value = '請檢查紅色必填欄位'
    console.log('❌ [Step 1] 表單驗證失敗')
  } else {
    console.log('✅ [Step 1] 表單驗證通過')
  }

  return isValid
}

const nextStep = () => {
  if (isUploading.value || isSubmitting.value) {
    return
  }

  if (currentStep.value === 'edit') {
    if (!validateForm()) return
    currentStep.value = 'tags'
    formError.value = ''
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

const prevStep = () => {
  formError.value = ''
  if (currentStep.value === 'preview') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'edit'
  }
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleImageSelect = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  console.log('📷 [圖片上傳] 選擇了', files.length, '張圖片')

  const remainingSlots = 5 - imagePreviews.value.length
  const filesToAdd = files.slice(0, remainingSlots)

  // 驗證文件
  const validFiles = []
  for (const file of filesToAdd) {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} 不是有效的圖片`)
      console.log('❌ [圖片上傳] 檔案類型無效:', file.name, file.type)
      continue
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} 檔案太大，請選擇小於 10MB 的圖片`)
      console.log('❌ [圖片上傳] 檔案過大:', file.name, (file.size / 1024 / 1024).toFixed(2), 'MB')
      continue
    }

    validFiles.push(file)
  }

  if (validFiles.length === 0) {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    return
  }

  // 立即上傳圖片並顯示進度
  isUploading.value = true
  uploadProgress.value = 0

  try {
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const fileIndex = imageFiles.value.length + i

      // 壓縮圖片
      submitStatus.value = `正在處理圖片 ${i + 1}/${validFiles.length}...`
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeMB: 2,
      })

      // 先顯示預覽
      const reader = new FileReader()
      reader.onload = (e) => {
        imagePreviews.value.push(e.target.result)
      }
      reader.readAsDataURL(compressedFile)

      // 上傳圖片（使用壓縮後的文件）
      submitStatus.value = `正在上傳圖片 ${i + 1}/${validFiles.length}...`
      const imageUrl = await uploadImage(
        compressedFile,
        'discussions',
        (progress) => {
          // 計算整體進度：已完成的文件 + 當前文件進度
          const baseProgress = (i / validFiles.length) * 100
          const currentFileProgress = (progress / 100) * (100 / validFiles.length)
          uploadProgress.value = Math.round(baseProgress + currentFileProgress)
          submitStatus.value = `正在上傳圖片 ${i + 1}/${validFiles.length}... ${progress}%`
        }
      )

      // 保存上傳後的 URL 和原始文件（保存壓縮後的文件）
      imageFiles.value.push(compressedFile)
      uploadedImageUrls.value.push(imageUrl)
      console.log(`✅ [圖片上傳] 第 ${i + 1} 張圖片上傳成功:`, imageUrl)
    }

    uploadProgress.value = 100
    submitStatus.value = '圖片上傳完成'
    await new Promise((resolve) => setTimeout(resolve, 500))
    submitStatus.value = ''
  } catch (error) {
    console.error('❌ [圖片上傳] 上傳失敗：', error)
    alert('圖片上傳失敗：' + error.message)
    // 移除失敗的預覽
    imagePreviews.value = imagePreviews.value.slice(0, imageFiles.value.length)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const removeImage = (index) => {
  console.log('🗑️ [圖片移除] 移除第', index + 1, '張圖片')
  imagePreviews.value.splice(index, 1)
  imageFiles.value.splice(index, 1) // 同時移除對應的 File 對象
  uploadedImageUrls.value.splice(index, 1) // 同時移除對應的 URL
}

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (cleanTag && !postData.value.tags.includes(cleanTag)) {
    postData.value.tags.push(cleanTag)
    console.log('🏷️ [標籤新增]', cleanTag, '，目前標籤數:', postData.value.tags.length)
  }
  tagSearch.value = ''
}

const removeTag = (index) => {
  const removedTag = postData.value.tags[index]
  postData.value.tags.splice(index, 1)
  console.log('🗑️ [標籤移除]', removedTag, '，剩餘標籤數:', postData.value.tags.length)
}

const handleSaveDraft = () => {
  console.log('💾 [草稿儲存] 開始儲存草稿')

  if (!postData.value.title.trim()) {
    formError.value = '請至少輸入標題才能儲存草稿'
    console.log('❌ [草稿儲存] 標題為空，無法儲存')
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
  console.log('✅ [草稿儲存] 草稿儲存成功，ID:', draftData.id)
  alert('📦 已儲存至「我的行程」草稿夾！')
  emit('close')
}

const handleFinalSubmit = async () => {
  if (isSubmitting.value) {
    return
  }

  console.log('🚀 [發文] ========== 開始發文流程 ==========')
  console.log('🚀 [發文 Step 0] 當前步驟:', currentStep.value)

  if (!validateForm()) {
    console.log('❌ [發文 Step 0] 表單驗證失敗，停止發文')
    return
  }

  console.log('🚀 [發文 Step 1] 檢查用戶登入狀態')
  if (!auth.currentUser) {
    formError.value = '請先登入'
    console.log('❌ [發文 Step 1] 用戶未登入')
    return
  }
  console.log('✅ [發文 Step 1] 用戶已登入，UID:', auth.currentUser.uid)

  isSubmitting.value = true
  submitProgress.value = 0
  submitStatus.value = '準備中...'

  try {
    console.log('🚀 [發文 Step 2] 開始上傳圖片到 Firebase Storage')

    // 上傳圖片到 Firebase Storage
    let bannerUrl = null
    let imageUrls = []

    // 使用已上傳的圖片 URL（在選擇時已上傳）
    if (uploadedImageUrls.value.length > 0) {
      submitProgress.value = 60
      submitStatus.value = '圖片已準備完成'

      // 第一張作為 banner
      bannerUrl = uploadedImageUrls.value[0]
      // 其餘作為 image_urls
      if (uploadedImageUrls.value.length > 1) {
        imageUrls = uploadedImageUrls.value.slice(1)
      }

      console.log('✅ [發文 Step 2] 使用已上傳的圖片:', { bannerUrl, imageUrls })
    } else {
      submitProgress.value = 60
      submitStatus.value = '準備提交...'
    }

    console.log('🚀 [發文 Step 3] 準備 payload')
    const payload = {
      board: 'discussion',
      category: postData.value.category,
      title: postData.value.title,
      content: postData.value.content,
      tags: postData.value.tags,
      banner: bannerUrl,
      image_urls: imageUrls,
      author_uid: auth.currentUser.uid,
    }

    console.log('✅ [發文 Step 3] Payload 準備完成')
    console.log('📊 [發文 Payload] 詳細資料:', {
      board: payload.board,
      category: payload.category,
      titleLength: payload.title.length,
      contentLength: payload.content.length,
      tagsCount: payload.tags.length,
      hasBanner: !!payload.banner,
      imageUrlsCount: payload.image_urls.length,
      author_uid: payload.author_uid,
    })

    submitProgress.value = 70
    submitStatus.value = '正在提交貼文...'
    console.log('🚀 [發文 Step 4] 調用 createPost API')
    const response = await createPost(payload)

    console.log('✅ [發文 Step 4] API 回應成功')
    console.log('📊 [發文 Response]', response)

    submitProgress.value = 100
    submitStatus.value = '發布成功！'

    if (response) {
      console.log('✅ [發文 Step 5] 發文成功！')
      // 延遲一下讓用戶看到完成狀態
      await new Promise((resolve) => setTimeout(resolve, 500))
      alert('✨ 發文成功！')
      // 重新載入頁面
      window.location.reload()
    }
  } catch (error) {
    console.error('❌ [發文 Error] ========== 發文失敗 ==========')
    console.error('❌ [發文 Error] 錯誤訊息:', error.message)
    console.error('❌ [發文 Error] 完整錯誤:', error)

    isSubmitting.value = false
    submitProgress.value = 0
    submitStatus.value = ''

    if (error.response) {
      console.error('❌ [發文 Error] HTTP 狀態:', error.response.status)
      console.error('❌ [發文 Error] 回應資料:', error.response.data)
    }

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
      :class="[
        'bg-white w-full flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all duration-300',
        currentStep === 'preview' ? 'max-w-4xl h-[90vh]' : 'max-w-2xl max-h-[90vh]',
      ]"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep !== 'edit' && currentStep !== 'preview'"
            class="p-2 hover:bg-gray-100 rounded-full transition"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-500" />
          </button>
          <h2 class="text-xl font-bold text-gray-800">
            {{ currentStep === 'preview' ? '預覽文章' : '發起討論' }}
          </h2>
        </div>
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="emit('close')">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div v-if="currentStep !== 'preview'" class="px-6 border-b border-gray-100">
        <div class="flex items-center space-x-8 text-sm font-bold overflow-x-auto">
          <div
            v-for="step in ['edit', 'tags', 'preview']"
            :key="step"
            :class="[
              'py-3 border-b-2 transition cursor-default whitespace-nowrap capitalize',
              currentStep === step
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400',
            ]"
          >
            {{ step === 'edit' ? '編輯內容' : step === 'tags' ? '標籤設定' : '預覽文章' }}
          </div>
        </div>
      </div>

      <div
        :class="[
          'flex-1 overflow-y-auto custom-scrollbar',
          currentStep === 'preview' ? 'p-0' : 'p-6 space-y-6',
        ]"
      >
        <div v-if="currentStep === 'edit'" class="space-y-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              選擇看板 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="postData.category"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition bg-white"
              :class="{ 'border-red-500': errors.category }"
            >
              <option value="" disabled selected>請選擇看板</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
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
                <button
                  class="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
                  @click="removeImage(index)"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400">已選擇 {{ imagePreviews.length }}/5 張圖片</p>
          </div>

          <!-- 上傳進度條 -->
          <div v-if="isUploading" class="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              class="bg-primary-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
              :style="{ width: uploadProgress + '%' }"
            >
              <span class="text-xs font-bold text-white">{{ uploadProgress }}%</span>
            </div>
          </div>
          <p v-if="isUploading" class="text-sm text-center text-primary-600 font-bold mb-2">
            {{ submitStatus }}
          </p>

          <button
            :disabled="isUploading"
            class="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="triggerFileSelect"
          >
            <ImageIcon class="w-6 h-6" />
            <span v-if="!isUploading">點擊上傳圖片</span>
            <span v-else>上傳中...</span>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            :disabled="isUploading"
            @change="handleImageSelect"
          />
        </div>

        <div v-else-if="currentStep === 'tags'" class="space-y-6">
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
                    <span class="text-blue-600 font-bold ml-1"> @ {{ postData.board }} </span>
                  </div>
                </div>
              </div>

              <div
                v-if="imagePreviews.length > 0"
                class="w-full max-h-96 object-cover rounded-lg overflow-hidden mb-4 bg-secondary-100"
              >
                <img :src="imagePreviews[0]" class="w-full h-full object-cover" />
              </div>

              <h4 class="text-xl font-bold text-secondary-900 mb-3">{{ postData.title }}</h4>

              <p class="text-secondary-700 text-base mb-4 leading-relaxed whitespace-pre-wrap">
                {{ postData.content }}
              </p>

              <div v-if="imagePreviews.length > 1" class="grid grid-cols-4 gap-2 mb-4">
                <img
                  v-for="(img, idx) in imagePreviews.slice(1)"
                  :key="idx"
                  :src="img"
                  class="w-full h-20 object-cover rounded-lg border border-gray-100"
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

        <!-- 提交進度條 -->
        <div v-if="isSubmitting" class="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            class="bg-primary-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
            :style="{ width: submitProgress + '%' }"
          >
            <span class="text-xs font-bold text-white">{{ submitProgress }}%</span>
          </div>
        </div>
        <p v-if="isSubmitting" class="text-sm text-center text-primary-600 font-bold">
          {{ submitStatus }}
        </p>

        <div class="flex gap-3">
          <button
            type="button"
            :disabled="isSubmitting"
            class="flex items-center justify-center px-4 py-3 text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSaveDraft"
          >
            <SaveIcon class="w-5 h-5 mr-2" /> 暫存草稿
          </button>

          <template v-if="currentStep === 'preview'">
            <button
              :disabled="isSubmitting"
              class="flex-1 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              :disabled="isSubmitting"
              class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleFinalSubmit"
            >
              <SendIcon v-if="!isSubmitting" class="w-4 h-4" />
              <span v-if="!isSubmitting">確認發布</span>
              <span v-else>發布中...</span>
            </button>
          </template>

          <button
            v-else
            :disabled="isUploading || isSubmitting"
            class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
