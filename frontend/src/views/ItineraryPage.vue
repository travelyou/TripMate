<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import { Map as MapIcon, XCircle as XCircleIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary'
import { useRoute, useRouter } from 'vue-router'
import { getItineraryById } from '@/api/itinerary'
import { getAllVendorRegions } from '@/api/vendor'

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

const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const isPostModalOpen = ref(false)

const selectedItinerary = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)
const itineraryToEdit = ref(null)

const activeFilter = ref('全部')
const vendorRegions = ref([])

const filterOptions = computed(() => {
  if (vendorRegions.value.length === 0) {
    return ['全部', '其他']
  }

  const categoryArray = [...vendorRegions.value]

  for (let i = categoryArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categoryArray[i], categoryArray[j]] = [categoryArray[j], categoryArray[i]]
  }

  return ['全部', ...categoryArray, '其他']
})

const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null)
let observer = null

const filteredItineraries = computed(() => {
  const itineraries = itinerariesStore.itineraries || []
  if (activeFilter.value === '全部') return itineraries
  return itineraries.filter((item) => (item.category || '其他') === activeFilter.value)
})

const loadItinerariesData = async (isLoadMore = false) => {
  if (itinerariesStore.loading) return

  if (route.params.id && !isLoadMore) {
    setAppLoading(true)
    try {
      const response = await getItineraryById(route.params.id)
      const item = response?.data || response
      if (item) {
        itinerariesStore.itineraries = [item]
        selectedItinerary.value = item
        isDetailModalOpen.value = true
        hasMore.value = false
      }
    } catch (error) {
    } finally {
      setAppLoading(false)
    }
    return
  }

  try {
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
    }

    const params = {
      page: currentPage.value,
      limit: 15,
      category: activeFilter.value !== '全部' ? activeFilter.value : null,
    }

    const newData = await itinerariesStore.fetchItineraries(params, isLoadMore)

    if (newData && newData.length < 15) {
      hasMore.value = false
    }

    if (isLoadMore) {
      currentPage.value++
    } else {
      if (hasMore.value) currentPage.value = 2
    }
  } catch (error) {
  }
}

watch(
  () => route.params.id,
  () => {
    loadItinerariesData(false)
  },
  { immediate: true },
)

watch(activeFilter, () => {
  if (route.params.id) {
    router.push('/featured-itinerary')
  } else {
    loadItinerariesData(false)
  }
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

const openShareModal = (itineraryId) => {
  shareLink.value = `${window.location.origin}/featured-itinerary/${itineraryId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

const handlePostSuccess = async () => {
  isPostModalOpen.value = false
  itineraryToEdit.value = null
  loadItinerariesData(false)
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

const handleCardDelete = () => {
  itinerariesStore.fetchItineraries()
}

onMounted(async () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !itinerariesStore.loading) {
        loadItinerariesData(true)
      }
    },
    { rootMargin: '200px' },
  )

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }

  if (route.query.itineraryId) {
    router.replace(`/featured-itinerary/${route.query.itineraryId}`)
  }

  try {
    const regionsResult = await getAllVendorRegions()
    if (regionsResult.success && Array.isArray(regionsResult.data)) {
      vendorRegions.value = regionsResult.data
    }
  } catch (error) {
    void error
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
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
        v-if="itinerariesStore.loading && itinerariesStore.itineraries.length === 0"
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

      <div ref="loadMoreTrigger" class="py-10 text-center w-full">
        <div v-if="itinerariesStore.loading" class="flex justify-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          ></div>
        </div>
        <div
          v-else-if="!hasMore && filteredItineraries.length > 0 && !route.params.id"
          class="text-gray-400 text-sm"
        >
          已經到底囉，看更多精選行程 🏝️
        </div>
      </div>
    </div>
  </div>

  <ItineraryDetailModal
    v-if="isDetailModalOpen"
    :itinerary="selectedItinerary"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDetailModal"
    @edit="handleDetailEdit"
    @deleted="handleCardDelete"
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
