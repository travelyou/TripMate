<script setup>
import { Star as StarIcon } from 'lucide-vue-next';

defineProps({
  reviews: {
    type: Array,
    required: true
  }
});
</script>

<template>
  <div class="mb-8">
    <div class="mb-6">
      <h2
        class="inline-flex items-center text-xl font-bold text-amber-900 bg-yellow-100 px-5 py-2 rounded-xl border-4 border-yellow-200 shadow-[4px_4px_0px_0px_rgba(250,204,21,0.5)]"
      >
        <StarIcon class="w-5 h-5 mr-2" />
        旅客評價
      </h2>
    </div>

    <div class="space-y-4">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="bg-white rounded-xl p-5 border-2 border-amber-50 shadow-sm"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <img :src="review.avatar" class="w-10 h-10 rounded-full border border-gray-200" />
            <div>
              <div class="font-bold text-gray-900">{{ review.userName }}</div>
              <div class="text-xs text-gray-500">{{ review.date }}</div>
            </div>
          </div>
          <div class="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
            <StarIcon class="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
            <span class="font-bold text-amber-700">{{ review.rating }}</span>
          </div>
        </div>
        <p class="text-gray-600 text-sm leading-relaxed">
          {{ review.content }}
        </p>
      </div>
    </div>

    <div class="text-center mt-6">
       <button class="text-amber-600 font-bold hover:underline">查看更多評價</button>
    </div>
  </div>
</template>
