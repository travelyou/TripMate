<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import ResultCard from '@/components/personality-test/ResultCard.vue'

const props = defineProps({
  result: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

// 如果沒有傳入 result，使用預設的 mock 資料（方便未來串接）
const displayResult = computed(() => {
  if (props.result) {
    return props.result
  }
  // 預設 mock 資料，未來可以從 store 或 API 取得
  return {
    animalEmoji: '🦁',
    animalName: '樂天派',
    summary: '開心最重要，計畫只是參考。',
    tags: ['隨性', '愛體驗', '新鮮感', '氣氛王'],
    strengths: [
      '很會把平凡行程玩成精彩回憶',
      '遇到變動不容易崩潰，能快速轉念',
      '很適合帶動氣氛，旅伴跟你不無聊',
    ],
    pitfalls: ['太隨性可能錯過熱門景點/餐廳的預約時段', '行程彈性太大時，旅伴可能跟不上節奏'],
    oneLiner: '把「1 個必做預約」加進行程，其餘全部留給當下的驚喜。',
    compatibleBuddies: [
      {
        id: 'dog_leader',
        emoji: '🐶',
        name: '狗狗領隊',
        tagline: '合群照顧型',
        reason: '你負責玩，他負責把大家照顧好；節奏輕鬆但不會亂。',
        tags: ['好相處', '氣氛穩', '能協調'],
      },
      {
        id: 'leopard_dash',
        emoji: '🐆',
        name: '豹豹快閃',
        tagline: '行動快節奏',
        reason: '你們都不怕變動，臨時改行程反而更有趣。',
        tags: ['嘗鮮', '冒險', '即興'],
      },
    ],
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up"
    >
      <!-- Header -->
      <header
        class="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10"
      >
        <h2 class="text-2xl font-bold text-gray-800">🧩 性格測驗結果</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-800"
          @click="emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </header>

      <!-- Content -->
      <div class="flex-grow overflow-y-auto custom-scrollbar p-6">
        <ResultCard :result="displayResult" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
