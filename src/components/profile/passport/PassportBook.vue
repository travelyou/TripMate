<script setup>
// 引入 Vue 的功能
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
// 引入剛剛建立的戳章組件
import PassportStamp from './PassportStamp.vue'

// 取得當前年份
const currentYear = new Date().getFullYear()

// 定義接收的資料
// entries: 護照內的所有戳章資料陣列
// Future: 可以加入 'cover' 屬性，支援顯示護照封面模式
const props = defineProps({
  entries: {
    type: Array,
    required: false,
    default: () => []
  },
  isEditable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete', 'hide'])

// 判斷是否為空護照
// Future: 可以顯示「申請第一本護照」的引導按鈕
const isEmpty = computed(() => props && props.entries && props.entries.length === 0)

// ----------------------------------------------------------------
// 分頁與響應式邏輯
// ----------------------------------------------------------------
const currentPage = ref(1)
const itemsPerPage = ref(12) // Default to Desktop

const updateItemsPerPage = () => {
  const width = window.innerWidth
  if (width < 768) {
    itemsPerPage.value = 4 // 手機: 2x2
  } else if (width < 1024) {
    itemsPerPage.value = 9 // 平板: 3x3
  } else {
    itemsPerPage.value = 12 // 桌機: 4x3
  }
}

// 監聽視窗大小改變
onMounted(() => {
  updateItemsPerPage()
  window.addEventListener('resize', updateItemsPerPage)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateItemsPerPage)
})

// 計算當前分頁的資料
const paginatedEntries = computed(() => {
  if (!props.entries) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return props.entries.slice(start, end)
})

const totalPages = computed(() => Math.ceil((props.entries ? props.entries.length : 0) / itemsPerPage.value))

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}
</script>

<template>
  <!-- 護照本體容器 -->
  <!-- 模擬紙張質感與內頁格線 -->
  <!-- Future: 實作翻頁動畫 (Page Flip effect) -->
  <div class="passport-page bg-[#fdfbf7] rounded-xl shadow-inner border border-[#e8dfc5] p-6 md:p-10 min-h-[500px] relative overflow-hidden transition-all duration-500 flex flex-col justify-between">

    <!-- 防偽浮水印背景 -->
    <!-- Future: 使用 Canvas 繪製動態浮水印，隨滑鼠移動 -->
    <div class="absolute inset-0 opacity-5 pointer-events-none bg-pattern"></div>

    <!-- 上半部：標題與內容 -->
    <div>
      <!-- 頁面標題區 -->
      <!-- Future: 顯示使用者專屬的護照號碼 -->
      <div class="relative z-10 flex justify-between items-end border-b-2 border-double border-gray-200 pb-4 mb-4">
        <div>
          <h2 class="text-3xl font-serif font-bold text-gray-800 tracking-wide">VISAS</h2>
          <p class="text-xs text-gray-400 font-mono tracking-[0.2em] uppercase mt-1">TripMate Official Document</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-gray-400 font-mono">Page {{ currentPage.toString().padStart(2, '0') }}</p>
        </div>
      </div>

      <!-- 戳章網格區 -->
      <!-- 自動適應寬度，模擬隨意蓋章的感覺 -->
      <!-- Future: 允許自由拖曳佈局 (Free-form layout) -->
      <div v-if="!isEmpty" class="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 place-items-center mb-8">
        <!-- 遍歷每一個足跡並產生戳章 -->
        <!-- Future: 加入新戳章蓋下的動畫 (Stamp animation) -->
        <PassportStamp
          v-for="(entry, index) in paginatedEntries"
          :key="index"
          :entry="entry"
          :is-editable="isEditable && entry.source === 'manual'"
          @delete="emit('delete', $event)"
          @hide="emit('hide', $event)"
        />
      </div>
    </div>

    <!-- 空狀態顯示 -->
    <div v-if="isEmpty" class="relative z-10 flex flex-col items-center justify-center flex-1 text-gray-300 min-h-[200px]">
        <div class="text-6xl mb-4 opacity-50">🗺️</div>
        <p class="text-lg font-serif italic">Your journey begins here...</p>
        <p class="text-sm mt-2">快去新增你的第一個足跡吧！</p>
    </div>

    <!-- 下半部：分頁與說明 -->
    <div class="relative z-10 mt-auto space-y-4">

       <!-- 分頁控制 -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 text-gray-400">
        <button
          :disabled="currentPage === 1"
          class="p-2 hover:bg-black/5 rounded-full disabled:opacity-30 transition"
          @click="prevPage"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <span class="text-xs font-mono tracking-widest">{{ currentPage }} / {{ totalPages }}</span>
        <button
          :disabled="currentPage === totalPages"
          class="p-2 hover:bg-black/5 rounded-full disabled:opacity-30 transition"
          @click="nextPage"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- 戳章說明圖例 -->
      <div class="border-t border-gray-200 pt-3 flex flex-wrap justify-center gap-4 text-[10px] md:text-xs text-gray-400 font-sans">
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full border border-indigo-600 bg-indigo-50"></div>
          <span>國內足跡 (Blue)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full border border-orange-600 bg-orange-50"></div>
          <span>世界探索 (Orange)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full border border-purple-600 bg-purple-50"></div>
          <span>主揪團 (Purple)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full border border-emerald-600 bg-emerald-50"></div>
          <span>參加行程 (Green)</span>
        </div>
      </div>

      <!-- 頁角 -->
      <div class="text-center">
        <span class="text-[10px] text-gray-300 font-mono">TRIPMATE PASSPORT • {{ currentYear }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* 簡單的網格背景，模擬防偽底紋 */
/* Future: 設計更精細的幾何圖形底紋 */
.bg-pattern {
  background-image: radial-gradient(#d1c4a0 1px, transparent 1px);
  background-size: 20px 20px;
}

/* 讓容器有些微的內陰影，增加紙張厚度感 */
.passport-page {
  box-shadow: inset 0 0 40px rgba(0,0,0,0.02);
}
</style>
