<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import dayjs from 'dayjs'
import Draggable from 'vuedraggable'
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
  GripVertical as GripVerticalIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { createTraveler } from '@/api/travelers'
import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'

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
  packingList: [
    {
      category: '盥洗用具',
      items: [
        { id: Date.now(), name: '牙刷', checked: false },
        { id: Date.now() + 1, name: '體香劑', checked: false },
      ],
    },
  ],
  status: 'published',
})

const dateRange = computed({
  get: () => {
    if (postData.value.start_date && postData.value.end_date) {
      return [dayjs(postData.value.start_date), dayjs(postData.value.end_date)]
    }
    return []
  },
  set: (dates) => {
    if (dates && dates.length === 2) {
      postData.value.start_date = dates[0].format('YYYY-MM-DD')
      postData.value.end_date = dates[1].format('YYYY-MM-DD')
    } else {
      postData.value.start_date = ''
      postData.value.end_date = ''
    }
  },
})

// 禁止選擇今天以前的日期
const disabledDate = (current) => {
  // Can not select days before today
  return current && current < dayjs().startOf('day')
}

const bannerPreview = ref('')
const bannerFileInput = ref(null)
const bannerFile = ref(null)
const uploadProgress = ref(0)
const isUploading = ref(false)
const dayListContainer = ref(null) // 天數列表容器 ref
const submitProgress = ref(0)
const isSubmitting = ref(false)
const submitStatus = ref('')
const activeDayIndex = ref(0)
// 基本資訊輸入框 Refs，用於 Enter 鍵切換焦點
const titleInput = ref(null)
const locationInput = ref(null)
const maxPeopleInput = ref(null)

// 打包清單物品輸入框 Refs [categoryIndex][itemIndex]
const itemRefs = ref([])
// 行程活動輸入框 Refs [activityIndex]
const activityTitleRefs = ref([])
const activityDescRefs = ref([])

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

  // 驗證標題
  if (!postData.value.title.trim()) {
    fieldErrors.value.title = '請輸入標題'
    hasError = true
  } else if (postData.value.title.trim().length > 35) {
    fieldErrors.value.title = `標題不能超過 35 字（目前 ${postData.value.title.trim().length} 字）`
    hasError = true
  }

  // 驗證內容
  if (!postData.value.content.trim()) {
    fieldErrors.value.content = '請輸入內容'
    hasError = true
  } else if (postData.value.content.trim().length > 5000) {
    fieldErrors.value.content = `內容不能超過 5000 字（目前 ${postData.value.content.trim().length} 字）`
    hasError = true
  }

  // 驗證地點
  if (!postData.value.location.trim()) {
    fieldErrors.value.location = '請輸入地點'
    hasError = true
  } else if (postData.value.location.trim().length > 50) {
    fieldErrors.value.location = `地點不能超過 50 字（目前 ${postData.value.location.trim().length} 字）`
    hasError = true
  }

  // 驗證人數
  const maxPeopleNum = Number(postData.value.max_people)
  if (!maxPeopleNum || maxPeopleNum < 1) {
    fieldErrors.value.max_people = '請輸入有效的人數'
    hasError = true
  } else if (maxPeopleNum > 999) {
    fieldErrors.value.max_people = '人數最多不能超過 999 人'
    hasError = true
  }

  // 驗證開始日期
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

  // 驗證結束日期
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
    console.error('圖片壓縮失敗：', error)
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
  // 自動跳轉至新增的天數 (Vue 的反應式更新可能是非同步的，所以雖然這裡改了 activeDayIndex，但 DOM 可能還沒變，不過對 View 切換來說是足夠的)
  activeDayIndex.value = postData.value.itinerary.days.length - 1

  if (nextDate) {
    postData.value.end_date = nextDate
  }

  // 自動捲動到最新的天數
  nextTick(() => {
    if (dayListContainer.value) {
      dayListContainer.value.scrollLeft = dayListContainer.value.scrollWidth
    }
  })
}

