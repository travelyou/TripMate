<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Type as TypeIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  Palette as PaletteIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
  AlertCircle as AlertIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useVendorStore } from '@/stores/vendor'
import { auth } from '@/firebase/config'
import { createItinerary, updateItinerary } from '@/api/itinerary'
import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'
import { showAlert, showConfirm, showError, showSuccess } from '@/utils/alert'
import DOMPurify from 'dompurify'

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
  initialData: {
    type: Object,
    default: null,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const vendorStore = useVendorStore()

const currentStep = ref('basic')
const formError = ref('')
const fieldErrors = ref({
  category: '',
  title: '',
  description: '',
  price: '',
  agencyName: '',
  max_people: '',
  start_date: '',
  end_date: '',
  location: '',
  itinerary: '',
  tags: '',
  banner: '',
})

const CHARACTER_LIMIT = 100000

// 從廠商的主打地區獲取分類選項
const categories = computed(() => {
  const defaultOption = ['未分類'] // 預設選項

  const vendor = vendorStore.currentVendor
  if (!vendor) return defaultOption

  try {
    const bannerImageData = vendor.bannerImage || vendor.banner_image || ''
    if (!bannerImageData) return defaultOption

    // 解析 JSON 字符串
    let mainRegions = []
    if (typeof bannerImageData === 'string') {
      if (bannerImageData.startsWith('[') || bannerImageData.startsWith('{')) {
        mainRegions = JSON.parse(bannerImageData)
      } else {
        return defaultOption
      }
    } else if (Array.isArray(bannerImageData)) {
      mainRegions = bannerImageData
    } else {
      return defaultOption
    }

    // 提取地區名稱
    const regionNames = mainRegions
      .filter((region) => region && region.name && region.name.trim())
      .map((region) => region.name.trim())

    // 如果有主打地區，則加上「未分類」選項；如果沒有，則只返回「未分類」
    if (regionNames.length > 0) {
      return ['未分類', ...regionNames]
    } else {
      return defaultOption
    }
  } catch (err) {
    console.error('[ItineraryPostModal] 解析主打地區失敗:', err)
    return defaultOption
  }
})

const postData = ref({
  category: '',
  title: '',
  description: '',
  price: null,
  agencyName: '',
  location: '',
  start_date: '',
  end_date: '',
  max_people: 20,
  coverImage: '',
  tags: [],
  itinerary: { days: [] },
})

const bannerPositionY = ref(50)
const isDraggingBanner = ref(false)
const dragStartY = ref(0)

const bannerPreview = ref('')
const bannerFileInput = ref(null)
const bannerFile = ref(null)
const editorFileInputRef = ref(null)
const isUploading = ref(false)
const submitProgress = ref(0)
const uploadProgress = ref(0)
const isSubmitting = ref(false)
const submitStatus = ref('')
const activeDayIndex = ref(0)

const tagSearch = ref('')

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
const toggleColorPicker = () => (showColorPicker.value = !showColorPicker.value)
const setColor = (color) => {
  editor.value.chain().focus().setColor(color).run()
  showColorPicker.value = false
}

const ResetStyleOnEnter = Extension.create({
  name: 'resetStyleOnEnter',
  addPriority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) return false
        if (editor.isActive('heading')) {
          if (editor.can().splitBlock()) {
            editor
              .chain()
              .focus()
              .splitBlock({ keepMarks: false })
              .setParagraph()
              .unsetAllMarks()
              .run()
          }
          return true
        }
        if (!editor.can().splitBlock()) return false
        return editor.chain().focus().splitBlock({ keepMarks: false }).unsetAllMarks().run()
      },
    }
  },
})

const editor = useEditor({
  content: postData.value.description,
  extensions: [
    StarterKit.configure({
      underline: false,
    }),
    Underline,
    TextStyle,
    FontFamily,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ImageExtension.configure({ inline: true, allowBase64: true }),
    ResetStyleOnEnter,
    CharacterCount.configure({ limit: CHARACTER_LIMIT }),
  ],
  editorProps: {
    attributes: { class: 'focus:outline-none min-h-[300px] px-4 py-2 text-gray-800 text-base' },
  },
  onUpdate: ({ editor }) => {
    postData.value.description = editor.getHTML()
    if (fieldErrors.value.description) fieldErrors.value.description = ''
  },
})

const setFontKai = () => {
  if (editor.value) editor.value.chain().focus().setFontFamily('BiauKai, DFKai-SB, 標楷體').run()
}

