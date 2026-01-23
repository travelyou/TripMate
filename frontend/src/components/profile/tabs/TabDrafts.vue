<script setup>
import { storeToRefs } from 'pinia'
import { FolderOpen as FolderIcon } from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'

// 定義元件會發出的事件，這裡定義了一個 'select-draft'，當使用者點擊草稿時會通知父組件
const emit = defineEmits(['select-draft'])

// 初始化 Store
const myItineraryStore = useMyItineraryStore()
// 從 Store 解構出 drafts 資料，並保持其響應性（當資料變動時畫會跟著變）
const { drafts } = storeToRefs(myItineraryStore)

/**
 * 根據草稿類型回傳對應的標籤顏色樣式
 * @param {string} type - 草稿類型 (例如: 'discussion', 'itinerary')
 */
const getTagColor = (type) => {
  if (type === 'discussion') return 'bg-primary-600 text-white border-primary-700'
  if (type === 'traveler') return 'bg-primary-500 text-white border-primary-600'
  if (type === 'my_itinerary' || type === 'itinerary') return 'bg-primary-700 text-white border-primary-800'
  return 'bg-secondary-500 text-white'
}

const getDraftPreviewText = (content) => {
  if (!content) return ''
  try {
    const doc = new DOMParser().parseFromString(String(content), 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  } catch {
    return String(content).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }
}

/**
 * 當使用者點擊草稿卡片時觸發
 * @param {Object} draft - 被點擊的草稿物件
 */
const handleDraftClick = (draft) => {
  // 將被點擊的草稿傳送給父組件（例如 ProfilePage），讓父組件決定要跳轉到哪裡
  emit('select-draft', draft)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 標題區域 -->
    <div class="flex items-center mb-6">
      <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-3">
        <FolderIcon class="w-5 h-5 text-primary-600" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-secondary-800">草稿夾</h3>
        <p class="text-sm text-secondary-500">查看你儲存的貼文草稿</p>
      </div>
    </div>

    <!-- 草稿列表：如果有草稿就顯示 grid 列表 -->
    <div v-if="drafts.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="draft in drafts"
        :key="draft.id"
        class="border-2 border-secondary-100 rounded-xl p-4 hover:border-primary-400 hover:bg-primary-50 transition cursor-pointer group bg-white shadow-sm"
        @click="handleDraftClick(draft)"
      >
        <div class="flex justify-between items-center mb-3">
          <!-- 顯示類型標籤 -->
          <span
            :class="[
              getTagColor(draft.type),
              'text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider',
            ]"
          >
            {{ draft.typeLabel }}
          </span>
          <!-- 顯示儲存時間 -->
          <span class="text-[10px] text-secondary-400 font-medium"
            >儲存於: {{ draft.saveTime ? draft.saveTime.split(' ')[0] : '剛剛' }}</span
          >
        </div>
        <!-- 顯示標題與簡介內容 -->
        <h4 class="font-bold text-base text-secondary-800 mb-2 group-hover:text-primary-700 transition">
          {{ draft.title }}
        </h4>
        <p class="text-xs text-secondary-500 line-clamp-2 leading-relaxed">
          {{ getDraftPreviewText(draft.content) }}
        </p>
      </div>
    </div>

    <!-- 沒草稿時的狀態 -->
    <div v-else class="text-center py-20 bg-secondary-50 rounded-xl border-2 border-dashed border-secondary-200">
      <FolderIcon class="w-12 h-12 text-secondary-300 mx-auto mb-3" />
      <p class="text-secondary-500">目前沒有任何草稿</p>
    </div>
  </div>
</template>
