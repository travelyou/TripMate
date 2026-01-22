<script setup>
import { ref, onMounted, computed } from 'vue'
import { Map as MapIcon, Plus as PlusIcon, XCircle as XCircleIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary'

import ItineraryCard from '@/components/cards/ItineraryCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'
import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'

const itinerariesStore = useItineraryStore()

// --- 模態框狀態管理 ---
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const isPostModalOpen = ref(false)

const selectedItinerary = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)

// ★ 修改：更新為新的分類選項
const filterOptions = ref([
  '全部',
  '國內旅遊',
  '日韓旅遊',
  '亞洲其他',
  '歐美紐澳',
  '海島度假',
  '攝影/興趣',
  '自駕共乘',
  '其他',
])
const activeFilter = ref('全部')

// ★ 新增：前端分類篩選邏輯
const filteredItineraries = computed(() => {
  const itineraries = itinerariesStore.itineraries || []
  if (activeFilter.value === '全部') {
    return itineraries
  }
  return itineraries.filter((item) => {
    // 兼容舊資料：如果沒有分類，歸類為「其他」
    const itemCategory = item.category || '其他'
    return itemCategory === activeFilter.value
  })
})

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

const itineraryToEdit = ref(null)

const handlePostSuccess = async () => {
  // 發布成功後，重新載入列表資料
  await itinerariesStore.fetchItineraries()
  isPostModalOpen.value = false
  itineraryToEdit.value = null
}

const handleCardEdit = (itinerary) => {
  itineraryToEdit.value = itinerary
  isPostModalOpen.value = true
}

const handleCardDelete = (itinerary) => {
  // 刪除已經在卡片組件中處理，這裡只需要重新整理列表
  itinerariesStore.fetchItineraries()
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
          class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition shadow-md flex items-center"
          @click="isPostModalOpen = true"
        >
          <PlusIcon class="w-5 h-5 mr-1" />
          上架行程
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
              'px-3 py-1 rounded-full font-bold transition border-2 ',
              activeFilter === filter
                ? 'bg-primary text-secondary-50 border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div
        v-if="itinerariesStore.loading"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        <div
          v-for="n in 6"
          :key="`itinerary-skeleton-${n}`"
          class="bg-white border border-secondary-200 shadow-md rounded-2xl overflow-hidden animate-pulse flex flex-col h-full"
        >
          <div class="relative w-full aspect-[4/3] bg-secondary-100">
            <div class="absolute top-0 left-0 h-6 w-20 bg-white/70 rounded-br-xl"></div>
            <div class="absolute bottom-2 left-2 h-8 w-28 bg-primary-600/30 rounded-full"></div>
          </div>

          <div class="p-4 flex flex-col flex-1 space-y-3">
            <div class="h-3 w-24 bg-primary-100 rounded"></div>
            <div class="h-5 w-4/5 bg-gray-200 rounded"></div>
            <div class="h-4 w-full bg-gray-200 rounded"></div>
            <div class="h-4 w-5/6 bg-gray-200 rounded"></div>

            <div class="flex items-center space-x-3 text-sm pt-2">
              <div class="h-4 w-24 bg-gray-200 rounded"></div>
              <div class="h-4 w-32 bg-gray-200 rounded"></div>
            </div>

            <div class="flex items-center justify-between border-t border-secondary-100 pt-3 mt-auto">
              <div class="flex items-center space-x-3">
                <div class="h-6 w-14 bg-gray-200 rounded"></div>
                <div class="h-6 w-14 bg-gray-200 rounded"></div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div class="h-6 w-6 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="itinerariesStore.error" class="text-center py-10 text-red-500">
        {{ itinerariesStore.error }}
      </div>

      <div
        v-else-if="filteredItineraries.length === 0"
        class="text-center py-20 text-gray-500 flex flex-col items-center"
      >
        <XCircleIcon class="w-16 h-16 mb-4 text-gray-300" />
        <p class="text-lg">目前沒有「{{ activeFilter }}」分類的行程</p>
        <button
          v-if="activeFilter !== '全部'"
          class="mt-4 text-primary-600 font-bold hover:underline"
          @click="activeFilter = '全部'"
        >
          查看全部行程
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ItineraryCard
          v-for="itinerary in filteredItineraries"
          :key="itinerary.id"
          :itinerary="itinerary"
          :show-menu-button="false"
          @open-detail="openDetailModal"
          @open-share="openShareModal"
          @edit="handleCardEdit"
          @delete="handleCardDelete"
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
    :itinerary-to-edit="itineraryToEdit"
    @close="() => { isPostModalOpen = false; itineraryToEdit = null }"
    @success="handlePostSuccess"
  />

  <ShareModal v-if="isShareModalOpen" :share-link="shareLink" @close="closeShareModal" />
</template>
