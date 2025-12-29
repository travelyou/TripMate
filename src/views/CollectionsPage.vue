<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user' // 1. 引入 Store
import { Bookmark, MessageCircle, Users, Map } from 'lucide-vue-next'

// 引入卡片元件
import PostCard from '@/components/posts/PostCard.vue'
import TravelerCard from '@/components/posts/TravelerCard.vue'
import ItineraryCard from '@/components/itinerary/ItineraryCard.vue'

// 2. 初始化 Store
const userStore = useUserStore()

// --- 篩選邏輯 ---
const activeTab = ref('all')

const tabs = [
  { id: 'all', label: '全部收藏', icon: Bookmark },
  { id: 'discussion', label: '討論文章', icon: MessageCircle },
  { id: 'traveler', label: '旅伴招募', icon: Users },
  { id: 'itinerary', label: '精選行程', icon: Map },
]

// 3. 改成從 Store 讀取 collections
const filteredItems = computed(() => {
  const items = userStore.collections || []
  if (activeTab.value === 'all') return items
  return items.filter((item) => item.type === activeTab.value)
})

const handleCardClick = (item) => {
  console.log('查看收藏內容:', item.title)
  // 這裡之後接開啟 Modal 的邏輯
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full">
    <div
      class="relative bg-gradient-to-r from-amber-500 to-orange-400 rounded-3xl p-8 mb-8 text-white shadow-lg overflow-hidden"
    >
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 w-60 h-60 bg-amber-900/20 rounded-full blur-3xl"></div>

      <div class="relative z-10 flex items-center gap-6">
        <div
          class="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner"
        >
          <Bookmark class="w-12 h-12 text-white fill-white" />
        </div>
        <div>
          <h1 class="text-3xl font-black mb-2 tracking-wide">我的收藏</h1>
          <p class="text-amber-100 font-medium">這裡是你精心挑選的口袋名單，隨時準備出發！</p>
        </div>

        <div
          class="hidden md:flex ml-auto gap-8 bg-white/10 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10"
        >
          <div class="text-center">
            <div class="text-2xl font-bold">{{ userStore.collections.length }}</div>
            <div class="text-xs text-amber-100">口袋名單</div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 flex overflow-x-auto no-scrollbar"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 min-w-[100px] py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
        :class="
          activeTab === tab.id
            ? 'bg-orange-50 text-orange-600 shadow-sm ring-2 ring-orange-100'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
        "
      >
        <component :is="tab.icon" class="w-4 h-4" :class="{ 'fill-current': tab.id === 'all' }" />
        {{ tab.label }}
      </button>
    </div>

    <div class="space-y-6 min-h-[400px]">
      <div
        v-if="filteredItems.length === 0"
        class="text-center py-20 text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200"
      >
        <Bookmark class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p class="font-bold text-lg">目前沒有{{ tabs.find((t) => t.id === activeTab).label }}</p>
        <p class="text-sm">看到喜歡的內容，記得按下收藏喔！</p>
      </div>

      <TransitionGroup name="list">
        <div v-for="item in filteredItems" :key="item.id">
          <TravelerCard
            v-if="item.type === 'traveler'"
            :traveler="item"
            @click="handleCardClick(item)"
          />

          <PostCard
            v-else-if="item.type === 'discussion'"
            :post="item"
            @click="handleCardClick(item)"
          />

          <ItineraryCard
            v-else-if="item.type === 'itinerary'"
            :itinerary="item"
            @click="handleCardClick(item)"
          />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
/* 隱藏滾動條但保持功能 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
