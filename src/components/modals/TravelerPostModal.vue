<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { createTraveler } from '@/api/travelers'
import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'
// --- Tiptap 相關引入 ---
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

const currentStep = ref('basic')
const formError = ref('')
const fieldErrors = ref({
  category: '',
  title: '',
  content: '',
  max_people: '',
  start_date: '',
  end_date: '',
  location: '',
  itinerary: '',
  packingList: '',
  tags: '',
  banner: '',
})

const CHARACTER_LIMIT = 100000

const categories = [
  '國內旅遊',
  '日韓旅遊',
  '亞洲其他',
  '歐美紐澳',
  '海島度假',
  '攝影',
  '自駕共乘',
  '其他',
]

// --- ★ 新增：取得今天日期字串 (YYYY-MM-DD) ---
const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const minDate = getTodayString()

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

// --- 顏色選擇器 ---
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

const postData = ref({
  category: '',
  title: '',
  content: '',
  location: '',
  start_date: '',
  end_date: '',
  max_people: 2,
  banner_image: '',
  tags: [],
  itinerary: { days: [] },
  packingList: [],
  status: '招募中',
})

const bannerPreview = ref('')
const bannerFileInput = ref(null)
const bannerFile = ref(null)
const editorFileInputRef = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const submitProgress = ref(0)
const isSubmitting = ref(false)
const submitStatus = ref('')
const activeDayIndex = ref(0)
const tagSearch = ref('')
const suggestedTags = [
  '省錢',
  '攝影',
  '美食',
  '自助',
  '自駕',
  '跨年',
  '滑雪',
  '度假',
  '健行',
  '文化',
  '新手友善',
]

const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((tag) => tag.toLowerCase().includes(tagSearch.value.toLowerCase()))
})

const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, date: '', activities: [] }
})

const ResetStyleOnEnter = Extension.create({
  name: 'resetStyleOnEnter',
  addPriority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) return false
        return editor.chain().splitBlock().setParagraph().unsetAllMarks().run()
      },
    }
  },
})

// --- [Tiptap] 編輯器初始化 ---
const editor = useEditor({
  content: postData.value.content,
  extensions: [
    StarterKit,
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
    postData.value.content = editor.getHTML()
    if (fieldErrors.value.content) fieldErrors.value.content = ''
  },
})

watch(
  () => props.draftData,
  (newDraft) => {
    if (newDraft && newDraft.data) {
      const draft = newDraft.data
      postData.value.category = draft.category || ''
      postData.value.title = draft.title || ''
      postData.value.content = draft.content || ''
      postData.value.location = draft.location || ''
      postData.value.start_date = draft.start_date || ''
      postData.value.end_date = draft.end_date || ''
      postData.value.max_people = draft.max_people || 2
      postData.value.tags = draft.tags || []

      if (editor.value && draft.content) {
        nextTick(() => {
          try {
            editor.value.commands.setContent(draft.content, false)
          } catch (error) {
            console.error('[發文編輯器] 載入草稿內容失敗:', error)
          }
        })
      }
    }
  },
  { immediate: true },
)

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
    const imageUrl = await uploadImage(compressedFile, 'travelers', (progress) =>
      console.log(`內文圖片: ${progress}%`),
    )
    if (imageUrl && editor.value) editor.value.chain().focus().setImage({ src: imageUrl }).run()
  } catch (error) {
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

// --- 驗證邏輯 ---
const validateBasic = () => {
  formError.value = ''
  Object.keys(fieldErrors.value).forEach((key) => (fieldErrors.value[key] = ''))

  let hasError = false

  if (!postData.value.category) {
    fieldErrors.value.category = '請選擇分類'
    hasError = true
  }
  if (!postData.value.title.trim()) {
    fieldErrors.value.title = '請輸入標題'
    hasError = true
  }

  if (!bannerPreview.value && !postData.value.banner_image) {
    fieldErrors.value.banner = '請上傳封面圖片'
    hasError = true
  }

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.content
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  if (!textContent.trim() && !postData.value.content.includes('<img')) {
    fieldErrors.value.content = '請輸入內容'
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
  // ★ 新增：日期驗證邏輯
  if (!postData.value.start_date) {
    fieldErrors.value.start_date = '請選擇開始日期'
    hasError = true
  } else {
    // 檢查是否早於今天
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
    fieldErrors.value.banner = ''
    bannerPositionY.value = 50

    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeMB: 2,
    })
    bannerFile.value = compressedFile
    const reader = new FileReader()
    reader.onload = (e) => {
      bannerPreview.value = e.target.result
    }
    reader.readAsDataURL(compressedFile)

    isUploading.value = false
  } catch (error) {
    alert('圖片處理失敗：' + error.message)
    isUploading.value = false
  }
}

