<script setup>
import { onMounted, computed } from 'vue'
import { useVendorStore } from '@/stores/vendor'
import {
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Heart,
  Bookmark,
  Calendar,
  Image as ImageIcon,
} from 'lucide-vue-next'

// 1. 定義 emit
const emit = defineEmits(['create', 'edit'])

const vendorStore = useVendorStore()
const posts = computed(() => vendorStore.vendorPosts)
const currentVendor = computed(() => vendorStore.currentVendor)

// 刪除確認
const handleDelete = async (id) => {
  if (confirm('確定要刪除此貼文嗎？此動作無法復原。')) {
    try {
      await vendorStore.deletePost(id)
      if (currentVendor.value?.id) {
        await vendorStore.fetchVendorPosts(currentVendor.value.id)
      }
    } catch (error) {
      console.error('刪除失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

// 2. 移除原本的 handleCreate/handleEdit 函式，直接在 template 使用 $emit

// 載入資料
onMounted(() => {
  if (currentVendor.value?.id) {
    vendorStore.fetchVendorPosts(currentVendor.value.id)
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-900">貼文管理</h2>
        <p class="text-gray-500 text-sm mt-1">
          分享旅遊心得與最新資訊，目前共有 {{ posts.length }} 篇貼文
        </p>
      </div>
      <button
        class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
        @click="$emit('create')"
      >
        <Plus class="w-4 h-4" />
        新增貼文
      </button>
    </div>

    <div v-if="posts.length > 0" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in posts"
        :key="item.id"
        class="bg-white border border-gray-200 rounded-xl p-4 flex gap-6 hover:shadow-md transition-shadow group"
      >
        <div class="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
            <ImageIcon class="w-8 h-8" />
          </div>
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span v-if="item.tags && item.tags.length" class="flex gap-1">
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium"
                >
                  {{ tag }}
                </span>
              </span>
              <span class="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                <Calendar class="w-3 h-3" />
                {{ item.time }}
              </span>
            </div>

            <h3
              class="text-lg font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors line-clamp-1"
            >
              {{ item.title }}
            </h3>
            <p class="text-gray-500 text-sm line-clamp-2 mb-2">
              {{ item.content }}
            </p>

            <div class="flex items-center gap-4 text-sm text-gray-400">
              <div class="flex items-center gap-1">
                <Heart class="w-4 h-4" />
                {{ item.likes || 0 }}
              </div>
              <div class="flex items-center gap-1">
                <Bookmark class="w-4 h-4" />
                {{ item.collects || 0 }}
              </div>
              <div class="flex items-center gap-1">
                <MessageSquare class="w-4 h-4" />
                {{ item.comments || 0 }}
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
            <button
              class="text-gray-500 hover:text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 text-sm font-medium transition-colors flex items-center gap-1"
              @click="$emit('edit', item)"
            >
              <Edit class="w-4 h-4" />
              編輯
            </button>
            <button
              class="text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors flex items-center gap-1"
              @click="handleDelete(item.id)"
            >
              <Trash2 class="w-4 h-4" />
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
    >
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageSquare class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-1">目前沒有貼文</h3>
      <p class="text-gray-500 mb-6">開始撰寫您的第一篇旅遊心得吧！</p>
      <button
        class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors inline-flex items-center gap-2"
        @click="$emit('create')"
      >
        <Plus class="w-4 h-4" />
        新增貼文
      </button>
    </div>
  </div>
</template>
