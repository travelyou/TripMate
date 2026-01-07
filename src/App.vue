<script setup>
import { onMounted } from 'vue'
import MainLayout from './layouts/MainLayout.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<template>
  <MainLayout />
</template>