const triggerEditorImageUpload = () => editorFileInputRef.value?.click()
const handleEditorImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  try {
    const compressedFile = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    })
    const imageUrl = await uploadImage(compressedFile, 'itineraries')
    if (imageUrl && editor.value) editor.value.chain().focus().setImage({ src: imageUrl }).run()
  } catch (error) {
    await showAlert('圖片插入失敗：' + error.message)
  }
  event.target.value = ''
}

watch(
  () => postData.value.description,
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

const triggerBannerSelect = () => bannerFileInput.value?.click()

const handleBannerSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('圖片大小不能超過 10MB')
    return
  }
  try {
    isUploading.value = true
    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeMB: 2,
    })
    bannerFile.value = compressedFile
    const reader = new FileReader()
    reader.onload = (e) => (bannerPreview.value = e.target.result)
    reader.readAsDataURL(compressedFile)
  } catch (error) {
    alert('圖片處理失敗：' + error.message)
  } finally {
    isUploading.value = false
  }
}

const removeBanner = () => {
  bannerPreview.value = ''
  bannerFile.value = null
  postData.value.coverImage = ''
  bannerPositionY.value = 50
}


const validateBasic = () => {
  formError.value = ''
  Object.keys(fieldErrors.value).forEach((key) => (fieldErrors.value[key] = ''))

  let hasError = false

  if (!postData.value.category) {
    fieldErrors.value.category = '請選擇主打地區'
    hasError = true
  }
  if (!postData.value.title.trim()) {
    fieldErrors.value.title = '請輸入標題'
    hasError = true
  }

  if (!bannerPreview.value && !postData.value.coverImage) {
    fieldErrors.value.banner = '請上傳封面圖片'
    hasError = true
  }

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.description
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  if (!textContent.trim() && !postData.value.description.includes('<img')) {
    fieldErrors.value.description = '請輸入內容'
    hasError = true
  }

  if (postData.value.price === null || postData.value.price === '') {
    fieldErrors.value.price = '請輸入價格'
    hasError = true
  } else if (postData.value.price < 0) {
    fieldErrors.value.price = '價格不能為負數'
    hasError = true
  }

  if (!postData.value.agencyName.trim()) {
    fieldErrors.value.agencyName = '請輸入旅行社/提供者名稱'
    hasError = true
  }

  if (!postData.value.location.trim()) {
    fieldErrors.value.location = '請輸入地點'
    hasError = true
  }

  const maxPeopleNum = Number(postData.value.max_people)
  if (!maxPeopleNum || maxPeopleNum < 1) {
    fieldErrors.value.max_people = '請輸入有效的人數'
    hasError = true
  } else if (maxPeopleNum > 999) {
    fieldErrors.value.max_people = '人數最多不能超過 999 人'
    hasError = true
  }

  if (!postData.value.start_date) {
    fieldErrors.value.start_date = '請選擇開始日期'
    hasError = true
  } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(postData.value.start_date)
    if (startDate < today) {
      fieldErrors.value.start_date = '開始日期不能早於今天'
      hasError = true
    }
  }

  if (!postData.value.end_date) {
    fieldErrors.value.end_date = '請選擇結束日期'
    hasError = true
  } else if (postData.value.start_date) {
    if (new Date(postData.value.end_date) < new Date(postData.value.start_date)) {
      fieldErrors.value.end_date = '結束日期不能早於開始日期'
      hasError = true
    }
  }

  if (hasError) return '請檢查並修正表單錯誤'
  return ''
}

watch(
  () => postData.value.title,
  () => {
    if (fieldErrors.value.title) {
      fieldErrors.value.title = ''
    }
  },
)

watch(
  () => postData.value.description,
  () => {
    if (fieldErrors.value.description) {
      fieldErrors.value.description = ''
    }
  },
)

watch(
  () => postData.value.price,
  () => {
    if (fieldErrors.value.price) {
      fieldErrors.value.price = ''
    }
  },
)

watch(
  () => postData.value.agencyName,
  () => {
    if (fieldErrors.value.agencyName) {
      fieldErrors.value.agencyName = ''
    }
  },
)

watch(
  () => postData.value.max_people,
  () => {
    if (fieldErrors.value.max_people) {
      fieldErrors.value.max_people = ''
    }
  },
)

watch(
  () => postData.value.start_date,
  () => {
    if (fieldErrors.value.start_date) {
      fieldErrors.value.start_date = ''
    }
    if (postData.value.end_date) {
      const endDate = new Date(postData.value.end_date)
      const startDate = new Date(postData.value.start_date)
      if (startDate && endDate) {
        if (endDate < startDate) {
          fieldErrors.value.end_date = '結束日期不能早於開始日期'
        } else {
          const diffTime = Math.abs(endDate - startDate)
          const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          if (daysCount > 365) {
            fieldErrors.value.end_date = '行程天數不能超過 365 天'
          } else {
            fieldErrors.value.end_date = ''
          }
        }
      }
    }
  },
)

