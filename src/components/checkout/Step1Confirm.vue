<script setup>
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
//import { computed } from 'vue'
const router = useRouter()

//之後金額必須在後端計算，避免被竄改
// const totalPrice = computed(() => {
//   return checkoutStore.selectedTour.price * checkoutStore.selectedTour.persons
// })

function nextStep() {
  router.push('/checkout/step2')
  //if () {} else {}
}

function backCart() {
  router.push('/cart')
  //if () {} else {}
}
</script>

<template>
  <section>
    <div class="max-w-4xl mx-auto">
      <!-- 標題 -->
      <div class="m-5 mt-10">
        <h1 class="font-bold text-3xl">確認商品</h1>
        <p class="text-gray-600">請確認您選購的行程資訊</p>
      </div>

      <!-- 行程資訊 -->
      <div v-if="checkoutStore.selectedTour">
        <div class="flex gap-10 bg-white rounded-xl p-10">
          <!-- 圖片 -->
          <img
            class="w-36 h-36 rounded-lg overflow-hidden flex-shrink-0"
            src="https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish"
            alt=""
          />
          <!-- 資訊大區 -->
          <div>
            <!-- 商品資訊區 -->
            <div>
              <h1 class="text-3xl">{{ checkoutStore.selectedTour.title }}</h1>
              <p>{{ checkoutStore.selectedTour.description }}</p>

              <div class="flex justify-between mt-5 mb-2">
                <p>出發日期：{{ checkoutStore.selectedTour.date }}</p>
                <p>行程時間：{{ checkoutStore.selectedTour.duration }}</p>
              </div>
              <p>人數：{{ checkoutStore.selectedTour.persons }} 人</p>
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
