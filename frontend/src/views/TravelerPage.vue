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
import { getTravelers, getTravelerById } from '@/api/travelers'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'

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
const selectedTraveler = ref(null)
const selectedDraft = ref(null) // 用於存儲要打開的草稿
const shouldScrollToComments = ref(false)
const travelers = ref([])
const isLoading = ref(false)

// --- 篩選狀態 ---
const filterOptions = ref(['全部', '招募中', '已額滿'])
const activeFilter = ref('全部') // 對應後端的 status

const categoryOptions = ref([
  '全部',
  '國內旅遊',
  '日韓旅遊',
  '亞洲其他',
  '歐美紐澳',
  '海島度假',
  '攝影',
  '自駕共乘',
  '其他',
])
const activeCategory = ref('全部') // 對應後端的 category

// --- 分頁狀態 ---
const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null)
let observer = null

// 載入旅伴資料 (支援分頁與篩選)
const loadTravelers = async (isLoadMore = false) => {
  if (isLoading.value) return

  try {
    isLoading.value = true

    // 如果不是載入更多 (代表是切換篩選或重新整理)，重置頁碼
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
      // travelers.value = [] // 選擇性：是否要先清空防止閃爍，這裡選擇不清空，直接覆蓋
    }

    const params = {
      page: currentPage.value,
      limit: 20, // ★ 修改：每次載入 20 則
    }

    // 加入篩選參數
    if (activeFilter.value !== '全部') {
      params.status = activeFilter.value
    }
    if (activeCategory.value !== '全部') {
      params.category = activeCategory.value
    }

    const response = await getTravelers(params)

    if (response.success) {
      let newData = response.data || []

      // 如果不是通过author_uid筛选（即不是个人档案页面），过滤掉过期的文章
      if (!params.author_uid) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        newData = newData.filter((traveler) => {
          if (!traveler.end_date) return true // 如果没有结束日期，保留
          const endDate = new Date(traveler.end_date)
          endDate.setHours(0, 0, 0, 0)
          return endDate >= today // 只保留未过期的文章
        })
      }

      // 判斷是否還有下一頁
      if (newData.length < 20) {
        hasMore.value = false
      }

      if (isLoadMore) {
        // 附加模式
        travelers.value.push(...newData)
        currentPage.value++
      } else {
        // 覆蓋模式
        travelers.value = newData
        if (hasMore.value) {
          currentPage.value = 2 // 準備下一頁
        }
      }
    }
  } catch (error) {
    console.error('載入旅伴失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 監聽篩選變更 -> 重新載入 (重置為第一頁)
watch([activeFilter, activeCategory], () => {
  loadTravelers(false)
})

watch(() => route.query.travelerId, (newTravelerId) => {
  if (newTravelerId) {
    nextTick(() => {
      tryOpenSharedTraveler()
    })
  }
})

const openTravelerDetail = (traveler, focusComment = false) => {
  selectedTraveler.value = traveler
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closeTravelerDetail = () => {
  isDetailModalOpen.value = false
  selectedTraveler.value = null
  shouldScrollToComments.value = false
}

// 切換狀態
const handleFilterChange = (filter) => {
  activeFilter.value = filter
}

// 切換分類
const handleCategoryChange = (cat) => {
  activeCategory.value = cat
}

// 資料更新回調
const handleTravelerUpdated = () => {
  // 更新單筆資料或重新載入，這裡簡單處理重新載入
  loadTravelers(false)
}

const handleCardEdit = async (traveler) => {
  setAppLoading(true)
  // 編輯時改用完整資料，避免行程/打包清單遺失
  let source = traveler
  try {
    const response = await getTravelerById(traveler.id)
    if (response?.success && response.data) {
      source = response.data
    }
  } catch (error) {
    console.error('取得旅伴完整資料失敗，改用列表資料：', error)
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

const handleCardDelete = (traveler) => {
  // 刪除已經在卡片組件中處理，這裡只需要重新整理列表
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

// 發文成功回調
const handlePostSuccess = () => {
  isPostingModalOpen.value = false
  selectedDraft.value = null
  loadTravelers(false)
}

// 關閉發文 Modal 並重置草稿狀態
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
  const travelerId = route.query.travelerId
  if (!travelerId) return
  setAppLoading(true)
  try {
    const response = await getTravelerById(travelerId)
    if (response?.success && response.data) {
      selectedTraveler.value = response.data
      shouldScrollToComments.value = false
      isDetailModalOpen.value = true
      router.replace({ path: '/travelers', query: {} })
    }
  } catch (error) {
    console.error('開啟分享旅伴失敗：', error)
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
  loadTravelers(false)

  // 設定 IntersectionObserver (無限捲動)
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !isLoading.value) {
        loadTravelers(true)
      }
    },
    {
      rootMargin: '200px', // 提早觸發載入
    },
  )

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }

  // 檢查是否有草稿需要打開
  tryOpenDraft()
  // 檢查是否有分享連結需要開啟
  tryOpenSharedTraveler()
  // 檢查是否要直接開啟編輯
  tryOpenEditTraveler()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// 監聽路由變化
watch(() => route.query.openDraft, (newDraftId) => {
  if (newDraftId) {
    nextTick(() => {
      tryOpenDraft()
    })
  }
})

watch(() => route.query.editTraveler, (newTravelerId) => {
  if (newTravelerId) {
    nextTick(() => {
      tryOpenEditTraveler()
    })
  }
})
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-primary-tall">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-white flex items-center">
            <UsersIcon class="w-6 h-6 mr-3 text-white" />
            找旅伴
          </h1>
          <button
            class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition flex items-center shadow-md"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            發起招募
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
          :key="`traveler-skeleton-${n}`"
          class="h-full bg-white border border-secondary-200 shadow rounded-xl overflow-hidden"
        >
          <div class="relative h-full animate-pulse">
            <div class="absolute top-0 left-0 h-6 w-20 bg-secondary-100 rounded-br-xl"></div>
            <div class="absolute top-0 right-0 h-6 w-16 bg-secondary-100 rounded-bl-xl"></div>
            <div
              class="relative w-full overflow-hidden rounded-xl aspect-[3/4] lg:aspect-auto lg:h-[36rem] bg-secondary-100"
            ></div>
            <div
              class="absolute inset-x-0 bottom-0 h-[45%] px-4 pb-4 pt-10 bg-gradient-to-t from-black/60 via-black/30 to-transparent"
            >
              <div class="flex items-center space-x-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-white/30"></div>
                <div class="h-3 w-24 bg-white/30 rounded"></div>
              </div>
              <div class="h-5 w-3/4 bg-white/30 rounded mb-2"></div>
              <div class="h-3 w-full bg-white/20 rounded mb-2"></div>
              <div class="flex flex-wrap gap-2 mb-3">
                <div class="h-4 w-12 bg-white/20 rounded-full"></div>
                <div class="h-4 w-16 bg-white/20 rounded-full"></div>
                <div class="h-4 w-10 bg-white/20 rounded-full"></div>
              </div>
              <div class="flex items-center justify-between">
                <div class="h-4 w-28 bg-white/25 rounded"></div>
                <div class="h-8 w-20 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="travelers.length > 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 auto-rows-fr items-stretch"
      >
        <div v-for="traveler in travelers" :key="traveler.id" class="h-full">
          <TravelerCard
            class="h-full w-full"
            :traveler="traveler"
            @click="openTravelerDetail(traveler, false)"
            @edit="handleCardEdit"
            @delete="handleCardDelete"
            @open-apply="handleOpenApply"
            @open-applications="handleOpenApplications"
          />
        </div>
      </div>

      <div v-else-if="!isLoading" class="text-center py-20">
        <UsersIcon class="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p class="text-gray-500 text-lg mb-2">目前沒有符合條件的旅伴招募</p>
        <button
          class="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition shadow-md mt-4"
          @click="isPostingModalOpen = true"
        >
          <PlusIcon class="w-5 h-5 inline mr-2" />
          發起招募
        </button>
      </div>

      <div ref="loadMoreTrigger" class="py-8 text-center w-full">
        <div v-if="isLoading" class="flex justify-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
          ></div>
        </div>
        <div v-else-if="!hasMore && travelers.length > 0" class="text-gray-400 text-sm">
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
  />
</template>
