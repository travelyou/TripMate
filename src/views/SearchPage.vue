<template>
  <div class="min-h-screen bg-[#fffef7] flex flex-col">
    <div class="sticky top-0 z-30 bg-[#fcf9f2] shadow-sm border-b border-gray-200 p-4">
      <div class="max-w-7xl mx-auto w-full">
        <div class="flex items-center gap-3 mb-4">
          <button
            class="p-2 -ml-2 hover:bg-gray-200 rounded-full transition text-gray-600 md:hidden"
            @click="router.back()"
          >
            <ChevronLeftIcon class="w-6 h-6" />
          </button>

          <div class="relative flex-1">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="搜尋關鍵字..."
              class="w-full pl-10 pr-10 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-base"
              @keyup.enter="performSearch"
            />
            <button
              v-if="searchQuery"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              @click="clearSearch"
            >
              <XIcon class="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <button
            class="hidden md:block px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px]"
            @click="performSearch"
          >
            搜尋
          </button>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition border-2',
              activeTab === tab.value
                ? 'bg-gray-800 text-white border-gray-800 shadow-[2px_2px_0px_0px_rgba(251,146,60,1)]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50',
            ]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 w-full max-w-7xl mx-auto p-4 overflow-x-hidden">
      <div class="w-full min-w-0">
        <div
          v-if="!hasSearched"
          class="flex flex-col items-center justify-center mt-20 text-gray-400 space-y-4"
        >
          <div class="bg-gray-100 p-6 rounded-full animate-bounce-slow">
            <SearchIcon class="w-12 h-12 text-gray-300" />
          </div>
          <p>輸入關鍵字來尋找旅伴或靈感吧！</p>

          <div class="flex flex-wrap justify-center gap-2 mt-4 max-w-xs">
            <span
              v-for="tag in ['#東京獨旅', '#京都賞楓', '#環島', '#美食']"
              :key="tag"
              class="px-3 py-1 bg-gray-100 text-xs text-gray-600 rounded-full cursor-pointer hover:bg-orange-100 hover:text-orange-600 transition"
              @click="quickSearch(tag.replace('#', ''))"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-else-if="filteredResults.length === 0" class="text-center mt-20 text-gray-500">
          <p class="text-lg">
            找不到與「<span class="text-orange-600 font-bold">{{ searchQuery }}</span
            >」相關的結果
          </p>
          <p class="text-sm mt-2">試試看切換其他分類，或使用更通用的關鍵字。</p>
        </div>

        <div v-else class="space-y-4 pb-10">
          <p class="text-sm text-gray-500 mb-2 ml-1">
            在 <span class="font-bold text-gray-700">{{ getTabLabel(activeTab) }}</span> 中找到
            {{ filteredResults.length }} 筆結果
          </p>

          <div
            v-for="item in filteredResults"
            :key="`${item.type}-${item.id}`"
            class="bg-white p-4 rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:shadow-md transition cursor-pointer flex gap-4 group"
            @click="handleResultClick(item)"
          >
            <div v-if="item.type === 'traveler'" class="w-16 h-16 shrink-0">
              <img
                :src="item.avatar"
                class="w-full h-full object-cover rounded-full border-2 border-gray-200 group-hover:border-orange-200 transition"
              />
            </div>
            <div
              v-else
              class="w-24 h-24 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100"
            >
              <img
                v-if="item.image"
                :src="item.image"
                class="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                <ImageIcon class="w-8 h-8" />
              </div>
            </div>

            <div class="flex flex-col justify-center min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                <span
                  class="text-[10px] px-2 py-0.5 rounded border font-bold"
                  :class="getCategoryStyle(item.type)"
                >
                  {{ getCategoryLabel(item.type) }}
                </span>
                <span class="text-xs text-gray-400">{{ item.date }}</span>
              </div>

              <h3
                class="font-bold text-gray-800 line-clamp-1 mb-1 group-hover:text-orange-600 transition"
              >
                {{ item.title }}
              </h3>
              <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {{ item.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
  X as XIcon,
  Image as ImageIcon,
} from 'lucide-vue-next'

// Stores
import { useDiscussionsStore } from '@/stores/discussions'
import { useTravelersStore } from '@/stores/travelers'
import { useItineraryStore } from '@/stores/itinerary'

// Components
// ❌ 移除廣告 import
// import RightSidebarAd from '@/components/common/RightSidebarAd.vue'

const router = useRouter()
const route = useRoute()

// Initialize Stores
const discussionsStore = useDiscussionsStore()
const travelersStore = useTravelersStore()
const itineraryStore = useItineraryStore()

const searchInput = ref(null)
const searchQuery = ref('')
const hasSearched = ref(false)
const activeTab = ref('all')

const tabs = [
  { label: '全部', value: 'all' },
  { label: '找旅伴', value: 'traveler' },
  { label: '討論區', value: 'discussion' },
  { label: '精選行程', value: 'itinerary' },
]

// 聚合資料 (Aggregation)
const allData = computed(() => {
  const results = []

  // Discussion
  if (discussionsStore.discussions) {
    discussionsStore.discussions.forEach((post) => {
      results.push({
        id: post.id,
        type: 'discussion',
        title: post.title,
        description: post.content,
        image: post.image,
        date: post.time || '剛剛',
        originalData: post,
      })
    })
  }

  // Traveler
  if (travelersStore.recommendations) {
    travelersStore.recommendations.forEach((traveler) => {
      results.push({
        id: traveler.id,
        type: 'traveler',
        title: traveler.title,
        description: traveler.content || `地點：${traveler.location}`,
        avatar: traveler.avatar || traveler.image,
        date: traveler.date || '近期',
        originalData: traveler,
      })
    })
  }

  // Itinerary
  if (itineraryStore.itineraries) {
    itineraryStore.itineraries.forEach((plan) => {
      results.push({
        id: plan.id,
        type: 'itinerary',
        title: plan.title,
        description: plan.description || '精彩的旅程規劃',
        image: plan.coverImage || plan.image,
        date: plan.date || '隨時出發',
        originalData: plan,
      })
    })
  }

  return results
})

// 搜尋與篩選邏輯
const filteredResults = computed(() => {
  if (!hasSearched.value) return []

  const query = searchQuery.value.toLowerCase().trim()

  let results = allData.value.filter((item) => {
    const title = item.title ? item.title.toLowerCase() : ''
    const desc = item.description ? item.description.toLowerCase() : ''
    return title.includes(query) || desc.includes(query)
  })

  if (activeTab.value !== 'all') {
    results = results.filter((item) => item.type === activeTab.value)
  }

  return results
})

onMounted(() => {
  if (route.query.q) {
    searchQuery.value = route.query.q
    performSearch()
  } else {
    searchInput.value?.focus()
  }
})

watch(
  () => route.query.q,
  (newVal) => {
    if (newVal) {
      searchQuery.value = newVal
      performSearch()
    }
  },
)

const performSearch = () => {
  if (!searchQuery.value.trim()) return
  hasSearched.value = true
}

const clearSearch = () => {
  searchQuery.value = ''
  hasSearched.value = false
  searchInput.value?.focus()
}

const quickSearch = (keyword) => {
  searchQuery.value = keyword
  performSearch()
}

// 樣式輔助
const getTabLabel = (val) => {
  const tab = tabs.find((t) => t.value === val)
  return tab ? tab.label : '全部'
}

const getCategoryLabel = (type) => {
  const map = { traveler: '找旅伴', discussion: '討論區', itinerary: '行程' }
  return map[type] || '其他'
}

const getCategoryStyle = (type) => {
  const map = {
    traveler: 'bg-green-50 text-green-600 border-green-200',
    discussion: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    itinerary: 'bg-amber-50 text-amber-600 border-amber-200',
  }
  return map[type] || 'bg-gray-50 text-gray-600 border-gray-200'
}

const handleResultClick = (item) => {
  if (item.type === 'discussion') {
    // 這裡通常會開啟 Modal 或導頁
    console.log('打開討論貼文', item.originalData)
  } else if (item.type === 'traveler') {
    console.log('打開找旅伴', item.originalData)
  } else if (item.type === 'itinerary') {
    // 假設行程也是用 Modal 或新頁面
    console.log('打開行程', item.originalData)
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.animate-bounce-slow {
  animation: bounce 2s infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(-5%);
  }
  50% {
    transform: translateY(0);
  }
}
</style>