const removeBanner = () => {
  bannerPreview.value = ''
  bannerFile.value = null
  postData.value.banner_image = ''
  bannerPositionY.value = 50
}

// ... (行程與打包清單相關邏輯) ...
const addDay = () => {
  const dayNumber = postData.value.itinerary.days.length + 1
  let nextDate = ''
  if (postData.value.itinerary.days.length > 0) {
    const lastDateStr = postData.value.itinerary.days[postData.value.itinerary.days.length - 1].date
    if (lastDateStr) {
      const d = new Date(lastDateStr)
      d.setDate(d.getDate() + 1)
      nextDate = d.toISOString().split('T')[0]
    }
  } else if (postData.value.start_date) {
    nextDate = postData.value.start_date
  }
  postData.value.itinerary.days.push({ day: dayNumber, date: nextDate, activities: [] })
  activeDayIndex.value = postData.value.itinerary.days.length - 1
  if (nextDate) postData.value.end_date = nextDate
}
const addActivity = () => {
  if (!currentDay.value.activities) currentDay.value.activities = []
  currentDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    title: '',
    desc: '',
    icon: 'map-pin',
  })
}
const removeActivity = (activityIndex) => currentDay.value.activities.splice(activityIndex, 1)
const addPackingCategory = () => postData.value.packingList.push({ category: '', items: [] })
const removePackingCategory = (index) => postData.value.packingList.splice(index, 1)
const addPackingItem = (categoryIndex) =>
  postData.value.packingList[categoryIndex].items.push({ id: Date.now(), name: '', checked: false })
const removePackingItem = (categoryIndex, itemIndex) =>
  postData.value.packingList[categoryIndex].items.splice(itemIndex, 1)
const addTag = (tag) => {
  if (!postData.value.tags.includes(tag) && postData.value.tags.length < 5)
    postData.value.tags.push(tag)
  tagSearch.value = ''
}
const removeTag = (index) => postData.value.tags.splice(index, 1)

// 下一步前的額外驗證
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

