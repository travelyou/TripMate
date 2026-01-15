<script setup>
import { ref, computed, watch } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
  CheckSquare as CheckSquareIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  MapPin as MapPinIcon,
  AlertCircle as AlertIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { createItinerary } from '@/api/itinerary'

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

const currentStep = ref('basic')
const formError = ref('')
const isSubmitting = ref(false)

// 表單資料結構
const postData = ref({
  title: '',
  description: '',
  price: null,
  agencyName: '',
  location: '',
  start_date: '',
  end_date: '',
  durationDays: 1,
  max_people: 20,
  coverImage: '',
  tags: [],
  itinerary: { days: [] },
  packingList: [],
})

const activeDayIndex = ref(0)
const tagSearch = ref('')

// --- Helper: 取得今天的日期字串 (YYYY-MM-DD) ---
const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
// 綁定給 input 的 min 屬性使用
const minDate = getTodayString()

// --- 驗證邏輯 ---
const validateBasic = () => {
  if (!postData.value.title) return '請輸入行程標題'
  if (postData.value.title.length > 35) return '標題不能超過 35 個字元'

  // ★ 限制：價格檢查 (非空、非負、不超過一百萬、必須是整數)
  if (postData.value.price === null || postData.value.price === '') return '請輸入價格'
  if (postData.value.price < 0) return '價格不能為負數'
  if (postData.value.price > 1000000) return '價格不能超過 1,000,000'
  if (!Number.isInteger(postData.value.price)) return '價格必須為整數'

  // ★ 限制：廠商名稱字數
  if (!postData.value.agencyName) return '請輸入旅行社/提供者名稱'
  if (postData.value.agencyName.length > 15) return '廠商名稱不能超過 15 個字'

  // ★ 限制：地點字數
  if (postData.value.location && postData.value.location.length > 10)
    return '地點名稱不能超過 10 個字'

  if (!postData.value.start_date || !postData.value.end_date) return '請選擇行程日期'

  // ★ 限制：出發日期不能早於今天
  // 將字串轉為日期物件進行比較 (設為當天 00:00:00 避免時分秒誤差)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(postData.value.start_date)
  if (startDate < today) return '出發日期不能早於今天'

  if (postData.value.description.length > 5000) return '行程介紹不能超過 5000 字'

  if (postData.value.max_people > 999) return '人數限制不能超過 999 人'
  if (postData.value.max_people < 1) return '人數限制至少 1 人'

  if (postData.value.tags.length > 5) return '標籤最多只能設定 5 個'

  return ''
}

// --- 日期與天數計算邏輯 ---
const calculateDuration = () => {
  if (postData.value.start_date && postData.value.end_date) {
    const start = new Date(postData.value.start_date)
    const end = new Date(postData.value.end_date)
    const diffTime = end - start
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (diffDays <= 0) {
      formError.value = '結束日期必須晚於或等於起始日期'
      postData.value.durationDays = 0
      return
    }

    if (diffDays > 364) {
      formError.value = '行程天數不能超過 364 天'
      postData.value.durationDays = 0
      return
    }

    formError.value = ''
    postData.value.durationDays = diffDays
    updateItineraryDays(diffDays)
  }
}

const updateItineraryDays = (daysCount) => {
  const currentDays = postData.value.itinerary.days
  if (daysCount > currentDays.length) {
    for (let i = currentDays.length; i < daysCount; i++) {
      currentDays.push({ day: i + 1, activities: [] })
    }
  } else if (daysCount < currentDays.length) {
    postData.value.itinerary.days = currentDays.slice(0, daysCount)
  }
  if (activeDayIndex.value >= daysCount) {
    activeDayIndex.value = Math.max(0, daysCount - 1)
  }
}

watch(() => [postData.value.start_date, postData.value.end_date], calculateDuration)

const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, activities: [] }
})

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

// --- 打包清單邏輯 ---
const addPackingCategory = () => {
  // ★ 限制：最多 10 個分類
  if (postData.value.packingList.length >= 10) {
    alert('打包物品最多只能設定 10 個分類')
    return
  }
  postData.value.packingList.push({ category: '新分類', items: [] })
}

const removePackingCategory = (index) => {
  postData.value.packingList.splice(index, 1)
}

