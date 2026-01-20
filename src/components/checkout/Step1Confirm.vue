<script setup>
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'

const router = useRouter()
const route = useRoute()

// 顯示用：永遠以 cartSelectedTour 為準（後端 cart + itinerary 合併後的資料）
const tour = computed(() => checkoutStore.cartSelectedTour)

onMounted(async () => {
  // 1) 從 query 拿 itineraryId（購物車 goCheckout 帶過來的）
  const itineraryId = Number(route.query.itineraryId)

  // 2) 先載入購物車（後端為準）
  await checkoutStore.loadCartFromDb()

  // 3) 有 itineraryId 就選它；沒有就保持 store 目前選擇（或預設第一筆）
  if (Number.isFinite(itineraryId) && itineraryId > 0) {
    checkoutStore.selectedCartTourId = itineraryId
  }

  // 4) 如果購物車是空的就退回
  if (!checkoutStore.cartSelectedTour) {
    router.replace('/cart')
  }
})

function nextStep() {
  router.push('/checkout/step2')
}

function backCart() {
  router.push('/cart')
}
</script>

<template>
  <section class="max-w-4xl mx-auto">
    <div>
      <!-- 標題 -->
      <div class="my-2 sm:my-5">
        <h1 class="font-bold text-3xl">確認商品</h1>
        <p class="text-gray-600">請確認您選購的行程資訊</p>
      </div>

      <!-- 行程資訊 -->
      <div v-if="tour">
        <div class="flex flex-col gap-10 bg-white rounded-xl p-10 sm:flex-row">
          <!-- 圖片 -->
          <div class="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
            <img v-if="tour.image" :src="tour.image" alt="旅遊圖片" />
          </div>

          <!-- 資訊文字區 -->
          <div>
            <!-- 商品資訊區 -->
            <div>
              <h1 class="text-xl font-bold sm:text-3xl">{{ tour.title }}</h1>
              <p class="text-sm mt-5 sm:text-base sm:mt-2 line-clamp-2">
                {{ tour.description }}
              </p>

              <div class="grid grid-cols-1 mt-5 text-sm sm:text-base sm:grid-cols-2">
                <p>行程日期：{{ tour.date }}</p>
                <p class="text-sm sm:text-base">人數：{{ tour.persons }} 人</p>
              </div>
            </div>

            <!-- 金額計算區 -->
            <div class="flex flex-col mt-10">
              <div class="flex justify-between">
                <p>商品價格:</p>
                <p>NT$ {{ tour.price }}</p>
              </div>
              <div class="flex justify-between">
                <p>打折:</p>
                <p>NT$ 0</p>
              </div>
              <div class="flex justify-between py-2 mt-5 border-t">
                <p>總計：</p>
                <p>NT$ {{ checkoutStore.cartTotalPrice }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 按鈕區 -->
        <div class="flex justify-between mt-10">
          <SubButton @click="backCart"> 返回購物車 </SubButton>
          <MainButton @click="nextStep"> 下一步 </MainButton>
        </div>
      </div>
    </div>
  </section>
</template>
