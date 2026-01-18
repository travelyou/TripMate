<script setup>
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
//import { computed } from 'vue'
const router = useRouter()

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
      <div v-if="checkoutStore.selectedTour">
        <div class="flex flex-col gap-10 bg-white rounded-xl p-10 sm:flex-row">
          <!-- 圖片 -->
          <div class="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
            <img
              v-if="checkoutStore.selectedTour.image"
              :src="checkoutStore.selectedTour.image"
              alt="旅遊圖片"
            />
          </div>

          <!-- 資訊文字區 -->
          <div>
            <!-- 商品資訊區 -->
            <div>
              <h1 class="text-xl font-bold sm:text-3xl">{{ checkoutStore.selectedTour.title }}</h1>
              <p class="text-sm mt-5 sm:text-base sm:mt-2 line-clamp-2">
                {{ checkoutStore.selectedTour.description }}
              </p>

              <div class="grid grid-cols-1 mt-5 text-sm sm:text-base sm:grid-cols-2">
                <p>行程日期：{{ checkoutStore.selectedTour.date }}</p>
                <p class="text-sm sm:text-base">
                  人數：{{ checkoutStore.selectedTour.persons }} 人
                </p>
              </div>
            </div>
            <!-- 金額計算區 -->
            <div class="flex flex-col mt-10">
              <div class="flex justify-between">
                <p>商品價格:</p>
                <p>NT$ {{ checkoutStore.selectedTour.price }}</p>
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
