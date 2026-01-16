<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Type as TypeIcon,
  Minus as MinusIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  Palette as PaletteIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { createPost } from '@/api/discussions'
import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'

// --- Tiptap 相關引入 ---
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core' // 引入 Extension 用於自定義功能
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import ImageExtension from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style' // 修正：使用具名匯出
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'

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
const editorFileInputRef = ref(null) // 內文圖片上傳專用
const imagePreviews = ref([])
const imageFiles = ref([]) // 保存原始 File 對象
const uploadedImageUrls = ref([]) // 保存已上傳的圖片 URL
const uploadProgress = ref(0)
const isUploading = ref(false)
const submitProgress = ref(0)
const isSubmitting = ref(false)
const submitStatus = ref('')

const errors = ref({
  category: '',
  title: '',
  content: '',
  tags: '',
})

const tagSearch = ref('')

// --- 自定義擴充：換行後重置樣式 ---
const ResetStyleOnEnter = Extension.create({
  name: 'resetStyleOnEnter',
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // 1. 如果在清單(List)中，保留預設行為(新增項目)
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return false
        }

        // 2. 如果是標題或有格式，按下 Enter 後：強制換行 -> 變回段落 -> 清除所有樣式(粗體/顏色等)
        return editor.chain().splitBlock().setParagraph().unsetAllMarks().run()
      },
    }
  },
})

// --- Tiptap 編輯器設定 ---
const editor = useEditor({
  content: postData.value.content,
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    FontFamily,
    Color,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    ImageExtension.configure({
      inline: true,
      allowBase64: true,
    }),
    ResetStyleOnEnter, // 加入自定義擴充
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[300px] px-4 py-2 max-w-none', // max-w-none 讓內容撐滿寬度
    },
  },
  onUpdate: ({ editor }) => {
    postData.value.content = editor.getHTML()
    if (errors.value.content) {
      errors.value.content = ''
    }
  },
})

// 設定標楷體 (修正：移除字串中的雙引號)
const setFontKai = () => {
  if (editor.value) {
    editor.value.chain().focus().setFontFamily('BiauKai, DFKai-SB, 標楷體').run()
  }
}

// 觸發內文圖片選擇
const triggerEditorImageUpload = () => {
  editorFileInputRef.value?.click()
}

// 處理內文圖片上傳
const handleEditorImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const compressedFile = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    })

    const imageUrl = await uploadImage(compressedFile, 'discussions', (progress) => {
      console.log(`內文圖片上傳: ${progress}%`)
    })

    if (imageUrl && editor.value) {
      editor.value.chain().focus().setImage({ src: imageUrl }).run()
    }
  } catch (error) {
    console.error('內文圖片插入失敗', error)
    alert('圖片插入失敗：' + error.message)
  }

  event.target.value = ''
}

watch(
  () => postData.value.content,
  (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
      if (editor.value.getText().trim() === '' && newContent) {
        editor.value.commands.setContent(newContent)
      }
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

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
  errors.value = { category: '', title: '', content: '', tags: '' }
  formError.value = ''
}

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
  } else if (postData.value.title.trim().length > 35) {
    errors.value.title = `標題不能超過 35 字`
    isValid = false
  }

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  if (!textContent || textContent.trim() === '') {
    if (!postData.value.content.includes('<img')) {
      errors.value.content = '請輸入內容'
      isValid = false
    }
  }

  if (postData.value.content.length > 20000) {
    errors.value.content = `內容過長`
    isValid = false
  }

  if (!isValid) {
    formError.value = '請檢查紅色必填欄位'
  }

  return isValid
}

