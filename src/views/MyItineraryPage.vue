<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia' // 🟢 1. 引入這個確保響應性
import {
  Calendar as CalendarIcon,
  FolderOpen as FolderIcon,
  Plus as PlusIcon,
  Briefcase as BriefcaseIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'

const myItineraryStore = useMyItineraryStore()

// 🟢 2. 使用 storeToRefs 拿資料，這樣資料變動時畫面才會跟著變
const { myItineraries, drafts } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)

// 開啟行程詳情 (編輯)
const openItineraryDetail = (itinerary) => {
  // 深拷貝一份，避免直接修改到原始資料
  selectedItinerary.value = JSON.parse(JSON.stringify(itinerary))
  isDetailModalOpen.value = true
}

// 開啟新增行程 (空白)
const openAddItineraryModal = () => {
  selectedItinerary.value = {
    id: Date.now(),
    title: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    // 🟢 3. 預設給一個 Day 1，不然組員的彈窗可能會報錯
    days: [{ day: 1, date: '', activities: [] }],
    packingList: [
      { category: '證件', items: [] },
      { category: '衣物', items: [] },
      { category: '電子產品', items: [] },
    ],
  }
  isDetailModalOpen.value = true
}

// 開啟草稿
const openDraft = (draft) => {
  // 判斷草稿類型，如果是行程草稿就打開編輯
  if ((draft.type === 'my_itinerary' || draft.type === 'itinerary') && (draft.data || draft.rawItinerary)) {
    // 兼容兩種草稿結構 (你原本寫的 & 我之前教你的)
    const dataToLoad = draft.data || draft.rawItinerary
    selectedItinerary.value = JSON.parse(JSON.stringify(dataToLoad))
    isDetailModalOpen.value = true
  } else {
    alert(`這是 ${draft.typeLabel} 的草稿，請至 ${draft.typeLabel === '找旅伴' ? '找旅伴頁面' : '討論區'} 編輯。`)
  }
}

// 處理「暫存草稿」
const handleSaveDraft = (draftItinerary) => {
  // 呼叫 Store 裡面的 addDraft (這是我們上一步新增的功能)
  myItineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '我的行程',
    title: draftItinerary.title || '(未命名行程)',
    content: `日期: ${draftItinerary.startDate || '?'} ~ ${draftItinerary.endDate || '?'}`,
    rawItinerary: draftItinerary // 把整包資料存起來
  })

  isDetailModalOpen.value = false
}

// 處理儲存 (發布/更新行程)
const handleSaveItinerary = (updatedItinerary) => {
  if (!updatedItinerary.title.trim()) updatedItinerary.title = '新旅程'

  // 1. 檢查是「修改」還是「新增」
  const index = myItineraryStore.myItineraries.findIndex((i) => i.id === updatedItinerary.id)

  if (index !== -1) {
    // 如果是舊的，就更新它
    myItineraryStore.myItineraries[index] = updatedItinerary
  } else {
    // 如果是新的，就放到最前面
    myItineraryStore.myItineraries.unshift(updatedItinerary)
  }

  // 2. 從草稿夾移除 (如果這個行程原本是草稿)
  // (這裡簡單過濾掉 id 相同的草稿)
  const draftIndex = myItineraryStore.drafts.findIndex(d =>
    (d.data && d.data.id === updatedItinerary.id) ||
    (d.rawItinerary && d.rawItinerary.id === updatedItinerary.id)
  )

  if (draftIndex !== -1) {
    myItineraryStore.drafts.splice(draftIndex, 1)
  }

  isDetailModalOpen.value = false
}

const handleDeleteItinerary = (id) => {
  if (confirm('確定要刪除這個行程嗎？')) {
    myItineraryStore.deleteItinerary(id)
    isDetailModalOpen.value = false
  }
}

const getTagColor = (type) => {
  if (type === 'discussion') return 'bg-pink-500 text-white border-pink-600'
  if (type === 'traveler') return 'bg-green-500 text-white border-green-600'
  if (type === 'my_itinerary' || type === 'itinerary') return 'bg-indigo-500 text-white border-indigo-600'
  return 'bg-gray-500 text-white'
}
</script>

<template>
  <div class="p-4 md:p-0">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div
        class="lg:col-start-1 lg:row-start-1 bg-indigo-500 text-white font-black text-2xl p-4 border-none shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] flex items-center rounded-none"
      >
        <div class="flex items-center space-x-3">
          <BriefcaseIcon class="w-6 h-6 text-white fill-indigo-300" />
          <span>我的行程</span>
        </div>
      </div>

      <div
        class="lg:col-start-1 lg:row-start-2 bg-white rounded-xl p-6 pixel-card relative overflow-hidden"
      >
        <div class="flex items-center mb-6 pb-4 border-b-2 border-gray-100">
          <div class="bg-indigo-100 p-2 rounded-lg border-2 border-indigo-200 mr-4">
            <CalendarIcon class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-800">行程列表</h3>
            <p class="text-sm text-gray-500">查看並管理你的旅遊行程</p>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="item in myItineraries"
            :key="item.id"
            class="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:bg-indigo-50 transition cursor-pointer group"
            @click="openItineraryDetail(item)"
          >
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold text-lg text-gray-800 group-hover:text-indigo-700 mb-1">
                  {{ item.title }}
                </h4>
                <div class="flex items-center text-sm text-gray-500">
                  <span class="bg-gray-100 px-2 py-0.5 rounded text-xs mr-2 border border-gray-300"
                    >日期</span
                  >
                  {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
                </div>
              </div>
              <div class="text-gray-300 group-hover:text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div v-if="myItineraries.length === 0" class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
            目前沒有行程，點擊下方按鈕新增！
          </div>
        </div>

        <button
          class="w-full mt-8 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(79,70,229,0.4)] active:translate-y-1 active:shadow-none border-2 border-indigo-800"
          @click="openAddItineraryModal"
        >
          <PlusIcon class="w-5 h-5 mr-2" />
          新增行程
        </button>
      </div>

      <div class="lg:col-start-2 lg:row-start-2 bg-white rounded-xl p-5 pixel-card">
        <div class="flex items-center mb-6">
          <div class="bg-amber-100 p-2 rounded-lg border-2 border-amber-200 mr-3">
            <FolderIcon class="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">草稿夾</h3>
            <p class="text-xs text-gray-500">查看你儲存的貼文草稿</p>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="draft in drafts"
            :key="draft.id"
            class="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-gray-50 cursor-pointer"
            @click="openDraft(draft)"
          >
            <div class="flex justify-between items-center mb-2">
              <span
                :class="[
                  getTagColor(draft.type),
                  'text-[10px] px-2 py-0.5 rounded border font-bold',
                ]"
              >
                {{ draft.typeLabel }}
              </span>
              <span class="text-[10px] text-gray-400"
                >儲存於: {{ draft.saveTime ? draft.saveTime.split(' ')[0] : '剛剛' }}</span
              >
            </div>
            <h4 class="font-bold text-sm text-gray-800 mb-1 line-clamp-1">{{ draft.title }}</h4>
            <p class="text-xs text-gray-500 line-clamp-2">{{ draft.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <ItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @save-draft="handleSaveDraft"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>

<style scoped>
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}
</style>
