<script setup>
import { ref, onMounted } from 'vue'
import { Map as MapIcon, Plus as PlusIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary' // 請確認這裡 store 名稱是否已改為 itinerary
import { useUserStore } from '@/stores/user'

import ItineraryCard from '@/components/cards/ItineraryCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'
import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'

const itinerariesStore = useItineraryStore()
const userStore = useUserStore()

// --- 模態框狀態管理 ---
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const isPostModalOpen = ref(false)

const selectedItinerary = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)

// 篩選狀態
const filterOptions = ref([
  '全部',
  '旅行社精選',
  '導遊推薦',
  '短天數(1-5日)',
  '長天數(6日以上)',
  '亞洲',
])
const activeFilter = ref('全部')

// 處理開啟詳情彈窗
const openDetailModal = (itinerary, focusComment = false) => {
  selectedItinerary.value = itinerary
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedItinerary.value = null
  shouldScrollToComments.value = false
}

// 處理開啟分享模態框
const openShareModal = (itineraryId) => {
  shareLink.value = `/itinerary/${itineraryId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

// ★★★ 修正點：定義一個函數來處理成功發布，而不是在 template 裡寫註解 ★★★
const handlePostSuccess = async () => {
  // 發布成功後，重新抓取列表資料
  await itinerariesStore.fetchItineraries()
  isPostModalOpen.value = false
}

// 初始化載入資料
onMounted(() => {
  itinerariesStore.fetchItineraries()
})
</script>

<template>
  <div class="p-4 relative min-h-screen">
    <div class="w-full">
      <div
        class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-primary-tall flex justify-between items-center"
      >
        <h1 class="text-2xl font-black text-secondary-50 flex items-center py-1">
          <MapIcon class="w-6 h-6 mr-3 text-white" />
          精選行程
        </h1>

        <button
          @click="isPostModalOpen = true"
          class="bg-white text-primary-700 px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-primary-50 transition flex items-center"
        >
          <PlusIcon class="w-4 h-4 mr-1" /> 上架行程
        </button>
      </div>

      <div
        class="p-4 bg-white mb-6 space-y-4 border-4 border-primary shadow-primary-tall rounded-xl"
      >
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-secondary-800 shadow-primary-solid',
              activeFilter === filter
                ? 'bg-primary text-secondary-50'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div v-if="itinerariesStore.loading" class="text-center py-10 text-gray-500">載入中...</div>
      <div v-else-if="itinerariesStore.error" class="text-center py-10 text-red-500">
        {{ itinerariesStore.error }}
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ItineraryCard
          v-for="itinerary in itinerariesStore.itineraries"
          :key="itinerary.id"
          :itinerary="itinerary"
          @open-detail="openDetailModal"
          @open-share="openShareModal"
        />
      </div>
    </div>
  </div>

  <ItineraryDetailModal
    v-if="isDetailModalOpen"
    :itinerary="selectedItinerary"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDetailModal"
  />

  <ItineraryPostModal
    v-if="isPostModalOpen"
    @close="isPostModalOpen = false"
    @success="handlePostSuccess"
  />

  <ShareModal v-if="isShareModalOpen" :share-link="shareLink" @close="closeShareModal" />
</template>
