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
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import ImageExtension from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import CharacterCount from '@tiptap/extension-character-count'

const props = defineProps({
  draftData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const myItineraryStore = useMyItineraryStore()
const currentStep = ref('edit')
const formError = ref('')
const CHARACTER_LIMIT = 100000

const bannerPositionY = ref(50)
const isDraggingBanner = ref(false)
const dragStartY = ref(0)

const startDragBanner = (event) => {
  isDraggingBanner.value = true
  dragStartY.value = event.clientY
}

const onDragBanner = (event) => {
  if (!isDraggingBanner.value) return
  const deltaY = event.clientY - dragStartY.value
  dragStartY.value = event.clientY
  const sensitivity = 0.5
  let newPos = bannerPositionY.value - deltaY * sensitivity
  bannerPositionY.value = Math.max(0, Math.min(100, newPos))
}

const stopDragBanner = () => {
  isDraggingBanner.value = false
}

const showColorPicker = ref(false)
const commonColors = [
  '#000000',
  '#4B5563',
  '#9CA3AF',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#CA8A04',
  '#16A34A',
  '#059669',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#9333EA',
  '#ffffff',
]

const toggleColorPicker = () => {
  showColorPicker.value = !showColorPicker.value
}

const setColor = (color) => {
  editor.value.chain().focus().setColor(color).run()
  showColorPicker.value = false
}

const postData = ref({
  category: '',
  title: '',
  content: '',
  tags: [],
})

const fileInputRef = ref(null)
const editorFileInputRef = ref(null)
const imagePreviews = ref([])
const imageFiles = ref([])
const uploadedImageUrls = ref([])
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
  banner: '',
})

const tagSearch = ref('')

const ResetStyleOnEnter = Extension.create({
  name: 'resetStyleOnEnter',
  addPriority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        try {
          if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            return false
          }
          if (editor.isActive('heading', { level: 2 })) {
            const result = editor.chain().focus().splitBlock().setHeading({ level: 2 }).run()
            return result
          }
          if (editor.isActive('heading', { level: 3 })) {
            const result = editor.chain().focus().splitBlock().setHeading({ level: 3 }).run()
            return result
          }

          const result = editor.chain().focus().splitBlock().setParagraph().unsetAllMarks().run()
          return result
        } catch (error) {
          console.error('[發文編輯器的] Enter 鍵出錯了:', error)
          return false
        }
      },
    }
  },
})

const editor = useEditor({
  content: postData.value.content || '',
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
    ResetStyleOnEnter,

    CharacterCount.configure({
      limit: CHARACTER_LIMIT,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[300px] px-4 py-2 text-gray-800 text-base',
    },
  },
  onUpdate: ({ editor }) => {
    try {
      postData.value.content = editor.getHTML()
      if (errors.value.content) {
        errors.value.content = ''
      }
    } catch (error) {
      console.error('[發文編輯器的] 更新內容出錯了:', error)
    }
  },
  onCreate: ({ editor }) => {
    if (postData.value.content && postData.value.content.trim()) {
      try {
        editor.commands.setContent(postData.value.content, false)
      } catch (error) {
        console.error('[發文編輯器的] 初始化失敗:', error)
      }
    }
  },
})

const setFontKai = () => {
  if (editor.value) {
    editor.value.chain().focus().setFontFamily('BiauKai, DFKai-SB, 標楷體').run()
  }
}

const triggerEditorImageUpload = () => {
  editorFileInputRef.value?.click()
}

const handleEditorImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const compressedFile = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    })

    const imageUrl = await uploadImage(compressedFile, 'discussions')

    if (imageUrl && editor.value) {
      editor.value.chain().focus().setImage({ src: imageUrl }).run()
    }
  } catch (error) {
    alert('圖片插入失敗：' + error.message)
  }

  event.target.value = ''
}

