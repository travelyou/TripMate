<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia' // 🟢 1. 引入這個確保響應性
import {
  Briefcase as BriefcaseIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'
import MyItineraryTab from '@/components/itinerary-tabs/MyItineraryTab.vue'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import FindPartnerTab from '@/components/itinerary-tabs/FindPartnerTab.vue'

const myItineraryStore = useMyItineraryStore()
const route = useRoute() // 獲取當前路由資訊，用於讀取網址參數

// 🟢 2. 使用 storeToRefs 拿資料，這樣資料變動時畫面才會跟著變
const { myItineraries, drafts, featuredItineraries, partnerItineraries } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)
const activeTab = ref('my')

const tabs = [
  { id: 'my', label: '我的行程' },
  { id: 'featured', label: '精選行程' },
  { id: 'partner', label: '找旅伴' },
]

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
    // ?? 3. 預設給一個 Day 1，不然組員的彈窗可能會報錯
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
    const draft = drafts.value.find(d => String(d.id) === String(draftId))
    if (draft) {
      // 如果找到了，就自動幫使用者開啟這個草稿
      openDraft(draft)
    }
  }
})

const handleFeaturedRate = ({ id, rating, comment }) => {
  myItineraryStore.updateFeaturedRating({ id, rating, comment })
}

const handleFeaturedClear = (id) => {
  myItineraryStore.clearFeaturedRating(id)
}

const handlePartnerUpdate = ({ id, comment, reviewLabel }) => {
  myItineraryStore.updatePartnerItinerary({ id, comment, reviewLabel })
}
</script>

<template>
  <!-- 最外層容器：限制最大寬度 (max-width 5xl) 並置中 (mx-auto)，讓畫面在寬螢幕上更美觀 -->
  <div class="p-4 max-w-5xl mx-auto">
    <!-- 使用 space-y-6 讓子元素之間自動產生垂直間距 -->
    <div class="space-y-6 pt-4">
      <div
        class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center"
      >
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

      <!-- DEV Branch 的標籤頁籤容器：放入我們的新容器中 -->
      <div class="bg-white rounded-xl border-4 border-primary shadow-primary-tall p-2">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="w-full px-4 py-3 rounded-lg font-semibold transition"
            :class="
              activeTab === tab.id
                ? 'bg-primary text-white border-2 border-primary'
                : 'bg-white text-secondary-600'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- DEV Branch 的行程列表組件：根據 activeTab 切換顯示內容 -->
      <MyItineraryTab
        v-if="activeTab === 'my'"
        :itineraries="myItineraries"
        @open="openItineraryDetail"
        @add="openAddItineraryModal"
      />
      <FeaturedItineraryTab
        v-if="activeTab === 'featured'"
        :itineraries="featuredItineraries"
        @rate="handleFeaturedRate"
        @clear="handleFeaturedClear"
      />
      <FindPartnerTab
        v-if="activeTab === 'partner'"
        :itineraries="partnerItineraries"
        @update="handlePartnerUpdate"
      />
    </div> <!-- End of space-y-6 container -->

    <MyItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @save-draft="handleSaveDraft"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>
