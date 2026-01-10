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
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { createTraveler } from '@/api/travelers'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

// 步驟控制
const currentStep = ref('basic') // 'basic', 'itinerary', 'packing', 'tags', 'preview'

// 表單資料
const postData = ref({
  title: '',
  content: '',
  location: '',
  start_date: '',
  end_date: '',
  max_people: 2,
  banner_image: '',
  tags: [],
  itinerary: {
    days: [],
  },
  packingList: [],
})

// Banner 圖片預覽
const bannerPreview = ref('')
const bannerFileInput = ref(null)

// 行程相關
const activeDayIndex = ref(0)

// 標籤搜尋
const tagSearch = ref('')

// 推薦標籤
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
  '限女生',
]

// 過濾標籤
const filteredTags = computed(() => {
  if (!tagSearch.value) return suggestedTags
  return suggestedTags.filter((tag) => tag.toLowerCase().includes(tagSearch.value.toLowerCase()))
})

// 當前行程天
const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, date: '', activities: [] }
})

// 驗證基本資訊
const validateBasic = () => {
  if (!postData.value.title.trim()) {
    alert('請輸入標題')
    return false
  }
  if (!postData.value.content.trim()) {
    alert('請輸入內容')
    return false
  }
  if (!postData.value.location.trim()) {
    alert('請輸入地點')
    return false
  }
  if (!postData.value.start_date) {
    alert('請選擇開始日期')
    return false
  }
  if (!postData.value.end_date) {
    alert('請選擇結束日期')
    return false
  }
  if (new Date(postData.value.end_date) < new Date(postData.value.start_date)) {
    alert('結束日期不能早於開始日期')
    return false
  }
  if (postData.value.max_people < 2) {
    alert('最多人數至少為 2 人')
    return false
  }
  return true
}

// Banner 圖片處理
const triggerBannerSelect = () => {
  bannerFileInput.value?.click()
}

const handleBannerSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案')
    return
  }

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

  if (bannerFileInput.value) {
    bannerFileInput.value.value = ''
  }
}

const removeBanner = () => {
  bannerPreview.value = ''
  postData.value.banner_image = ''
}

// 行程處理
const addDay = () => {
  const dayNumber = postData.value.itinerary.days.length + 1
  postData.value.itinerary.days.push({
    day: dayNumber,
    date: '',
    activities: [],
  })
  activeDayIndex.value = postData.value.itinerary.days.length - 1
}

const removeDay = (index) => {
  if (postData.value.itinerary.days.length === 1) {
    alert('至少要保留一天行程')
    return
  }
  postData.value.itinerary.days.splice(index, 1)
  // 重新編號
  postData.value.itinerary.days.forEach((day, i) => {
    day.day = i + 1
  })
  if (activeDayIndex.value >= postData.value.itinerary.days.length) {
    activeDayIndex.value = postData.value.itinerary.days.length - 1
  }
}

const addActivity = () => {
  if (!currentDay.value.activities) {
    currentDay.value.activities = []
  }
  currentDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    title: '',
    desc: '',
    icon: 'map-pin',
  })
}

const removeActivity = (activityIndex) => {
  currentDay.value.activities.splice(activityIndex, 1)
}

// 打包清單處理
const addPackingCategory = () => {
  postData.value.packingList.push({
    category: '',
    items: [],
  })
}

const removePackingCategory = (index) => {
  postData.value.packingList.splice(index, 1)
}

const addPackingItem = (categoryIndex) => {
  const category = postData.value.packingList[categoryIndex]
  if (!category.items) {
    category.items = []
  }
  category.items.push({
    id: Date.now(),
    name: '',
    checked: false,
  })
}

