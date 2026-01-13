<script setup>
import { Calendar as CalendarIcon, Star as StarIcon } from 'lucide-vue-next'

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

defineEmits(['rate'])
</script>

<template>
  <div class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall">
    <div class="flex items-center mb-6 pb-4 border-b-2 border-secondary-100">
      <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-4">
        <CalendarIcon class="w-6 h-6 text-primary-600" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-secondary-800">精選行程</h3>
        <p class="text-sm text-secondary-500">查看你的訂單與參加狀態</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition"
      >
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1">
            <h4 class="font-bold text-lg text-secondary-800 mb-1">
              {{ item.title }}
            </h4>
            <div class="flex items-center text-sm text-secondary-500 mb-3">
              <span
                class="bg-secondary-100 px-2 py-0.5 rounded text-xs mr-2 border border-secondary-300"
              >
                日期
              </span>
              {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
            </div>

            <div class="text-sm text-secondary-600 space-y-1">
              <div class="font-semibold text-secondary-700">訂單詳細資訊</div>
              <div>訂單編號: {{ item.orderNumber || '—' }}</div>
              <div>訂單日期: {{ item.orderDate || '—' }}</div>
            </div>
          </div>

          <div class="text-right min-w-[120px]">
            <div class="text-xs text-secondary-400 mb-2">狀態</div>
            <div
              class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
              :class="item.status === 'joined'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-secondary-100 text-secondary-600 border border-secondary-200'"
            >
              {{ item.status === 'joined' ? '已參加' : '未參加' }}
            </div>
          </div>
        </div>

        <div v-if="item.status === 'joined'" class="mt-4 pt-3 border-t border-secondary-100">
          <div class="text-sm font-semibold text-secondary-700 mb-2">給評價</div>
          <div class="flex items-center gap-1">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              class="p-1 rounded hover:bg-primary-50 transition"
              @click="$emit('rate', { id: item.id, rating: star })"
            >
              <StarIcon
                class="w-5 h-5"
                :class="star <= (item.rating || 0) ? 'text-amber-400' : 'text-secondary-300'"
              />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="itineraries.length === 0"
        class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
      >
        目前沒有精選行程
      </div>
    </div>
  </div>
</template>
