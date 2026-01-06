<script setup>
import { Star } from 'lucide-vue-next'

defineProps({
  reviews: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="reviews && reviews.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div
        v-for="review in reviews"
        :key="review.id"
        class="p-4 border border-gray-100 rounded-xl bg-gray-50 flex gap-4 items-start"
      >
        <img
          :src="review.avatar"
          class="w-10 h-10 rounded-full bg-gray-200"
          alt="Reviewer"
        />
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-bold text-gray-800">{{ review.author }}</span>
            <span class="text-xs text-gray-500">{{ review.date }}</span>
          </div>
          <div class="flex text-yellow-400 mb-2">
            <Star
              v-for="n in 5"
              :key="n"
              :class="{
                'fill-current': n <= review.rating,
                'text-gray-300': n > review.rating,
              }"
              class="w-3 h-3"
            />
          </div>
          <p class="text-sm text-gray-600 leading-relaxed">{{ review.content }}</p>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-20 text-gray-400">
      <p>目前還沒有收到評論。</p>
    </div>
  </div>
</template>