const removePackingItem = (categoryIndex, itemIndex) => {
  postData.value.packingList[categoryIndex].items.splice(itemIndex, 1)
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

// 步驟導航
const nextStep = () => {
  if (currentStep.value === 'basic') {
    if (!validateBasic()) return

    // 自動生成行程天數
    if (postData.value.itinerary.days.length === 0) {
      const start = new Date(postData.value.start_date)
      const end = new Date(postData.value.end_date)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

      for (let i = 0; i < days; i++) {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        postData.value.itinerary.days.push({
          day: i + 1,
          date: date.toISOString().split('T')[0],
          activities: [],
        })
      }
    }

    currentStep.value = 'itinerary'
  } else if (currentStep.value === 'itinerary') {
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

const prevStep = () => {
  if (currentStep.value === 'preview') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    currentStep.value = 'itinerary'
  } else if (currentStep.value === 'itinerary') {
    currentStep.value = 'basic'
  }
}

// 最終發布
const handleFinalSubmit = async () => {
  if (!validateBasic()) return

  if (!auth.currentUser) {
    alert('請先登入')
    return
  }

  try {
    const payload = {
      title: postData.value.title,
      content: postData.value.content,
      banner_image: postData.value.banner_image || 'https://picsum.photos/1200/400',
      location: postData.value.location,
      start_date: postData.value.start_date,
      end_date: postData.value.end_date,
      max_people: postData.value.max_people,
      author_uid: auth.currentUser.uid,
      author_name: userStore.currentUser?.displayName || '匿名',
      author_avatar:
        userStore.currentUser?.photoURL ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      spirit_animal: userStore.currentUser?.spiritAnimal || '🦁 樂天派',
      tags: postData.value.tags,
      itinerary: postData.value.itinerary,
      packingList: postData.value.packingList,
    }

    console.log('發布旅伴招募：', payload)

    const response = await createTraveler(payload)

    if (response.success) {
      alert('✨ 旅伴招募發布成功！')
      emit('success')
    } else {
      alert('發布失敗：' + (response.message || '請稍後再試'))
    }
  } catch (error) {
    console.error('發布錯誤：', error)
    alert('發布失敗：' + (error.message || '請稍後再試'))
  }
}

// 初始化：確保有至少一天的行程
if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({
    day: 1,
    date: '',
    activities: [],
  })
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border-4 border-gray-800 rounded-xl animate-pop-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b-4 border-gray-800 bg-gradient-to-r from-green-100 to-emerald-100"
      >
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep !== 'basic'"
            class="p-2 hover:bg-white/80 rounded-full transition border-2 border-gray-800 bg-white"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <h2 class="text-2xl font-black text-gray-800">找旅伴招募</h2>
        </div>
        <button
          class="p-2 hover:bg-white/80 rounded-full transition border-2 border-gray-800 bg-white"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Progress Steps -->
      <div class="px-6 pt-4 pb-2 bg-gray-50">
        <div class="flex items-center justify-between text-xs font-bold">
          <div
            :class="[
              'flex-1 text-center pb-2 border-b-4 transition',
              currentStep === 'basic'
                ? 'border-green-500 text-green-600'
                : 'border-gray-200 text-gray-400',
            ]"
          >
            基本資訊
          </div>
          <div
            :class="[
              'flex-1 text-center pb-2 border-b-4 transition',
              currentStep === 'itinerary'
                ? 'border-green-500 text-green-600'
                : 'border-gray-200 text-gray-400',
            ]"
          >
            行程規劃
          </div>
          <div
            :class="[
              'flex-1 text-center pb-2 border-b-4 transition',
              currentStep === 'packing'
                ? 'border-green-500 text-green-600'
                : 'border-gray-200 text-gray-400',
            ]"
          >
            打包清單
          </div>
          <div
            :class="[
              'flex-1 text-center pb-2 border-b-4 transition',
              currentStep === 'tags'
                ? 'border-green-500 text-green-600'
                : 'border-gray-200 text-gray-400',
            ]"
          >
            標籤
          </div>
          <div
            :class="[
              'flex-1 text-center pb-2 border-b-4 transition',
              currentStep === 'preview'
                ? 'border-green-500 text-green-600'
                : 'border-gray-200 text-gray-400',
            ]"
          >
            預覽
          </div>
        </div>
      </div>

      <!-- Step 1: 基本資訊 -->
      <div v-if="currentStep === 'basic'" class="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            標題 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="postData.title"
            type="text"
            placeholder="例如：徵求一位女生分攤札幌住宿費"
            class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
            maxlength="100"
          />
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            內容 <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="postData.content"
            placeholder="詳細描述你的旅行計劃..."
            rows="5"
            class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              <MapPinIcon class="w-4 h-4 inline mr-1" />
              地點 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="postData.location"
              type="text"
              placeholder="例如：日本"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              <UsersIcon class="w-4 h-4 inline mr-1" />
              最多人數 <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="postData.max_people"
              type="number"
              min="2"
              max="20"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              <CalendarIcon class="w-4 h-4 inline mr-1" />
              開始日期 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="postData.start_date"
              type="date"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">
              <CalendarIcon class="w-4 h-4 inline mr-1" />
              結束日期 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="postData.end_date"
              type="date"
              class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Banner 圖片 <span class="text-gray-400">(選填)</span>
          </label>
          <div
            v-if="bannerPreview"
            class="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300 mb-2"
          >
            <img :src="bannerPreview" alt="Banner" class="w-full h-full object-cover" />
            <button
              class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
              @click="removeBanner"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>
          <button
            v-else
            class="w-full py-3 border-2 border-dashed border-gray-400 text-gray-500 font-bold rounded-lg hover:bg-gray-50 hover:border-green-400 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
            @click="triggerBannerSelect"
          >
            <ImageIcon class="w-5 h-5" />
            上傳 Banner 圖片
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

      <!-- Step 2: 行程規劃 -->
      <div v-else-if="currentStep === 'itinerary'" class="flex-1 overflow-y-auto p-6 space-y-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">行程規劃</h3>
          <button
            class="px-3 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition flex items-center gap-2 border-2 border-gray-800"
            @click="addDay"
          >
            <PlusIcon class="w-4 h-4" />
            新增天數
          </button>
        </div>

        <!-- 天數選擇 -->
        <div class="flex overflow-x-auto space-x-2 pb-2">
          <button
            v-for="(day, index) in postData.itinerary.days"
            :key="index"
            :class="[
              'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
              activeDayIndex === index
                ? 'bg-green-600 text-white border-green-700'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="activeDayIndex = index"
          >
            Day {{ day.day }}
            <button
              v-if="postData.itinerary.days.length > 1"
              class="ml-2 text-red-400 hover:text-red-600"
              @click.stop="removeDay(index)"
            >
              <XIcon class="w-3 h-3 inline" />
            </button>
          </button>
        </div>

        <!-- 當天日期 -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2"
            >Day {{ currentDay.day }} 日期</label
          >
          <input
            v-model="currentDay.date"
            type="date"
            class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold"
          />
        </div>

        <!-- 活動列表 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-gray-700">活動安排</h4>
            <button
              class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition text-sm flex items-center gap-1"
              @click="addActivity"
            >
              <PlusIcon class="w-3 h-3" />
              新增活動
            </button>
          </div>

          <div
            v-for="(activity, actIndex) in currentDay.activities"
            :key="activity.id"
            class="p-4 border-2 border-gray-200 rounded-lg space-y-2 bg-gray-50"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-gray-500">活動 {{ actIndex + 1 }}</span>
              <button class="text-red-500 hover:text-red-700" @click="removeActivity(actIndex)">
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="activity.time"
                type="time"
                class="p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-sm font-bold"
              />
              <input
                v-model="activity.title"
                type="text"
                placeholder="活動名稱"
                class="p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-sm font-bold"
              />
            </div>

            <textarea
              v-model="activity.desc"
              placeholder="活動描述"
              rows="2"
              class="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none text-sm"
            ></textarea>
          </div>

          <p v-if="currentDay.activities.length === 0" class="text-center text-gray-400 py-4">
            尚未新增活動
          </p>
        </div>
      </div>

      <!-- Step 3: 打包清單 -->
      <div v-else-if="currentStep === 'packing'" class="flex-1 overflow-y-auto p-6 space-y-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">
            <CheckSquareIcon class="w-5 h-5 inline mr-2" />
            打包清單
          </h3>
          <button
            class="px-3 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition flex items-center gap-2 border-2 border-gray-800"
            @click="addPackingCategory"
          >
            <PlusIcon class="w-4 h-4" />
            新增分類
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-for="(category, catIndex) in postData.packingList"
            :key="catIndex"
            class="p-4 border-2 border-gray-200 rounded-lg bg-gray-50"
          >
            <div class="flex items-center justify-between mb-3">
              <input
                v-model="category.category"
                type="text"
                placeholder="分類名稱（例如：衣物）"
                class="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none font-bold mr-2"
              />
              <button
                class="p-2 text-red-500 hover:text-red-700"
                @click="removePackingCategory(catIndex)"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(item, itemIndex) in category.items"
                :key="item.id"
                class="flex items-center gap-2"
              >
                <input
                  v-model="item.name"
                  type="text"
                  placeholder="物品名稱"
                  class="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-sm"
                />
                <button
                  class="text-red-500 hover:text-red-700"
                  @click="removePackingItem(catIndex, itemIndex)"
                >
                  <XIcon class="w-4 h-4" />
                </button>
              </div>

              <button
                class="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-lg hover:bg-gray-100 transition text-sm"
                @click="addPackingItem(catIndex)"
              >
                + 新增物品
              </button>
            </div>
          </div>

          <p v-if="postData.packingList.length === 0" class="text-center text-gray-400 py-4">
            尚未新增打包清單
          </p>
        </div>
      </div>

      <!-- Step 4: 標籤 -->
      <div v-else-if="currentStep === 'tags'" class="flex-1 overflow-y-auto p-6">
        <div class="relative mb-6">
          <input
            v-model="tagSearch"
            type="text"
            placeholder="搜尋或建立新標籤..."
            class="w-full pl-10 pr-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl focus:outline-none focus:border-green-500 font-bold"
            @keyup.enter="addTag(tagSearch)"
          />
          <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
        </div>

        <div v-if="postData.tags.length > 0" class="mb-6">
          <h4 class="text-sm font-bold text-gray-700 mb-2">已選標籤：</h4>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(tag, index) in postData.tags"
              :key="index"
              class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border-2 border-green-300 flex items-center gap-1"
            >
              #{{ tag }}
              <button class="hover:text-red-500" @click="removeTag(index)">
                <XIcon class="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>

        <button
          v-if="tagSearch"
          class="w-full text-left p-3 hover:bg-gray-100 rounded-lg flex items-center gap-3 mb-4 border-2 border-dashed border-green-300"
          @click="addTag(tagSearch)"
        >
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <span class="font-bold text-lg text-green-600">+</span>
          </div>
          <div>
            <p class="font-bold text-green-600">新增「{{ tagSearch }}」</p>
          </div>
        </button>

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

      <!-- Step 5: 預覽 -->
      <div v-else-if="currentStep === 'preview'" class="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div class="bg-white p-5 border-2 border-gray-200 rounded-lg shadow-sm space-y-4">
          <div
            v-if="bannerPreview"
            class="w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300"
          >
            <img :src="bannerPreview" alt="Banner" class="w-full h-full object-cover" />
          </div>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gray-300 border-2 border-gray-400"></div>
            <div>
              <p class="font-bold text-sm">{{ userStore.currentUser?.displayName || '你' }}</p>
              <p class="text-xs text-gray-500">剛剛</p>
            </div>
          </div>

          <h2 class="text-xl font-bold">{{ postData.title }}</h2>
          <p class="text-gray-700 whitespace-pre-wrap">{{ postData.content }}</p>

          <div class="flex flex-wrap gap-4 text-sm text-gray-700">
            <span class="flex items-center font-bold">
              <MapPinIcon class="w-4 h-4 mr-1 text-red-500" />
              {{ postData.location }}
            </span>
            <span class="flex items-center font-bold">
              <CalendarIcon class="w-4 h-4 mr-1 text-amber-500" />
              {{ postData.start_date }} ~ {{ postData.end_date }}
            </span>
            <span class="flex items-center font-bold">
              <UsersIcon class="w-4 h-4 mr-1 text-blue-500" />
              1/{{ postData.max_people }} 人
            </span>
          </div>

          <div v-if="postData.tags.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="tag in postData.tags"
              :key="tag"
              class="text-purple-700 bg-purple-100 px-2 py-1 rounded-full text-xs font-bold"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="text-sm text-gray-500 pt-4 border-t border-gray-200">
            <p>📅 行程天數：{{ postData.itinerary.days.length }} 天</p>
            <p>📦 打包清單：{{ postData.packingList.length }} 個分類</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t-2 border-gray-200 bg-white flex gap-3">
        <button
          v-if="currentStep !== 'preview'"
          class="flex-1 py-3 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg border-4 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]"
          @click="nextStep"
        >
          下一步
        </button>
        <template v-else>
          <button
            class="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-200 rounded-lg border-4 border-gray-800"
            @click="prevStep"
          >
            返回修改
          </button>
          <button
            class="flex-1 py-3 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg border-4 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]"
            @click="handleFinalSubmit"
          >
            <SendIcon class="w-4 h-4 inline mr-2" />
            確認發布
          </button>
        </template>
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
