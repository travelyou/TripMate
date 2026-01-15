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

const route = useRoute()
const vendorStore = useVendorStore()
const { currentVendor, vendorItineraries, vendorPosts, vendorReviews, loading } =
  storeToRefs(vendorStore)

// State
const activeRegion = ref('全部')
const showReviewModal = ref(false)

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
  // NOTE: In a real app we might want to fetch data filtered by region from backend
  // but here we filter on client side in child components.
}

const handlePageChange = (page) => {
  // Implement real pagination here
  console.log('Page changed to:', page)
}
</script>

<template>
  <div class="p-4 md:px-0 md:pt-8 lg:pt-8 max-w-7xl mx-auto">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-amber-600 font-bold text-xl animate-pulse">資料載入中...</div>
    </div>

    <!-- Content -->
    <div v-else-if="currentVendor" class="animate-fade-in">
      <!-- 廠商 Header (包含封面、基本資料、簡介) -->
      <VendorHeader :vendor="currentVendor" @open-review-modal="showReviewModal = true" />

      <!-- 廠商 Banner (本季主打) -->
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

      <!-- 地區篩選器 -->
      <VendorRegionSelector
        :regions="currentVendor.regionTags"
        :active-region="activeRegion"
        @select-region="handleRegionSelect"
      />

      <!-- 行程列表 -->
      <VendorItineraryList
        :itineraries="vendorItineraries"
        :active-region="activeRegion"
        @page-change="handlePageChange"
      />

      <!-- 貼文列表 -->
      <VendorPostList :posts="vendorPosts" :active-region="activeRegion" />
    </div>

    <!-- Error/Empty State -->
    <div v-else class="text-center py-12 text-gray-500">找不到廠商資料</div>

    <!-- Review Modal -->
    <VendorReviewModal
      :is-open="showReviewModal"
      :reviews="vendorReviews"
      :average-rating="currentVendor?.rating"
      :total-reviews="currentVendor?.reviewCount"
      @close="showReviewModal = false"
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
