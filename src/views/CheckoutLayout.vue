<script setup>
import CheckoutProgress from '../components/checkout/CheckoutProgress.vue'
</script>
<template>
  <CheckoutProgress :current-step="1" />
  <div>
    <h1>結帳流程</h1>
  </div>
  <router-view />
</template>
