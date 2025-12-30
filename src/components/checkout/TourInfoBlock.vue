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
    <div class="bg-white rounded-xl p-5 flex flex-col gap-5 justify-between sm:flex-row">
      <div class="flex gap-5 flex-col sm:flex-row">
        <img
          class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 self-center flex sm:self-auto"
          src="https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish"
          alt=""
        />
        <div>
          <h1 class="text-lg font-bold sm:text-xl">{{ tour.title }}</h1>
          <p class="text-sm">{{ tour.description }}</p>

          <div class="text-sm mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-5">
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
