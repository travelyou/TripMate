<script setup>
import { computed } from 'vue'
import { checkoutStore } from '@/stores/checkout'

// 允許外部傳 tour / price（Step4/Step5 很適合直接傳後端資料）
const props = defineProps({
  tour: { type: Object, default: null },
  price: { type: [Number, String], default: null },
})

// tour：props > cartSelectedTour（後端 cart 合併資料）> lastOrder.tour（舊相容）
const tour = computed(() => {
  return props.tour ?? checkoutStore.cartSelectedTour ?? checkoutStore.lastOrder?.tour ?? null
})

// price：props > 以 tour.price * persons 算（或直接用 store cartTotalPrice）> 0
const displayPrice = computed(() => {
  if (props.price != null) return Number(props.price) || 0

  const t = tour.value
  if (!t) return 0

  // 如果 tour 本身有 price/persons，就直接算（最不依賴 store）
  const p = Number(t.price ?? 0)
  const n = Number(t.persons ?? 1)
  if (p && n) return p * n

  // 最後才退回 store 的 cartTotalPrice（適用於 Step1~3）
  return Number(checkoutStore.cartTotalPrice ?? 0)
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
