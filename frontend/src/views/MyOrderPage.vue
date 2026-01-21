<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Map as MapIcon } from 'lucide-vue-next'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import { fetchOrders } from '@/api/orders'

const orders = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const router = useRouter()

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

const handlePayOrder = (id) => {
  router.push({ name: 'CheckoutStep4', query: { orderId: id } })
}


const mapOrderToCard = (order) => ({
  id: order.id,
  title: order.itinerary?.title || '未命名行程',
  startDate: order.itinerary?.startDate || '',
  endDate: order.itinerary?.endDate || '',
  orderNumber: order.orderNo || '',
  orderDate: order.createdAt || '',
  status: order.status || '',
  paymentMethod: order.paymentMethod || '',
  paymentMeta: order.paymentMeta || null,
  travelStatus: getTravelStatus(order.itinerary?.endDate),
  reviewable: getTravelStatus(order.itinerary?.endDate) === '已結束' && order.status === 'PAID',
  rating: order.rating || null,
  comment: order.comment || '',
})

const getTravelStatus = (endDate) => {
  if (!endDate) return '未出行'
  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return '未出行'
  const now = new Date()
  return end >= now ? '未出行' : '已結束'
}

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
        <div v-if="isLoading" class="space-y-4">
          <div
            v-for="n in 3"
            :key="`order-skeleton-${n}`"
            class="bg-white border-2 border-secondary-200 rounded-lg p-4 animate-pulse"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
              <div class="flex-1">
                <div class="h-5 w-56 bg-secondary-200 rounded mb-3"></div>
                <div class="h-4 w-64 bg-secondary-100 rounded mb-3"></div>
                <div class="space-y-2">
                  <div class="h-4 w-48 bg-secondary-100 rounded"></div>
                  <div class="h-4 w-60 bg-secondary-100 rounded"></div>
                  <div class="h-4 w-40 bg-secondary-100 rounded"></div>
                </div>
              </div>
              <div class="flex flex-col items-start sm:items-end gap-3 sm:min-w-[120px]">
                <div class="h-4 w-20 bg-secondary-100 rounded"></div>
                <div class="h-7 w-16 bg-secondary-200 rounded"></div>
                <div class="h-8 w-24 bg-secondary-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="errorMessage" class="text-center text-rose-600">
          {{ errorMessage }}
        </div>
        <FeaturedItineraryTab
          v-else
          :itineraries="orders"
          @rate="handleFeaturedRate"
          @clear="handleFeaturedClear"
          @pay="handlePayOrder"
        />
      </div>
    </div>
  </div>
</template>