const validatePackingList = () => {
  fieldErrors.value.packingList = ''
  if (!postData.value.packingList || postData.value.packingList.length === 0) {
    return ''
  }

  if (postData.value.packingList.length > 50) {
    fieldErrors.value.packingList = `分類數量不能超過 50 個（目前 ${postData.value.packingList.length} 個）`
    return fieldErrors.value.packingList
  }

  let totalItems = 0
  for (let i = 0; i < postData.value.packingList.length; i++) {
    const category = postData.value.packingList[i]
    if (category.category && category.category.trim().length > 30) {
      fieldErrors.value.packingList = `第 ${i + 1} 個分類名稱不能超過 30 字（目前 ${category.category.trim().length} 字）`
      return fieldErrors.value.packingList
    }
    if (category.items && Array.isArray(category.items)) {
      totalItems += category.items.length
      for (let j = 0; j < category.items.length; j++) {
        const item = category.items[j]
        if (item.name && item.name.trim().length > 50) {
          fieldErrors.value.packingList = `第 ${i + 1} 個分類第 ${j + 1} 個物品名稱不能超過 50 字（目前 ${item.name.trim().length} 字）`
          return fieldErrors.value.packingList
        }
      }
    }
  }

  if (totalItems > 100) {
    fieldErrors.value.packingList = `物品總數不能超過 100 個（目前 ${totalItems} 個）`
    return fieldErrors.value.packingList
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
// 下一步邏輯
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
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    const error = validatePackingList()
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
  else if (currentStep.value === 'tags') currentStep.value = 'packing'
  else if (currentStep.value === 'packing') currentStep.value = 'itinerary'
  else if (currentStep.value === 'itinerary') currentStep.value = 'basic'
}

const executeSubmit = async () => {
  isSubmitting.value = true
  submitProgress.value = 0
  submitStatus.value = '準備中...'

  try {
    let bannerImageUrl = postData.value.banner_image

    if (bannerFile.value) {
      try {
        isUploading.value = true
        uploadProgress.value = 0
        submitProgress.value = 10
        submitStatus.value = '正在上傳圖片...'
        bannerImageUrl = await uploadImage(
          bannerFile.value,
          'travelers',
          (progress) => {
            uploadProgress.value = progress
            submitProgress.value = 10 + Math.floor((progress / 100) * 50)
            submitStatus.value = `正在上傳圖片... ${progress}%`
          },
        )
        uploadProgress.value = 100
        submitProgress.value = 60
        submitStatus.value = '圖片上傳完成'
      } catch (error) {
        isUploading.value = false
        uploadProgress.value = 0
        const shouldContinue = confirm(
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
      banner_image: bannerImageUrl,
      banner_position_y: Math.round(bannerPositionY.value),
      author_uid: auth.currentUser.uid,
      author_name: userStore.userProfile?.name || userStore.userProfile?.nickname || '匿名',
      author_avatar:
        userStore.userProfile?.avatar ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      spirit_animal: userStore.userProfile?.spiritAnimal || null,
      status: postData.value.status || '招募中',
    }

    const optimizedPayload = {
      title: payload.title.trim(),
      content: payload.content.trim(),
      location: payload.location.trim(),
      start_date: payload.start_date,
      end_date: payload.end_date,
      max_people: Number(payload.max_people) || 2,
      tags: payload.tags || [],
      status: payload.status,
      banner_image: payload.banner_image,
      author_uid: payload.author_uid,
      author_name: payload.author_name,
      author_avatar: payload.author_avatar,
      spirit_animal: payload.spirit_animal,
      itinerary: payload.itinerary?.days
        ? {
            days: payload.itinerary.days.map((day) => ({
              day: Number(day.day || day.day_number) || 1,
              date: day.date || '',
              activities: (day.activities || []).map((act) => ({
                time: act.time || '',
                title: (act.title || '').trim(),
                desc: (act.desc || '').trim(),
              })),
            })),
          }
        : { days: [] },
      packingList: (payload.packingList || []).map((pack) => ({
        category: (pack.category || '').trim(),
        items: (pack.items || []).map((item) => ({
          name: (item.name || '').trim(),
        })),
      })),
    }

    const payloadSize = JSON.stringify(optimizedPayload).length
    const payloadSizeKB = (payloadSize / 1024).toFixed(2)

    if (payloadSize > 900 * 1024) {
      formError.value = `資料太大（${payloadSizeKB}KB），請減少行程天數、打包清單項目或內容長度`
      isSubmitting.value = false
      submitProgress.value = 0
      submitStatus.value = ''
      return
    }

    submitProgress.value = 70
    submitStatus.value = '正在提交貼文...'

    const response = await createTraveler(optimizedPayload)

    if (response.success) {
      sessionStorage.removeItem('is_submitting_traveler_post')
      sessionStorage.removeItem('submit_start_time')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('旅伴招募發布成功！', {
          body: '您的貼文已成功發布',
          icon: '/favicon.ico',
        })
      } else {
        alert('旅伴招募發布成功！')
      }
      emit('success')
      emit('close')
    } else {
      sessionStorage.removeItem('is_submitting_traveler_post')
      sessionStorage.removeItem('submit_start_time')
      const errorMessage = '發布失敗：' + (response.message || '請稍後再試')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('發布失敗', {
          body: errorMessage,
          icon: '/favicon.ico',
        })
      } else {
        alert(errorMessage)
      }

      isSubmitting.value = false
      submitProgress.value = 0
      submitStatus.value = ''
    }
  } catch (error) {
    sessionStorage.removeItem('is_submitting_traveler_post')
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
      alert(fullErrorMessage)
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
  sessionStorage.setItem('is_submitting_traveler_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())
  executeSubmit()
}

const handleClose = () => {
  if (isSubmitting.value) return
  emit('close')
}

onMounted(() => {
  if (postData.value.itinerary.days.length === 0) {
    postData.value.itinerary.days.push({ day: 1, date: '', activities: [] })
  }
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting.value || sessionStorage.getItem('is_submitting_traveler_post')) {
      e.preventDefault()
      e.returnValue = '貼文正在提交中，確定要離開嗎？'
      return e.returnValue
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
            v-if="currentStep !== 'basic' && currentStep !== 'preview'"
            class="p-2 hover:bg-gray-100 rounded-full transition"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-500" />
          </button>
          <h2 class="text-xl font-bold text-gray-800">
            {{ currentStep === 'preview' ? '預覽招募貼文' : '找旅伴招募' }}
          </h2>
        </div>
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="handleClose">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div v-if="currentStep !== 'preview'" class="px-6 border-b border-gray-100">
        <div class="flex items-center space-x-8 text-sm font-bold overflow-x-auto">
          <div
            v-for="step in ['basic', 'itinerary', 'packing', 'tags', 'preview']"
            :key="step"
            :class="[
              'py-3 border-b-2 transition cursor-default whitespace-nowrap capitalize',
              currentStep === step
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-400',
            ]"
          >
            {{
              step === 'basic'
                ? '基本資訊'
                : step === 'itinerary'
                  ? '行程規劃'
                  : step === 'packing'
                    ? '打包清單'
                    : step === 'tags'
                      ? '標籤'
                      : '預覽'
            }}
          </div>
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
              >分類 <span class="text-red-500">*</span></label
            >
            <select
              v-model="postData.category"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition bg-white"
              :class="{ 'border-red-500': fieldErrors.category }"
            >
              <option value="" disabled selected>請選擇分類</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
            <p v-if="fieldErrors.category" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.category }}
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700"
                >標題 <span class="text-red-500">*</span></label
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
              v-model="postData.title"
              type="text"
              placeholder="例如：徵求一位女生分攤札幌住宿費"
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                fieldErrors.title ? 'border-red-500' : 'border-gray-200 focus:border-green-500',
              ]"
              maxlength="35"
            />
            <p v-if="fieldErrors.title" class="mt-1 text-sm text-red-500">
              {{ fieldErrors.title }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-gray-700"
              >Banner 圖片 <span class="text-red-500">*</span></label
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
              class="w-full py-8 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-green-500 hover:text-green-600 transition flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              :class="{ 'border-red-500': fieldErrors.banner }"
              @click="triggerBannerSelect"
            >
              <ImageIcon class="w-8 h-8 opacity-50" /> 點擊上傳 Banner 圖片
            </button>
            <input
              ref="bannerFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleBannerSelect"
            />
            <p v-if="fieldErrors.banner" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.banner }}
            </p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">內容</label>
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
              class="border-2 rounded-xl overflow-hidden transition flex flex-col bg-white"
              :class="
                fieldErrors.content
                  ? 'border-red-500'
                  : 'border-gray-200 focus-within:border-green-500'
              "
            >
              <div
                v-if="editor"
                class="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-20"
              >
                <button
                  @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 2 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H2"
                >
                  <Heading2Icon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 3 }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H3"
                >
                  <Heading3Icon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="editor.chain().focus().toggleBold().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('bold') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="粗體"
                >
                  <BoldIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().toggleItalic().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('italic') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="斜體"
                >
                  <ItalicIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().toggleUnderline().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('underline') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="底線"
                >
                  <UnderlineIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="editor.chain().focus().setTextAlign('left').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'left' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="靠左"
                >
                  <AlignLeftIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().setTextAlign('center').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'center' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="置中"
                >
                  <AlignCenterIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <div class="relative">
                  <button
                    @click="toggleColorPicker"
                    class="p-2 rounded hover:bg-gray-200 flex items-center"
                    title="文字顏色"
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
                      @click="setColor(color)"
                      class="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 shadow-sm"
                      :style="{ backgroundColor: color }"
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
                  @click="setFontKai"
                  :class="{
                    'bg-gray-200 text-black': editor.isActive('textStyle', {
                      fontFamily: 'BiauKai, DFKai-SB, 標楷體',
                    }),
                  }"
                  class="p-2 rounded hover:bg-gray-200 flex items-center gap-1"
                  title="標楷體"
                >
                  <TypeIcon class="w-4 h-4" /><span class="text-xs font-bold">楷</span>
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="triggerEditorImageUpload"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
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
            <p v-if="fieldErrors.content" class="mt-1 text-sm text-red-500">
              {{ fieldErrors.content }}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">地點</label>
              <input
                v-model="postData.location"
                type="text"
                placeholder="例如：日本"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.location
                    ? 'border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
              <p v-if="fieldErrors.location" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.location }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">最多人數</label>
              <input
                v-model.number="postData.max_people"
                type="number"
                min="1"
                max="999"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.max_people
                    ? 'border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">開始日期</label>
              <input
                v-model="postData.start_date"
                type="date"
                :min="minDate"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.start_date
                    ? 'border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
              <p v-if="fieldErrors.start_date" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.start_date }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">結束日期</label>
              <input
                v-model="postData.end_date"
                type="date"
                :min="postData.start_date || minDate"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.end_date
                    ? 'border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
              <p v-if="fieldErrors.end_date" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.end_date }}
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-800">行程安排</h3>
            <button
              class="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-100 flex items-center gap-2"
              @click="addDay"
            >
              <PlusIcon class="w-4 h-4" /> 新增天數
            </button>
          </div>
          <div class="flex overflow-x-auto space-x-2 pb-2">
            <button
              v-for="(day, index) in postData.itinerary.days"
              :key="index"
              :class="[
                'px-4 py-2 rounded-lg font-bold border transition whitespace-nowrap',
                activeDayIndex === index
                  ? 'bg-green-600 text-white border-green-600 shadow-md'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
              ]"
              @click="activeDayIndex = index"
            >
              {{ day.date || `Day ${day.day}` }}
            </button>
          </div>
          <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <span class="font-bold text-gray-700">{{
                currentDay.date ? `日期：${currentDay.date}` : `Day ${currentDay.day} 日期`
              }}</span
              ><input
                v-model="currentDay.date"
                type="date"
                class="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-700"
              />
            </div>
            <div class="space-y-3">
              <div
                v-for="(activity, actIndex) in currentDay.activities"
                :key="activity.id"
                class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
              >
                <div class="flex justify-between items-start mb-2">
                  <input
                    v-model="activity.time"
                    type="time"
                    class="bg-gray-50 border border-gray-200 rounded px-2 py-1 font-bold text-gray-800"
                  /><button
                    class="text-gray-400 hover:text-red-500"
                    @click="removeActivity(actIndex)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <input
                      v-model="activity.title"
                      placeholder="活動名稱"
                      :class="[
                        'w-full font-bold text-lg focus:outline-none',
                        activity.title && activity.title.trim().length > 50 ? 'text-red-500' : '',
                      ]"
                      maxlength="50"
                    />
                    <span
                      :class="[
                        'text-xs ml-2',
                        activity.title && activity.title.trim().length > 50
                          ? 'text-red-500 font-bold'
                          : 'text-gray-400',
                      ]"
                    >
                      {{ (activity.title || '').length }}/50
                    </span>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <textarea
                      v-model="activity.desc"
                      placeholder="活動描述..."
                      rows="2"
                      :class="[
                        'w-full text-sm text-gray-600 bg-transparent resize-none focus:outline-none',
                        activity.desc && activity.desc.trim().length > 500 ? 'text-red-500' : '',
                      ]"
                      maxlength="500"
                    ></textarea>
                    <span
                      :class="[
                        'text-xs ml-2 self-start pt-1',
                        activity.desc && activity.desc.trim().length > 500
                          ? 'text-red-500 font-bold'
                          : 'text-gray-400',
                      ]"
                    >
                      {{ (activity.desc || '').length }}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              class="w-full mt-4 py-3 border border-dashed border-gray-300 text-gray-500 rounded-xl hover:bg-white hover:border-green-400 hover:text-green-600"
              @click="addActivity"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 'packing'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-800">打包清單</h3>
            <button
              class="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-100"
              @click="addPackingCategory"
            >
              新增分類
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(category, catIndex) in postData.packingList"
              :key="catIndex"
              class="p-4 border border-gray-200 rounded-xl bg-gray-50"
            >
              <div class="flex justify-between items-center mb-3">
                <div class="flex-1 mr-2">
                  <div class="flex items-center justify-between">
                    <input
                      v-model="category.category"
                      placeholder="分類名稱"
                      :class="[
                        'bg-transparent font-bold text-gray-800 focus:outline-none w-full',
                        category.category && category.category.trim().length > 30
                          ? 'text-red-500'
                          : '',
                      ]"
                      maxlength="30"
                    />
                    <span
                      :class="[
                        'text-xs ml-2',
                        category.category && category.category.trim().length > 30
                          ? 'text-red-500 font-bold'
                          : 'text-gray-400',
                      ]"
                    >
                      {{ (category.category || '').length }}/30
                    </span>
                  </div>
                  <p
                    v-if="category.category && category.category.trim().length > 30"
                    class="text-xs text-red-500 mt-1"
                  >
                    分類名稱不能超過 30 字
                  </p>
                </div>
                <button
                  class="text-gray-400 hover:text-red-500"
                  @click="removePackingCategory(catIndex)"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(item, itemIndex) in category.items"
                  :key="item.id"
                  class="bg-white p-2 rounded border border-gray-100"
                >
                  <div class="flex items-center gap-2">
                    <input
                      v-model="item.name"
                      placeholder="物品名稱"
                      :class="[
                        'flex-1 text-sm focus:outline-none',
                        item.name && item.name.trim().length > 50 ? 'text-red-500' : '',
                      ]"
                      maxlength="50"
                    />
                    <span
                      :class="[
                        'text-xs',
                        item.name && item.name.trim().length > 50
                          ? 'text-red-500 font-bold'
                          : 'text-gray-400',
                      ]"
                    >
                      {{ (item.name || '').length }}/50
                    </span>
                    <button
                      class="text-gray-300 hover:text-red-500"
                      @click="removePackingItem(catIndex, itemIndex)"
                    >
                      <XIcon class="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button
                  class="text-xs text-green-600 font-bold mt-2"
                  @click="addPackingItem(catIndex)"
                >
                  + 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'tags'" class="">
          <div class="relative mb-6">
            <input
              v-model="tagSearch"
              type="text"
              placeholder="輸入標籤..."
              class="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none"
              maxlength="30"
              @keyup.enter="addTag(tagSearch)"
            /><HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="(tag, i) in postData.tags"
              :key="i"
              class="px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1 bg-green-50 text-green-700 border-green-100"
              >#{{ tag }} <button @click="removeTag(i)"><XIcon class="w-3 h-3" /></button
            ></span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in filteredTags"
              :key="tag"
              class="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
              @click="addTag(tag)"
            >
              #{{ tag }}
            </button>
          </div>
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
            <div class="mb-6">
              <h1 class="text-3xl font-black text-secondary-900 mb-4">{{ postData.title }}</h1>
              <div class="flex items-center space-x-3 mb-4">
                <img
                  :src="
                    userStore.userProfile?.avatar ||
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                  "
                  class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
                />
                <div>
                  <div class="flex items-center space-x-2 flex-wrap gap-2">
                    <span class="font-bold text-secondary-900">{{
                      userStore.userProfile?.name || userStore.userProfile?.nickname || '你'
                    }}</span>
                    <span
                      v-if="userStore.userProfile?.spiritAnimal && userStore.userProfile.spiritAnimal.trim()"
                      class="text-xs sm:text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full whitespace-nowrap"
                      >{{ userStore.userProfile.spiritAnimal }}</span
                    >
                  </div>
                  <div class="text-sm text-secondary-500">
                    發布於 剛剛 •
                    <span class="text-blue-600 font-bold ml-1"> @ {{ postData.category }} </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="prose prose-lg max-w-none mb-6 text-secondary-700 leading-relaxed"
              v-html="postData.content"
            ></div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >地點</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.location }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >日期</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.start_date }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >人數</span
                  >
                </div>
                <div class="font-bold text-primary-600">{{ postData.max_people }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex flex-col gap-2 z-10">
        <p
          v-if="formError"
          class="text-red-500 font-bold text-sm text-center flex items-center justify-center"
        >
          <AlertIcon class="w-4 h-4 mr-1" />
          {{ formError }}
        </p>

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
              class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              :disabled="isSubmitting"
              class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
              @click="handleFinalSubmit"
            >
              {{ isSubmitting ? '發布中...' : '確認發布' }}
            </button>
          </template>
          <button
            v-else
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

/* Tiptap 樣式 */
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