watch(
  () => postData.value.content,
  (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
      try {
        // 只在编辑器为空且有新内容时才设置
        if (editor.value.getText().trim() === '' && newContent) {
          editor.value.commands.setContent(newContent, false)
        }
      } catch (error) {
        console.error('[编辑器] 内容同步错误:', error)
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
  errors.value = { category: '', title: '', content: '', tags: '', banner: '' }
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
    errors.value.title = `標題不能超過 35 字（目前 ${postData.value.title.trim().length} 字）`
    isValid = false
  }

  // 驗證內容（使用富文本編輯器的HTML內容）
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''

  if (!textContent || textContent.trim() === '') {
    if (!postData.value.content.includes('<img')) {
      errors.value.content = '請輸入內容'
      isValid = false
    }
  }

  // 檢查字數限制（使用編輯器的字符計數）
  if (editor.value && editor.value.storage.characterCount.characters() > CHARACTER_LIMIT) {
    errors.value.content = `內容不能超過 ${CHARACTER_LIMIT} 字（目前 ${editor.value.storage.characterCount.characters()} 字）`
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
    errors.value.tags = `標籤數量不能超過 5 個（目前 ${postData.value.tags.length} 個）`
    return errors.value.tags
  }

  for (let i = 0; i < postData.value.tags.length; i++) {
    const tag = postData.value.tags[i]
    if (tag && tag.trim().length > 30) {
      errors.value.tags = `第 ${i + 1} 個標籤不能超過 30 字（目前 ${tag.trim().length} 字）`
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

const triggerFileSelect = () => {
  // 如果已經達到上限或正在上傳，不觸發文件選擇
  if (imagePreviews.value.length >= 1 || isUploading.value) {
    return
  }
  fileInputRef.value?.click()
}

const handleImageSelect = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  // 如果已經達到上限，直接返回
  if (imagePreviews.value.length >= 1) {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    return
  }

  console.log('[圖片上傳] 選擇了', files.length, '張圖片')

  const remainingSlots = 1 - imagePreviews.value.length
  const filesToAdd = files.slice(0, remainingSlots)

  // 驗證文件
  const validFiles = []
  for (const file of filesToAdd) {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} 不是有效的圖片`)
      console.log('[圖片上傳] 檔案類型無效:', file.name, file.type)
      continue
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} 檔案太大，請選擇小於 10MB 的圖片`)
      console.log('[圖片上傳] 檔案過大:', file.name, (file.size / 1024 / 1024).toFixed(2), 'MB')
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
  if (errors.value.banner) errors.value.banner = ''
  // 如果是第一張圖片，初始化 bannerPositionY
  if (imagePreviews.value.length === 0) {
    bannerPositionY.value = 50
  }

  try {
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

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
      console.log(`[圖片上傳] 第 ${i + 1} 張圖片上傳成功:`, imageUrl)
    }

    uploadProgress.value = 100
    submitStatus.value = '圖片上傳完成'
    await new Promise((resolve) => setTimeout(resolve, 500))
    submitStatus.value = ''
  } catch (error) {
    console.error('[圖片上傳] 上傳失敗：', error)
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
  console.log('[圖片移除] 移除第', index + 1, '張圖片')
  imagePreviews.value.splice(index, 1)
  imageFiles.value.splice(index, 1) // 同時移除對應的 File 對象
  uploadedImageUrls.value.splice(index, 1) // 同時移除對應的 URL
  // 如果移除的是第一張圖片，重置 bannerPositionY
  if (index === 0 && imagePreviews.value.length > 0) {
    bannerPositionY.value = 50
  } else if (imagePreviews.value.length === 0) {
    bannerPositionY.value = 50
  }
}

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (!cleanTag) {
    tagSearch.value = ''
    return
  }

  if (cleanTag.length > 30) {
    errors.value.tags = `標籤不能超過 30 字（目前 ${cleanTag.length} 字）`
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
  console.log('[標籤新增]', cleanTag, '，目前標籤數:', postData.value.tags.length)
  tagSearch.value = ''
}

const removeTag = (index) => {
  const removedTag = postData.value.tags[index]
  postData.value.tags.splice(index, 1)
  errors.value.tags = ''
  console.log('[標籤移除]', removedTag, '，剩餘標籤數:', postData.value.tags.length)
}

watch(
  () => postData.value.title,
  () => {
    if (errors.value.title) {
      errors.value.title = ''
    }
  },
)

watch(
  () => tagSearch.value,
  () => {
    if (errors.value.tags) {
      errors.value.tags = ''
    }
  },
)

watch(
  () => postData.value.content,
  () => {
    if (errors.value.content && postData.value.content) {
      errors.value.content = ''
    }
  },
)

const handleSaveDraft = () => {
  console.log('[草稿儲存] 開始儲存草稿')

  if (!postData.value.title.trim()) {
    formError.value = '請至少輸入標題才能儲存草稿'
    console.log('[草稿儲存] 標題為空，無法儲存')
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
  console.log('[草稿儲存] 草稿儲存成功，ID:', draftData.id)
  alert('已儲存至「個人檔案」草稿夾！')
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
    const shouldClose = confirm('貼文正在提交中，確定要關閉嗎？')
    if (shouldClose) {
      sessionStorage.removeItem('is_submitting_discussion_post')
      sessionStorage.removeItem('submit_start_time')
      emit('close')
    }
    return
  }

  if (hasContent.value) {
    const shouldSave = confirm('您有未完成的內容，是否要儲存到草稿夾？\n\n點擊「確定」儲存草稿並關閉\n點擊「取消」僅關閉不儲存')
    if (shouldSave) {
      if (postData.value.title.trim()) {
        handleSaveDraft()
      } else {
        alert('請至少輸入標題才能儲存草稿')
        const stillClose = confirm('是否仍要關閉？')
        if (stillClose) {
          emit('close')
        }
      }
    } else {
      const confirmClose = confirm('確定要關閉嗎？未儲存的內容將會遺失。')
      if (confirmClose) {
        emit('close')
      }
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
    console.log('[發文] ========== 開始發文流程 ==========')
    console.log('[發文 Step 2] 開始上傳圖片到 Firebase Storage')

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

      console.log('[發文 Step 2] 使用已上傳的圖片:', { bannerUrl, imageUrls })
    } else {
      submitProgress.value = 60
      submitStatus.value = '準備提交...'
    }

    console.log('[發文 Step 3] 準備 payload')
    const payload = {
      board: 'discussion',
      category: postData.value.category,
      title: postData.value.title,
      content: postData.value.content,
      tags: postData.value.tags,
      banner: bannerUrl,
      banner_position_y: imagePreviews.value.length > 0 ? Math.round(bannerPositionY.value) : undefined,
      image_urls: imageUrls,
      author_uid: auth.currentUser.uid,
    }

    console.log('[發文 Step 3] Payload 準備完成')
    console.log('[發文 Payload] 詳細資料:', {
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
    console.log('[發文 Step 4] 調用 createPost API')
    const response = await createPost(payload)

    console.log('[發文 Step 4] API 回應成功')
    console.log('[發文 Response]', response)

    submitProgress.value = 100
    submitStatus.value = '發布成功！'

    if (response) {
      console.log('[發文 Step 5] 發文成功！')
      sessionStorage.removeItem('is_submitting_discussion_post')
      sessionStorage.removeItem('submit_start_time')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('發文成功！', {
          body: '您的貼文已成功發布',
          icon: '/favicon.ico',
        })
      } else {
        alert('發文成功！')
      }
      window.location.reload()
    }
  } catch (error) {
    console.error('[發文 Error] ========== 發文失敗 ==========')
    console.error('[發文 Error] 錯誤訊息:', error.message)
    console.error('[發文 Error] 完整錯誤:', error)

    sessionStorage.removeItem('is_submitting_discussion_post')
    sessionStorage.removeItem('submit_start_time')

    isSubmitting.value = false
    submitProgress.value = 0
    submitStatus.value = ''

    if (error.response) {
      console.error('[發文 Error] HTTP 狀態:', error.response.status)
      console.error('[發文 Error] 回應資料:', error.response.data)
    }

    const errorMessage = '發文失敗：' + (error.message || '請稍後再試')

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('發文失敗', {
        body: errorMessage,
        icon: '/favicon.ico',
      })
    } else {
      alert(errorMessage)
    }
  }
}

const handleFinalSubmit = async () => {
  if (isSubmitting.value) {
    return
  }

  console.log('[發文] ========== 開始發文流程 ==========')
  console.log('[發文 Step 0] 當前步驟:', currentStep.value)

  if (!validateForm()) {
    console.log('[發文 Step 0] 表單驗證失敗，停止發文')
    return
  }

  console.log('[發文 Step 1] 檢查用戶登入狀態')
  if (!auth.currentUser) {
    formError.value = '請先登入'
    console.log('[發文 Step 1] 用戶未登入')
    return
  }
  console.log('[發文 Step 1] 用戶已登入，UID:', auth.currentUser.uid)

  // 立即關閉模態框
  emit('close')

  // 設置提交標記
  sessionStorage.setItem('is_submitting_discussion_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())

  // 在後台執行提交
  executeSubmit()
}

// 監聽草稿數據，當有草稿時載入到表單
watch(() => props.draftData, (newDraft) => {
  if (newDraft && newDraft.data) {
    const draft = newDraft.data
    postData.value.category = draft.category || ''
    postData.value.title = draft.title || ''
    postData.value.content = draft.content || ''
    postData.value.tags = draft.tags || []

    // 如果有圖片預覽數據
    if (draft.imagePreviews && Array.isArray(draft.imagePreviews)) {
      imagePreviews.value = draft.imagePreviews
    }
  }
}, { immediate: true })

onMounted(() => {
  // 如果有草稿數據，載入到表單
  if (props.draftData && props.draftData.data) {
    const draft = props.draftData.data
    postData.value.category = draft.category || ''
    postData.value.title = draft.title || ''
    postData.value.content = draft.content || ''
    postData.value.tags = draft.tags || []

    if (draft.imagePreviews && Array.isArray(draft.imagePreviews)) {
      imagePreviews.value = draft.imagePreviews
    }
  }

  // 監聽頁面卸載事件，提示用戶
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting.value || sessionStorage.getItem('is_submitting_discussion_post')) {
      e.preventDefault()
      e.returnValue = '貼文正在提交中，確定要離開嗎？'
      return e.returnValue
    }
  })

  // 請求通知權限
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

            <div class="space-y-2">
              <label class="block text-sm font-bold text-gray-700"
                >封面圖片 <span class="text-red-500">*</span></label
              >
              <div v-if="imagePreviews.length > 0" class="flex flex-wrap gap-3 mb-2">
                <div
                  v-for="(url, index) in imagePreviews"
                  :key="index"
                  class="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group cursor-move select-none"
                  @mousedown.prevent="startDragBanner"
                  @mousemove="onDragBanner"
                  @mouseup="stopDragBanner"
                  @mouseleave="stopDragBanner"
                >
                  <img
                    :src="url"
                    alt="預覽"
                    class="w-full h-full object-cover pointer-events-none"
                    :style="{ objectPosition: `center ${bannerPositionY}%` }"
                  />
                  <div
                    class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  >
                    上下拖曳調整位置
                  </div>
                  <button
                    class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
                    @click.stop="removeImage(index)"
                  >
                    <XIcon class="w-5 h-5" />
                  </button>
                </div>
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
              :class="{ 'border-red-500 text-red-500 bg-red-50': errors.banner }"
              @click="triggerFileSelect"
            >
              <ImageIcon class="w-6 h-6" />
              <span v-if="!isUploading && imagePreviews.length < 1">上傳封面圖片</span>
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
            <p v-if="errors.banner" class="text-red-500 text-xs mt-1">{{ errors.banner }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">內容</label>
              <span
                v-if="editor"
                class="text-xs"
                :class="{
                  'text-gray-400':
                    editor.storage.characterCount.characters() < CHARACTER_LIMIT * 0.9,
                  'text-orange-500 font-bold':
                    editor.storage.characterCount.characters() >= CHARACTER_LIMIT * 0.9 &&
                    editor.storage.characterCount.characters() < CHARACTER_LIMIT,
                  'text-red-500 font-bold':
                    editor.storage.characterCount.characters() >= CHARACTER_LIMIT,
                }"
              >
                {{ editor.storage.characterCount.characters() }} / {{ CHARACTER_LIMIT }}
              </span>
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
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 2 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="標題 (H2)"
                  @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                >
                  <Heading2Icon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 3 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="標題 (H3)"
                  @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                >
                  <Heading3Icon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('bold') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="粗體"
                  @click="editor.chain().focus().toggleBold().run()"
                >
                  <BoldIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('italic') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="斜體"
                  @click="editor.chain().focus().toggleItalic().run()"
                >
                  <ItalicIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('underline') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="底線"
                  @click="editor.chain().focus().toggleUnderline().run()"
                >
                  <UnderlineIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('strike') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="刪除線"
                  @click="editor.chain().focus().toggleStrike().run()"
                >
                  <StrikethroughIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'left' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="靠左"
                  @click="editor.chain().focus().setTextAlign('left').run()"
                >
                  <AlignLeftIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'center' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="置中"
                  @click="editor.chain().focus().setTextAlign('center').run()"
                >
                  <AlignCenterIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <div class="relative">
                  <button
                    class="p-2 rounded hover:bg-gray-200 transition text-gray-600 flex items-center"
                    title="文字顏色"
                    @click="toggleColorPicker"
                  >
                    <PaletteIcon class="w-4 h-4" />
                    <div
                      class="w-2 h-2 rounded-full ml-1 border border-gray-300"
                      :style="{
                        backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                      }"
                    ></div>
                  </button>
                  <div
                    v-if="showColorPicker"
                    class="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 grid grid-cols-4 gap-2 z-50 w-40"
                  >
                    <button
                      v-for="color in commonColors"
                      :key="color"
                      class="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition shadow-sm"
                      :style="{ backgroundColor: color }"
                      :title="color"
                      @click="setColor(color)"
                    ></button>
                  </div>
                  <div
                    v-if="showColorPicker"
                    class="fixed inset-0 z-40"
                    @click="showColorPicker = false"
                  ></div>
                </div>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="分隔線"
                  @click="editor.chain().focus().setHorizontalRule().run()"
                >
                  <MinusIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  :class="{
                    'bg-gray-200 text-black': editor.isActive('textStyle', {
                      fontFamily: 'BiauKai, DFKai-SB, 標楷體',
                    }),
                  }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 flex items-center gap-1 transition"
                  title="標楷體"
                  @click="setFontKai"
                >
                  <TypeIcon class="w-4 h-4" /><span class="text-xs font-bold">楷</span>
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600 transition"
                  title="插入圖片"
                  @click="triggerEditorImageUpload"
                >
                  <ImageIcon class="w-4 h-4" />
                </button>
                <input
                  ref="editorFileInputRef"
                  type="file"
                  class="hidden"
                  accept="image/*"
                  @change="handleEditorImageSelect"
                />
              </div>
              <editor-content :editor="editor" class="min-h-[300px] cursor-text bg-white" />
            </div>
            <p v-if="errors.content" class="mt-1 text-sm text-red-500">{{ errors.content }}</p>
          </div>
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
                >{{ (tagSearch || '').length }}/30</span
              >
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
                >#{{ tag
                }}<button class="hover:text-red-500 transition" @click="removeTag(index)">
                  <XIcon class="w-3 h-3" /></button
              ></span>
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
              <div
                v-if="imagePreviews.length > 0"
                class="w-full max-h-[500px] object-cover rounded-lg overflow-hidden mb-4 bg-secondary-100"
              >
                <img
                  :src="imagePreviews[0]"
                  class="w-full h-full object-cover"
                  :style="{ objectPosition: `center ${bannerPositionY}%` }"
                />
              </div>
              <h4 class="text-2xl font-bold text-secondary-900 mb-3">{{ postData.title }}</h4>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div
                class="text-secondary-700 text-base mb-4 leading-relaxed prose prose-lg max-w-none"
                v-html="postData.content"
              ></div>
              <div class="flex flex-wrap gap-2 mb-4">
                <span
                  v-for="tag in postData.tags"
                  :key="tag"
                  class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full"
                  >#{{ tag }}</span
                >
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
                <div class="flex items-center space-x-1 mr-6"><BookmarkIcon class="w-4 h-4" /></div>
                <div class="ml-auto"><Repeat2Icon class="w-4 h-4" /></div>
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

:deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  line-height: 1.5;
  font-size: 16px;
}

:deep(.ProseMirror p) {
  margin: 0 !important;
  padding: 0;
  min-height: 1.5em;
}

:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 !important;
  line-height: 1.2;
  color: #111827;
}

:deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 !important;
  line-height: 1.2;
  color: #1f2937;
}

:deep(.ProseMirror strong) {
  font-weight: bold !important;
}

:deep(.ProseMirror em) {
  font-style: italic !important;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
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
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  margin-left: 0;
  margin-right: auto;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1em 0;
}

:deep(.ProseMirror [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
