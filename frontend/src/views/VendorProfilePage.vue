<script setup>
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVendorStore } from '@/stores/vendor'
import { storeToRefs } from 'pinia'
import { usePermission } from '@/composables/usePermission'

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

const { canEdit: isOwner } = usePermission()

const activeRegion = ref('全部')
const showReviewModal = ref(false)

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
  const vendorId = route.params.id || 'vendor001'
  await Promise.all([
    vendorStore.fetchVendorProfile(vendorId),
    vendorStore.fetchVendorItineraries(vendorId),
    vendorStore.fetchVendorPosts(vendorId),
    vendorStore.fetchVendorReviews(vendorId),
  ])
}

onMounted(() => {
  loadData()
})

watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadData()
  },
)

const handleEdit = () => {
  router.push({ name: 'VendorDashboard' })
}

const handleRegionSelect = (region) => {
  activeRegion.value = region
}

const handlePageChange = (page) => {
}
</script>

<template>
  <div class="p-4 md:px-8 md:pt-8 lg:pt-8 mt-6 md:mt-8 max-w-7xl mx-auto">
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="text-primary-600 font-bold text-xl animate-pulse">資料載入中...</div>
    </div>

    <div v-else-if="currentVendor" class="animate-fade-in">
      <VendorHeader
        :vendor="currentVendor"
        :is-owner="isOwner"
        @open-review-modal="showReviewModal = true"
        @edit="handleEdit"
      />

      <VendorRegionSelector
        :regions="mainRegions"
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

    <div v-else class="text-center py-12 text-secondary-500">找不到廠商資料</div>

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
