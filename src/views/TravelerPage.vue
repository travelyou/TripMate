<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import { getTravelers } from '@/api/travelers'
import { useMyItineraryStore } from '@/stores/myItinerary'

const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()
const { drafts } = storeToRefs(myItineraryStore)

const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedTraveler = ref(null)
const selectedDraft = ref(null) // 用於存儲要打開的草稿
const shouldScrollToComments = ref(false)
const travelers = ref([])
const isLoading = ref(false)
const filterOptions = ref(['全部', '招募中', '已額滿'])
const activeFilter = ref('全部')

const loadTravelers = async () => {
  isLoading.value = true
  try {
    const filters = {}
    if (activeFilter.value !== '全部') {
      filters.status = activeFilter.value
    }
    const response = await getTravelers(filters)
    if (response.success) {
      travelers.value = response.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

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

const handleFilterChange = (filter) => {
  activeFilter.value = filter
  loadTravelers()
}

const handleTravelerUpdated = () => {
  loadTravelers()
}

// 處理發文成功
const handlePostSuccess = () => {
  isPostingModalOpen.value = false
  selectedDraft.value = null
  loadTravelers()
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

onMounted(() => {
  loadTravelers()
  // 檢查是否有草稿需要打開
  tryOpenDraft()
})

// 監聽路由變化
watch(() => route.query.openDraft, (newDraftId) => {
  if (newDraftId) {
    nextTick(() => {
      tryOpenDraft()
    })
  }
})
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-primary-tall">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-secondary-50 flex items-center">
            <UsersIcon class="w-6 h-6 mr-3 text-white" />
            找旅伴
          </h1>
          <button
            class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition flex items-center"
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
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-secondary-800 shadow-primary-solid',
              activeFilter === filter
                ? 'bg-primary text-secondary-50'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200',
            ]"
            @click="handleFilterChange(filter)"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-20">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
        ></div>
      </div>

      <div v-else-if="travelers.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelerCard
          v-for="traveler in travelers"
          :key="traveler.id"
          :traveler="traveler"
          @click="openTravelerDetail(traveler, false)"
        />
      </div>

      <div v-else class="text-center py-20">
        <UsersIcon class="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p class="text-gray-500 text-lg mb-2">目前沒有符合條件的旅伴招募</p>
        <button
          class="bg-green-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600 transition shadow-md mt-4"
          @click="isPostingModalOpen = true"
        >
          <PlusIcon class="w-5 h-5 inline mr-2" />
          發起招募
        </button>
      </div>
    </div>
  </div>

  <TravelerPostModal
    v-if="isPostingModalOpen"
    :draft-data="selectedDraft"
    @close="isPostingModalOpen = false; selectedDraft = null"
    @success="handlePostSuccess"
  />

  <TravelerDetailModal
    v-if="isDetailModalOpen"
    :traveler="selectedTraveler"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeTravelerDetail"
    @traveler-updated="handleTravelerUpdated"
  />
</template>
