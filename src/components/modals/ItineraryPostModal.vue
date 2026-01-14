<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
// 假設你有一個 API 用來新增精選行程
// import { createFeaturedItinerary } from '@/api/featured'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

const currentStep = ref('basic')
const formError = ref('')

// 表單資料結構
const postData = ref({
  title: '',
  description: '', // 對應精選行程的介紹
  price: null,
  agencyName: '',
  location: '', // 主要目的地
  durationDays: 1, // 總天數
  coverImage: '',
  tags: [],
  itinerary: { days: [] }, // 對應 itinerary_days 表
  packingList: [], // 對應 itinerary_packing_lists 表
})

const bannerPreview = ref('')
const activeDayIndex = ref(0)
const tagSearch = ref('')

// ... (大部分邏輯與 TravelerPostModal 相似，但針對欄位做調整) ...

// 驗證
const validateBasic = () => {
  if (!postData.value.title) return '請輸入行程標題'
  if (!postData.value.price) return '請輸入價格'
  if (!postData.value.agencyName) return '請輸入旅行社/提供者名稱'
  return ''
}

// 新增天數邏輯
const addDay = () => {
  const dayNumber = postData.value.itinerary.days.length + 1
  postData.value.itinerary.days.push({ day: dayNumber, activities: [] })
  activeDayIndex.value = postData.value.itinerary.days.length - 1
  postData.value.durationDays = postData.value.itinerary.days.length // 自動更新總天數
}

const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, activities: [] }
})

// 活動操作
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
const removeActivity = (index) => currentDay.value.activities.splice(index, 1)