watch(
  () => postData.value.end_date,
  () => {
    if (fieldErrors.value.end_date && postData.value.start_date && postData.value.end_date) {
      const endDate = new Date(postData.value.end_date)
      const startDate = new Date(postData.value.start_date)
      if (endDate >= startDate) {
        const diffTime = Math.abs(endDate - startDate)
        const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        if (daysCount <= 365) {
          fieldErrors.value.end_date = ''
        }
      }
    }
  },
)

watch(
  () => postData.value.location,
  () => {
    if (fieldErrors.value.location && postData.value.location) {
      if (postData.value.location.trim().length <= 50) {
        fieldErrors.value.location = ''
      }
    }
  },
)

const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, date: '', activities: [] }
})

const sanitizedDescription = computed(() => {
  return DOMPurify.sanitize(postData.value.description || '')
})


const addActivity = () => {
  if (!currentDay.value.activities) currentDay.value.activities = []

  let defaultTime = '09:00'
  const activities = currentDay.value.activities
  if (activities.length > 0) {
    const lastActivity = activities[activities.length - 1]
    if (lastActivity && lastActivity.time) {
      const [h, m] = lastActivity.time.split(':').map(Number)
      if (m < 59) {
        defaultTime = lastActivity.time
      } else {
        const newH = (h + 1) % 24
        defaultTime = `${String(newH).padStart(2, '0')}:00`
      }
    }
  }

  currentDay.value.activities.push({
    id: Date.now(),
    time: defaultTime,
    title: '',
    desc: '',
    icon: 'map-pin',
    isOpen: true,
    prevTime: defaultTime,
    location: null,
  })
}


const removeActivity = (activityIndex) => currentDay.value.activities.splice(activityIndex, 1)

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (!cleanTag) {
    tagSearch.value = ''
    return
  }

  if (cleanTag.length > 30) {
    fieldErrors.value.tags = `標籤不能超過 30 字（目前 ${cleanTag.length} 字）`
    return
  }

  if (postData.value.tags.length >= 5) {
    fieldErrors.value.tags = '標籤數量不能超過 5 個'
    return
  }

  if (postData.value.tags.includes(cleanTag)) {
    tagSearch.value = ''
    return
  }

  fieldErrors.value.tags = ''
  postData.value.tags.push(cleanTag)
  tagSearch.value = ''
}
const removeTag = (index) => postData.value.tags.splice(index, 1)

const validateItinerary = () => {
  fieldErrors.value.itinerary = ''
  if (!postData.value.itinerary.days || postData.value.itinerary.days.length === 0) {
    return ''
  }

  for (let i = 0; i < postData.value.itinerary.days.length; i++) {
    const day = postData.value.itinerary.days[i]
    if (day.activities && Array.isArray(day.activities)) {
      for (let j = 0; j < day.activities.length; j++) {
        const activity = day.activities[j]
        if (activity.title && activity.title.trim().length > 50) {
          fieldErrors.value.itinerary = `第 ${i + 1} 天第 ${j + 1} 個活動名稱不能超過 50 字（目前 ${activity.title.trim().length} 字）`
          return fieldErrors.value.itinerary
        }
        if (activity.desc && activity.desc.trim().length > 500) {
          fieldErrors.value.itinerary = `第 ${i + 1} 天第 ${j + 1} 個活動內文不能超過 500 字（目前 ${activity.desc.trim().length} 字）`
          return fieldErrors.value.itinerary
        }
      }
    }
  }
  return ''
}

const validateTags = () => {
  fieldErrors.value.tags = ''
  if (!postData.value.tags || postData.value.tags.length === 0) {
    return ''
  }

  if (postData.value.tags.length > 5) {
    fieldErrors.value.tags = `標籤數量不能超過 5 個（目前 ${postData.value.tags.length} 個）`
    return fieldErrors.value.tags
  }

  for (let i = 0; i < postData.value.tags.length; i++) {
    const tag = postData.value.tags[i]
    if (tag && tag.trim().length > 30) {
      fieldErrors.value.tags = `第 ${i + 1} 個標籤不能超過 30 字（目前 ${tag.trim().length} 字）`
      return fieldErrors.value.tags
    }
  }

  return ''
}

