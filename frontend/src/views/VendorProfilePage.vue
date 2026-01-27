<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVendorStore } from '@/stores/vendor'
import { storeToRefs } from 'pinia'
import { usePermission } from '@/composables/usePermission'

// Components
import VendorHeader from '@/components/vendor/VendorHeader.vue'
import VendorItineraryList from '@/components/vendor/VendorItineraryList.vue'
import VendorPostList from '@/components/vendor/VendorPostList.vue'
import VendorRegionSelector from '@/components/vendor/VendorRegionSelector.vue'
import VendorReviewModal from '@/components/vendor/VendorReviewModal.vue'

const route = useRoute()
const router = useRouter()
const vendorStore = useVendorStore()
const { currentVendor, vendorItineraries, vendorPosts, vendorReviews, loading } =
  storeToRefs(vendorStore)

// Permissions
const { canEdit: isOwner } = usePermission()

// State
const activeRegion = ref('全部')
const showReviewModal = ref(false)

// Computed
const mainRegions = computed(() => {
  if (!currentVendor.value) return []
  
  const bannerImageData = currentVendor.value.bannerImage || currentVendor.value.banner_image || ''
  
  if (!bannerImageData) {
    return []
  }
  
  try {
    let parsedData = null
    
    if (typeof bannerImageData === 'string') {
      if (bannerImageData.startsWith('[') || bannerImageData.startsWith('{')) {
        parsedData = JSON.parse(bannerImageData)
      } else {
        return []
      }
    } else if (Array.isArray(bannerImageData)) {
      parsedData = bannerImageData
    } else {
      return []
    }
    
    const regions = Array.isArray(parsedData) ? parsedData : []
    
    const validRegions = regions.filter(region => region && region.name && region.image)
    
    return validRegions
  } catch (e) {
    return []
  }
})

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
const handleEdit = () => {
  router.push({ name: 'VendorDashboard' })
}

const handleRegionSelect = (region) => {
  activeRegion.value = region
  // NOTE: In a real app we might want to fetch data filtered by region from backend
  // but here we filter on client side in child components.
}
// ... existing code ...
const handlePageChange = (page) => {
  // Implement real pagination here
}
</script>

<template>
  <div class="p-4 md:px-8 md:pt-8 lg:pt-8 mt-6 md:mt-8 max-w-7xl mx-auto">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-primary-600 font-bold text-xl animate-pulse">資料載入中...</div>
    </div>

    <!-- Content -->
    <div v-else-if="currentVendor" class="animate-fade-in">
      <!-- 廠商 Header (包含封面、基本資料、簡介) -->
      <VendorHeader
        :vendor="currentVendor"
        :is-owner="isOwner"
        @open-review-modal="showReviewModal = true"
        @edit="handleEdit"
      />

      <!-- 地區篩選器 (主打地區) -->
      <VendorRegionSelector
        :regions="mainRegions"
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
    <div v-else class="text-center py-12 text-secondary-500">找不到廠商資料</div>

    <!-- Review Modal -->
    <VendorReviewModal
      :is-open="showReviewModal"
      :reviews="vendorReviews"
      :average-rating="Number(currentVendor?.rating || 0)"
      :total-reviews="Number(currentVendor?.reviewCount || 0)"
      @close="showReviewModal = false"
    />
  </div>
</template>

<style scoped>
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
