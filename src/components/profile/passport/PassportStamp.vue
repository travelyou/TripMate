<script setup>
// 引入 Vue 的 computed 函數，用於計算動態樣式
// Future: 未來可引入更多動畫常數或隨機變數產生器
import { computed } from 'vue'
import { X, EyeOff } from 'lucide-vue-next'

// 定義組件接收的 Props (屬性)
// entry: 包含戳章的所有資訊 (類型、地點、日期等)
// Future: 可以新增 size 屬性來控制戳章大小 (sm, md, lg)
const props = defineProps({
  entry: {
    type: Object,
    required: true,
    // 預期結構: { type, location, date, title, color }
  },
  isEditable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete', 'hide'])

// 計算戳章的旋轉角度，讓每個章看起來蓋得不一樣
// 使用字串雜湊或簡單隨機來決定角度，這裡為了簡單先用基於長度的偽隨機
// Future: 可以將旋轉角度儲存在資料庫中，確保每次重新整理都一樣
const rotation = computed(() => {
  if (!props.entry.location) return 'rotate-0'
  const hash = props.entry.location.length + props.entry.date.length
  const deg = (hash % 20) - 10 // 產生 -10 到 10 度的隨機旋轉
  return `rotate(${deg}deg)`
})

// 根據戳章類型決定邊框和文字顏色
// blue: 國內, orange: 國外, purple: 主揪, green: 參加
// Future: 可以開放使用者自定義戳章墨水顏色
const colorClasses = computed(() => {
  switch (props.entry.type) {
    case 'domestic':
      return 'border-indigo-600 text-indigo-700'
    case 'international':
      return 'border-orange-600 text-orange-700'
    case 'hosted':
      return 'border-purple-600 text-purple-700'
    case 'participated':
      return 'border-emerald-600 text-emerald-700'
    default:
      return 'border-gray-600 text-gray-700'
  }
})

// 根據類型決定戳章內的裝飾圖示
// Future: 可以改用真實的 SVG 圖示或允許使用者上傳圖片
const icon = computed(() => {
  switch (props.entry.type) {
    case 'domestic':
      return '🇹🇼'
    case 'international':
      return '✈️'
    case 'hosted':
      return '👑' // 主揪皇冠
    case 'participated':
      return '🎒' // 背包客
    default:
      return '📍'
  }
})

// 格式化日期顯示，將 ISO 日期轉為更像郵戳的格式
// Future: 支援更多國家的日期格式設定
const formattedDate = computed(() => {
  return props.entry.date.replace('-', '.').replace('/', '.')
})
</script>

<template>
  <!-- 戳章外層容器，套用動態旋轉與顏色樣式 -->
  <!-- group class 用於處理 hover 效果 -->
  <!-- Future: 可以加入拖曳功能，讓使用者自己排列戳章位置 -->
  <div
    class="relative group select-none flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 border-[3px] rounded-full transition-transform duration-300 hover:scale-110 hover:z-10"
    :class="colorClasses"
    :style="{ transform: rotation }"
  >
    <!-- 按鈕群組 (僅在編輯模式且 Hover 時顯示) -->
    <div v-if="isEditable" class="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-20">
      <!-- 隱藏按鈕 -->
      <button
        class="bg-gray-500 text-white rounded-full p-1 shadow-sm cursor-pointer hover:bg-gray-600"
        title="隱藏戳章"
        @click.stop="emit('hide', entry)"
      >
        <EyeOff class="w-3 h-3" />
      </button>
      <!-- 刪除按鈕 -->
      <button
        class="bg-red-500 text-white rounded-full p-1 shadow-sm cursor-pointer hover:bg-red-600"
        title="刪除戳章"
        @click.stop="emit('delete', entry)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>

    <!-- 墨水不均勻的紋理效果 (透過 mask 或 opacity 模擬) -->
    <!-- Future: 使用 SVG filter 製作更真實的缺墨效果 -->
    <div class="absolute inset-0 rounded-full border-[1px] border-dashed border-current opacity-30 scale-90"></div>

    <!-- 戳章頂部標籤 (例如：入境/出境 或 TripMate) -->
    <!-- Future: 根據行程狀態顯示不同文字 (如: 已完成/回憶中) -->
    <div class="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-80 border-b border-current mb-1 pb-0.5">
      {{ entry.type === 'hosted' ? 'HOST' : 'VISA' }}
    </div>

    <!-- 中央主要地點文字 -->
    <!-- Future: 如果地點名稱太長，需要自動縮小字體 -->
    <div class="text-sm md:text-base font-black text-center leading-tight px-2 line-clamp-2">
      {{ entry.location }}
    </div>

    <!-- 戳章圖示 -->
    <!-- Future: 點擊圖示可以播放小動畫 -->
    <div class="text-lg my-0.5 opacity-90 grayscale group-hover:grayscale-0 transition-all">
      {{ icon }}
    </div>

    <!-- 底部日期 -->
    <!-- Future: 點擊日期可連結到行事曆 -->
    <div class="text-[10px] md:text-xs font-mono font-bold tracking-tighter">
      {{ formattedDate }}
    </div>

    <!-- 雜訊紋理 (模擬印章蓋下的斑駁感) -->
    <div class="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-noise"></div>
  </div>
</template>

<style scoped>
/* 定義雜訊背景，增加真實感 */
/* Future: 改用真實的圖片素材作為雜訊遮罩 */
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacit='0.1'/%3E%3C/svg%3E");
}
</style>
