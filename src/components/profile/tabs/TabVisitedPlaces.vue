<script setup>
// 引入 Vue 的功能
import { ref, computed } from 'vue'
// 引入圖示
import { Plus, Stamp, MapPin, Globe, AlertTriangle } from 'lucide-vue-next'
// 引入新的「旅行護照」組件
// Future: 未來可以加入切換視圖的功能 (列表模式 vs 護照模式)
import PassportBook from '../passport/PassportBook.vue'

// 使用者 Store，用於獲取護照資料
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 定義 Props
defineProps({
  visitedPlaces: {
    type: Object,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-place', 'remove-place'])

// 目前選擇的分頁 (國內/國外)
const currentTab = ref('domestic') // 'domestic' | 'international'

// 刪除確認視窗狀態
const isDeleteModalOpen = ref(false)
const itemToDelete = ref(null)

// 隱藏列表 (本地暫存，重整後會還原，除非接上後端)
const hiddenEntries = ref(new Set())

// 新增介面的輸入變數
const newDomesticPlace = ref('')
const newDomesticDate = ref('')
const newInternationalPlace = ref('')
const newInternationalDate = ref('')

// 新增足跡的處理函數
// type: 'domestic' 或 'international'
// Future: 增加防呆機制，避免重複新增相同地點
function handleAdd(type) {
  const nameVal = type === 'domestic' ? newDomesticPlace.value : newInternationalPlace.value
  const dateVal = type === 'domestic' ? newDomesticDate.value : newInternationalDate.value

  if (nameVal && nameVal.trim()) {
    // 發出事件通知父組件新增
    emit('add-place', { type, name: nameVal, date: dateVal })
    // 清空輸入框
    if (type === 'domestic') {
      newDomesticPlace.value = ''
      newDomesticDate.value = ''
    } else {
      newInternationalPlace.value = ''
      newInternationalDate.value = ''
    }
  }
}

// 請求刪除 (開啟確認視窗)
function requestDelete(entry) {
  itemToDelete.value = entry
  isDeleteModalOpen.value = true
}

// 確認刪除
function confirmDelete() {
  if (itemToDelete.value) {
    const entry = itemToDelete.value
    if (entry.source === 'manual' && typeof entry.originalIndex === 'number') {
       emit('remove-place', { type: entry.type, index: entry.originalIndex })
    }
    isDeleteModalOpen.value = false
    itemToDelete.value = null
  }
}

// 取消刪除
function cancelDelete() {
  isDeleteModalOpen.value = false
  itemToDelete.value = null
}

// 處理隱藏
function handleHide(entry) {
  // 這裡僅做前端暫時隱藏
  // Future: 發送 API 更新 user 偏好設定
  // 由於 entry 是計算出來的物件，我們需要一個唯一標識，這裡暫用 location + date
  const key = `${entry.type}-${entry.location}-${entry.date}`
  hiddenEntries.value.add(key)
}

// 從 Store 獲取聚合後的護照資料，並根據 Tab 過濾
const filteredPassportData = computed(() => {
  const allEntries = userStore.passportEntries

  // 先過濾掉被隱藏的
  const visibleEntries = allEntries.filter(e => {
     const key = `${e.type}-${e.location}-${e.date}`
     return !hiddenEntries.value.has(key)
  })

  if (currentTab.value === 'domestic') {
    return visibleEntries.filter(e =>
      e.type === 'domestic' ||
      (e.type === 'hosted' && !isInternational(e.location)) ||
      (e.type === 'participated' && !isInternational(e.location))
    )
  } else {
    // International
     return visibleEntries.filter(e =>
       e.type === 'international' ||
       (e.type === 'hosted' && isInternational(e.location)) ||
       (e.type === 'participated' && isInternational(e.location))
     )
  }
})

// 簡單判斷是否為國外地點 (這裡僅做簡單模擬，實際可能需要更嚴謹的資料欄位)
// 假設 userStore 資料若未標記，預設為國內，除非包含特定關鍵字或在 international 列表中
function isInternational(location) {
  // 簡單邏輯：如果是手動輸入且在 international 列表，type 已決定
  // 對於 hosted/participated，這裡暫且假設包含 '台灣' 為國內，否則視為國外 (僅為範例，實際需後端欄位)
  if (!location) return false
  return !location.includes('台灣') && !location.includes('Taiwan') && !location.includes('台北') && !location.includes('台中') && !location.includes('高雄') && !location.includes('澎湖')
}

// 切換 Tab 的 CSS 類別
const tabBtnClass = (isActive) => {
  return isActive
    ? 'bg-indigo-600 text-white shadow-md'
    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
}
</script>

<template>
  <div class="space-y-6 animate-fade-in relative">

    <!-- 1. 分頁切換區 (Tabs) -->
    <div class="flex justify-center mb-6">
      <div class="bg-gray-100 p-1 rounded-xl flex gap-1">
        <button
          class="px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2"
          :class="tabBtnClass(currentTab === 'domestic')"
          @click="currentTab = 'domestic'"
        >
          <MapPin class="w-4 h-4" />
          國內足跡
        </button>
        <button
          class="px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2"
          :class="tabBtnClass(currentTab === 'international')"
          @click="currentTab = 'international'"
        >
          <Globe class="w-4 h-4" />
          世界探索
        </button>
      </div>
    </div>

    <!-- 2. 護照本顯示區塊 -->
    <!-- 根據 currentTab 傳遞過濾後的資料 -->
    <div class="min-h-[400px]">
       <PassportBook
         :entries="filteredPassportData"
         :is-editable="isCurrentUser"
         @delete="requestDelete"
         @hide="handleHide"
       />
    </div>

    <!-- 3. 自助登錄區 (僅限本人可見) -->
    <!-- 根據 currentTab 顯示對應的輸入框 -->
    <div v-if="isCurrentUser" class="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 mt-8 transition-all duration-500">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg">
        <Stamp class="w-5 h-5 mr-2 text-indigo-500" />
        自助簽證登錄 (Self Check-in)
      </h3>

      <!-- 國內登錄表單 -->
      <div v-if="currentTab === 'domestic'" class="animate-fade-in-up">
        <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Domestic (TW)</div>
        <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            v-model="newDomesticPlace"
            placeholder="城市名稱 (如: 台南)"
            class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-0"
            @keyup.enter="handleAdd('domestic')"
          />
          <input
            v-model="newDomesticDate"
            type="month"
            class="px-4 py-2 border rounded-xl text-sm w-full sm:w-32 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-500 bg-white"
          />
          <button
            class="p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md transition transform active:scale-95 flex justify-center items-center"
            title="蓋上戳章"
            @click="handleAdd('domestic')"
          >
            <Plus class="w-5 h-5 text-white" />
            <span class="sm:hidden ml-2 text-white font-bold text-sm">新增</span>
          </button>
        </div>
      </div>

      <!-- 國外登錄表單 -->
      <div v-else class="animate-fade-in-up">
        <div class="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">International</div>
        <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
           <input
            v-model="newInternationalPlace"
            placeholder="城市名稱 (如: 東京)"
            class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-orange-500 outline-none bg-white min-w-0"
            @keyup.enter="handleAdd('international')"
          />
          <input
            v-model="newInternationalDate"
            type="month"
            class="px-4 py-2 border rounded-xl text-sm w-full sm:w-32 focus:ring-2 focus:ring-orange-500 outline-none text-gray-500 bg-white"
          />
          <button
            class="p-2 bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md transition transform active:scale-95 flex justify-center items-center"
            title="蓋上戳章"
            @click="handleAdd('international')"
          >
            <Plus class="w-5 h-5 text-white" />
            <span class="sm:hidden ml-2 text-white font-bold text-sm">新增</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 刪除確認跳窗 -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-pop-in">
        <div class="flex flex-col items-center text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-800 mb-2">確定刪除此戳章？</h3>
          <p class="text-sm text-gray-500 mb-6">
            刪除後將無法復原，您確定要移除這個足跡紀錄嗎？
            <br>
            <span class="font-bold text-gray-700 mt-2 block">{{ itemToDelete?.location }}</span>
          </p>
          <div class="flex gap-3 w-full">
            <button
              class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition shadow-lg shadow-red-200"
              @click="confirmDelete"
            >
              確定刪除
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out;
}
.animate-pop-in {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
