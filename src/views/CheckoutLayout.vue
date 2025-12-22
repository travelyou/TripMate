<script setup>
import CheckoutProgress from '@/components/checkout/CheckoutProgress.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()

const currentStep = computed(() => {
  const match = route.name?.match(/\d+/)
  return match ? Number(match[0]) : 1
})
</script>
<template>
  <section class="mr-24">
    <CheckoutProgress :current-step="currentStep" />
    <router-view />
  </section>
</template>
