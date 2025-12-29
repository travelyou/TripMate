<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { Bookmark, FolderOpen, Plus, Trash2 } from 'lucide-vue-next'

// 引入卡片元件
import PostCard from '@/components/posts/PostCard.vue'
import TravelerCard from '@/components/posts/TravelerCard.vue'
import ItineraryCard from '@/components/itinerary/ItineraryCard.vue'

const userStore = useUserStore()

// 當前選中的分類 ID (預設 'all')
const activeCategoryId = ref('all')

// --- 動作：新增分類 ---
const createNewCategory = () => {
  const name = window.prompt('請輸入新分類名稱：')
  if (name) {
    userStore.createCategoryAndSave(name)
    const newCat = userStore.collectionCategories[userStore.collectionCategories.length - 1]
    if (newCat) activeCategoryId.value = newCat.id
  }
}

// --- 動作：刪除目前分類 ---
const deleteCurrentCategory = () => {
  // 保護預設分類不被刪除
  const protectedIds = ['all', 'default', 'domestic', 'international']
  if (protectedIds.includes(activeCategoryId.value)) return

  if (confirm('確定要刪除這個分類嗎？裡面的收藏會變回「未分類」狀態。')) {
    const index = userStore.collectionCategories.findIndex((c) => c.id === activeCategoryId.value)
    if (index > -1) {
      userStore.collectionCategories.splice(index, 1)
      activeCategoryId.value = 'all'
    }
  }
}

// --- 動作：從分類中移除項目 ---
const removeItem = (item) => {
  if (confirm('確定要取消收藏嗎？')) {
    const targetCatId = activeCategoryId.value === 'all' ? null : activeCategoryId.value
    userStore.removeFromCollection(item, targetCatId)
  }
}

// --- 資料計算 ---
const tabs = computed(() => {
  const categories = userStore.collectionCategories.map((cat) => ({
    id: cat.id,
    label: cat.name,
    count: cat.items.length,
    icon: FolderOpen,
  }))

  return [
    { id: 'all', label: '全部收藏', count: userStore.collections.length, icon: Bookmark },
    ...categories,
  ]
})

const filteredItems = computed(() => {
  if (activeCategoryId.value === 'all') {
    return userStore.collections
  }
  const category = userStore.collectionCategories.find((c) => c.id === activeCategoryId.value)
  return category ? category.items : []
})

const currentCategoryName = computed(() => {
  const tab = tabs.value.find((t) => t.id === activeCategoryId.value)
  return tab ? tab.label : '收藏'
})

const handleCardClick = (item) => {
  console.log('查看收藏內容:', item.title)
}

// 統一橘色系樣式
const getTabStyle = (isActive) => {
  let baseStyle = 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
  let activeStyle = 'bg-orange-50 text-orange-600 shadow-sm ring-2 ring-orange-200'
  return isActive ? activeStyle : baseStyle
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full mt-[20px]">
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
          <p class="text-amber-100 font-medium">建立專屬分類，規劃你的夢想旅程！</p>
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
      class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 flex overflow-x-auto no-scrollbar items-center gap-2"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeCategoryId = tab.id"
        class="flex-shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
        :class="getTabStyle(activeCategoryId === tab.id)"
      >
        <component
          :is="tab.icon"
          class="w-4 h-4"
          :class="{ 'fill-current': activeCategoryId === tab.id }"
        />
        {{ tab.label }}
        <span
          class="ml-1 text-xs px-1.5 py-0.5 rounded-full"
          :class="activeCategoryId === tab.id ? 'bg-white/40' : 'bg-gray-200 text-gray-500'"
        >
          {{ tab.count }}
        </span>
      </button>

      <div class="w-px h-8 bg-gray-200 mx-1 flex-shrink-0"></div>

      <button
        class="flex-shrink-0 px-4 py-2.5 text-sm font-bold text-indigo-500 hover:bg-indigo-50 rounded-xl transition flex items-center gap-1"
        @click="createNewCategory"
      >
        <Plus class="w-4 h-4" />
        新增分類
      </button>
    </div>

    <div class="space-y-6 min-h-[400px]">
      <div class="flex justify-between items-end px-1">
        <div
          class="bg-white/90 backdrop-blur-sm px-5 py-2 rounded-2xl shadow-sm border border-gray-100 flex items-center"
        >
          <h2 class="text-xl font-black text-gray-800 flex items-center">
            <FolderOpen class="w-6 h-6 mr-2 text-amber-500 fill-amber-100" />
            {{ currentCategoryName }}
          </h2>
        </div>

        <button
          v-if="!['all', 'default', 'domestic', 'international'].includes(activeCategoryId)"
          class="text-red-500 hover:text-red-600 text-sm flex items-center font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 hover:bg-red-50 transition"
          @click="deleteCurrentCategory"
        >
          <Trash2 class="w-4 h-4 mr-1" /> 刪除此分類
        </button>
      </div>

      <div
        v-if="filteredItems.length === 0"
        class="text-center py-20 text-gray-400 bg-white/95 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300 shadow-sm"
      >
        <Bookmark class="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p class="font-bold text-lg">這裡目前是空的</p>
        <p class="text-sm">快去逛逛，把喜歡的內容加進來吧！</p>
      </div>

      <TransitionGroup name="list">
        <div v-for="item in filteredItems" :key="item.id" class="relative group">
          <button
            class="absolute top-4 right-4 z-20 p-2 bg-white/90 hover:bg-red-500 hover:text-white text-gray-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition duration-200 border border-gray-100"
            title="移除收藏"
            @click.stop="removeItem(item)"
          >
            <Trash2 class="w-4 h-4" />
          </button>

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
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
