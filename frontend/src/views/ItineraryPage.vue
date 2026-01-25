<script setup>
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue' // ★ 加入 onUnmounted
import { Map as MapIcon, Plus as PlusIcon, XCircle as XCircleIcon } from 'lucide-vue-next'
import { useItineraryStore } from '@/stores/itinerary'
import { useRoute, useRouter } from 'vue-router'
import { getItineraryById } from '@/api/itinerary'

import ItineraryCard from '@/components/cards/ItineraryCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'
import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'
import { ITINERARY_CATEGORY_OPTIONS } from '@/utils/filterOptions'
import { showError } from '@/utils/alert'

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
const itineraryToEdit = ref(null)

// ★ 修改：更新為新的分類選項
const filterOptions = ref(ITINERARY_CATEGORY_OPTIONS)
const activeFilter = ref('全部')

// --- ★ 分頁與捲動狀態 [新增] ---
const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null)
let observer = null

const filteredItineraries = computed(() => {
  const itineraries = itinerariesStore.itineraries || []
  if (activeFilter.value === '全部') return itineraries
  return itineraries.filter((item) => (item.category || '其他') === activeFilter.value)
})

// [修正] 核心載入邏輯：支援 15 則分頁載入
const loadItinerariesData = async (isLoadMore = false) => {
  if (itinerariesStore.loading) return

  // 1. 單篇顯示模式 (網址帶 ID)
  if (route.params.id && !isLoadMore) {
    setAppLoading(true)
    try {
      const response = await getItineraryById(route.params.id)
      const item = response?.data || response
      if (item) {
        itinerariesStore.itineraries = [item] // 背景只留一張
        selectedItinerary.value = item
        isDetailModalOpen.value = true
        hasMore.value = false // 關閉無限捲動
      }
    } catch (error) {
      console.error('抓取行程失敗:', error)
    } finally {
      setAppLoading(false)
    }
    return
  }

  // 2. 正常列表分頁模式
  try {
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
    }

    const params = {
      page: currentPage.value,
      limit: 15, // ★ 每次載入 15 則
      category: activeFilter.value !== '全部' ? activeFilter.value : null,
    }

    // 呼叫 Store Action，傳入分頁參數
    const newData = await itinerariesStore.fetchItineraries(params, isLoadMore)

    // 判斷是否還有資料
    if (newData && newData.length < 15) {
      hasMore.value = false
    }

    if (isLoadMore) {
      currentPage.value++
    } else {
      if (hasMore.value) currentPage.value = 2
    }
  } catch (error) {
    console.error('載入行程失敗:', error)
  }
}

// 監聽網址參數：處理 Modal 開啟與列表刷新
watch(
  () => route.params.id,
  () => {
    loadItinerariesData(false)
  },
  { immediate: true },
)

// 監聽篩選條件：切換時若在單篇模式則回到列表
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
  router.push('/featured-itinerary') // 網址重置會自動觸發 watch 載入列表
}

const tryOpenSharedItinerary = async () => {
  let itineraryId = route.query.itineraryId
  if (!itineraryId && route.hash) {
    const match = route.hash.match(/^#itinerary-(.+)$/)
    if (match?.[1]) {
      itineraryId = match[1]
    }
  }
  if (!itineraryId) return
  setAppLoading(true)
  try {
    const response = await getItineraryById(itineraryId)
    const itinerary = response?.data || response
    if (itinerary) {
      openDetailModal(itinerary, false)
      router.replace({ path: '/featured-itinerary', query: {}, hash: '' })
    } else {
      await showError('無法找到該行程，可能已被刪除或不存在')
      router.replace({ path: '/featured-itinerary', query: {}, hash: '' })
    }
  } catch (error) {
    console.error('開啟分享行程失敗：', error)
    await showError('開啟行程時發生錯誤，請稍後再試')
    router.replace({ path: '/featured-itinerary', query: {}, hash: '' }).catch(() => {})
  } finally {
    setAppLoading(false)
  }
}

// 處理開啟分享模態框
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
  loadItinerariesData(false)
}

// eslint-disable-next-line no-unused-vars
const handleCardDelete = (itinerary) => {
  // 刪除已經在卡片組件中處理，這裡只需要重新整理列表
  itinerariesStore.fetchItineraries()
}

// 初始化載入資料
onMounted(() => {
  // 設定無限捲動偵測器
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !itinerariesStore.loading) {
        loadItinerariesData(true) // 下載更多 15 則
      }
    },
    { rootMargin: '200px' },
  )

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }

  // 舊式查詢參數導航兼容處理
  if (route.query.itineraryId) {
    router.replace(`/featured-itinerary/${route.query.itineraryId}`)
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