// 標籤操作
const addTag = (tagText) => {
  const clean = tagText.replace(/^#/, '').trim()
  if (clean && !postData.value.tags.includes(clean)) postData.value.tags.push(clean)
  tagSearch.value = ''
}

// 步驟切換
const nextStep = () => {
  if (currentStep.value === 'basic') {
    const error = validateBasic()
    if (error) {
      formError.value = error
      return
    }
    // 如果行程天數為空，自動初始化
    if (postData.value.itinerary.days.length === 0) {
      for (let i = 0; i < postData.value.durationDays; i++) {
        postData.value.itinerary.days.push({ day: i + 1, activities: [] })
      }
    }
    currentStep.value = 'itinerary'
  } else if (currentStep.value === 'itinerary') {
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    currentStep.value = 'preview'
  }
}

const prevStep = () => {
  if (currentStep.value === 'preview') currentStep.value = 'packing'
  else if (currentStep.value === 'packing') currentStep.value = 'itinerary'
  else if (currentStep.value === 'itinerary') currentStep.value = 'basic'
}

const handleFinalSubmit = async () => {
  try {
    console.log('Submitting:', postData.value)
    // const res = await createFeaturedItinerary(postData.value)
    // if(res.success) { ... }

    alert('精選行程發布模擬成功！(請串接後端 API)')
    emit('success')
    emit('close')
  } catch (e) {
    console.error(e)
    formError.value = '發布失敗'
  }
}

// 初始化
if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({ day: 1, activities: [] })
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep !== 'basic'"
            class="p-2 hover:bg-gray-100 rounded-full"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-500" />
          </button>
          <h2 class="text-xl font-bold text-gray-800">上架精選行程</h2>
        </div>
        <button class="p-2 hover:bg-gray-100 rounded-full" @click="emit('close')">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div class="px-6 border-b border-gray-100 bg-gray-50">
        <div class="flex items-center space-x-8 text-sm font-bold py-3">
          <span :class="currentStep === 'basic' ? 'text-primary-600' : 'text-gray-400'"
            >1. 基本資訊</span
          >
          <span :class="currentStep === 'itinerary' ? 'text-primary-600' : 'text-gray-400'"
            >2. 每日行程</span
          >
          <span :class="currentStep === 'packing' ? 'text-primary-600' : 'text-gray-400'"
            >3. 打包建議</span
          >
          <span :class="currentStep === 'preview' ? 'text-primary-600' : 'text-gray-400'"
            >4. 預覽發布</span
          >
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <div v-if="currentStep === 'basic'" class="space-y-6">
          <div>
            <label class="block font-bold text-gray-700 mb-2">行程標題</label>
            <input
              v-model="postData.title"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 outline-none"
              placeholder="例如：京都深度五日遊"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-2">價格 (NT$)</label>
              <div class="relative">
                <DollarSignIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model.number="postData.price"
                  type="number"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-2">旅行社/提供者</label>
              <div class="relative">
                <BuildingIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model="postData.agencyName"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-2">地點</label>
              <input
                v-model="postData.location"
                class="w-full p-3 border-2 border-gray-200 rounded-xl"
                placeholder="例如：日本關西"
              />
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-2">總天數</label>
              <input
                v-model.number="postData.durationDays"
                type="number"
                min="1"
                class="w-full p-3 border-2 border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-2">行程介紹</label>
            <textarea
              v-model="postData.description"
              rows="4"
              class="w-full p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-primary-500 outline-none"
            ></textarea>
          </div>

          <div>
            <label class="block font-bold text-gray-700 mb-2">標籤 (按 Enter 新增)</label>
            <div class="flex flex-wrap gap-2 mb-2" v-if="postData.tags.length">
              <span
                v-for="(tag, idx) in postData.tags"
                :key="idx"
                class="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm"
                >#{{ tag }}</span
              >
            </div>
            <input
              v-model="tagSearch"
              @keyup.enter="addTag(tagSearch)"
              class="w-full p-3 border-2 border-gray-200 rounded-xl"
              placeholder="輸入標籤..."
            />
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg">行程規劃</h3>
            <button
              @click="addDay"
              class="text-primary-600 font-bold hover:bg-primary-50 px-3 py-1 rounded"
            >
              <PlusIcon class="inline w-4 h-4" /> 新增天數
            </button>
          </div>

          <div class="flex overflow-x-auto gap-2 pb-2">
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
            <div class="mb-4 font-bold text-gray-700">正在編輯 Day {{ currentDay.day }}</div>

            <div class="space-y-3">
              <div
                v-for="(act, aIdx) in currentDay.activities"
                :key="act.id"
                class="bg-white p-3 rounded border shadow-sm"
              >
                <div class="flex justify-between mb-2">
                  <input
                    v-model="act.time"
                    type="time"
                    class="bg-gray-100 rounded px-2 font-bold"
                  />
                  <button @click="removeActivity(aIdx)" class="text-gray-400 hover:text-red-500">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <input
                  v-model="act.title"
                  placeholder="活動標題"
                  class="w-full font-bold mb-1 border-b border-transparent focus:border-primary-300 outline-none"
                />
                <textarea
                  v-model="act.desc"
                  placeholder="詳細描述..."
                  class="w-full text-sm text-gray-600 resize-none outline-none bg-transparent"
                ></textarea>
              </div>
            </div>

            <button
              @click="addActivity"
              class="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-primary-400 hover:text-primary-600"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 'packing'">
          <div class="text-center text-gray-400 py-10">
            (此處邏輯與 TravelerPostModal 打包清單相同，省略以節省篇幅)
            <br />
            請在此實作新增 Category 與 Items 的介面
          </div>
        </div>

        <div v-else-if="currentStep === 'preview'">
          <div class="text-center py-10 space-y-4">
            <h3 class="text-2xl font-black text-gray-800">{{ postData.title }}</h3>
            <div class="text-primary-600 font-bold text-xl">NT$ {{ postData.price }}</div>
            <p class="text-gray-600">確認資訊無誤後請點擊發布。</p>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
        <div v-if="formError" class="mr-auto text-red-500 font-bold self-center">
          {{ formError }}
        </div>

        <button
          v-if="currentStep === 'preview'"
          @click="handleFinalSubmit"
          class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700"
        >
          確認發布
        </button>
        <button
          v-else
          @click="nextStep"
          class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700"
        >
          下一步
        </button>
      </div>
    </div>
  </div>
</template>
