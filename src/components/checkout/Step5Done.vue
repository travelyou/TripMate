<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { checkoutStore } from '@/stores/checkout'
import MainButton from './MainButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'

const router = useRouter()

const paymentMethodText = computed(() => {
  const order = checkoutStore.lastOrder
  const method = order ? order.paymentMethod : checkoutStore.paymentMethod
  switch (method) {
    case 'credit':
      return '信用卡'
    case 'mobile':
      if (order && order.mobileProvider) {
        switch (order.mobileProvider) {
          case 'apple':
            return '行動支付（Apple Pay）'
          case 'google':
            return '行動支付（Google Pay）'
          case 'line':
            return '行動支付（LINE Pay）'
        }
      }
      return '行動支付'
    case 'bank':
      return '銀行轉帳'
    default:
      return '未選擇'
  }
})

function goHome() {
  router.push('/')
}
</script>

<template>
  <section class="max-w-3xl mx-auto text-center bg-white p-10 rounded-xl">
    <h2 class="text-3xl font-bold mb-4">✔️ 訂單完成</h2>
    <p class="text-gray-500 mb-8">感謝您的訂購，以下是您的訂單資訊</p>

    <div class="text-left space-y-4 mb-8">
      <TourInfoBlock />

      <div>
        <p class="text-gray-500 text-lg">付款方式</p>
        <p>{{ paymentMethodText }}</p>
      </div>
    </div>

    <MainButton @click="goHome"> 回到首頁 </MainButton>
  </section>
</template>
