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
const contactInfo = computed(() => order.value?.contact || checkoutStore.contact || null)
const emergencyInfo = computed(
  () => order.value?.emergencyContact || checkoutStore.emergencyContact || null,
)
const hasContactInfo = computed(() => {
  const c = contactInfo.value || {}
  return Boolean(c.name || c.phone || c.email || c.note)
})
const hasEmergencyInfo = computed(() => {
  const c = emergencyInfo.value || {}
  return Boolean(c.name || c.phone)
})

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
  <section class="max-w-4xl mx-auto text-center bg-white p-5 rounded-xl">
    <h2 class="text-3xl font-bold mb-4">✔️ 訂單完成</h2>
    <p class="text-gray-500 mb-8">感謝您的訂購，以下是您的訂單資訊</p>

    <div v-if="loading">載入中…</div>
    <div v-else class="text-left mb-8">
      <div v-if="error" class="text-red-500">{{ error }}</div>
      <TourInfoBlock v-if="tourForBlock" :tour="tourForBlock" :price="payableAmount" />

      <!-- 訂單編號顯示 -->

      <div class="space-y-10">
        <div>
          <h1 class="mb-4 ml-2 text-xl font-bold">訂單資訊</h1>
          <div class="bg-white p-5 rounded-xl border border-secondary-100">
            <div class="flex flex-col gap-5">
              <div class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">訂單編號</p>
                <p>{{ orderNoText }}</p>
              </div>
              <div class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">付款方式</p>
                <p>{{ paymentMethodText }}</p>
              </div>
              <div class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">付款狀態</p>
                <p>{{ paymentStatusText }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasContactInfo">
          <h1 class="mb-4 ml-2 text-xl font-bold">訂購人資訊</h1>
          <div class="bg-white p-5 rounded-xl border border-secondary-100">
            <div class="flex flex-col gap-5">
              <div v-if="contactInfo?.name" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">姓名</p>
                <p>{{ contactInfo.name }}</p>
              </div>
              <div v-if="contactInfo?.phone" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">手機</p>
                <p>{{ contactInfo.phone }}</p>
              </div>
              <div v-if="contactInfo?.email" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">電子郵件</p>
                <p>{{ contactInfo.email }}</p>
              </div>
              <div v-if="contactInfo?.note" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">備註</p>
                <p>{{ contactInfo.note }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasEmergencyInfo">
          <h1 class="mb-4 ml-2 text-xl font-bold">緊急聯絡人</h1>
          <div class="bg-white p-5 rounded-xl border border-secondary-100">
            <div class="flex flex-col gap-5">
              <div v-if="emergencyInfo?.name" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">姓名</p>
                <p>{{ emergencyInfo.name }}</p>
              </div>
              <div v-if="emergencyInfo?.phone" class="flex md:flex-row justify-between flex-col">
                <p class="text-gray-500">手機</p>
                <p>{{ emergencyInfo.phone }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MainButton @click="goHome">回到首頁</MainButton>
  </section>
</template>