const addActivity = () => {
  if (!currentDay.value.activities) currentDay.value.activities = []

  let defaultTime = '09:00'
  const activities = currentDay.value.activities
  if (activities.length > 0) {
    const lastActivity = activities[activities.length - 1]
    if (lastActivity && lastActivity.time) {
      const [h, m] = lastActivity.time.split(':').map(Number)
      // 如果分小於 59，則維持同時間
      if (m < 59) {
        defaultTime = lastActivity.time
      } else {
        // 如果是 59 分，則小時 + 1，分歸零
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
    isOpen: true, // 自動開啟時間選擇器
    prevTime: defaultTime // 修正：預設開啟時也需要初始化 prevTime，否則第一次選擇會報錯
  })
}

const removeActivity = (activityIndex) => currentDay.value.activities.splice(activityIndex, 1)

// --- 拖曳排序相關邏輯 ---
const savedTimes = ref([])

const getDisabledHours = (index) => {
  const hours = []

  // 1. 檢查上一項活動 (不能比它早)
  if (index > 0) {
    const prevActivity = currentDay.value.activities[index - 1]
    if (prevActivity && prevActivity.time) {
      const [prevH] = prevActivity.time.split(':').map(Number)
      for (let i = 0; i < prevH; i++) hours.push(i)
    }
  }

  // 2. 檢查下一項活動 (不能比它晚)
  if (index < currentDay.value.activities.length - 1) {
    const nextActivity = currentDay.value.activities[index + 1]
    if (nextActivity && nextActivity.time) {
      const [nextH] = nextActivity.time.split(':').map(Number)
      for (let i = nextH + 1; i < 24; i++) hours.push(i)
    }
  }

  return hours
}

const getDisabledMinutes = (selectedHour, index) => {
  const minutes = []

  // 1. 檢查上一項活動
  if (index > 0) {
    const prevActivity = currentDay.value.activities[index - 1]
    if (prevActivity && prevActivity.time) {
      const [prevH, prevM] = prevActivity.time.split(':').map(Number)
      if (selectedHour === prevH) {
        for (let i = 0; i < prevM; i++) minutes.push(i)
      }
    }
  }

  // 2. 檢查下一項活動
  if (index < currentDay.value.activities.length - 1) {
    const nextActivity = currentDay.value.activities[index + 1]
    if (nextActivity && nextActivity.time) {
      const [nextH, nextM] = nextActivity.time.split(':').map(Number)
      if (selectedHour === nextH) {
        for (let i = nextM + 1; i < 60; i++) minutes.push(i)
      }
    }
  }

  return minutes
}

const handleDragStart = () => {
  // 拖曳開始前，先備份當前的「時間順序」
  // 我們的目標是：拖曳只改變「內容」，而「時間點」應該要留在原地 (Slot 概念)
  if (currentDay.value.activities) {
    savedTimes.value = currentDay.value.activities.map(a => a.time)
  }
}

const handleDragEnd = () => {
  // 拖曳結束後，把原本的時間「倒回去」給新的排序
  // 這樣就達成了：內容像卡片一樣換了位置，但時間點不動
  if (currentDay.value.activities && savedTimes.value.length > 0) {
    currentDay.value.activities.forEach((activity, index) => {
      // 如果原本的時間陣列不夠長(極端情況)，就維持原樣，不然就覆蓋回去
      if (index < savedTimes.value.length) {
        activity.time = savedTimes.value[index]
      }
    })
    savedTimes.value = [] // 清空備份
  }
}

const handleTimeOpenChange = (open, activity) => {
  // 當開啟時，記錄當前時間，以便後續判斷是否為「分鐘」選擇
  if (open) {
    activity.prevTime = activity.time
  }
}

const handleTimeSelect = (val, activity) => {
  // 處理時間選擇邏輯：
  // 如果小時沒變，但分鐘變了（或確認相同時間），則視為選完分鐘 -> 關閉
  // 如果小時變了 -> 保持開啟（等待選分鐘）

  // val 可能是 dayjs 物件或字串，視 value-format 而定，但 @select 通常給 dayjs
  // 為了保險，我們統一轉為 HH:mm 比較
  let newTimeStr = ''
  if (typeof val === 'string') {
    newTimeStr = val
  } else if (val && typeof val.format === 'function') {
    newTimeStr = val.format('HH:mm')
  }

  if (!activity.prevTime) {
      // 如果沒有記錄（極端情況），假設已經完成
      activity.isOpen = false
      return
  }

  // 無論如何，先把新選擇的值存入，確保不會丟失
  activity.time = newTimeStr

  if (!activity.prevTime) activity.prevTime = newTimeStr // 防呆：如果 prevTime 遺失，補上

  const [oldH] = activity.prevTime.split(':')
  const [newH] = newTimeStr.split(':')

  if (oldH === newH) {
    // 小時相同，代表是在選分鐘，或是確認
    console.log('[TimePicker] Selected minute, updating time:', newTimeStr)
    // 使用 nextTick 確保數值已更新後再關閉，避免被還原
    nextTick(() => {
        activity.isOpen = false
    })
  } else {
    // 小時不同，更新 prevTime，等待下一次（選分鐘）
    console.log('[TimePicker] Selected hour:', newH)
    activity.prevTime = newTimeStr
  }
}

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

  if (cleanTag.length > 10) {
    fieldErrors.value.tags = `標籤不能超過 10 字（目前 ${cleanTag.length} 字）`
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
    if (category.category && category.category.trim().length > 10) {
      fieldErrors.value.packingList = `第 ${i + 1} 個分類名稱不能超過 10 字（目前 ${category.category.trim().length} 字）`
      return fieldErrors.value.packingList
    }
    if (category.items && Array.isArray(category.items)) {
      totalItems += category.items.length
      for (let j = 0; j < category.items.length; j++) {
        const item = category.items[j]
        if (item.name && item.name.trim().length > 10) {
          fieldErrors.value.packingList = `第 ${i + 1} 個分類第 ${j + 1} 個物品名稱不能超過 10 字（目前 ${item.name.trim().length} 字）`
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

// 監聽步驟變更，處理自動化邏輯
watch(currentStep, (newStep, oldStep) => {
  // 當離開「基本資訊」頁面時，自動產生行程天數
  if (oldStep === 'basic' && newStep !== 'basic') {
    // generateDays() // 這裡不需要，因為 nextStep 已經處理了
  }

  // 當離開「打包清單」頁面時，自動清理空白項目
  if (oldStep === 'packing') {
    // 移除未填寫的分類與物品
    postData.value.packingList = postData.value.packingList.filter(cat => {
        // 先過濾掉分類下空白的物品
        if (cat.items) {
            cat.items = cat.items.filter(item => item.name && item.name.trim())
        }
        // 保留規則：分類有名稱 OR 分類下還有物品
        return (cat.category && cat.category.trim()) || (cat.items && cat.items.length > 0)
    })
  }
})

// 全域/Modal Enter 鍵導航處理
const handleGlobalEnter = (e) => {
  if (e.key !== 'Enter') return

  // 如果焦點在輸入框或文字區域，則保留預設行為或由個別 handler 處理
  const tagName = document.activeElement.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea') return

  // 如果不在預覽頁，則 Enter 視為「下一步」
  if (currentStep.value !== 'preview') {
    nextStep()
  }
}

const handleSaveDraft = () => {
  console.log('[DraftDebug] handleSaveDraft triggered')

  if (!postData.value.title.trim()) {
    console.warn('[DraftDebug] Title empty, aborting save')
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

  console.log('[DraftDebug] Preparing to save draft:', draftData)

  try {
      console.log('[DraftDebug] Calling store.addDraft...')
      myItineraryStore.addDraft(draftData)
      console.log('[DraftDebug] store.addDraft success. Current drafts count:', myItineraryStore.drafts.length)
  } catch (err) {
      console.error('[DraftDebug] Store addDraft failed:', err)
  }

  // 移除 alert 改為直接關閉，避免阻塞導致兩次點擊問題
  // alert('已儲存至「我的行程」草稿夾！')

  // 使用 nextTick 確保資料寫入後才關閉
  nextTick(() => {
    emit('close')
  })
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
        console.log('[旅伴發文] 開始上傳 banner 圖片...')
        bannerImageUrl = await uploadImage(
          bannerFile.value,
          'travelers',
          (progress) => {
            uploadProgress.value = progress
            submitProgress.value = 10 + Math.floor((progress / 100) * 50)
            submitStatus.value = `正在上傳圖片... ${progress}%`
            console.log(`[旅伴發文] 上傳進度: ${progress}%`)
          }
        )
        console.log('[旅伴發文] Banner 圖片上傳成功:', bannerImageUrl)
        uploadProgress.value = 100
        submitProgress.value = 60
        submitStatus.value = '圖片上傳完成'
      } catch (error) {
        console.error('[旅伴發文] Banner 圖片上傳失敗：', error)
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
      author_name: userStore.currentUser?.displayName || '匿名',
      author_avatar:
        userStore.currentUser?.photoURL ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      spirit_animal: userStore.currentUser?.spiritAnimal || '樂天派',
    }

    // 清理和优化数据
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
    const payloadSizeMB = (payloadSize / 1024 / 1024).toFixed(2)
    const payloadSizeKB = (payloadSize / 1024).toFixed(2)
    console.log('[旅伴發文] Payload 大小:', payloadSizeMB, 'MB (', payloadSizeKB, 'KB)')
    console.log('[旅伴發文] Payload 詳細:', {
      title: optimizedPayload.title,
      contentLength: optimizedPayload.content?.length || 0,
      itineraryDays: optimizedPayload.itinerary?.days?.length || 0,
      packingListCount: optimizedPayload.packingList?.length || 0,
      tagsCount: optimizedPayload.tags?.length || 0,
      hasBanner: !!optimizedPayload.banner_image,
    })

    console.log('[診斷] Firebase Storage URL 長度:', bannerImageUrl?.length || 0)
    console.log('[診斷] 完整 payload 結構分析:', {
      bannerUrlLength: optimizedPayload.banner_image?.length || 0,
      itinerarySize: JSON.stringify(optimizedPayload.itinerary).length,
      packingListSize: JSON.stringify(optimizedPayload.packingList).length,
      contentSize: optimizedPayload.content?.length || 0,
      tagsSize: JSON.stringify(optimizedPayload.tags).length,
      totalSize: payloadSize,
      totalSizeKB: payloadSizeKB,
      totalSizeMB: payloadSizeMB,
    })

    if (optimizedPayload.banner_image) {
      console.log('[診斷] Banner URL 前 100 字符:', optimizedPayload.banner_image.substring(0, 100))
    }

    // Zeabur 通常限制为 1MB，我们设置为 900KB 作为安全边界
    if (payloadSize > 900 * 1024) {
      formError.value = `資料太大（${payloadSizeKB}KB），請減少行程天數、打包清單項目或內容長度`
      isSubmitting.value = false
      submitProgress.value = 0
      submitStatus.value = ''
      return
    }

    submitProgress.value = 70
    submitStatus.value = '正在提交貼文...'
    console.log('[旅伴發文] 提交 payload:', {
      title: optimizedPayload.title,
      hasBanner: !!optimizedPayload.banner_image,
      bannerUrl: optimizedPayload.banner_image,
      payloadSizeKB: payloadSizeKB,
    })

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
    console.error('[旅伴發文] 提交失敗:', error)
    console.error('[旅伴發文] 錯誤詳情:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.response?.data?.code,
      detail: error.response?.data?.detail,
    })

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

  // 立即關閉模態框
  emit('close')

  // 設置提交標記
  sessionStorage.setItem('is_submitting_traveler_post', 'true')
  sessionStorage.setItem('submit_start_time', Date.now().toString())

  // 在後台執行提交
  executeSubmit()
}

if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({ day: 1, date: '', activities: [] })
}

onMounted(() => {
  // 監聽頁面卸載事件，提示用戶
  window.addEventListener('beforeunload', (e) => {
    if (isSubmitting.value || sessionStorage.getItem('is_submitting_traveler_post')) {
      e.preventDefault()
      e.returnValue = '貼文正在提交中，確定要離開嗎？'
      return e.returnValue
    }
  })

  // 請求通知權限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  // 註冊全域 Enter 鍵監聽
  window.addEventListener('keydown', handleGlobalEnter)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalEnter)
})
// 跳轉到指定步驟
const jumpToStep = (targetStep) => {
  // 如果當前正在提交，禁止跳轉
  if (isUploading.value || isSubmitting.value) return

  // 如果目標是基本資訊，直接跳轉 (隨時可以回去修)
  if (targetStep === 'basic') {
    currentStep.value = 'basic'
    formError.value = ''
    return
  }

  // 如果目標是其他步驟，必須先驗證基本資訊
  const basicError = validateBasic()
  if (basicError) {
    // 如果有錯，強制跳回基本資訊頁並顯示錯誤
    currentStep.value = 'basic'
    formError.value = basicError
    return
  }

  // 驗證通過，允許跳轉
  currentStep.value = targetStep
  formError.value = ''
}

// ... existing code ...
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      :class="[
        'modal-content-container bg-white w-full flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all duration-300',
        currentStep === 'preview' ? 'max-w-5xl h-[90vh]' : 'max-w-4xl h-[90vh]',
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
          <button
            v-for="step in ['basic', 'itinerary', 'packing', 'tags', 'preview']"
            :key="step"
            type="button"
            :class="[
              'py-3 border-b-2 transition cursor-pointer whitespace-nowrap capitalize focus:outline-none',
              currentStep === step
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            ]"
            @click="jumpToStep(step)"
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
              ref="titleInput"
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
              @keydown.enter.prevent="() => locationInput.focus()"
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
                ref="locationInput"
                v-model="postData.location"
                type="text"
                placeholder="例如：日本"
                :class="[
                  'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                  fieldErrors.location
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
                @keydown.enter.prevent="() => maxPeopleInput.focus()"
              />
              <p v-if="fieldErrors.location" class="mt-1 text-sm text-red-500">
                {{ fieldErrors.location }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">最多人數</label>
              <input
                ref="maxPeopleInput"
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
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">日期範圍</label>
            <a-range-picker
              v-model:value="dateRange"
              :disabled-date="disabledDate"
              class="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-green-500 focus:border-green-500 transition shadow-none"
              :class="{'border-red-500': fieldErrors.start_date || fieldErrors.end_date}"
              :placeholder="['開始日期', '結束日期']"
            />
            <p v-if="fieldErrors.start_date || fieldErrors.end_date" class="mt-1 text-sm text-red-500">
              {{ fieldErrors.start_date || fieldErrors.end_date }}
            </p>
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
          <div ref="dayListContainer" class="flex overflow-x-auto space-x-2 pb-2 custom-scrollbar">
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
              <!-- 移除修改日期按鈕 -->
            </div>
            <!-- 調整左側內距以容納時間軸 (pl-32) -->
            <div class="relative pl-32 space-y-6">
              <!-- 時間軸直獻 (裝飾用) - 調整位置至 7.5rem -->
              <div class="absolute left-[7.5rem] top-2 bottom-4 w-0.5 bg-gray-200"></div>

              <Draggable
                v-model="currentDay.activities"
                item-key="id"
                handle=".drag-handle"
                :animation="200"
                ghost-class="opacity-50"
                class="space-y-6 relative"
                @start="handleDragStart"
                @end="handleDragEnd"
              >
                <template #item="{ element: activity, index: actIndex }">
                  <div class="relative flex items-start gap-4 group">
                    <!-- 左側：獨立時間軸 (絕對定位負值，移至卡片左側空白處) -->
                    <div class="absolute -left-[7rem] mt-0 text-right w-24 flex flex-col items-end z-10">
                      <!-- 使用 Ant Design TimePicker 取代原生 input，支援 24h 與驗證邏輯 -->
                      <a-time-picker
                        v-model:value="activity.time"
                        v-model:open="activity.isOpen"
                        value-format="HH:mm"
                        format="HH:mm"
                        :minute-step="1"
                        placeholder="時間"
                        :show-now="false"
                        :allow-clear="false"
                        :disabled-hours="() => getDisabledHours(actIndex)"
                        :disabled-minutes="(selectedHour) => getDisabledMinutes(selectedHour, actIndex)"
                        class="w-24 shadow-sm font-bold"
                        :bordered="true"
                        @open-change="(open) => handleTimeOpenChange(open, activity)"
                        @select="(val) => handleTimeSelect(val, activity)"
                      />
                      <!-- 連接線與圓點 -->
                      <div class="absolute top-[1.1rem] -right-[1.6rem] w-4 h-0.5 bg-gray-300"></div>
                      <div class="absolute top-[0.9rem] -right-[1.85rem] w-3 h-3 rounded-full bg-green-500 border-2 border-white ring-1 ring-gray-200"></div>
                    </div>

                    <!-- 右側：行程卡片 -->
                    <div class="flex-1 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div class="flex gap-3">
                         <!-- 拖曳手把 (移到卡片內) -->
                         <div class="cursor-move drag-handle mt-1 text-gray-300 hover:text-gray-600">
                            <GripVerticalIcon class="w-5 h-5" />
                         </div>

                         <!-- 內容區域 -->
                         <div class="flex-1 space-y-2">
                           <div class="flex justify-between items-start gap-3">
                              <!-- 標題輸入 -->
                              <div class="flex-1">
                                <div class="relative">
                                  <input
                                    :ref="(el) => { if (el) activityTitleRefs[actIndex] = el }"
                                    v-model="activity.title"
                                    placeholder="活動名稱"
                                    :class="[
                                      'w-full font-bold text-lg focus:outline-none placeholder-gray-300 border-b border-transparent focus:border-green-500 transition-colors pb-1',
                                      activity.title && activity.title.trim().length > 50 ? 'text-red-500' : 'text-gray-800',
                                    ]"
                                    maxlength="50"
                                    @keydown.enter.prevent="() => activityDescRefs[actIndex]?.focus()"
                                  />
                                  <span
                                    :class="[
                                      'absolute right-0 top-1 text-xs',
                                      activity.title && activity.title.trim().length > 50
                                        ? 'text-red-500 font-bold'
                                        : 'text-gray-300',
                                    ]"
                                  >
                                    {{ (activity.title || '').length }}/50
                                  </span>
                                </div>
                                <p v-if="activity.title && activity.title.trim().length > 50" class="text-xs text-red-500 mt-1">
                                  名稱過長
                                </p>
                              </div>

                               <!-- 刪除按鈕 -->
                               <button
                                  class="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="刪除"
                                  @click="removeActivity(actIndex)"

                                >
                                  <TrashIcon class="w-4 h-4" />
                                </button>
                           </div>

                            <!-- 描述輸入 -->
                            <div>
                              <div class="relative">
                                <textarea
                                  :ref="(el) => { if (el) activityDescRefs[actIndex] = el }"
                                  v-model="activity.desc"
                                  placeholder="添加備註..."
                                  rows="2"
                                  :class="[
                                    'w-full text-sm text-gray-600 bg-gray-50 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-100 placeholder-gray-400',
                                    activity.desc && activity.desc.trim().length > 500 ? 'text-red-500' : '',
                                  ]"
                                  maxlength="500"
                                  @keydown.enter.prevent="() => {
                                      // Focus next activity title if exists
                                      if (activityTitleRefs[actIndex + 1]) {
                                          activityTitleRefs[actIndex + 1].focus()
                                      }
                                  }"
                                ></textarea>
                                <span
                                  :class="[
                                    'absolute right-2 bottom-2 text-xs',
                                    activity.desc && activity.desc.trim().length > 500
                                      ? 'text-red-500 font-bold'
                                      : 'text-gray-300',
                                  ]"
                                >
                                  {{ (activity.desc || '').length }}/500
                                </span>
                              </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </template>
              </Draggable>
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
                        category.category && category.category.trim().length > 10
                          ? 'text-red-500'
                          : '',
                      ]"
                      maxlength="10"
                      @keydown.enter.prevent="() => {
                           // Focus first item input of this category if exists, or add one?
                           // Request: Enter -> jump to item
                           if (itemRefs[catIndex] && itemRefs[catIndex][0]) {
                               itemRefs[catIndex][0].focus()
                           } else {
                               addPackingItem(catIndex)
                           }
                      }"
                />
                  </div>
                  <p
                    v-if="category.category && category.category.trim().length > 10"
                    class="text-xs text-red-500 mt-1"
                  >
                    分類名稱不能超過 10 字
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
                    :ref="(el) => {
                        if (!itemRefs[catIndex]) itemRefs[catIndex] = []
                        if (el) itemRefs[catIndex][itemIndex] = el
                    }"
                    v-model="item.name"
                    placeholder="物品名稱"
                      :class="[
                        'flex-1 text-sm focus:outline-none',
                        item.name && item.name.trim().length > 10 ? 'text-red-500' : '',
                      ]"
                      maxlength="10"
                      @keydown.enter.prevent="() => {
                          addPackingItem(catIndex)
                      }"
                  />
                  <button
                    class="text-gray-300 hover:text-red-500"
                    @click="removePackingItem(catIndex, itemIndex)"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
                  </div>
                  <p
                    v-if="item.name && item.name.trim().length > 10"
                    class="text-xs text-red-500 mt-1"
                  >
                    物品名稱不能超過 10 字
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
          <div class="relative mb-6 flex items-center gap-2">
            <div class="relative flex-1">
              <input
                v-model="tagSearch"
                type="text"
                placeholder="輸入標籤..."
                :class="[
                  'w-full pl-10 pr-16 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none',
                  tagSearch && tagSearch.trim().length > 10
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-200 focus:border-green-500',
                ]"
                maxlength="10"
                @keyup.enter="addTag(tagSearch)"
              />
              <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              <div class="absolute right-3 top-3.5 pointer-events-none">
                <span
                  :class="[
                    'text-xs',
                    tagSearch && tagSearch.trim().length > 10
                      ? 'text-red-500 font-bold'
                      : 'text-gray-400',
                  ]"
                >
                  {{ (tagSearch || '').length }}/10
                </span>
              </div>
            </div>
            <button
              class="px-4 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              :disabled="!tagSearch.trim()"
              @click="addTag(tagSearch)"
            >
              創建標籤
            </button>
            <p
              v-if="tagSearch && tagSearch.trim().length > 10"
              class="absolute -bottom-6 left-0 text-xs text-red-500"
            >
              標籤不能超過 10 字
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
                    userStore.currentUser?.photoURL ||
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                  "
                  class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
                />
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="font-bold text-secondary-900">{{
                      userStore.currentUser?.displayName || '你'
                    }}</span>
                    <span
                      class="text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full"
                      >{{ userStore.currentUser?.spiritAnimal || '🦁 樂天派' }}</span
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
