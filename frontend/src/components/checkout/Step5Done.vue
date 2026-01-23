<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import MainButton from './MainButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'
import { checkoutStore } from '@/stores/checkout'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref('')

const order = ref(null)
const itinerary = ref(null)
const payment = ref(null)

const paymentMethodText = computed(() => {
  const method = payment.value?.method || payment.value?.provider
  switch (method) {
    case 'linepay':
      return 'LINE Pay'
    case 'credit':
      return '信用卡'
    case 'bank':
      return '銀行轉帳'
    case 'mock':
      return '模擬付款'
    default:
      return '未選擇'
  }
})

const paymentStatusText = computed(() => {
  const status = payment.value?.status ?? order.value?.status ?? 'UNKNOWN'
  switch (status) {
    case 'PAID':
      return '已付款'
    case 'PENDING':
      return '未付款'
    case 'CANCELLED':
      return '已取消'
    case 'REFUNDED':
      return '已退款'
    case 'FAILED':
      return '付款失敗'
    case 'INIT':
      return '付款處理中'
    default:
      return '未知'
  }
})

// TourInfoBlock 要的 shape
const tourForBlock = computed(() => {
  if (!itinerary.value || !order.value) return null

  const it = itinerary.value
  const start = it.startDate ? String(it.startDate).slice(0, 10) : ''
  const end = it.endDate ? String(it.endDate).slice(0, 10) : ''
  const date = start && end ? `${start} ~ ${end}` : start || end || ''

  return {
    title: it.title ?? '',
    image: it.bannerImage ?? '',
    date,
    persons: Number(order.value.persons ?? 1),
  }
})

const payableAmount = computed(() => Number(order.value?.amount ?? 0))
const orderNoText = computed(() => order.value?.orderNo || '')

onMounted(async () => {
  // Step5 必須靠 query 的 orderId（重整也不怕）
  const orderId = route.query.orderId || localStorage.getItem('lastOrderId')
  if (!orderId) {
    error.value = '找不到訂單編號（orderId）'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  try {
    const data = await checkoutStore.fetchOrderDetail(orderId)
    order.value = data.order
    itinerary.value = data.itinerary
    payment.value = data.latestPayment
  } catch (e) {
    console.error(e)
    error.value = e?.message || '載入訂單失敗'
  } finally {
    loading.value = false
  }
})

function goHome() {
  router.push('/')
}
</script>

<template>
  <section class="max-w-4xl mx-auto text-center bg-white p-10 rounded-xl">
    <h2 class="text-3xl font-bold mb-4">✔️ 訂單完成</h2>
    <p class="text-gray-500 mb-8">感謝您的訂購，以下是您的訂單資訊</p>

    <div v-if="loading">載入中…</div>
    <div v-else class="text-left space-y-4 mb-8">
      <div v-if="error" class="text-red-500">{{ error }}</div>
      <TourInfoBlock v-if="tourForBlock" :tour="tourForBlock" :price="payableAmount" />

      <!-- 訂單編號顯示 -->
      <div>
        <p class="text-gray-500 text-lg">訂單編號</p>
        <p>{{ orderNoText }}</p>
      </div>

      <div>
        <p class="text-gray-500 text-lg">付款方式</p>
        <p>{{ paymentMethodText }}</p>
      </div>

      <div>
        <p class="text-gray-500 text-lg">付款狀態</p>
        <p>{{ paymentStatusText }}</p>
      </div>
    </div>

    <MainButton @click="goHome">回到首頁</MainButton>
  </section>
</template>
