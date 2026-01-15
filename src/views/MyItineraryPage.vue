<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia' // 🟢 1. 引入這個確保響應性
import {
  Calendar as CalendarIcon,
  Briefcase as BriefcaseIcon,
  Plus as PlusIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'

const myItineraryStore = useMyItineraryStore()
const route = useRoute() // 獲取當前路由資訊，用於讀取網址參數

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

    days: [{ day: 1, date: '', activities: [] }],
    packingList: [
      { category: '證件', items: [] },
      { category: '衣物', items: [] },
      { category: '電子產品', items: [] },
    ],
  }
  isDetailModalOpen.value = true
}

/**
 * 開啟草稿編輯彈窗
 * @param {Object} draft - 要編輯的草稿
 */
const openDraft = (draft) => {
  // 判斷草稿類型，如果是行程草稿就打開編輯
  if (
    (draft.type === 'my_itinerary' || draft.type === 'itinerary') &&
    (draft.data || draft.rawItinerary)
  ) {
    // 獲取草稿內的行程數據
    const dataToLoad = draft.data || draft.rawItinerary
    // 深拷貝一份資料，避免直接改到 Store 裡的原始草稿
    selectedItinerary.value = JSON.parse(JSON.stringify(dataToLoad))
    // 開啟編輯 Modal
    isDetailModalOpen.value = true
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
    rawItinerary: draftItinerary, // 把整包資料存起來
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
  const draftIndex = myItineraryStore.drafts.findIndex(
    (d) =>
      (d.data && d.data.id === updatedItinerary.id) ||
      (d.rawItinerary && d.rawItinerary.id === updatedItinerary.id),
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

// 當組件掛載完成（頁面載入）時執行
onMounted(() => {
  // 從網址中尋找是否有 'openDraft' 這個參數
  const draftId = route.query.openDraft
  if (draftId) {
    // 在草稿清單中找出 ID 符合的那筆
    const draft = drafts.value.find((d) => String(d.id) === String(draftId))
    if (draft) {
      // 如果找到了，就自動幫使用者開啟這個草稿
      openDraft(draft)
    }
  }
})
</script>

<template>
  <!-- 最外層容器：限制最大寬度 (max-width 5xl) 並置中 (mx-auto)，讓畫面在寬螢幕上更美觀 -->
  <div class="p-4 max-w-5xl mx-auto">
    <!-- 使用 space-y-6 讓子元素之間自動產生垂直間距 -->
    <div class="space-y-6 pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

      <div
        class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall"
      >
        <div class="flex items-center mb-6 pb-4 border-b-2 border-secondary-100">
          <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-4">
            <CalendarIcon class="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-secondary-800">行程列表</h3>
            <p class="text-sm text-secondary-500">查看並管理你的旅遊行程</p>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="item in myItineraries"
            :key="item.id"
            class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition cursor-pointer group"
            @click="openItineraryDetail(item)"
          >
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold text-lg text-secondary-800 group-hover:text-primary-700 mb-1">
                  {{ item.title }}
                </h4>
                <div class="flex items-center text-sm text-secondary-500">
                  <span
                    class="bg-secondary-100 px-2 py-0.5 rounded text-xs mr-2 border border-secondary-300"
                    >日期</span
                  >
                  {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
                </div>
              </div>
              <div class="text-secondary-300 group-hover:text-primary-400">
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

          <div
            v-if="myItineraries.length === 0"
            class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
          >
            目前沒有行程，點擊下方按鈕新增！
          </div>
        </div>

        <button
          class="w-full mt-8 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center shadow-primary-strong active:translate-y-1 active:shadow-none"
          @click="openAddItineraryModal"
        >
          <PlusIcon class="w-5 h-5 mr-2" />
          新增行程
        </button>
      </div>
    </div>
    <!-- End of space-y-6 container -->

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
