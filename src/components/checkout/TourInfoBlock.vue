<script setup>
import { computed } from 'vue'
import { checkoutStore } from '@/stores/checkout'

const tour = computed(() => checkoutStore.selectedTour ?? checkoutStore.lastOrder?.tour ?? null)
const displayPrice = computed(() => {
  if (checkoutStore.selectedTour) return checkoutStore.totalPrice
  return checkoutStore.lastOrder?.totalPrice ?? 0
})
</script>

<template>
  <section v-if="tour">
    <div class="bg-white rounded-xl p-5 flex justify-between">
      <div class="flex gap-5">
        <img
          class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0"
          src="https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish"
          alt=""
        />
        <div>
          <h1 class="text-xl">{{ tour.title }}</h1>
          <p class="text-sm">{{ tour.description }}</p>

          <div class="text-sm mt-2">
            <p>出發日期：{{ tour.date }}</p>
            <p>行程時間：{{ tour.duration }}</p>
            <p>人數：{{ tour.persons }} 人</p>
          </div>
        </div>
      </div>
      <div>
        <p class="text-2xl font-bold text-blue-500">NT${{ displayPrice }}</p>
      </div>
    </div>
  </section>
</template>