const nextStep = () => {
  if (isUploading.value || isSubmitting.value) return

  if (currentStep.value === 'basic') {
    const error = validateBasic()
    if (error) {
      formError.value = error
      return
    }
    const start = new Date(postData.value.start_date)
    const end = new Date(postData.value.end_date)
    const daysCount = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1

    if (daysCount > 365) {
      formError.value = '行程天數過長'
      return
    }

    const newDays = []
    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      if (postData.value.itinerary.days[i]) {
        postData.value.itinerary.days[i].day = i + 1
        postData.value.itinerary.days[i].date = dateStr
        newDays.push(postData.value.itinerary.days[i])
      } else {
        newDays.push({ day: i + 1, date: dateStr, activities: [] })
      }
    }
    postData.value.itinerary.days = newDays
    currentStep.value = 'itinerary'
    formError.value = ''
  } else if (currentStep.value === 'itinerary') {
    const error = validateItinerary()
    if (error) {
      formError.value = error
      return
    }
    currentStep.value = 'tags'
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
  if (currentStep.value === 'preview') currentStep.value = 'tags'
  else if (currentStep.value === 'tags') currentStep.value = 'itinerary'
  else if (currentStep.value === 'itinerary') currentStep.value = 'basic'
}


const handleGlobalEnter = (e) => {
  if (e.key !== 'Enter') return
  const tagName = document.activeElement.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') return
  if (currentStep.value !== 'preview') {
    nextStep()
  }
}

const hasContent = computed(() => {
  return (
    postData.value.title.trim() ||
    postData.value.description.trim() ||
    postData.value.location.trim() ||
    postData.value.itinerary.days.length > 0 ||
    postData.value.tags.length > 0 ||
    bannerFile.value
  )
})

const handleClose = async () => {
  if (isSubmitting.value || sessionStorage.getItem('is_submitting_itinerary_post')) {
    const shouldClose = await showConfirm('貼文正在提交中，確定要關閉嗎？')
    if (shouldClose) {
      sessionStorage.removeItem('is_submitting_itinerary_post')
      sessionStorage.removeItem('submit_start_time')
      emit('close')
    }
    return
  }

  if (hasContent.value) {
    const confirmClose = await showConfirm('確定要關閉嗎？未儲存的內容將會遺失。')
    if (confirmClose) {
      emit('close')
    }
  } else {
    emit('close')
  }
}

watch(
  () => props.initialData,
  (newData) => {
    if (props.isEdit && newData) {
      postData.value.category = newData.category || ''
      postData.value.title = newData.title || newData.name || ''
      postData.value.description = newData.description || ''
      postData.value.price = newData.price || null
      postData.value.agencyName = newData.agencyName || userStore.userProfile?.name || userStore.userProfile?.nickname || ''
      postData.value.location = newData.location || ''
      postData.value.start_date = newData.start_date ? (newData.start_date.split('T')[0] || newData.start_date) : ''
      postData.value.end_date = newData.end_date ? (newData.end_date.split('T')[0] || newData.end_date) : ''
      postData.value.max_people = newData.max_people || 20
      postData.value.tags = newData.tags || []
      postData.value.coverImage = newData.image || newData.coverImage || ''
      postData.value.itinerary = newData.itinerary || { days: [] }

      bannerPreview.value = postData.value.coverImage || ''
      bannerFile.value = null
      bannerPositionY.value = Number(newData.banner_position_y) || 50

      if (editor.value && postData.value.description) {
        nextTick(() => {
          try {
            editor.value.commands.setContent(postData.value.description, false)
          } catch (error) {
            console.error('[發文編輯器] 載入內容失敗:', error)
          }
        })
      }
    }
  },
  { immediate: true },
)

