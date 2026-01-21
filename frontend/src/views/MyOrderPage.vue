<script setup>
import { ref, onMounted } from 'vue'
import { Map as MapIcon } from 'lucide-vue-next'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import { fetchOrders } from '@/api/orders'

const orders = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

const handleFeaturedRate = ({ id, rating, comment }) => {
  orders.value = orders.value.map((item) =>
    item.id === id ? { ...item, rating, comment } : item,
  )
}

const handleFeaturedClear = (id) => {
  orders.value = orders.value.map((item) =>
    item.id === id ? { ...item, rating: null, comment: '' } : item,
  )
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-TW')
}

const mapOrderToCard = (order) => ({
  id: order.id,
  title: order.itinerary?.title || '未命名行程',
  startDate: order.itinerary?.startDate || '',
  endDate: order.itinerary?.endDate || '',
  orderNumber: order.orderNo || '',
  orderDate: formatDate(order.createdAt),
  status: order.status || '',
  reviewable: order.status === 'PAID',
  rating: order.rating || null,
  comment: order.comment || '',
})

const loadOrders = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const data = await fetchOrders()
    orders.value = data.map(mapOrderToCard)
  } catch (error) {
    console.error('[MyOrderPage] load orders failed:', error)
    errorMessage.value = error?.message || '載入訂單失敗'
    orders.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="space-y-6 pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <MapIcon class="w-6 h-6 text-secondary-50" />
          訂單管理
        </h1>
      </div>

      <div class="p-4 space-y-4">
        <div v-if="isLoading" class="text-center text-secondary-500">載入中...</div>
        <div v-else-if="errorMessage" class="text-center text-rose-600">
          {{ errorMessage }}
        </div>
        <FeaturedItineraryTab
          v-else
          :itineraries="orders"
          @rate="handleFeaturedRate"
          @clear="handleFeaturedClear"
        />
      </div>
    </div>
  </div>
</template>
