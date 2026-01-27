<script setup>
import { onMounted, computed } from 'vue'
import { useVendorStore } from '@/stores/vendor'
import { Plus, Edit, Trash2, MapPin, Calendar, Star, MessageSquare } from 'lucide-vue-next'
// 移除原本內部的 ItineraryModal，改用父層控制
// import ItineraryModal from '@/components/vendor-dashboard/modals/ItineraryModal.vue'

// 定義可以發送的訊號
defineEmits(['create', 'edit', 'delete', 'create-post'])

const vendorStore = useVendorStore()
const itineraries = computed(() => vendorStore.vendorItineraries)
const currentVendor = computed(() => vendorStore.currentVendor)

// 刪除確認
const handleDelete = async (id) => {
  if (confirm('確定要刪除此行程嗎？此動作無法復原。')) {
    try {
      await vendorStore.deleteItinerary(id)
      await vendorStore.fetchVendorItineraries(currentVendor.value.id)
    } catch (error) {
      alert('刪除失敗，請稍後再試')
    }
  }
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(price)
}

onMounted(() => {
  if (currentVendor.value?.id) {
    vendorStore.fetchVendorItineraries(currentVendor.value.id)
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-900">行程管理</h2>
        <p class="text-gray-500 text-sm mt-1">
          管理您的旅遊行程商品，目前共有 {{ itineraries.length }} 個上架行程
        </p>
      </div>
      <button
        class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
        @click="$emit('create')"
      >
        <Plus class="w-4 h-4" />
        新增行程
      </button>
    </div>

    <div v-if="itineraries.length > 0" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="bg-white border border-gray-200 rounded-xl p-4 flex gap-6 hover:shadow-md transition-shadow group"
      >
        <div class="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img
            :src="item.image || item.coverImage || 'https://picsum.photos/400/300'"
            :alt="item.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium"
                >
                  {{ item.region || '未分類' }}
                </span>
                <span v-if="item.tags && item.tags.length" class="flex gap-1">
                  <span
                    v-for="tag in item.tags.slice(0, 2)"
                    :key="tag"
                    class="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full font-medium"
                  >
                    {{ tag }}
                  </span>
                </span>
              </div>
              <h3
                class="text-lg font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors"
              >
                {{ item.name || item.title }}
              </h3>
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <div class="flex items-center gap-1">
                  <Calendar class="w-4 h-4" />
                  {{ item.days || item.durationDays || 1 }} 天
                </div>
                <div class="flex items-center gap-1">
                  <Star class="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {{ item.rating || 0 }} ({{ item.reviewCount || 0 }})
                </div>
              </div>
            </div>

            <div class="text-right">
              <div class="text-xl font-bold text-amber-600">
                {{ formatPrice(item.price) }}
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
            <button
              class="text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors flex items-center gap-1"
              title="為此行程發文"
              @click="$emit('create-post', item)"
            >
              <MessageSquare class="w-4 h-4" />
              發文
            </button>
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
        <MapPin class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-1">目前沒有行程</h3>
      <p class="text-gray-500 mb-6">開始新增您的第一個旅遊行程商品吧！</p>
      <button
        class="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors inline-flex items-center gap-2"
        @click="$emit('create')"
      >
        <Plus class="w-4 h-4" />
        新增行程
      </button>
    </div>
  </div>
</template>
