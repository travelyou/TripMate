<script setup>
import { ref } from 'vue'
import { Map as MapIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary'

import ItineraryCard from '@/components/itinerary/ItineraryCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import PostDetailModal from '@/components/modals/PostDetailModal.vue'

const itinerariesStore = useItineraryStore()

// --- 模態框狀態管理 ---
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)

const selectedPost = ref(null)
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
const openPostDetailModal = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closePostDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPost.value = null
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
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-hidden">
    <div class="w-full">
      <div
        class="bg-orange-500 text-white font-black text-2xl p-4 mb-6 pixel-card-header shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] flex items-center"
      >
        <div class="flex items-center space-x-3">
          <MapIcon class="w-6 h-6 fill-white" />
          <span>精選行程</span>
        </div>
      </div>

      <div class="pixel-card p-4 bg-white mb-6 space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]',
              activeFilter === filter
                ? 'bg-orange-400 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ItineraryCard
          v-for="itinerary in itinerariesStore.itineraries"
          :key="itinerary.id"
          :itinerary="itinerary"
          @open-detail="openPostDetailModal"
          @open-share="openShareModal"
        />
      </div>
    </div>
  </div>

  <PostDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closePostDetailModal"
  />

  <ShareModal v-if="isShareModalOpen" :share-link="shareLink" @close="closeShareModal" />
</template>
