<script setup>
import CheckoutProgress from '../components/checkout/CheckoutProgress.vue'
</script>
<template>
  <CheckoutProgress :current-step="1" />
  <router-view />
</template>