const executeSubmit = async () => {
  isSubmitting.value = true
  submitProgress.value = 0
  submitStatus.value = '準備中...'

  try {
    let bannerImageUrl = postData.value.coverImage

    if (bannerFile.value) {
      try {
        isUploading.value = true
        uploadProgress.value = 0
        submitProgress.value = 10
        submitStatus.value = '正在上傳圖片...'
        bannerImageUrl = await uploadImage(bannerFile.value, 'itineraries', (progress) => {
          uploadProgress.value = progress
          submitProgress.value = 10 + Math.floor((progress / 100) * 50)
          submitStatus.value = `正在上傳圖片... ${progress}%`
        })
        uploadProgress.value = 100
        submitProgress.value = 60
        submitStatus.value = '圖片上傳完成'
      } catch (error) {
        isUploading.value = false
        uploadProgress.value = 0
        const shouldContinue = await showConfirm(
          'Banner 圖片上傳失敗：' + error.message + '\n\n是否要繼續發布（使用預設圖片）？',
        )
        if (!shouldContinue) {
          isSubmitting.value = false
          submitProgress.value = 0
          submitStatus.value = ''
          return
        }
        submitProgress.value = 60
        submitStatus.value = '使用預設圖片'
      } finally {
        isUploading.value = false
      }
    } else {
      submitProgress.value = 60
      submitStatus.value = '準備提交...'
    }

    const payload = {
      ...postData.value,
      coverImage: bannerImageUrl,
      banner_position_y: Math.round(bannerPositionY.value),
      author_uid: auth.currentUser.uid,
      author_name: userStore.userProfile?.name || userStore.userProfile?.nickname || '匿名',
      author_avatar: userStore.userProfile?.avatar || null,
    }

    const optimizedPayload = {
      title: payload.title.trim(),
      description: payload.description.trim(),
      location: payload.location.trim(),
      category: (payload.category || '').trim(),
      start_date: payload.start_date,
      end_date: payload.end_date,
      max_people: Number(payload.max_people) || 20,
      price: Number(payload.price) || 0,
      agencyName: (payload.agencyName || '').trim(),
      tags: payload.tags || [],
      coverImage: payload.coverImage,
      banner_position_y: payload.banner_position_y,
      author_uid: payload.author_uid,
      author_name: payload.author_name,
      author_avatar: payload.author_avatar,
      itinerary: payload.itinerary?.days
        ? {
            days: payload.itinerary.days.map((day) => ({
              day: Number(day.day || day.day_number) || 1,
              date: day.date || '',
              activities: (day.activities || []).map((act) => ({
                time: act.time || '',
                title: (act.title || '').trim(),
                desc: (act.desc || '').trim(),
                location: act.location || null,
              })),
            })),
          }
        : { days: [] },
    }

    const payloadSize = JSON.stringify(optimizedPayload).length
    const payloadSizeKB = (payloadSize / 1024).toFixed(2)

    if (payloadSize > 900 * 1024) {
      formError.value = `資料太大（${payloadSizeKB}KB），請減少行程天數或內容長度`
      isSubmitting.value = false
      submitProgress.value = 0
      submitStatus.value = ''
      return
    }

    submitProgress.value = 70
    submitStatus.value = '正在提交貼文中...'

    let response
    if (props.isEdit) {
      response = await updateItinerary(props.initialData.id, optimizedPayload)
    } else {
      response = await createItinerary(optimizedPayload)
    }

    console.log('[ItineraryPostModal] API Response:', response)
    console.log('[ItineraryPostModal] Current User UID:', auth.currentUser?.uid)
    console.log('[ItineraryPostModal] Payload sent:', {
      title: optimizedPayload.title,
      category: optimizedPayload.category,
      author_uid: optimizedPayload.author_uid,
    })

    if (response.success || response.id) {
      sessionStorage.removeItem('is_submitting_itinerary_post')
      sessionStorage.removeItem('submit_start_time')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('行程發布成功！', {
          body: '您的行程已成功發布',
          icon: '/favicon.ico',
        })
      } else {
        await showSuccess('行程發布成功！')
      }
      emit('success')
      emit('close')
    } else {
      sessionStorage.removeItem('is_submitting_itinerary_post')
      sessionStorage.removeItem('submit_start_time')
      const errorMessage = '發布失敗：' + (response.message || '請稍後再試')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('發布失敗', {
          body: errorMessage,
          icon: '/favicon.ico',
        })
      } else {
        await showError(errorMessage)
      }

      isSubmitting.value = false
      submitProgress.value = 0
      submitStatus.value = ''
    }
  } catch (error) {
    sessionStorage.removeItem('is_submitting_itinerary_post')
    sessionStorage.removeItem('submit_start_time')

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '發布失敗，發生未知錯誤'
    const errorDetail = error.response?.data?.detail || error.response?.data?.code || ''
    const fullErrorMessage = errorDetail ? `${errorMessage} (${errorDetail})` : errorMessage

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('發布失敗', {
        body: fullErrorMessage,
        icon: '/favicon.ico',
      })
    } else {
      await showError(fullErrorMessage)
    }

    isSubmitting.value = false
    submitProgress.value = 0
    submitStatus.value = ''
  }
}

