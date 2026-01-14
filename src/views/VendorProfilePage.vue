<script setup>
import { onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useVendorStore } from '@/stores/vendor'
import { storeToRefs } from 'pinia'

// Components
import VendorHeader from '@/components/vendor/VendorHeader.vue'
import VendorItineraryList from '@/components/vendor/VendorItineraryList.vue'
import VendorPostList from '@/components/vendor/VendorPostList.vue'
import VendorRegionSelector from '@/components/vendor/VendorRegionSelector.vue'
import VendorReviewModal from '@/components/vendor/VendorReviewModal.vue'
// [新增] 引入新增行程彈窗
import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'

const route = useRoute()
const vendorStore = useVendorStore()
const { currentVendor, vendorItineraries, vendorPosts, vendorReviews, loading } =
  storeToRefs(vendorStore)

// State
const activeRegion = ref('全部')
const showReviewModal = ref(false)
const showPostModal = ref(false) // [新增] 控制新增行程彈窗的狀態

const loadData = async () => {
  const vendorId = route.params.id || 'vendor001' // Default to mock ID if none
  await Promise.all([
    vendorStore.fetchVendorProfile(vendorId),
    vendorStore.fetchVendorItineraries(vendorId),
    vendorStore.fetchVendorPosts(vendorId),
    vendorStore.fetchVendorReviews(vendorId),
  ])
}

// Initial load
onMounted(() => {
  loadData()
})

// Watch for route changes (e.g. switching between vendors)
watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadData()
  },
)

// Event Handlers
const handleRegionSelect = (region) => {
  activeRegion.value = region
}

const handlePageChange = (page) => {
  console.log('Page changed to:', page)
}

// [新增] 處理發布成功
const handlePostSuccess = async () => {
  showPostModal.value = false
  // 重新載入資料，這樣列表就會出現剛新增的行程
  await loadData()
  // 也可以加一個簡單的提示
  // alert('行程發布成功！')
}
</script>

<template>
  <div class="p-4 md:px-0 md:pt-8 lg:pt-8 max-w-7xl mx-auto">
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-amber-600 font-bold text-xl animate-pulse">資料載入中...</div>
    </div>

    <div v-else-if="currentVendor" class="animate-fade-in">
      <VendorHeader
        :vendor="currentVendor"
        @open-review-modal="showReviewModal = true"
        @open-post-modal="showPostModal = true"
      />

      <div
        v-if="currentVendor.bannerImage"
        class="mb-8 rounded-3xl overflow-hidden shadow-lg border-2 border-amber-100 h-40 md:h-64 relative pixel-card"
      >
        <img :src="currentVendor.bannerImage" class="w-full h-full object-cover" />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6"
        >
          <h2 class="text-white text-2xl md:text-3xl font-black drop-shadow-lg tracking-wide">
            本季主打行程
          </h2>
        </div>
      </div>

      <VendorRegionSelector
        :regions="currentVendor.regionTags"
        :active-region="activeRegion"
        @select-region="handleRegionSelect"
      />

      <VendorItineraryList
        :itineraries="vendorItineraries"
        :active-region="activeRegion"
        @page-change="handlePageChange"
      />

      <VendorPostList :posts="vendorPosts" :active-region="activeRegion" />
    </div>

    <div v-else class="text-center py-12 text-gray-500">找不到廠商資料</div>

    <VendorReviewModal
      :is-open="showReviewModal"
      :reviews="vendorReviews"
      :average-rating="currentVendor?.rating"
      :total-reviews="currentVendor?.reviewCount"
      @close="showReviewModal = false"
    />

    <ItineraryPostModal
      v-if="showPostModal"
      @close="showPostModal = false"
      @success="handlePostSuccess"
    />
  </div>
</template>

<style scoped>
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
