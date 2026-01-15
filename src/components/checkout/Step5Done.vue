<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'
import TourInfoBlock from './TourInfoBlock.vue'

const route = useRoute()
const order = ref(null)
const itinerary = ref(null)
const loading = ref(true)

onMounted(async () => {
  const orderId = route.query.orderId
  const { data } = await axios.get(`${API_BASE_URL}/orders/${orderId}`)
  order.value = data.order
  itinerary.value = data.itinerary
  loading.value = false
})

// 👉 轉成 TourInfoBlock 要的 shape
const tourForBlock = computed(() => {
  if (!itinerary.value || !order.value) return null

  const it = itinerary.value

  return {
    title: it.title,
    description: it.content || '',
    image: it.banner_image,
    date: `${String(it.start_date).slice(0, 10)} ~ ${String(it.end_date).slice(0, 10)}`,
    duration: '',
    price: Number(it.price),
    persons: Number(order.value.persons),
  }
})
</script>

<template>
  <section class="max-w-3xl mx-auto text-center bg-white p-10 rounded-xl">
    <div v-if="loading">載入中...</div>
    <div v-else>
      <TourInfoBlock v-if="tourForBlock" :tour="tourForBlock" />

      <p>訂單編號：{{ order.order_no }}</p>
      <p>付款狀態：{{ order.status }}</p>
      <p>總金額：{{ order.amount }}</p>
    </div>

    <MainButton @click="goHome"> 回到首頁 </MainButton>
  </section>
</template>
