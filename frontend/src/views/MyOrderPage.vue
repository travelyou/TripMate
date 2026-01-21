<script setup>
import { storeToRefs } from 'pinia'
import { Map as MapIcon } from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'

const myItineraryStore = useMyItineraryStore()
const { featuredItineraries } = storeToRefs(myItineraryStore)

const handleFeaturedRate = ({ id, rating, comment }) => {
  myItineraryStore.updateFeaturedRating({ id, rating, comment })
}

const handleFeaturedClear = (id) => {
  myItineraryStore.clearFeaturedRating(id)
}
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="space-y-6 pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <MapIcon class="w-6 h-6 text-secondary-50" />
          訂單管理
        </h1>
      </div>

      <div class="p-4 space-y-4">
        <FeaturedItineraryTab
          :itineraries="featuredItineraries"
          @rate="handleFeaturedRate"
          @clear="handleFeaturedClear"
        />
      </div>
    </div>
  </div>
</template>
