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
        <div class="flex flex-col gap-10 bg-white rounded-xl p-10 sm:flex-row sm:justify-center">
          <!-- 圖片 -->
          <img
            class="w-36 h-36 rounded-lg overflow-hidden flex-shrink-0 self-center sm:self-start"
            src="https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish"
            alt=""
          />
          <!-- 資訊大區 -->
          <div>
            <!-- 商品資訊區 -->
            <div>
              <h1 class="text-xl font-bold sm:text-3xl">{{ checkoutStore.selectedTour.title }}</h1>
              <p class="text-sm mt-5 sm:text-base sm:mt-0">
                {{ checkoutStore.selectedTour.description }}
              </p>

              <div class="grid grid-cols-1 mt-5 text-sm sm:text-base sm:grid-cols-2">
                <p>出發日期：{{ checkoutStore.selectedTour.date }}</p>
                <p>行程時間：{{ checkoutStore.selectedTour.duration }}</p>
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
                <p>NT$ {{ checkoutStore.totalPrice }}</p>
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
