<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Send as SendIcon,
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
  Coffee as CoffeeIcon,
  Camera as CameraIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { createTraveler } from '@/api/travelers'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()
const myItineraryStore = useMyItineraryStore()

const currentStep = ref('basic')
const formError = ref('')
const isSubmitting = ref(false) // 防止重複提交

// 預覽頁面的 Tab 狀態
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

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'camera':
      return CameraIcon
    case 'coffee':
      return CoffeeIcon
    case 'map-pin':
      return MapPinIcon
    default:
      return MapIcon
  }
}

const getDayLabel = (index) => {
  const startDateStr = postData.value.start_date
  if (!startDateStr) return `Day ${index + 1}`
  const date = new Date(startDateStr)
  date.setDate(date.getDate() + index)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d}`
}

const validateBasic = () => {
  formError.value = ''
  if (!postData.value.title.trim()) return '請輸入標題'
  if (!postData.value.content.trim()) return '請輸入內容'
  if (!postData.value.location.trim()) return '請輸入地點'
  if (!postData.value.start_date) return '請選擇開始日期'
  if (!postData.value.end_date) return '請選擇結束日期'
  if (new Date(postData.value.end_date) < new Date(postData.value.start_date)) {
    return '結束日期不能早於開始日期'
  }
  return ''
}

const triggerBannerSelect = () => bannerFileInput.value?.click()

const handleBannerSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('圖片大小不能超過 5MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    bannerPreview.value = e.target.result
    postData.value.banner_image = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeBanner = () => {
  bannerPreview.value = ''
  postData.value.banner_image = ''
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

const removeDay = (index) => {
  if (postData.value.itinerary.days.length === 1) return
  postData.value.itinerary.days.splice(index, 1)
  postData.value.itinerary.days.forEach((day, i) => {
    day.day = i + 1
  })
  if (activeDayIndex.value >= postData.value.itinerary.days.length) {
    activeDayIndex.value = postData.value.itinerary.days.length - 1
  }
  const lastDay = postData.value.itinerary.days[postData.value.itinerary.days.length - 1]
  if (lastDay && lastDay.date) {
    postData.value.end_date = lastDay.date
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

const addPackingCategory = () => postData.value.packingList.push({ category: '', items: [] })
const removePackingCategory = (index) => postData.value.packingList.splice(index, 1)
const addPackingItem = (categoryIndex) => {
  const category = postData.value.packingList[categoryIndex]
  if (!category.items) category.items = []
  category.items.push({ id: Date.now(), name: '', checked: false })
}
const removePackingItem = (categoryIndex, itemIndex) =>
  postData.value.packingList[categoryIndex].items.splice(itemIndex, 1)

const addTag = (tagText) => {
  const cleanTag = tagText.replace(/^#/, '').trim()
  if (cleanTag && !postData.value.tags.includes(cleanTag)) postData.value.tags.push(cleanTag)
  tagSearch.value = ''
}
const removeTag = (index) => postData.value.tags.splice(index, 1)

const nextStep = () => {
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
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
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
  // 即使欄位沒填完，只要有標題建議就可以存
  if (!postData.value.title.trim()) {
    formError.value = '請至少輸入標題才能儲存草稿'
    return
  }

  // 建立草稿物件
  const draftData = {
    id: Date.now(), // 暫時 ID
    type: 'traveler', // 標記為找旅伴類型
    typeLabel: '找旅伴', // 顯示在卡片上的標籤
    title: postData.value.title,
    content: postData.value.content || '無內容',
    saveTime: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(postData.value)), // 深拷貝當前表單資料
  }

  // 存入 Store
  myItineraryStore.addDraft(draftData)

  alert('📦 已儲存至「我的行程」草稿夾！')
  emit('close')
}

// 確認發布 (改進版：防止重複提交 + 詳細錯誤處理)
const handleFinalSubmit = async () => {
  // 防止重複提交
  if (isSubmitting.value) {
    console.log('正在提交中，請稍候...')
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

  isSubmitting.value = true
  formError.value = ''

  try {
    // 只發送後端需要的字段，避免傳遞多餘資料
    const payload = {
      title: postData.value.title,
      content: postData.value.content,
      banner_image: postData.value.banner_image || 'https://picsum.photos/1200/400',
      location: postData.value.location,
      start_date: postData.value.start_date,
      end_date: postData.value.end_date,
      max_people: postData.value.max_people,
      status: '招募中',
      tags: postData.value.tags || [],
      itinerary: postData.value.itinerary,
      packingList: postData.value.packingList || [],
      author_uid: auth.currentUser.uid,
      author_name: userStore.currentUser?.displayName || '匿名',
      author_avatar:
        userStore.currentUser?.photoURL ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      spirit_animal: userStore.currentUser?.spiritAnimal || '🦁 樂天派',
    }

    console.log('🚀 準備發送 payload:', payload)

    const response = await createTraveler(payload)

    console.log('✅ API 回應:', response)

    if (response.success) {
      alert('✨ 旅伴招募發布成功！')
      emit('success')
      emit('close')
    } else {
      formError.value = '發布失敗：' + (response.message || '請稍後再試')
    }
  } catch (error) {
    console.error('❌ 發布錯誤詳情:', error)

    // 更詳細的錯誤訊息
    if (error.response) {
      // 後端返回錯誤 (4xx, 5xx)
      const errorMsg = error.response.data?.message || error.response.statusText
      formError.value = `發布失敗：${errorMsg}`
      console.error('後端錯誤:', error.response.data)
      console.error('狀態碼:', error.response.status)
    } else if (error.request) {
      // 請求發送但沒有收到回應（網路問題）
      formError.value = '網路連線問題，請檢查網路後重試'
      console.error('無回應，請求對象:', error.request)
    } else {
      // 其他錯誤（設置請求時發生的錯誤）
      formError.value = '發布失敗：' + (error.message || '發生未知錯誤')
      console.error('錯誤:', error.message)
    }
  } finally {
    isSubmitting.value = false
  }
}

if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({ day: 1, date: '', activities: [] })
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
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="emit('close')">
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
            <label class="block text-sm font-bold text-gray-700 mb-2">標題</label>
            <input
              v-model="postData.title"
              type="text"
              placeholder="例如：徵求一位女生分攤札幌住宿費"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
              maxlength="100"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">內容</label>
            <textarea
              v-model="postData.content"
              placeholder="詳細描述你的旅行計劃..."
              rows="5"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none resize-none transition"
            ></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">地點</label>
              <input
                v-model="postData.location"
                type="text"
                placeholder="例如：日本"
                class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">最多人數</label>
              <input
                v-model.number="postData.max_people"
                type="number"
                min="2"
                class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
              />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">開始日期</label>
              <input
                v-model="postData.start_date"
                type="date"
                class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">結束日期</label>
              <input
                v-model="postData.end_date"
                type="date"
                class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
              />
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
                class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition"
                @click="removeBanner"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <button
              v-else
              class="w-full py-8 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-green-500 hover:text-green-600 transition flex flex-col items-center justify-center gap-2"
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
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
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
              Day {{ day.day }}
            </button>
          </div>
          <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <span class="font-bold text-gray-700">Day {{ currentDay.day }} 日期</span>
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
                <input
                  v-model="activity.title"
                  placeholder="活動名稱"
                  class="w-full font-bold text-lg mb-2 focus:outline-none"
                />
                <textarea
                  v-model="activity.desc"
                  placeholder="活動描述..."
                  rows="2"
                  class="w-full text-sm text-gray-600 bg-transparent resize-none focus:outline-none"
                ></textarea>
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
                <input
                  v-model="category.category"
                  placeholder="分類名稱"
                  class="bg-transparent font-bold text-gray-800 focus:outline-none"
                />
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
                  class="flex items-center gap-2 bg-white p-2 rounded border border-gray-100"
                >
                  <input
                    v-model="item.name"
                    placeholder="物品名稱"
                    class="flex-1 text-sm focus:outline-none"
                  />
                  <button
                    class="text-gray-300 hover:text-red-500"
                    @click="removePackingItem(catIndex, itemIndex)"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
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
              class="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="(tag, i) in postData.tags"
              :key="i"
              class="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-100 flex items-center gap-1"
            >
              #{{ tag }} <button @click="removeTag(i)"><XIcon class="w-3 h-3" /></button>
            </span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in filteredTags"
              :key="tag"
              @click="addTag(tag)"
              class="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
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
                  Day {{ day.day }}
                </button>
              </div>
              <div
                class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm"
                v-if="currentDay"
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
              type="button"
              class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              type="button"
              class="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="isSubmitting"
              @click="handleFinalSubmit"
            >
              {{ isSubmitting ? '發布中...' : '確認發布' }}
            </button>
          </template>

          <button
            v-else
            type="button"
            class="flex-1 py-3 text-white bg-green-600 hover:bg-green-700 rounded-xl font-bold transition shadow-md"
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