const validateTags = () => {
  errors.value.tags = ''
  if (!postData.value.tags || postData.value.tags.length === 0) {
    return ''
  }

  if (postData.value.tags.length > 5) {
    errors.value.tags = `標籤數量不能超過 5 個`
    return errors.value.tags
  }

  for (let i = 0; i < postData.value.tags.length; i++) {
    const tag = postData.value.tags[i]
    if (tag && tag.trim().length > 30) {
      errors.value.tags = `第 ${i + 1} 個標籤不能超過 30 字`
      return errors.value.tags
    }
  }

  return ''
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
    const error = validateTags()
    if (error) {
      formError.value = error
      return
    }
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

// 底部封面圖片邏輯 (限制 1 張)
const triggerFileSelect = () => {
  if (imagePreviews.value.length >= 1 || isUploading.value) {
    return
  }
  fileInputRef.value?.click()
}

const handleImageSelect = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  // 限制 1 張
  if (imagePreviews.value.length >= 1) {
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }

  const file = files[0] // 只取第一張

  if (!file.type.startsWith('image/')) {
    alert(`${file.name} 不是有效的圖片`)
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert(`${file.name} 檔案太大，請選擇小於 10MB 的圖片`)
    return
  }

  isUploading.value = true
  uploadProgress.value = 0

  try {
    submitStatus.value = `正在處理圖片...`
    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeMB: 2,
    })

    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviews.value.push(e.target.result)
    }
    reader.readAsDataURL(compressedFile)

    submitStatus.value = `正在上傳圖片...`
    const imageUrl = await uploadImage(compressedFile, 'discussions', (progress) => {
      uploadProgress.value = progress
      submitStatus.value = `正在上傳圖片... ${progress}%`
    })

    imageFiles.value.push(compressedFile)
    uploadedImageUrls.value.push(imageUrl)

    uploadProgress.value = 100
    submitStatus.value = '圖片上傳完成'
    await new Promise((resolve) => setTimeout(resolve, 500))
    submitStatus.value = ''
  } catch (error) {
    console.error('[圖片上傳] 上傳失敗：', error)
    alert('圖片上傳失敗：' + error.message)
    imagePreviews.value = [] // 清空預覽
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const removeImage = (index) => {
  imagePreviews.value.splice(index, 1)
  imageFiles.value.splice(index, 1)
  uploadedImageUrls.value.splice(index, 1)
}

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (!cleanTag) {
    tagSearch.value = ''
    return
  }
  if (cleanTag.length > 30) {
    errors.value.tags = `標籤不能超過 30 字`
    return
  }
  if (postData.value.tags.length >= 5) {
    errors.value.tags = '標籤數量不能超過 5 個'
    return
  }
  if (postData.value.tags.includes(cleanTag)) {
    tagSearch.value = ''
    return
  }
  errors.value.tags = ''
  postData.value.tags.push(cleanTag)
  tagSearch.value = ''
}

const removeTag = (index) => {
  postData.value.tags.splice(index, 1)
  errors.value.tags = ''
}

watch(
  () => postData.value.title,
  () => {
    if (errors.value.title) errors.value.title = ''
  },
)

watch(
  () => tagSearch.value,
  () => {
    if (errors.value.tags) errors.value.tags = ''
  },
)

watch(
  () => postData.value.content,
  () => {
    if (errors.value.content && postData.value.content) errors.value.content = ''
  },
)

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
    data: JSON.parse(JSON.stringify({ ...postData.value, imagePreviews: imagePreviews.value })),
  }
  myItineraryStore.addDraft(draftData)
  alert('已儲存至「我的行程」草稿夾！')
  emit('close')
}

const hasContent = computed(() => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  return (
    postData.value.title.trim() ||
    textContent.trim() ||
    postData.value.tags.length > 0 ||
    uploadedImageUrls.value.length > 0 ||
    imagePreviews.value.length > 0 ||
    postData.value.content.includes('<img')
  )
})

const handleClose = () => {
  if (isSubmitting.value || sessionStorage.getItem('is_submitting_discussion_post')) {
    if (confirm('貼文正在提交中，確定要關閉嗎？')) {
      sessionStorage.removeItem('is_submitting_discussion_post')
      sessionStorage.removeItem('submit_start_time')
      emit('close')
    }
    return
  }

  if (hasContent.value) {
    if (
      confirm(
        '您有未完成的內容，是否要儲存到草稿夾？\n\n點擊「確定」儲存草稿並關閉\n點擊「取消」僅關閉不儲存',
      )
    ) {
      if (postData.value.title.trim()) {
        handleSaveDraft()
      } else {
        alert('請至少輸入標題才能儲存草稿')
        if (confirm('是否仍要關閉？')) emit('close')
      }
    } else {
      if (confirm('確定要關閉嗎？未儲存的內容將會遺失。')) emit('close')
    }
  } else {
    emit('close')
  }
}

