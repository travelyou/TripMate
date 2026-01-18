<script setup>
import { ref, computed, watch, onMounted } from 'vue'
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
  CheckSquare as CheckSquareIcon,
  Save as SaveIcon,
  Map as MapIcon,
  MessageCircle as MessageCircleIcon,
  Heart as HeartIcon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { createTraveler } from '@/api/travelers'
import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'

const props = defineProps({
  draftData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const myItineraryStore = useMyItineraryStore()

const currentStep = ref('basic')
const formError = ref('')
const fieldErrors = ref({
  title: '',
  content: '',
  max_people: '',
  start_date: '',
  end_date: '',
  location: '',
  itinerary: '',
  packingList: '',
  tags: '',
})

const previewActiveTab = ref('itinerary')

const postData = ref({
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
  status: 'published',
})

const bannerPreview = ref('')
const bannerFileInput = ref(null)
const bannerFile = ref(null)
const uploadProgress = ref(0)
const isUploading = ref(false)
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

const validateBasic = () => {
  formError.value = ''
  fieldErrors.value = {
    title: '',
    content: '',
    max_people: '',
    start_date: '',
    end_date: '',
  }

  let hasError = false

  if (!postData.value.title.trim()) {
    fieldErrors.value.title = '請輸入標題'
    hasError = true
  } else if (postData.value.title.trim().length > 35) {
    fieldErrors.value.title = `標題不能超過 35 字（目前 ${postData.value.title.trim().length} 字）`
    hasError = true
  }

  if (!postData.value.content.trim()) {
    fieldErrors.value.content = '請輸入內容'
    hasError = true
  } else if (postData.value.content.trim().length > 5000) {
    fieldErrors.value.content = `內容不能超過 5000 字（目前 ${postData.value.content.trim().length} 字）`
    hasError = true
  }

  if (!postData.value.location.trim()) {
    fieldErrors.value.location = '請輸入地點'
    hasError = true
  } else if (postData.value.location.trim().length > 50) {
    fieldErrors.value.location = `地點不能超過 50 字（目前 ${postData.value.location.trim().length} 字）`
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
      fieldErrors.value.start_date = '開始日期不能選擇小於今日'
      hasError = true
    }
  }

  if (!postData.value.end_date) {
    fieldErrors.value.end_date = '請選擇結束日期'
    hasError = true
  } else {
    const endDate = new Date(postData.value.end_date)
    if (postData.value.start_date) {
      const startDate = new Date(postData.value.start_date)
      if (endDate < startDate) {
        fieldErrors.value.end_date = '結束日期不能早於開始日期'
        hasError = true
      } else {
        const diffTime = Math.abs(endDate - startDate)
        const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        if (daysCount > 365) {
          fieldErrors.value.end_date = '行程天數不能超過 365 天'
          hasError = true
        }
      }
    } else {
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 3)
      if (endDate > maxDate) {
        fieldErrors.value.end_date = '結束日期不能超過 3 年以後'
        hasError = true
      }
    }
  }

  if (hasError) {
    return '請檢查並修正表單錯誤'
  }
  return ''
}

const maxEndDate = computed(() => {
  if (postData.value.start_date) {
    const startDate = new Date(postData.value.start_date)
    const maxDate = new Date(startDate)
    maxDate.setDate(maxDate.getDate() + 364)
    return maxDate.toISOString().split('T')[0]
  }
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 3)
  return maxDate.toISOString().split('T')[0]
})

const minStartDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

watch(
  () => postData.value.title,
  () => {
    if (fieldErrors.value.title) {
      fieldErrors.value.title = ''
    }
  }
)

watch(
  () => postData.value.content,
  () => {
    if (fieldErrors.value.content) {
      fieldErrors.value.content = ''
    }
  }
)

watch(
  () => postData.value.max_people,
  () => {
    if (fieldErrors.value.max_people) {
      fieldErrors.value.max_people = ''
    }
  }
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
  }
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
  }
)

