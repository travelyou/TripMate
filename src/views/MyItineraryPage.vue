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
const { myItineraries, featuredItineraries, partnerItineraries } = storeToRefs(myItineraryStore)

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
  <div class="p-4 lg:mx-12">
    <div class="grid grid-cols-1 gap-6 items-start pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

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
    </div>

    <ItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>

