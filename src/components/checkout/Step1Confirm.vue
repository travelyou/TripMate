<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function nextStep() {
  router.push('/checkout/step2')
  //if () {} else {}
}
</script>

<template>
  <section>
    <div class="max-w-4xl mx-auto">
      <div class="m-5 mt-10">
        <h1 class="font-bold text-3xl">確認商品</h1>
        <p class="text-gray-600">請確認您選購的行程資訊</p>
      </div>
      <div class="bg-white rounded-xl p-5 m-5">
        <img
          class="w-36 h-36 rounded-lg overflow-hidden flex-shrink-0"
          src="https://readdy.ai/api/search-image?query=taipei%20101%20observatory%20deck%20with%20panoramic%20city%20view%2C%20modern%20skyscraper%20interior%20with%20floor%20to%20ceiling%20windows%2C%20tourists%20enjoying%20the%20scenic%20vista%2C%20clean%20white%20background%20with%20soft%20lighting&width=300&height=300&seq=cart1&orientation=squarish"
          alt=""
        />
        <h1 class="text-3xl">台北 101 觀景台 + 信義區美食之旅</h1>
        <p>登上台北最高建築，俯瞰城市美景，品嚐在地特色美食</p>
        <p>出發日期：2025年1月15日</p>
        <p>行程時間：4小時</p>
        <p>人數：1 人</p>

        <button
          class="p-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
          @click="nextStep"
        >
          下一步
        </button>
      </div>
    </div>
  </section>
</template>
