<script setup>
import { Calendar, Plus, ChevronRight } from 'lucide-vue-next'

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

defineEmits(['open', 'add'])
</script>

<template>
  <div
    class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall"
  >
    <div class="flex items-center mb-6 pb-4 border-b-2 border-secondary-100">
      <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-4">
        <Calendar class="w-6 h-6 text-primary-600" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-secondary-800">行程列表</h3>
        <p class="text-sm text-secondary-500">查看並管理你的旅遊行程</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition cursor-pointer group"
        @click="$emit('open', item)"
      >
        <div class="flex justify-between items-center">
          <div>
            <h4 class="font-bold text-lg text-secondary-800 group-hover:text-primary-700 mb-1">
              {{ item.title }}
            </h4>
            <div class="flex items-center text-sm text-secondary-500">
              <span
                class="bg-secondary-100 px-2 py-0.5 rounded text-xs mr-2 border border-secondary-300"
              >
                日期
              </span>
              {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
            </div>
          </div>
          <div class="text-secondary-300 group-hover:text-primary-400">
            <ChevronRight class="h-6 w-6" />
          </div>
        </div>
      </div>

      <div
        v-if="itineraries.length === 0"
        class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
      >
        目前沒有行程，點擊下方按鈕新增！
      </div>
    </div>

    <button
      class="w-full mt-8 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center shadow-primary-strong active:translate-y-1 active:shadow-none"
      @click="$emit('add')"
    >
      <Plus class="w-5 h-5 mr-2" />
      新增行程
    </button>
  </div>
</template>
