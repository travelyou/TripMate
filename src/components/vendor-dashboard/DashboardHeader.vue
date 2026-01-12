<script setup>
import { computed } from 'vue'
import { Star, MapPin, Calendar, TrendingUp } from 'lucide-vue-next'

defineProps({
  vendor: {
    type: Object,
    required: true
  }
})

// 🔴 MOCK DATA - 統計數據
// 📡 未來需從 API 取得真實數據
const stats = computed(() => ({
  totalItineraries: 28,
  totalPosts: 45,
  totalOrders: 156,
  monthlyRevenue: 328000
}))
</script>

<template>
  <div class="bg-white border-b border-gray-200 px-8 py-6">
    <div class="flex items-start justify-between">
      <!-- 左側：廠商資訊 -->
      <div class="flex items-center gap-6">
        <!-- 頭像 -->
        <div class="relative">
          <img
            :src="vendor.avatar"
            :alt="vendor.name"
            class="w-20 h-20 rounded-full border-4 border-gray-100 object-cover shadow-md"
          />
          <div
            v-if="vendor.isVerified"
            class="absolute bottom-0 right-0 bg-blue-500 p-1.5 rounded-full border-2 border-white"
          >
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- 資訊 -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-1">
            {{ vendor.name }}
          </h1>
          <p class="text-gray-600 mb-2">
            {{ vendor.slogan || '管理您的廠商資料' }}
          </p>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <Star class="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span class="font-medium">{{ vendor.rating }}</span>
              <span>({{ vendor.reviewCount }} 評價)</span>
            </div>
            <div class="flex items-center gap-1">
              <MapPin class="w-4 h-4" />
              <span>{{ vendor.regionTags?.join(', ') || '多個地區' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：統計卡片 -->
      <div class="grid grid-cols-4 gap-4">
        <!-- 行程數 -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div class="flex items-center gap-2 mb-1">
            <Calendar class="w-4 h-4 text-blue-600" />
            <p class="text-xs font-medium text-blue-600">行程數</p>
          </div>
          <p class="text-2xl font-bold text-blue-900">{{ stats.totalItineraries }}</p>
        </div>

        <!-- 貼文數 -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div class="flex items-center gap-2 mb-1">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p class="text-xs font-medium text-purple-600">貼文數</p>
          </div>
          <p class="text-2xl font-bold text-purple-900">{{ stats.totalPosts }}</p>
        </div>

        <!-- 訂單數 -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div class="flex items-center gap-2 mb-1">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-xs font-medium text-green-600">總訂單</p>
          </div>
          <p class="text-2xl font-bold text-green-900">{{ stats.totalOrders }}</p>
        </div>

        <!-- 本月收入 -->
        <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div class="flex items-center gap-2 mb-1">
            <TrendingUp class="w-4 h-4 text-amber-600" />
            <p class="text-xs font-medium text-amber-600">本月收入</p>
          </div>
          <p class="text-2xl font-bold text-amber-900">
            {{ (stats.monthlyRevenue / 1000).toFixed(0) }}K
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
