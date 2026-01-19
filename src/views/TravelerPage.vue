<script setup>
import { ref, onMounted, computed } from 'vue'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import { getTravelers } from '@/api/travelers'

const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedTraveler = ref(null)
const shouldScrollToComments = ref(false)
const travelers = ref([])
const isLoading = ref(false)

const statusOptions = ref(['全部', '招募中', '已額滿'])
const activeStatus = ref('全部')

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
const activeCategory = ref('全部')

const loadTravelers = async () => {
  isLoading.value = true
  try {
    // 這裡我們抓取所有資料，然後在前端進行雙重過濾
    const response = await getTravelers({})
    if (response.success) {
      travelers.value = response.data
    }
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

// ★ 新增：雙重過濾邏輯 (狀態 + 分類)
const filteredTravelers = computed(() => {
  return travelers.value.filter((t) => {
    // 1. 狀態篩選
    const statusMatch = activeStatus.value === '全部' || t.status === activeStatus.value
    // 2. 分類篩選
    const categoryMatch = activeCategory.value === '全部' || t.category === activeCategory.value

    return statusMatch && categoryMatch
  })
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

const handleTravelerUpdated = () => {
  loadTravelers()
}

const handlePostSuccess = () => {
  isPostingModalOpen.value = false
  loadTravelers()
}

onMounted(() => {
  loadTravelers()
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
            v-for="status in statusOptions"
            :key="status"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2',
              activeStatus === status
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="activeStatus = status"
          >
            {{ status }}
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
            @click="activeCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-20">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
        ></div>
      </div>

      <div
        v-else-if="filteredTravelers.length > 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 auto-rows-fr items-stretch"
      >
        <div v-for="traveler in filteredTravelers" :key="traveler.id" class="h-full">
          <TravelerCard
            class="h-full w-full"
            :traveler="traveler"
            @click="openTravelerDetail(traveler, false)"
          />
        </div>
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
    @close="isPostingModalOpen = false"
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
