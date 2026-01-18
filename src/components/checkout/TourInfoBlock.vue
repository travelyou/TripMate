<script setup>
import { computed } from 'vue'
import { checkoutStore } from '@/stores/checkout'

// 新增：允許外部傳 tour / price
const props = defineProps({
  tour: { type: Object, default: null },
  price: { type: [Number, String], default: null },
})

// tour：先用 props.tour，沒有才回退到 store
const tour = computed(
  () => props.tour ?? checkoutStore.selectedTour ?? checkoutStore.lastOrder?.tour ?? null,
)

// displayPrice：先用 props.price，沒有才回退舊邏輯
const displayPrice = computed(() => {
  if (props.price != null) return Number(props.price) || 0
  if (checkoutStore.selectedTour) return checkoutStore.cartTotalPrice
  return Number(checkoutStore.lastOrder?.cartTotalPrice ?? 0)
})
</script>

<template>
  <section v-if="tour">
    <div class="bg-white rounded-xl p-5 flex flex-col gap-2 justify-between sm:flex-row">
      <div class="flex gap-5 flex-col sm:flex-row">
        <div class="w-44 h-28 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
          <img v-if="tour.image" :src="tour.image" alt="旅遊圖片" />
        </div>
        <div class="space-y-2">
          <h1 class="text-lg font-bold sm:text-xl">{{ tour.title }}</h1>
          <p class="text-sm">{{ tour.description }}</p>

          <div class="text-sm mt-3 flex flex-col xl:gap-5 xl:flex-row">
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
