<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia' //  1. 引入這個確保響應性
import { Briefcase as BriefcaseIcon } from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'
import MyItineraryTab from '@/components/itinerary-tabs/MyItineraryTab.vue'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import FindPartnerTab from '@/components/itinerary-tabs/FindPartnerTab.vue'

const myItineraryStore = useMyItineraryStore()

//  2. 使用 storeToRefs 拿資料，這樣資料變動時畫面才會跟著變
const { myItineraries } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)
const activeTab = ref('my')

const tabs = [
  { id: 'my', label: '我的行程' },
  { id: 'featured', label: '精選行程' },
  { id: 'partner', label: '找旅伴' },
]

const featuredItineraries = ref([
  {
    id: 101,
    title: '沖繩海島放鬆之旅',
    startDate: '2025-03-12',
    endDate: '2025-03-16',
    orderNumber: 'TM-20250312001',
    orderDate: '2025-02-01',
    status: 'joined',
    rating: 4,
  },
  {
    id: 102,
    title: '北海道滑雪體驗',
    startDate: '2025-01-20',
    endDate: '2025-01-25',
    orderNumber: 'TM-20250120008',
    orderDate: '2024-12-10',
    status: 'not_joined',
  },
])

const partnerItineraries = ref([
  {
    id: 201,
    title: '清邁慢旅行',
    startDate: '2025-05-05',
    endDate: '2025-05-12',
    status: 'joined',
    comment: '行程節奏剛好，很好相處！',
    reviewLabel: '超好評',
  },
  {
    id: 202,
    title: '曼谷美食團',
    startDate: '2025-07-08',
    endDate: '2025-07-10',
    status: 'not_joined',
  },
])

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
  const draftIndex = myItineraryStore.drafts.findIndex((d) =>
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

const handleFeaturedRate = ({ id, rating }) => {
  const target = featuredItineraries.value.find((item) => item.id === id)
  if (target) target.rating = rating
}
</script>

<template>
  <div class="p-4">
    <div class="grid grid-cols-1 gap-6 items-start pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-4 py-2 rounded-lg font-semibold border-2 transition"
          :class="activeTab === tab.id
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-secondary-600 border-secondary-200 hover:border-primary-300'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

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
      />
      <FindPartnerTab
        v-if="activeTab === 'partner'"
        :itineraries="partnerItineraries"
      />
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
