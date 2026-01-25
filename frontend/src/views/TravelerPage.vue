<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import TravelerApplyModal from '@/components/modals/TravelerApplyModal.vue'
import TravelerApplicationsModal from '@/components/modals/TravelerApplicationsModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue' // [新增] 確保功能不遺失
import { getTravelers, getTravelerById } from '@/api/travelers'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { TRAVELER_STATUS_OPTIONS, TRAVELER_CATEGORY_OPTIONS } from '@/utils/filterOptions'

const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()
const { drafts } = storeToRefs(myItineraryStore)

const setAppLoading = (active) => {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active } }))
}

const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isApplyModalOpen = ref(false)
const isApplicationsModalOpen = ref(false)
const isShareModalOpen = ref(false) // [新增] 功能回填

const selectedTraveler = ref(null)
const selectedDraft = ref(null)
const shareLink = ref('') // [新增] 功能回填
const shouldScrollToComments = ref(false)
const travelers = ref([])
const isLoading = ref(false)

// --- 篩選狀態 ---
const filterOptions = ref(TRAVELER_STATUS_OPTIONS)
const activeFilter = ref('全部') // 對應後端的 status

const categoryOptions = ref(TRAVELER_CATEGORY_OPTIONS)
const activeCategory = ref('全部') // 對應後端的 category

// --- 分頁狀態 ---
const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null)
let observer = null