const handleFinalSubmit = async () => {
  if (!auth.currentUser) {
    formError.value = '請先登入'
    return
  }
  sessionStorage.setItem('is_submitting_itinerary_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())
  executeSubmit()
}

const jumpToStep = (targetStep) => {
  if (isUploading.value || isSubmitting.value) return

  if (targetStep === 'basic') {
    currentStep.value = 'basic'
    formError.value = ''
    return
  }

  const basicError = validateBasic()
  if (basicError) {
    currentStep.value = 'basic'
    formError.value = basicError
    return
  }

  currentStep.value = targetStep
  formError.value = ''
}

onMounted(() => {
  if (postData.value.itinerary.days.length === 0) {
    postData.value.itinerary.days.push({ day: 1, date: '', activities: [] })
  }
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting.value || sessionStorage.getItem('is_submitting_itinerary_post')) {
      e.preventDefault()
      e.returnValue = '貼文正在提交中，確定要離開嗎？'
      return e.returnValue
    }
  })

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  window.addEventListener('keydown', handleGlobalEnter)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalEnter)
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
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
            v-if="currentStep !== 'basic' && currentStep !== 'preview'"
            class="p-2 hover:bg-gray-100 rounded-full transition"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-500" />
          </button>
          <h2 class="text-xl font-bold text-gray-800">
            {{ currentStep === 'preview' ? '預覽行程' : '上架精選行程' }}
          </h2>
        </div>
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="handleClose">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div v-if="currentStep !== 'preview'" class="px-3 sm:px-6 border-b border-gray-100">
        <div
          class="flex items-center space-x-4 sm:space-x-8 text-xs sm:text-sm font-bold overflow-x-auto custom-scrollbar pb-1"
        >
          <button
            v-for="step in ['basic', 'itinerary', 'tags', 'preview']"
            :key="step"
            type="button"
            :class="[
              'py-3 border-b-2 transition cursor-pointer whitespace-nowrap capitalize focus:outline-none',
              currentStep === step
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            ]"
            @click="jumpToStep(step)"
          >
            {{
              step === 'basic'
                ? '基本資訊'
                : step === 'itinerary'
                  ? '行程規劃'
                  : step === 'tags'
                    ? '標籤'
                    : '預覽'
            }}
          </button>
        </div>
      </div>

      <div
        :class="[
          'flex-1 overflow-y-auto custom-scrollbar',
          currentStep === 'preview' ? 'p-0' : 'p-6 space-y-6',
        ]"
      >
        <div v-if="currentStep === 'basic'" class="space-y-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2"
              >主打地區 <span class="text-red-500">*</span></label
            >
            <select
              id="category"
              v-model="postData.category"
              name="category"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition bg-white"
              :class="{ 'border-red-500': fieldErrors.category }"
            >
              <option value="" disabled selected>請選擇主打地區</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <p v-if="fieldErrors.category" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.category }}
            </p>
            <p v-if="categories.length === 1" class="text-amber-600 text-xs mt-1">
              💡 提示：您尚未設定主打地區，目前僅有「未分類」選項。建議前往「基本資料設定」新增主打地區，以便更好地分類您的行程。
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700"
                >行程標題 <span class="text-red-500">*</span></label
              >
              <span
                :class="[
                  'text-xs',
                  postData.title.trim().length > 35 ? 'text-red-500 font-bold' : 'text-gray-400',
                ]"
                >{{ postData.title.trim().length }}/35</span
              >
            </div>
            <input
              id="title"
              v-model="postData.title"
              name="title"
              type="text"
              placeholder="例如：京都深度五日遊"
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                !postData.title.trim() && formError
                  ? 'border-red-500'
                  : 'border-gray-200 focus:border-primary-500',
              ]"
              maxlength="35"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-gray-700"
              >封面圖片 <span class="text-red-500">*</span></label
            >
            <div
              v-if="bannerPreview"
              class="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group cursor-move select-none"
              @mousedown.prevent="startDragBanner"
              @mousemove="onDragBanner"
              @mouseup="stopDragBanner"
              @mouseleave="stopDragBanner"
            >
              <img
                :src="bannerPreview"
                class="w-full h-full object-cover pointer-events-none"
                :style="{ objectPosition: `center ${bannerPositionY}%` }"
              />
              <div
                class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none"
              >
                上下拖曳調整位置
              </div>
              <button
                class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition"
                @click.stop="removeBanner"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <button
              v-else
              :disabled="isUploading"
              class="w-full py-8 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-primary-500 hover:text-primary-600 transition flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              @click="triggerBannerSelect"
            >
              <ImageIcon class="w-8 h-8 opacity-50" /> 點擊上傳封面圖片
            </button>
            <input
              id="bannerFile"
              ref="bannerFileInput"
              name="bannerFile"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleBannerSelect"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">行程介紹</label>
              <span
                v-if="editor"
                class="text-xs"
                :class="{
                  'text-red-500 font-bold':
                    editor.storage.characterCount.characters() >= CHARACTER_LIMIT,
                }"
                >{{ editor.storage.characterCount.characters() }} / {{ CHARACTER_LIMIT }}</span
              >
            </div>
            <div
              class="border-2 rounded-xl overflow-x-hidden transition flex flex-col bg-white border-gray-200 focus-within:border-primary-500"
            >
              <div
                v-if="editor"
                class="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-30 shadow-sm"
              >
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H2"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 2 }) }"
                  @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                >
                  <Heading2Icon class="w-4 h-4" />
                </button>
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H3"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 3 }) }"
                  @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                >
                  <Heading3Icon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('bold') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="粗體"
                  @click="editor.chain().focus().toggleBold().run()"
                >
                  <BoldIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('italic') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="斜體"
                  @click="editor.chain().focus().toggleItalic().run()"
                >
                  <ItalicIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive('underline') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="底線"
                  @click="editor.chain().focus().toggleUnderline().run()"
                >
                  <UnderlineIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'left' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="靠左"
                  @click="editor.chain().focus().setTextAlign('left').run()"
                >
                  <AlignLeftIcon class="w-4 h-4" />
                </button>
                <button
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'center' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="置中"
                  @click="editor.chain().focus().setTextAlign('center').run()"
                >
                  <AlignCenterIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <div class="relative">
                  <button
                    class="p-2 rounded hover:bg-gray-200 flex items-center"
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
                      class="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 shadow-sm"
                      :style="{ backgroundColor: color }"
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
                  :class="{
                    'bg-gray-200 text-black': editor.isActive('textStyle', {
                      fontFamily: 'BiauKai, DFKai-SB, 標楷體',
                    }),
                  }"
                  class="p-2 rounded hover:bg-gray-200 flex items-center gap-1"
                  title="標楷體"
                  @click="setFontKai"
                >
                  <TypeIcon class="w-4 h-4" /><span class="text-xs font-bold">楷</span>
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="插入圖片"
                  @click="triggerEditorImageUpload"
                >
                  <ImageIcon class="w-4 h-4" />
                </button>
                <input
                  id="editorFile"
                  ref="editorFileInputRef"
                  name="editorFile"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleEditorImageSelect"
                />
              </div>
              <editor-content
                :editor="editor"
                class="min-h-[300px] cursor-text bg-white rounded-b-xl"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">價格</label>
              <div class="relative">
                <DollarSignIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="price"
                  v-model.number="postData.price"
                  name="price"
                  type="number"
                  min="0"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="請輸入金額"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">旅行社/提供者</label>
              <div class="relative">
                <BuildingIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="agencyName"
                  v-model="postData.agencyName"
                  name="agencyName"
                  maxlength="15"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="例如：雄獅旅遊"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">出發日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="start_date"
                  v-model="postData.start_date"
                  name="start_date"
                  type="date"
                  :min="minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">結束日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="end_date"
                  v-model="postData.end_date"
                  name="end_date"
                  type="date"
                  :min="postData.start_date || minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">地點</label>
              <div class="relative">
                <MapPinIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="location"
                  v-model="postData.location"
                  name="location"
                  maxlength="10"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="例如：日本關西"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">團體人數上限</label>
              <div class="relative">
                <UsersIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="max_people"
                  v-model.number="postData.max_people"
                  name="max_people"
                  type="number"
                  min="1"
                  max="999"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="請輸入人數"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg text-gray-800">每日行程規劃</h3>
            <div class="text-sm text-gray-500">共 {{ postData.durationDays }} 天</div>
          </div>
          <div class="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
            <button
              v-for="(day, idx) in postData.itinerary.days"
              :key="idx"
              :class="[
                'px-4 py-2 rounded-lg font-bold border transition whitespace-nowrap',
                activeDayIndex === idx ? 'bg-primary-600 text-white' : 'bg-white border-gray-200',
              ]"
              @click="activeDayIndex = idx"
            >
              Day {{ day.day }}
            </button>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div class="mb-4 font-bold text-gray-700 flex justify-between">
              <span>正在編輯 Day {{ currentDay.day }}</span>
              <span v-if="postData.start_date" class="text-sm text-gray-400">{{
                new Date(
                  new Date(postData.start_date).getTime() + activeDayIndex * 86400000,
                ).toLocaleDateString()
              }}</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="(act, aIdx) in currentDay.activities"
                :key="act.id"
                class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
              >
                <div class="flex justify-between mb-2">
                  <input
                    :id="`activity-time-${aIdx}`"
                    v-model="act.time"
                    :name="`activity-time-${aIdx}`"
                    type="time"
                    class="bg-gray-100 rounded px-2 font-bold text-gray-700"
                  />
                  <button class="text-gray-400 hover:text-red-500" @click="removeActivity(aIdx)">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <input
                  :id="`activity-title-${aIdx}`"
                  v-model="act.title"
                  :name="`activity-title-${aIdx}`"
                  placeholder="活動標題"
                  class="w-full font-bold mb-1 border-b border-transparent focus:border-primary-300 outline-none"
                />
                <textarea
                  :id="`activity-desc-${aIdx}`"
                  v-model="act.desc"
                  :name="`activity-desc-${aIdx}`"
                  placeholder="詳細描述..."
                  class="w-full text-sm text-gray-600 resize-none outline-none bg-transparent"
                ></textarea>
              </div>
            </div>
            <button
              class="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-primary-400 hover:text-primary-600 transition"
              @click="addActivity"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 'tags'" class="space-y-6">
          <div class="relative mb-6">
            <input
              id="tagSearch"
              v-model="tagSearch"
              name="tagSearch"
              type="text"
              placeholder="輸入標籤..."
              class="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-primary-500"
              maxlength="30"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="(tag, i) in postData.tags"
              :key="i"
              class="px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1 bg-primary-50 text-primary-700 border-primary-100"
            >
              #{{ tag }} <button @click="removeTag(i)"><XIcon class="w-3 h-3" /></button>
            </span>
          </div>
          <div class="text-sm text-gray-500">最多 5 個標籤。輸入後按 Enter 新增。</div>
        </div>

        <div v-else-if="currentStep === 'preview'" class="bg-white h-full relative">
          <div class="relative w-full h-72 overflow-hidden">
            <img
              :src="bannerPreview || 'https://picsum.photos/1200/400'"
              class="w-full h-full object-cover"
              :style="{ objectPosition: `center ${bannerPositionY}%` }"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div
              class="absolute top-4 left-4 px-4 py-2 font-bold text-sm rounded-lg border-2 border-primary bg-primary-600 text-white"
            >
              預覽中
            </div>
          </div>

          <div class="p-6">
            <h1 class="text-3xl font-black text-secondary-900 mb-4">{{ postData.title }}</h1>

            <div class="flex items-center space-x-3 mb-6">
              <img
                :src="
                  userStore.currentUser?.avatar ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                "
                class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
              />
              <div>
                <div class="font-bold text-secondary-900">
                  {{ userStore.currentUser?.displayName || '你' }}
                </div>
                <div class="text-xs text-secondary-400">
                  剛剛發布 •
                  <span class="text-primary-600 font-bold ml-1">@ {{ postData.category }}</span>
                </div>
              </div>
            </div>

            <!-- eslint-disable vue/no-v-html -->
            <div
              class="prose prose-lg max-w-none mb-8 text-secondary-700 leading-relaxed"
              v-html="sanitizedDescription"
            ></div>
            <!-- eslint-enable vue/no-v-html -->

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >地點</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.location }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >日期</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.start_date }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >人數</span
                  >
                </div>
                <div class="font-bold text-primary-600">{{ postData.max_people }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-green-600 mb-1">
                  <DollarSignIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >價格</span
                  >
                </div>
                <div class="font-bold text-green-700">NT$ {{ postData.price }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex flex-col gap-3 z-10">
        <div
          v-if="formError"
          class="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 flex items-start gap-2 animate-in fade-in duration-200"
        >
          <AlertIcon class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-red-700 font-bold text-sm flex-1 leading-relaxed">
          {{ formError }}
        </p>
        </div>

        <div v-if="isSubmitting" class="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            class="bg-primary-600 h-3 rounded-full transition-all duration-300"
            :style="{ width: submitProgress + '%' }"
          ></div>
        </div>
        <p v-if="isSubmitting" class="text-sm text-center text-primary-600 font-bold">
          {{ submitStatus }}
        </p>

        <div class="flex gap-3 justify-end">
          <template v-if="currentStep === 'preview'">
            <button
              v-if="!isSubmitting"
              type="button"
              class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              type="button"
              :disabled="isSubmitting"
              class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
              @click="handleFinalSubmit"
            >
              {{ isSubmitting ? '發布中...' : '確認發布' }}
            </button>
          </template>
          <button
            v-else
            type="button"
            :disabled="isUploading || isSubmitting"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
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
:deep(.ProseMirror [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
