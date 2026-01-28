<script setup>
import CheckoutProgress from '@/components/checkout/CheckoutProgress.vue'
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import { checkoutStore } from '@/stores/checkout'
const route = useRoute()
const router = useRouter()

const currentStep = computed(() => {
  const match = route.name?.match(/\d+/)
  return match ? Number(match[0]) : 1
})

onMounted(async () => {
  const orderId = route.query.orderId || checkoutStore.lastOrderId
  if (route.name === 'CheckoutStep4' || route.name === 'CheckoutStep5') {
    if (!orderId) router.replace('/cart')
    return
  }
  if (checkoutStore.selectedTour) return

  if (!checkoutStore.tourGroups.length) {
    await checkoutStore.loadCartFromDb()
  }
  const selected = checkoutStore.cartSelectedTour
  if (selected) {
    checkoutStore.selectedTour = { ...selected }
    return
  }

  router.replace('/cart')
})
</script>
<template>
  <section class="lg:mr-24 px-5 py-6 rounded-2xl">
    <CheckoutProgress :current-step="currentStep" />
    <router-view />
  </section>
</template>
