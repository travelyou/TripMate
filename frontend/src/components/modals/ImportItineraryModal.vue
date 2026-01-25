<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  Map as MapIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { storeToRefs } from 'pinia'

const emit = defineEmits(['close', 'select'])

const myItineraryStore = useMyItineraryStore()
// 從 Store 取得已轉換為 CamelCase 的行程列表
const { myItineraries } = storeToRefs(myItineraryStore)

const searchQuery = ref('')

// 過濾行程列表 (只顯示有標題的行程)
const filteredItineraries = computed(() => {
  let list = myItineraries.value || []

  // 簡單過濾：必須有標題
  list = list.filter((item) => item.title && item.title.trim() !== '')

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((item) => item.title.toLowerCase().includes(q))
  }

  // 排序：最新的在前面 (以 ID 排序)
  return list.sort((a, b) => b.id - a.id)
})

const getDuration = (start, end) => {
  if (!start || !end) return '天數未定'
  const s = new Date(start)
  const e = new Date(end)
  const diffTime = Math.abs(e - s)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return `${diffDays} 天`
}

const handleSelect = (itinerary) => {
  // 關鍵：使用深拷貝傳出資料，避免子組件與父組件連動修改
  const data = JSON.parse(JSON.stringify(itinerary))
  emit('select', data)
}
</script>

<template>
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
  >
    <div
      class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
    >
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MapIcon class="w-6 h-6 text-primary-600" />
          匯入我的行程
        </h3>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
          @click="$emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="p-4 bg-gray-50 border-b border-gray-100">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋行程標題..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition bg-white"
          />
          <SearchIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3" />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 custom-scrollbar">
        <div
          v-if="filteredItineraries.length === 0"
          class="flex flex-col items-center justify-center py-12 text-gray-400"
        >
          <div class="bg-white p-4 rounded-full mb-3 shadow-sm">
            <AlertCircleIcon class="w-8 h-8 text-gray-300" />
          </div>
          <p>沒有符合的行程</p>
          <p class="text-xs mt-1">請先至「我的行程」建立規劃</p>
        </div>

        <button
          v-for="item in filteredItineraries"
          :key="item.id"
          class="w-full bg-white p-4 rounded-xl border-2 border-transparent hover:border-primary-500 hover:shadow-lg transition-all group text-left relative overflow-hidden"
          @click="handleSelect(item)"
        >
          <div class="flex justify-between items-start mb-2">
            <h4
              class="font-bold text-lg text-gray-800 group-hover:text-primary-700 transition line-clamp-1"
            >
              {{ item.title }}
            </h4>
            <div
              class="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0"
            >
              <span
                class="bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
              >
                選擇 <CheckCircleIcon class="w-3 h-3" />
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
              <CalendarIcon class="w-4 h-4 text-gray-400" />
              <span>{{ item.startDate || '未定' }} ~ {{ item.endDate || '未定' }}</span>
            </div>
            <div class="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
              <ClockIcon class="w-4 h-4 text-gray-400" />
              <span>{{ getDuration(item.startDate, item.endDate) }}</span>
            </div>
          </div>

          <div class="mt-3 flex gap-2">
            <span
              v-if="item.days?.length"
              class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100"
            >
              {{ item.days.length }} 天行程
            </span>
            <span
              v-if="item.packingList?.length"
              class="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100"
            >
              {{ item.packingList.length }} 類物品
            </span>
          </div>
        </button>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white text-center text-xs text-gray-400">
        點擊行程以匯入其標題、日期、活動與打包清單
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}
</style>
