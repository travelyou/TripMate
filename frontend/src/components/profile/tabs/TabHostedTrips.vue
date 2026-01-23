<script setup>
import TravelerCard from '@/components/cards/TravelerCard.vue'

defineProps({
  trips: {
    type: Array,
    default: () => []
  }
})

defineEmits(['open-detail', 'edit'])
</script>

<template>
  <div class="space-y-4">
    <div v-if="trips.length > 0" class="grid grid-cols-1 gap-6">
      <TravelerCard
        v-for="trip in trips"
        :key="trip.id"
        :traveler="trip"
        @click="$emit('open-detail', trip)"
        @edit="$emit('edit', trip)"
      />
    </div>
    <div v-else class="text-center py-20 text-secondary-400">
      <p>還沒有發布過旅遊揪團喔！</p>
    </div>
  </div>
</template>