watch(
  () => postData.value.location,
  () => {
    if (fieldErrors.value.location && postData.value.location) {
      if (postData.value.location.trim().length <= 50) {
        fieldErrors.value.location = ''
      }
    }
  }
)

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
    uploadProgress.value = 0

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
    uploadProgress.value = 0
  } catch (error) {
    alert('圖片處理失敗：' + error.message)
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const removeBanner = () => {
  bannerPreview.value = ''
  bannerFile.value = null
}

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

  if (nextDate) {
    postData.value.end_date = nextDate
  }
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

const addPackingCategory = () => {
  if (postData.value.packingList.length >= 50) {
    fieldErrors.value.packingList = '分類數量不能超過 50 個'
    return
  }
  fieldErrors.value.packingList = ''
  postData.value.packingList.push({ category: '', items: [] })
}
const removePackingCategory = (index) => {
  postData.value.packingList.splice(index, 1)
  fieldErrors.value.packingList = ''
}
const addPackingItem = (categoryIndex) => {
  const category = postData.value.packingList[categoryIndex]
  if (!category.items) category.items = []

  let totalItems = 0
  for (const cat of postData.value.packingList) {
    if (cat.items && Array.isArray(cat.items)) {
      totalItems += cat.items.length
    }
  }

  if (totalItems >= 100) {
    fieldErrors.value.packingList = '物品總數不能超過 100 個'
    return
  }

  fieldErrors.value.packingList = ''
  category.items.push({ id: Date.now(), name: '', checked: false })
}
const removePackingItem = (categoryIndex, itemIndex) => {
  postData.value.packingList[categoryIndex].items.splice(itemIndex, 1)
  fieldErrors.value.packingList = ''
}

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

const nextStep = () => {
  if (isUploading.value || isSubmitting.value) {
    return
  }

  if (currentStep.value === 'basic') {
    const error = validateBasic()
    if (error) {
      formError.value = error
      return
    }
    const start = new Date(postData.value.start_date)
    const end = new Date(postData.value.end_date)
    const diffTime = Math.abs(end - start)
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (daysCount > 365) {
      formError.value = '行程天數不能超過 365 天'
      return
    }

    const existingDays = postData.value.itinerary.days
    const newDays = []

    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      if (existingDays[i]) {
        existingDays[i].day = i + 1
        existingDays[i].date = dateStr
        newDays.push(existingDays[i])
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
      return
    }
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    const error = validatePackingList()
    if (error) {
      return
    }
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    const error = validateTags()
    if (error) {
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

const handleSaveDraft = () => {
  if (!postData.value.title.trim()) {
    formError.value = '請至少輸入標題才能儲存草稿'
    return
  }

  const draftData = {
    id: Date.now(),
    type: 'traveler',
    typeLabel: '找旅伴',
    title: postData.value.title,
    content: postData.value.content || '無內容',
    saveTime: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(postData.value)),
  }

  myItineraryStore.addDraft(draftData)

  alert('已儲存至「我的行程」草稿夾！')
  emit('close')
}

const hasContent = computed(() => {
  return (
    postData.value.title.trim() ||
    postData.value.content.trim() ||
    postData.value.location.trim() ||
    postData.value.itinerary.days.length > 0 ||
    postData.value.packingList.length > 0 ||
    postData.value.tags.length > 0 ||
    bannerFile.value
  )
})

const handleClose = () => {
  if (isSubmitting.value || sessionStorage.getItem('is_submitting_traveler_post')) {
    const shouldClose = confirm('貼文正在提交中，確定要關閉嗎？')
    if (shouldClose) {
      sessionStorage.removeItem('is_submitting_traveler_post')
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
    let bannerImageUrl = 'https://picsum.photos/1200/400'

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
          }
        )
        uploadProgress.value = 100
        submitProgress.value = 60
        submitStatus.value = '圖片上傳完成'
      } catch (error) {
        isUploading.value = false
        uploadProgress.value = 0
        const shouldContinue = confirm(
          'Banner 圖片上傳失敗：' + error.message + '\n\n是否要繼續發布（使用預設圖片）？'
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
      title: postData.value.title,
      content: postData.value.content,
      location: postData.value.location,
      start_date: postData.value.start_date,
      end_date: postData.value.end_date,
      max_people: postData.value.max_people,
      tags: postData.value.tags,
      itinerary: postData.value.itinerary,
      packingList: postData.value.packingList,
      status: '招募中',
      banner_image: bannerImageUrl,
      author_uid: auth.currentUser.uid,
      author_name: userStore.userProfile?.name || userStore.userProfile?.nickname || '匿名',
      author_avatar:
        userStore.userProfile?.avatar ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      spirit_animal: userStore.userProfile?.spiritAnimal || null,
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

    submitProgress.value = 100
    submitStatus.value = '發布成功！'

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
      window.location.reload()
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

    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '發布失敗，發生未知錯誤'
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
  if (isSubmitting.value) {
    return
  }

  const error = validateBasic()
  if (error) {
    formError.value = error
    return
  }

  if (!auth.currentUser) {
    formError.value = '請先登入'
    return
  }

  emit('close')

  sessionStorage.setItem('is_submitting_traveler_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())

  executeSubmit()
}

if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({ day: 1, date: '', activities: [] })
}

watch(() => props.draftData, (newDraft) => {
  if (newDraft && newDraft.data) {
    const draft = newDraft.data
    postData.value.title = draft.title || ''
    postData.value.content = draft.content || ''
    postData.value.location = draft.location || ''
    postData.value.start_date = draft.start_date || ''
    postData.value.end_date = draft.end_date || ''
    postData.value.max_people = draft.max_people || 2
    postData.value.tags = draft.tags || []

    if (draft.itinerary && draft.itinerary.days) {
      postData.value.itinerary.days = draft.itinerary.days
    }

    if (draft.packingList && Array.isArray(draft.packingList)) {
      postData.value.packingList = draft.packingList
    }

    if (draft.banner_image) {
      postData.value.banner_image = draft.banner_image
      bannerPreview.value = draft.banner_image
    }
  }
}, { immediate: true })

onMounted(() => {
  if (props.draftData && props.draftData.data) {
    const draft = props.draftData.data
    postData.value.title = draft.title || ''
    postData.value.content = draft.content || ''
    postData.value.location = draft.location || ''
    postData.value.start_date = draft.start_date || ''
    postData.value.end_date = draft.end_date || ''
    postData.value.max_people = draft.max_people || 2
    postData.value.tags = draft.tags || []

    if (draft.itinerary && draft.itinerary.days) {
      postData.value.itinerary.days = draft.itinerary.days
    }

    if (draft.packingList && Array.isArray(draft.packingList)) {
      postData.value.packingList = draft.packingList
    }

    if (draft.banner_image) {
      postData.value.banner_image = draft.banner_image
      bannerPreview.value = draft.banner_image
    }
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
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">標題</label>
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
              placeholder="例如：徵求一位女生分攤札幌住宿費"
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                fieldErrors.title
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-green-500',
              ]"
              maxlength="35"
            />
            <p v-if="fieldErrors.title" class="mt-1 text-sm text-red-500">{{ fieldErrors.title }}</p>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">內容</label>
              <span
                :class="[
                  'text-xs',
                  postData.content.trim().length > 5000 ? 'text-red-500 font-bold' : 'text-gray-400',
                ]"
              >
                {{ postData.content.trim().length }}/5000
              </span>
            </div>
            <textarea
              v-model="postData.content"
              placeholder="詳細描述你的旅行計劃..."
              rows="5"
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none resize-none transition',
                fieldErrors.content
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 focus:border-green-500',
              ]"
              maxlength="5000"
            ></textarea>
            <p v-if="fieldErrors.content" class="mt-1 text-sm text-red-500">{{ fieldErrors.content }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-bold text-gray-700">地點</label>
                <span
                  :class="[
                    'text-xs',
                    postData.location.length > 50 ? 'text-red-500' : 'text-gray-400',
                  ]"
                >
                  {{ postData.location.length }}/50
                </span>
              </div>
              <input
                v-model="postData.location"
                type="text"
                placeholder="例如：日本"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.location
                    ? 'border-red-500 focus:border-red-500'
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
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
              <p v-if="fieldErrors.max_people" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.max_people }}
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">開始日期</label>
              <input
                v-model="postData.start_date"
                type="date"
                :min="minStartDate"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.start_date
                    ? 'border-red-500 focus:border-red-500'
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
                :min="postData.start_date || minStartDate"
                :max="maxEndDate"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.end_date
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
              />
              <p v-if="fieldErrors.end_date" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.end_date }}
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">Banner 圖片</label>
            <div
              v-if="bannerPreview"
              class="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200"
            >
              <img :src="bannerPreview" alt="Banner" class="w-full h-full object-cover" />
              <button
                v-if="!isUploading"
                class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition"
                @click="removeBanner"
              >
                <XIcon class="w-5 h-5" />
              </button>
              <div
                v-if="isUploading"
                class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center"
              >
                <div class="w-3/4 bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    class="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                    :style="{ width: uploadProgress + '%' }"
                  ></div>
                </div>
                <span class="text-white text-sm font-bold">{{ uploadProgress }}%</span>
              </div>
            </div>
            <button
              v-else
              :disabled="isUploading"
              class="w-full py-8 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-green-500 hover:text-green-600 transition flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="triggerBannerSelect"
            >
              <ImageIcon class="w-8 h-8 opacity-50" /> 點擊上傳 Banner 圖片
            </button>
            <input
              ref="bannerFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="isUploading"
              @change="handleBannerSelect"
            />
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <p v-if="fieldErrors.itinerary" class="text-sm text-red-500 mb-2">
            {{ fieldErrors.itinerary }}
          </p>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-800">行程安排</h3>
            <button
              class="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-100 transition flex items-center gap-2"
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
              <span class="font-bold text-gray-700">{{ currentDay.date ? `日期：${currentDay.date}` : `Day ${currentDay.day} 日期` }}</span>
              <input
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
                  />
                  <button
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
                  <p
                    v-if="activity.title && activity.title.trim().length > 50"
                    class="text-xs text-red-500 mb-1"
                  >
                    活動名稱不能超過 50 字
                  </p>
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
                  <p
                    v-if="activity.desc && activity.desc.trim().length > 500"
                    class="text-xs text-red-500"
                  >
                    活動內文不能超過 500 字
                  </p>
                </div>
              </div>
            </div>
            <button
              class="w-full mt-4 py-3 border border-dashed border-gray-300 text-gray-500 rounded-xl hover:bg-white hover:border-green-400 hover:text-green-600 transition"
              @click="addActivity"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 'packing'" class="space-y-6">
          <p v-if="fieldErrors.packingList" class="text-sm text-red-500 mb-2">
            {{ fieldErrors.packingList }}
          </p>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-800">打包清單</h3>
            <button
              class="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-100 transition"
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
                  <p
                    v-if="item.name && item.name.trim().length > 50"
                    class="text-xs text-red-500 mt-1"
                  >
                    物品名稱不能超過 50 字
                  </p>
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
          <p v-if="fieldErrors.tags" class="text-sm text-red-500 mb-2">
            {{ fieldErrors.tags }}
          </p>
          <div class="relative mb-6">
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
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="(tag, i) in postData.tags"
              :key="i"
              :class="[
                'px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1',
                tag && tag.trim().length > 30
                  ? 'bg-red-50 text-red-700 border-red-100'
                  : 'bg-green-50 text-green-700 border-green-100',
              ]"
            >
              #{{ tag }} <button @click="removeTag(i)"><XIcon class="w-3 h-3" /></button>
            </span>
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
              :src="bannerPreview || postData.banner_image || 'https://picsum.photos/1200/400'"
              class="w-full h-full object-cover"
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
                    userStore.currentUser?.avatar ||
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
                  <div class="text-sm text-secondary-500">發布於 剛剛</div>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-600 mb-1">
                    <MapPinIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >地點</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">{{ postData.location }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-secondary-500 mb-1">
                    <CalendarIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >日期</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">
                    {{
                      postData.start_date
                        ? postData.end_date && postData.start_date !== postData.end_date
                          ? `${postData.start_date} - ${postData.end_date}`
                          : postData.start_date
                        : '未設定日期'
                    }}
                  </div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-500 mb-1">
                    <UsersIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >人數</span
                    >
                  </div>
                  <div class="font-bold text-primary-600">{{ postData.max_people }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-600 mb-1">
                    <MessageCircleIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >留言</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">0</div>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 mb-6">
              <span
                v-for="tag in postData.tags"
                :key="tag"
                class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
                >#{{ tag }}</span
              >
            </div>

            <div class="prose prose-lg max-w-none mb-6">
              <p class="text-secondary-700 leading-relaxed whitespace-pre-wrap">
                {{ postData.content }}
              </p>
            </div>

            <div
              class="flex items-center space-x-4 py-4 border-t border-b border-secondary-200 mb-6 opacity-50 cursor-not-allowed"
            >
              <button class="flex items-center space-x-1 text-secondary-400">
                <HeartIcon class="w-5 h-5" /> <span class="font-bold">0</span>
              </button>
              <button class="flex items-center space-x-1 text-secondary-400">
                <BookmarkIcon class="w-5 h-5" />
              </button>
              <div
                class="ml-auto bg-primary-600 text-white px-6 py-2 rounded-full font-bold shadow-md"
              >
                聯繫作者
              </div>
            </div>

            <div class="border-b-2 border-primary-200 mb-6">
              <div class="flex space-x-1">
                <button
                  :class="[
                    'px-6 py-3 font-bold transition relative',
                    previewActiveTab === 'itinerary'
                      ? 'text-primary-600 border-b-4 border-primary-600'
                      : 'text-secondary-400 hover:text-secondary-600',
                  ]"
                  @click="previewActiveTab = 'itinerary'"
                >
                  <MapIcon class="w-5 h-5 inline mr-2" /> 行程規劃
                </button>
                <button
                  :class="[
                    'px-6 py-3 font-bold transition relative',
                    previewActiveTab === 'comments'
                      ? 'text-primary-600 border-b-4 border-primary-600'
                      : 'text-secondary-400 hover:text-secondary-600',
                  ]"
                  @click="previewActiveTab = 'comments'"
                >
                  <MessageCircleIcon class="w-5 h-5 inline mr-2" /> 留言討論
                </button>
              </div>
            </div>

            <div v-if="previewActiveTab === 'itinerary'" class="space-y-6 pb-20">
              <div class="flex overflow-x-auto space-x-2 pb-2">
                <button
                  v-for="(day, index) in postData.itinerary.days"
                  :key="index"
                  :class="[
                    'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                    activeDayIndex === index
                      ? 'bg-primary-600 text-white border-primary-700'
                      : 'bg-white text-secondary-500 border-secondary-200',
                  ]"
                  @click="activeDayIndex = index"
                >
                  {{ day.date || `Day ${day.day}` }}
                </button>
              </div>
              <div
                v-if="currentDay"
                class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm"
              >
                <h4 class="font-bold text-gray-700 mb-3">
                  Day {{ currentDay.day }} - {{ currentDay.date }}
                </h4>
                <div class="space-y-3">
                  <div
                    v-for="act in currentDay.activities"
                    :key="act.id"
                    class="flex gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="text-primary-600 font-black w-16">{{ act.time }}</div>
                    <div>
                      <div class="font-bold text-secondary-900">{{ act.title }}</div>
                      <div class="text-sm text-secondary-500">{{ act.desc }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="postData.packingList.length" class="mt-6">
                <h3 class="font-black text-lg text-secondary-900 mb-3">
                  <CheckSquareIcon class="w-5 h-5 inline mr-2 text-primary" /> 建議攜帶物品
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div
                    v-for="(cat, idx) in postData.packingList"
                    :key="idx"
                    class="bg-white border-2 border-secondary-200 rounded-lg p-3"
                  >
                    <h4 class="font-bold text-secondary-700 mb-2">{{ cat.category }}</h4>
                    <ul class="text-sm text-secondary-600 list-disc pl-4">
                      <li v-for="item in cat.items" :key="item.id">{{ item.name }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-secondary-400 py-10">
              預覽模式無法查看留言功能。
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
              type="button"
              :disabled="isSubmitting"
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              type="button"
              :disabled="isSubmitting"
              class="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleFinalSubmit"
            >
              <span v-if="!isSubmitting">確認發布</span>
              <span v-else>發布中...</span>
            </button>
          </template>

          <button
            v-else
            type="button"
            :disabled="isUploading || isSubmitting"
            class="flex-1 py-3 text-white bg-green-600 hover:bg-green-700 rounded-xl font-bold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