// [核心修正] 統一載入邏輯：嚴格區分單篇模式與列表模式
const loadTravelers = async (isLoadMore = false) => {
  if (isLoading.value) return

  try {
    isLoading.value = true

    // A. 單篇模式：網址帶有 ID (例如 /travelers/77)
    if (route.params.id && !isLoadMore) {
      const response = await getTravelerById(route.params.id)
      if (response.success && response.data) {
        travelers.value = [response.data] // 背景只留一張卡片
        selectedTraveler.value = response.data
        isDetailModalOpen.value = true
        hasMore.value = false // 關閉無限捲動
      } else {
        travelers.value = []
        hasMore.value = false
      }
      isLoading.value = false
      return
    }

    // B. 列表模式：網址無 ID
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
    }

    const params = {
      page: currentPage.value,
      limit: 20, // 每次載入 20 則
    }

    if (activeFilter.value !== '全部') params.status = activeFilter.value
    if (activeCategory.value !== '全部') params.category = activeCategory.value

    const response = await getTravelers(params)

    if (response.success) {
      let newData = response.data || []

      // 過濾已過期的招募
      const today = new Date().setHours(0, 0, 0, 0)
      newData = newData.filter((t) => !t.end_date || new Date(t.end_date) >= today)

      if (newData.length < 20) hasMore.value = false

      if (isLoadMore) {
        travelers.value.push(...newData)
        currentPage.value++
      } else {
        travelers.value = newData
        if (hasMore.value) currentPage.value = 2
      }
    }
  } catch (error) {
    console.error('載入旅伴失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// [修正] 監聽路由 ID：這是唯一的進入點，避免 onMounted 重複呼叫
watch(
  () => route.params.id,
  () => {
    loadTravelers(false)
  },
  { immediate: true },
)

// 監聽 query 參數變化，處理通知跳轉等情況
watch(() => route.query.travelerId, async (newTravelerId) => {
  if (newTravelerId) {
    await nextTick()
    tryOpenSharedTraveler()
  }
})

const openTravelerDetail = (traveler, focusComment = false) => {
  router.push({
    path: `/travelers/${traveler.id}`,
    query: focusComment ? { scrollTo: 'comments' } : {},
  })
}

const closeTravelerDetail = () => {
  isDetailModalOpen.value = false
  selectedTraveler.value = null
  router.push('/travelers') // 網址變更會自動觸發上方 watch 重新載入列表
}

// [新增] 整合分享視窗功能
const openShareModal = (travelerId) => {
  shareLink.value = `${window.location.origin}/travelers/${travelerId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

const handleFilterChange = (filter) => {
  activeFilter.value = filter
}
const handleCategoryChange = (cat) => {
  activeCategory.value = cat
}
const handleTravelerUpdated = () => {
  loadTravelers(false)
}

const handleCardEdit = async (traveler) => {
  setAppLoading(true)
  let source = traveler
  try {
    const response = await getTravelerById(traveler.id)
    if (response?.success && response.data) source = response.data
  } catch (error) {
    console.error(error)
  }
  openEditModalFromTraveler(source)
  nextTick(() => setAppLoading(false))
}

const openEditModalFromTraveler = (source) => {
  selectedDraft.value = {
    type: 'traveler',
    data: {
      category: source.category || '',
      title: source.title || '',
      content: source.content || '',
      location: source.location || '',
      start_date: source.start_date || '',
      end_date: source.end_date || '',
      max_people: source.max_people || source.people?.split('/')[1] || 2,
      tags: source.tags || [],
      banner_image: source.image || source.banner_image || '',
      banner_position_y: source.banner_position_y,
      itinerary: source.itinerary || { days: [] },
      packingList: source.packingList || [],
      status: source.status || '招募中',
    },
  }
  isPostingModalOpen.value = true
}

const handleDetailEdit = (traveler) => {
  isDetailModalOpen.value = false
  handleCardEdit(traveler)
}

const handleCardDelete = () => {
  loadTravelers(false)
}
const handleOpenApply = (traveler) => {
  selectedTraveler.value = traveler
  isApplyModalOpen.value = true
}
const handleOpenApplications = (traveler) => {
  selectedTraveler.value = traveler
  isApplicationsModalOpen.value = true
}
const handleApplySuccess = () => {
  loadTravelers(false)
}
const handleApplicationUpdated = () => {
  loadTravelers(false)
}

const handlePostSuccess = () => {
  isPostingModalOpen.value = false
  selectedDraft.value = null
  loadTravelers(false)
}
const handlePostModalClose = () => {
  isPostingModalOpen.value = false
  selectedDraft.value = null
}

// 開啟草稿編輯
const openDraft = (draft) => {
  if (draft.type === 'traveler' && draft.data) {
    // 設置草稿數據並打開 Modal
    selectedDraft.value = draft
    isPostingModalOpen.value = true
  }
}

// 嘗試打開草稿的函數
const tryOpenDraft = () => {
  const draftId = route.query.openDraft
  if (draftId) {
    const draft = drafts.value.find((d) => String(d.id) === String(draftId))
    if (draft && draft.type === 'traveler') {
      nextTick(() => {
        openDraft(draft)
        // 清除查詢參數
        router.replace({ path: '/traveler', query: {} })
      })
    }
  }
}

const tryOpenSharedTraveler = async () => {
  let travelerId = route.query.travelerId
  if (!travelerId && route.hash) {
    const match = route.hash.match(/^#traveler-(.+)$/)
    if (match?.[1]) {
      travelerId = match[1]
    }
  }
  if (!travelerId) return
  
  // 防止重複打開
  if (isDetailModalOpen.value && String(selectedTraveler.value?.id) === String(travelerId)) {
    return
  }
  
  // 檢查是否需要滾動到留言區
  const shouldScroll = route.query.scrollToComments === 'true'
  
  setAppLoading(true)
  try {
    const response = await getTravelerById(travelerId)
    if (response?.success && response.data) {
      // 先清除 URL 參數，避免重複觸發
      await router.replace({ path: '/travelers', query: {}, hash: '' })
      
      // 確保 URL 更新後再打開模態框
      await nextTick()
      
      selectedTraveler.value = response.data
      shouldScrollToComments.value = shouldScroll
      isDetailModalOpen.value = true
    } else {
      // API 回應格式不正確或無資料
      console.error('旅伴資料格式錯誤：', response)
      await router.replace({ path: '/travelers', query: {}, hash: '' })
      alert('無法找到該找旅伴貼文')
    }
  } catch (error) {
    console.error('開啟分享旅伴失敗：', error)
    // 清除 URL 參數
    await router.replace({ path: '/travelers', query: {}, hash: '' }).catch(() => {})
    
    // 根據錯誤類型給予不同提示
    const errorMessage = error.response?.status === 404 
      ? '找旅伴貼文不存在或已被刪除'
      : '開啟找旅伴貼文時發生錯誤，請稍後再試'
    alert(errorMessage)
  } finally {
    setAppLoading(false)
  }
}

const tryOpenEditTraveler = async () => {
  const travelerId = route.query.editTraveler
  if (!travelerId) return
  setAppLoading(true)
  try {
    const response = await getTravelerById(travelerId)
    if (response?.success && response.data) {
      openEditModalFromTraveler(response.data)
      router.replace({ path: '/travelers', query: {} })
    }
  } catch (error) {
    console.error('開啟編輯旅伴失敗：', error)
  } finally {
    nextTick(() => setAppLoading(false))
  }
}

onMounted(() => {
  // 注意：這裡不需要呼叫 loadTravelers，因為 watch(..., {immediate: true}) 已經幫你做了

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !isLoading.value) {
        loadTravelers(true) // 下載更多 20 則
      }
    },
    { rootMargin: '200px' },
  )

  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-primary-tall">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-white flex items-center">
            <UsersIcon class="w-6 h-6 mr-3 text-white" />找旅伴
          </h1>
          <button
            class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition flex items-center shadow-md"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />發起招募
          </button>
        </div>
      </div>

      <div
        class="p-4 bg-white mb-6 space-y-4 border-4 border-primary shadow-primary-tall rounded-xl"
      >
        <div class="flex flex-wrap gap-2 text-sm border-b border-gray-100 pb-4 mb-2">
          <span class="text-gray-400 font-bold self-center mr-2">狀態：</span>
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2',
              activeFilter === filter
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="handleFilterChange(filter)"
          >
            {{ filter }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="text-gray-400 font-bold self-center mr-2">分類：</span>
          <button
            v-for="cat in categoryOptions"
            :key="cat"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2',
              activeCategory === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="handleCategoryChange(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div
        v-if="isLoading && travelers.length === 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 auto-rows-fr items-stretch"
      >
        <div
          v-for="n in 4"
          :key="n"
          class="h-[36rem] bg-white border border-secondary-200 shadow rounded-xl overflow-hidden animate-pulse"
        ></div>
      </div>

      <div
        v-else-if="travelers.length > 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 auto-rows-fr items-stretch"
      >
        <div v-for="traveler in travelers" :key="traveler.id" class="h-full">
          <TravelerCard
            class="h-full w-full"
            :traveler="traveler"
            @open-detail="openTravelerDetail(traveler, false)"
            @edit="handleCardEdit"
            @delete="handleCardDelete"
            @open-apply="handleOpenApply"
            @open-applications="handleOpenApplications"
            @share="openShareModal"
          />
        </div>
      </div>

      <div v-else-if="!isLoading" class="text-center py-20">
        <UsersIcon class="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p class="text-gray-500 text-lg mb-2">目前沒有符合條件的旅伴招募</p>
      </div>

      <div ref="loadMoreTrigger" class="py-8 text-center w-full">
        <div v-if="isLoading" class="flex justify-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          ></div>
        </div>
        <div
          v-else-if="!hasMore && travelers.length > 0 && !route.params.id"
          class="text-gray-400 text-sm"
        >
          已經到底囉，沒有更多招募了 🏝️
        </div>
      </div>
    </div>
  </div>

  <TravelerPostModal
    v-if="isPostingModalOpen"
    :draft-data="selectedDraft"
    @close="handlePostModalClose"
    @success="handlePostSuccess"
  />
  <TravelerDetailModal
    v-if="isDetailModalOpen"
    :traveler="selectedTraveler"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeTravelerDetail"
    @traveler-updated="handleTravelerUpdated"
    @open-apply="handleOpenApply"
    @open-applications="handleOpenApplications"
    @edit="handleDetailEdit"
  />
  <TravelerApplyModal
    v-if="isApplyModalOpen"
    :traveler="selectedTraveler"
    @close="isApplyModalOpen = false"
    @success="handleApplySuccess"
  />
  <TravelerApplicationsModal
    v-if="isApplicationsModalOpen"
    :traveler="selectedTraveler"
    @close="isApplicationsModalOpen = false"
    @application-updated="handleApplicationUpdated"
    @traveler-updated="handleTravelerUpdated"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
