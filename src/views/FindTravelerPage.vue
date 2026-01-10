<script setup>
import { ref, onMounted } from 'vue'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import { getTravelers } from '@/api/travelers'

const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const selectedTraveler = ref(null)
const shouldScrollToComments = ref(false)

// 旅伴列表資料
const travelers = ref([])
const isLoading = ref(false)

// 篩選選項
const filterOptions = ref(['全部', '招募中', '已額滿'])
const activeFilter = ref('全部')

// 載入旅伴資料
const loadTravelers = async () => {
  isLoading.value = true
  try {
    const filters = {}

    // 根據篩選條件設定
    if (activeFilter.value !== '全部') {
      filters.status = activeFilter.value
    }

    const response = await getTravelers(filters)

    if (response.success) {
      travelers.value = response.data
      console.log('載入旅伴資料成功：', travelers.value)
    } else {
      console.error('載入旅伴資料失敗：', response)
    }
  } catch (error) {
    console.error('載入旅伴資料失敗：', error)
    alert('載入旅伴資料失敗，請檢查後端是否啟動')
  } finally {
    isLoading.value = false
  }
}

// 打開旅伴詳情
const openTravelerDetail = (traveler, focusComment = false) => {
  selectedTraveler.value = traveler
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

// 關閉旅伴詳情
const closeTravelerDetail = () => {
  isDetailModalOpen.value = false
  selectedTraveler.value = null
  shouldScrollToComments.value = false
}

// 監聽篩選變化
const handleFilterChange = (filter) => {
  activeFilter.value = filter
  loadTravelers()
}

// 旅伴更新後重新載入
const handleTravelerUpdated = () => {
  loadTravelers()
}

// 初始化載入
onMounted(() => {
  loadTravelers()
})
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-hidden">
    <div class="w-full">
      <div
        class="bg-green-100 p-5 rounded-xl mb-6 mt-4 border-4 border-green-300 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)]"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-amber-900 flex items-center">
            <UsersIcon class="w-7 h-7 mr-3 text-red-500 fill-red-100" />
            找旅伴
          </h1>
          <button
            class="bg-green-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-600 transition shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center border-4 border-gray-800"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            發起招募
          </button>
        </div>
      </div>

      <div
        class="mb-8 p-4 bg-white/90 border-4 border-amber-700 shadow-[4px_4px_0px_0px_rgba(139,111,71,0.2)]"
      >
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]',
              activeFilter === filter
                ? 'bg-red-400 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
            @click="handleFilterChange(filter)"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="isLoading" class="text-center py-20">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
        ></div>
        <p class="mt-4 text-gray-600">載入中...</p>
      </div>

      <!-- 旅伴列表 -->
      <div v-else-if="travelers.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelerCard
          v-for="traveler in travelers"
          :key="traveler.id"
          :traveler="traveler"
          @click="openTravelerDetail(traveler, false)"
        />
      </div>

      <!-- 無資料 -->
      <div v-else class="text-center py-20">
        <UsersIcon class="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p class="text-gray-500 text-lg mb-2">目前沒有符合條件的旅伴招募</p>
        <p class="text-gray-400 text-sm mb-4">成為第一個發起招募的人！</p>
        <button
          class="bg-green-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600 transition shadow-md"
          @click="isPostingModalOpen = true"
        >
          <PlusIcon class="w-5 h-5 inline mr-2" />
          發起招募
        </button>
      </div>
    </div>
  </div>

  <PostingChoiceModal v-if="isPostingModalOpen" @close="isPostingModalOpen = false" />

  <TravelerDetailModal
    v-if="isDetailModalOpen"
    :traveler="selectedTraveler"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeTravelerDetail"
    @traveler-updated="handleTravelerUpdated"
  />
</template>