const addPackingItem = (catIndex) => {
  // ★ 限制：每個分類最多 15 個物品
  if (postData.value.packingList[catIndex].items.length >= 15) {
    alert('每個分類最多只能包含 15 個物品')
    return
  }
  postData.value.packingList[catIndex].items.push('')
}

const removePackingItem = (catIndex, itemIndex) => {
  postData.value.packingList[catIndex].items.splice(itemIndex, 1)
}

// --- 標籤邏輯 ---
const addTag = (tagText) => {
  const clean = tagText.replace(/^#/, '').trim()
  if (!clean) return
  if (clean.length > 30) {
    alert('標籤名稱不能超過 30 個字元')
    return
  }
  if (postData.value.tags.length >= 5) {
    alert('標籤最多只能設定 5 個')
    return
  }
  if (!postData.value.tags.includes(clean)) {
    postData.value.tags.push(clean)
  }
  tagSearch.value = ''
}
const removeTag = (index) => {
  postData.value.tags.splice(index, 1)
}

// --- 步驟控制 ---
const nextStep = () => {
  if (currentStep.value === 'basic') {
    const error = validateBasic()
    if (error) {
      formError.value = error
      return
    }
    currentStep.value = 'itinerary'
  } else if (currentStep.value === 'itinerary') {
    if (postData.value.packingList.length === 0) {
      postData.value.packingList.push(
        { category: '證件與金錢', items: ['護照', '現金', '信用卡'] },
        { category: '衣物', items: ['換洗衣物', '外套'] },
      )
    }
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

// --- 送出表單 ---
const handleFinalSubmit = async () => {
  isSubmitting.value = true
  formError.value = ''
  try {
    const res = await createItinerary(postData.value)

    if (res.success) {
      emit('success')
      emit('close')
    } else {
      formError.value = res.message || '發布失敗'
    }
  } catch (e) {
    console.error(e)
    formError.value = '伺服器錯誤，請稍後再試'
  } finally {
    isSubmitting.value = false
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
              maxlength="35"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 outline-none"
              placeholder="例如：京都深度五日遊 (限35字)"
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
                  min="0"
                  max="1000000"
                  step="1"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                  placeholder="0 ~ 1,000,000"
                />
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-2">旅行社/提供者</label>
              <div class="relative">
                <BuildingIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model="postData.agencyName"
                  maxlength="15"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                  placeholder="限 15 字內"
                />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-2">出發日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model="postData.start_date"
                  type="date"
                  :min="minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-2">結束日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model="postData.end_date"
                  type="date"
                  :min="postData.start_date || minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>
          <div
            v-if="postData.durationDays > 0"
            class="text-sm text-primary-600 font-bold bg-primary-50 p-2 rounded-lg"
          >
            預計行程天數：{{ postData.durationDays }} 天
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-gray-700 mb-2">地點</label>
              <div class="relative">
                <MapPinIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model="postData.location"
                  maxlength="10"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl"
                  placeholder="限 10 字內，例如：日本關西"
                />
              </div>
            </div>
            <div>
              <label class="block font-bold text-gray-700 mb-2">團體人數上限</label>
              <div class="relative">
                <UsersIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  v-model.number="postData.max_people"
                  type="number"
                  min="1"
                  max="999"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl"
                  placeholder="限制 999 人內"
                />
              </div>
              <p class="text-xs text-gray-400 mt-1 text-right">上限 999 人</p>
            </div>
          </div>
          <div>
            <label class="block font-bold text-gray-700 mb-2">封面圖片網址</label>
            <input
              v-model="postData.coverImage"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 outline-none"
              placeholder="https://..."
            />
          </div>
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="block font-bold text-gray-700">行程介紹</label>
              <span
                :class="postData.description.length > 5000 ? 'text-red-500' : 'text-gray-400'"
                class="text-xs"
                >{{ postData.description.length }} / 5000</span
              >
            </div>
            <textarea
              v-model="postData.description"
              rows="4"
              maxlength="5000"
              class="w-full p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-primary-500 outline-none"
            ></textarea>
          </div>
          <div>
            <div class="flex justify-between mb-2">
              <label class="block font-bold text-gray-700">標籤</label>
              <span class="text-xs text-gray-400">{{ postData.tags.length }} / 5 (每個限30字)</span>
            </div>
            <div class="flex flex-wrap gap-2 mb-2" v-if="postData.tags.length">
              <span
                v-for="(tag, idx) in postData.tags"
                :key="idx"
                class="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm flex items-center"
              >
                #{{ tag }}
                <button
                  @click="removeTag(idx)"
                  class="ml-1 text-primary-400 hover:text-primary-700"
                >
                  <XIcon class="w-3 h-3" />
                </button>
              </span>
            </div>
            <input
              v-model="tagSearch"
              @keyup.enter="addTag(tagSearch)"
              :disabled="postData.tags.length >= 5"
              class="w-full p-3 border-2 border-gray-200 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="輸入標籤按 Enter 新增..."
            />
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg">每日行程規劃</h3>
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
              <span class="text-sm text-gray-400" v-if="postData.start_date">{{
                new Date(
                  new Date(postData.start_date).getTime() + activeDayIndex * 86400000,
                ).toLocaleDateString()
              }}</span>
            </div>
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

        <div v-else-if="currentStep === 'packing'" class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <h3 class="font-bold text-lg text-gray-800">打包建議清單</h3>
              <p class="text-xs text-gray-500">幫旅客列出這趟旅程必備的物品</p>
            </div>
            <button
              @click="addPackingCategory"
              class="text-primary-600 font-bold hover:bg-primary-50 px-3 py-1 rounded"
            >
              <PlusIcon class="inline w-4 h-4" /> 新增分類
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(cat, cIdx) in postData.packingList"
              :key="cIdx"
              class="bg-white p-4 rounded-xl border-2 border-gray-200 relative group"
            >
              <button
                @click="removePackingCategory(cIdx)"
                class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <XIcon class="w-4 h-4" />
              </button>
              <input
                v-model="cat.category"
                class="font-bold text-primary-700 w-full mb-3 border-b border-dashed border-gray-300 focus:border-primary-500 outline-none"
                placeholder="分類名稱"
              />
              <div class="space-y-2">
                <div v-for="(item, iIdx) in cat.items" :key="iIdx" class="flex items-center">
                  <CheckSquareIcon class="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" />
                  <input
                    v-model="cat.items[iIdx]"
                    class="text-sm text-gray-600 w-full outline-none hover:bg-gray-50 rounded px-1"
                    placeholder="物品名稱"
                  />
                  <button
                    @click="removePackingItem(cIdx, iIdx)"
                    class="text-gray-300 hover:text-red-400 ml-2"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
                </div>
                <button
                  @click="addPackingItem(cIdx)"
                  class="text-xs font-bold text-primary-500 mt-2 hover:underline"
                >
                  + 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'preview'">
          <div class="text-center py-10 space-y-4">
            <h3 class="text-2xl font-black text-gray-800">{{ postData.title }}</h3>
            <div class="flex justify-center gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1"
                ><MapPinIcon class="w-4 h-4" /> {{ postData.location }}</span
              >
              <span>|</span>
              <span class="flex items-center gap-1"
                ><CalendarIcon class="w-4 h-4" /> {{ postData.start_date }} 出發</span
              >
              <span>|</span>
              <span class="flex items-center gap-1"
                ><UsersIcon class="w-4 h-4" /> 上限 {{ postData.max_people }} 人</span
              >
            </div>
            <div class="text-primary-600 font-bold text-xl">NT$ {{ postData.price }}</div>
            <div
              class="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto mt-4 text-sm text-gray-600"
            >
              <p class="font-bold mb-1">打包清單預覽：</p>
              <ul class="list-disc pl-5">
                <li v-for="cat in postData.packingList" :key="cat.category">
                  {{ cat.category }}: {{ cat.items.length }} 項物品
                </li>
              </ul>
            </div>
            <p class="text-gray-600 pt-4">確認資訊無誤後請點擊發布。</p>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
        <div v-if="formError" class="mr-auto text-red-500 font-bold self-center flex items-center">
          <AlertIcon class="w-4 h-4 mr-1" />
          {{ formError }}
        </div>

        <button
          v-if="currentStep === 'preview'"
          @click="handleFinalSubmit"
          :disabled="isSubmitting"
          class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
        >
          {{ isSubmitting ? '發布中...' : '確認發布' }}
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
