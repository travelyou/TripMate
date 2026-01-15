<script setup>
import { computed } from 'vue'
import { checkoutStore } from '@/stores/checkout'

const tour = computed(() => checkoutStore.selectedTour ?? checkoutStore.lastOrder?.tour ?? null)
const displayPrice = computed(() => {
  if (checkoutStore.selectedTour) return checkoutStore.cartTotalPrice
  return checkoutStore.lastOrder?.cartTotalPrice ?? 0
})
</script>

<template>
  <section v-if="tour">
    <div class="bg-white rounded-xl p-5 flex flex-col gap-5 justify-between sm:flex-row">
      <div class="flex gap-5 flex-col sm:flex-row">
        <div class="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
          <img v-if="tour.image" :src="tour.image" alt="旅遊圖片" />
        </div>
        <div class="space-y-2">
          <h1 class="text-lg font-bold sm:text-xl">{{ tour.title }}</h1>
          <p class="text-sm">{{ tour.description }}</p>

          <div class="text-sm mt-3 flex flex-col gap-1 lg:flex-row lg:justify-between">
            <p>行程日期：{{ tour.date }}</p>
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
