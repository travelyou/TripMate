<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { Map as MapIcon, Plus as PlusIcon, XCircle as XCircleIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary'
import { useRoute, useRouter } from 'vue-router'
import { getItineraryById } from '@/api/itinerary'

import ItineraryCard from '@/components/cards/ItineraryCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'
import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'

const itinerariesStore = useItineraryStore()
const route = useRoute()
const router = useRouter()
const setAppLoading = (active) => {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active } }))
}

// --- 模態框狀態管理 ---
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const isPostModalOpen = ref(false)

const selectedItinerary = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)

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

const filteredItineraries = computed(() => {
  const itineraries = itinerariesStore.itineraries || []
  if (activeFilter.value === '全部') return itineraries
  return itineraries.filter((item) => (item.category || '其他') === activeFilter.value)
})

const openDetailModal = (itinerary, focusComment = false) => {
  router.push({
    path: `/featured-itinerary/${itinerary.id}`,
    query: focusComment ? { scrollTo: 'comments' } : {},
  })
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedItinerary.value = null
  shouldScrollToComments.value = false
  router.push('/featured-itinerary')
}

const loadItinerariesData = async () => {
  if (route.params.id) {
    setAppLoading(true)
    try {
      const response = await getItineraryById(route.params.id)
      const item = response?.data || response
      if (item) {
        itinerariesStore.itineraries = [item]
        selectedItinerary.value = item
        isDetailModalOpen.value = true
      }
    } catch (error) {
      console.error('抓取失敗:', error)
    } finally {
      setAppLoading(false)
    }
    return
  }
  await itinerariesStore.fetchItineraries()
}

watch(
  () => route.params.id,
  () => {
    loadItinerariesData()
  },
  { immediate: true },
)

// [修正] 移除 demo 網址，使用正確的路徑格式
const openShareModal = (itineraryId) => {
  shareLink.value = `${window.location.origin}/featured-itinerary/${itineraryId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

const itineraryToEdit = ref(null)

const handlePostSuccess = async () => {
  await itinerariesStore.fetchItineraries()
  isPostModalOpen.value = false
  itineraryToEdit.value = null
}

const handleCardEdit = (itinerary) => {
  setAppLoading(true)
  itineraryToEdit.value = itinerary
  isPostModalOpen.value = true
  nextTick(() => setAppLoading(false))
}

const handleDetailEdit = (itinerary) => {
  setAppLoading(true)
  itineraryToEdit.value = itinerary
  isPostModalOpen.value = true
  isDetailModalOpen.value = false
  nextTick(() => setAppLoading(false))
}

const handleDetailDeleted = () => {
  itinerariesStore.fetchItineraries()
}

const handleCardDelete = (itinerary) => {
  itinerariesStore.fetchItineraries()
}

onMounted(() => {
  // 舊式 query 轉發
  if (route.query.itineraryId) {
    router.replace(`/featured-itinerary/${route.query.itineraryId}`)
  }
})
</script>

<template>
  <div class="p-4 relative min-h-screen">
    <div class="w-full">
      <div
        class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-primary-tall flex justify-between items-center"
      >
        <h1 class="text-2xl font-black text-secondary-50 flex items-center py-1">
          <MapIcon class="w-6 h-6 mr-3 text-white" />精選行程
        </h1>
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
          :key="n"
          class="bg-white border border-secondary-200 shadow-md rounded-2xl animate-pulse h-96"
        ></div>
      </div>

      <div
        v-else-if="filteredItineraries.length === 0"
        class="text-center py-20 text-gray-500 flex flex-col items-center"
      >
        <XCircleIcon class="w-16 h-16 mb-4 text-gray-300" />
        <p class="text-lg">目前沒有符合的行程</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ItineraryCard
          v-for="itinerary in filteredItineraries"
          :key="itinerary.id"
          :itinerary="itinerary"
          :show-menu-button="true"
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
    @edit="handleDetailEdit"
    @deleted="handleDetailDeleted"
  />
  <ItineraryPostModal
    v-if="isPostModalOpen"
    :itinerary-to-edit="itineraryToEdit"
    @close="
      () => {
        isPostModalOpen = false
        itineraryToEdit = null
      }
    "
    @success="handlePostSuccess"
  />

  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