const executeSubmit = async () => {
  isSubmitting.value = true
  submitProgress.value = 0
  submitStatus.value = '準備中...'

  try {
    let bannerUrl = null
    let imageUrls = []

    if (uploadedImageUrls.value.length > 0) {
      submitProgress.value = 60
      submitStatus.value = '圖片已準備完成'
      bannerUrl = uploadedImageUrls.value[0]
      // 雖然現在限制一張，但保留陣列結構以防萬一
      if (uploadedImageUrls.value.length > 1) {
        imageUrls = uploadedImageUrls.value.slice(1)
      }
    }

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

    submitProgress.value = 70
    submitStatus.value = '正在提交貼文...'
    const response = await createPost(payload)

    submitProgress.value = 100
    submitStatus.value = '發布成功！'

    if (response) {
      sessionStorage.removeItem('is_submitting_discussion_post')
      sessionStorage.removeItem('submit_start_time')
      window.location.reload()
    }
  } catch (error) {
    sessionStorage.removeItem('is_submitting_discussion_post')
    sessionStorage.removeItem('submit_start_time')
    isSubmitting.value = false
    submitProgress.value = 0
    submitStatus.value = ''
    alert('發文失敗：' + (error.message || '請稍後再試'))
  }
}

const handleFinalSubmit = async () => {
  if (isSubmitting.value) return
  if (!validateForm()) return
  if (!auth.currentUser) {
    formError.value = '請先登入'
    return
  }

  emit('close')
  sessionStorage.setItem('is_submitting_discussion_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())
  executeSubmit()
}

onMounted(() => {
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting.value || sessionStorage.getItem('is_submitting_discussion_post')) {
      e.preventDefault()
      e.returnValue = '貼文正在提交中，確定要離開嗎？'
    }
  })
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      :class="[
        'modal-content-container bg-white w-full flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all duration-300',
        currentStep === 'preview' ? 'max-w-5xl h-[90vh]' : 'max-w-4xl max-h-[90vh]',
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
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="handleClose">
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
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">
                標題 <span class="text-red-500">*</span>
              </label>
              <span
                :class="[
                  'text-xs',
                  postData.title.trim().length > 35 ? 'text-red-500 font-bold' : 'text-gray-400',
                ]"
              >
                {{ postData.title.trim().length }}/35
              </span>
            </div>
            <input
              v-model="postData.title"
              type="text"
              placeholder="輸入一個吸引人的標題..."
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                errors.title
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-green-500',
              ]"
              maxlength="35"
            />
            <p v-if="errors.title" class="mt-1 text-sm text-red-500">{{ errors.title }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">內容</label>
            </div>

            <div
              class="border-2 rounded-xl overflow-hidden transition flex flex-col bg-white"
              :class="
                errors.content ? 'border-red-500' : 'border-gray-200 focus-within:border-green-500'
              "
            >
              <div
                v-if="editor"
                class="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-20"
              >
                <button
                  @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 2 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="標題 (H2)"
                >
                  <Heading2Icon class="w-4 h-4" />
                </button>

                <button
                  @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 3 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="標題 (H3)"
                >
                  <Heading3Icon class="w-4 h-4" />
                </button>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <button
                  @click="editor.chain().focus().toggleBold().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('bold') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="粗體"
                >
                  <BoldIcon class="w-4 h-4" />
                </button>

                <button
                  @click="editor.chain().focus().toggleItalic().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('italic') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="斜體"
                >
                  <ItalicIcon class="w-4 h-4" />
                </button>

                <button
                  @click="editor.chain().focus().toggleUnderline().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('underline') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="底線"
                >
                  <UnderlineIcon class="w-4 h-4" />
                </button>

                <button
                  @click="editor.chain().focus().toggleStrike().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('strike') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="刪除線"
                >
                  <StrikethroughIcon class="w-4 h-4" />
                </button>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <button
                  @click="editor.chain().focus().setTextAlign('left').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'left' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="靠左"
                >
                  <AlignLeftIcon class="w-4 h-4" />
                </button>

                <button
                  @click="editor.chain().focus().setTextAlign('center').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'center' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="置中"
                >
                  <AlignCenterIcon class="w-4 h-4" />
                </button>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <div
                  class="relative flex items-center p-2 rounded hover:bg-gray-200 transition group cursor-pointer"
                  title="文字顏色"
                >
                  <PaletteIcon class="w-4 h-4 text-gray-600" />
                  <input
                    type="color"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    @input="editor.chain().focus().setColor($event.target.value).run()"
                    :value="editor.getAttributes('textStyle').color || '#000000'"
                  />
                </div>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <button
                  @click="editor.chain().focus().setHorizontalRule().run()"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="分隔線"
                >
                  <MinusIcon class="w-4 h-4" />
                </button>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <button
                  @click="setFontKai"
                  :class="{
                    'bg-gray-200 text-black': editor.isActive('textStyle', {
                      fontFamily: 'BiauKai, DFKai-SB, 標楷體',
                    }),
                  }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 flex items-center gap-1 transition"
                  title="標楷體"
                >
                  <TypeIcon class="w-4 h-4" />
                  <span class="text-xs font-bold">楷</span>
                </button>

                <div class="w-px h-4 bg-gray-300 mx-1"></div>

                <button
                  @click="triggerEditorImageUpload"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="插入圖片"
                >
                  <ImageIcon class="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref="editorFileInputRef"
                  class="hidden"
                  accept="image/*"
                  @change="handleEditorImageSelect"
                />
              </div>

              <editor-content :editor="editor" class="min-h-[300px] cursor-text bg-white" />
            </div>

            <p v-if="errors.content" class="mt-1 text-sm text-red-500">{{ errors.content }}</p>
          </div>
          <div v-if="imagePreviews.length > 0" class="space-y-2">
            <label class="block text-sm font-bold text-gray-700">封面圖片</label>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(url, index) in imagePreviews"
                :key="index"
                class="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group"
              >
                <img :src="url" alt="預覽" class="w-full h-full object-cover" />
                <button
                  class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
                  @click="removeImage(index)"
                >
                  <XIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400">已選擇封面圖片</p>
          </div>

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
            :disabled="isUploading || imagePreviews.length >= 1"
            class="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="triggerFileSelect"
          >
            <ImageIcon class="w-6 h-6" />
            <span v-if="!isUploading && imagePreviews.length < 1">上傳封面圖片（單張）</span>
            <span v-else-if="isUploading">上傳中...</span>
            <span v-else>已設定封面圖片</span>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="isUploading || imagePreviews.length >= 1"
            @change="handleImageSelect"
          />
        </div>

        <div v-else-if="currentStep === 'tags'" class="space-y-6">
          <div class="relative">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="輸入標籤..."
              :class="[
                'w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none',
                tagSearch && tagSearch.trim().length > 30
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-green-500',
              ]"
              maxlength="30"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            <div class="absolute right-3 top-3.5">
              <span
                :class="[
                  'text-xs',
                  tagSearch && tagSearch.trim().length > 30
                    ? 'text-red-500 font-bold'
                    : 'text-gray-400',
                ]"
              >
                {{ (tagSearch || '').length }}/30
              </span>
            </div>
            <p v-if="tagSearch && tagSearch.trim().length > 30" class="text-xs text-red-500 mt-1">
              標籤不能超過 30 字
            </p>
          </div>
          <div class="mb-2">
            <span class="text-xs text-gray-500">已選擇 {{ postData.tags.length }}/5 個標籤</span>
            <p v-if="errors.tags" class="text-xs text-red-500 mt-1">{{ errors.tags }}</p>
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
                class="w-full max-h-[500px] object-cover rounded-lg overflow-hidden mb-4 bg-secondary-100"
              >
                <img :src="imagePreviews[0]" class="w-full h-full object-cover" />
              </div>

              <h4 class="text-2xl font-bold text-secondary-900 mb-3">{{ postData.title }}</h4>

              <div
                class="text-secondary-700 text-base mb-4 leading-relaxed prose prose-lg max-w-none"
                v-html="postData.content"
              ></div>

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

/* Tiptap Editor Styles */
:deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
}

/* --- 這裡做了修改 --- */
:deep(.ProseMirror p) {
  margin-bottom: 0.2em; /* 縮小段落間距 */
  margin-top: 0;
  font-size: 1rem;
  line-height: 1.6;
}
/* ------------------ */

:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  color: #111827;
  line-height: 1.3;
}

:deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.4em;
  color: #1f2937;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em; /* 列表間距也稍微縮小 */
}

:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

:deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.5em 0; /* 圖片間距稍微縮小 */
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1.5em 0;
}

:deep(.ProseMirror [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
