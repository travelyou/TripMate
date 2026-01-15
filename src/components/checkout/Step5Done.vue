<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { API_BASE_URL } from '@/api/config'
import { checkoutStore } from '@/stores/checkout'
import axios from 'axios'
import MainButton from './MainButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref('')
const order = ref(null)
const itinerary = ref(null)
const payment = ref(null)

const paymentMethodText = computed(() => {
  // 付款方式顯示：仍可用 store（或改用 payment/provider）
  const method = checkoutStore.paymentMethod
  switch (method) {
    case 'credit':
      return '信用卡'
    case 'mobile':
      return checkoutStore.mobileProvider === 'apple'
        ? '行動支付（Apple Pay）'
        : checkoutStore.mobileProvider === 'google'
          ? '行動支付（Google Pay）'
          : checkoutStore.mobileProvider === 'line'
            ? '行動支付（LINE Pay）'
            : '行動支付'
    case 'bank':
      return '銀行轉帳'
    default:
      return '未選擇'
  }
})

// 把後端 itinerary/order 轉成 TourInfoBlock 要的 shape
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

const payableAmount = computed(
  () =>
    Number(order.value?.amount ?? 0) ||
    Number(checkoutStore.cartTotalPrice ?? 0) ||
    Number(checkoutStore.lastOrder?.cartTotalPrice ?? checkoutStore.lastOrder?.totalPrice ?? 0),
)

const orderNoText = computed(
  () =>
    order.value?.order_no ||
    order.value?.orderNo ||
    route.query.orderId ||
    checkoutStore.lastOrder?.orderNo ||
    checkoutStore.lastOrder?.order_no ||
    checkoutStore.lastOrder?.id ||
    '',
)

onMounted(async () => {
  const orderId = route.query.orderId || checkoutStore.lastOrder?.id
  if (!orderId) {
    error.value = '找不到訂單編號（orderId）'
    loading.value = false
    return
  }

  try {
    const { data } = await axios.get(`${API_BASE_URL}/orders/${orderId}`)
    if (!data?.ok) throw new Error(data?.message || '載入訂單失敗')

    order.value = data.order
    itinerary.value = data.itinerary
    payment.value = data.latestPayment

    // （可選）同步回 store，方便其他地方用
    checkoutStore.lastOrder = {
      id: data.order.id,
      orderNo: data.order.order_no ?? data.order.orderNo ?? '',
      order_no: data.order.order_no ?? '',
      amount: Number(data.order.amount ?? 0),
      status: data.order.status,
      tour: tourForBlock.value ?? null,
    }
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
  <section class="max-w-3xl mx-auto text-center bg-white p-10 rounded-xl">
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
        <p>{{ payment?.status || order?.status }}</p>
      </div>
    </div>

    <MainButton @click="goHome">回到首頁</MainButton>
  </section>
</template>
