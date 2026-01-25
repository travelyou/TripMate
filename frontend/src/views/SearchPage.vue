<template>
  <div class="min-h-screen bg-secondary-50 flex flex-col pb-24 lg:pb-0">
    <div class="sticky top-0 z-30 bg-secondary-100 shadow-sm border-b border-secondary-200 p-4">
      <div class="w-full">
        <div class="flex items-center gap-3 mb-4">
          <button
            class="p-2 -ml-2 hover:bg-secondary-100 rounded-full transition text-secondary-600 md:hidden"
            @click="router.back()"
          >
            <ChevronLeftIcon class="w-6 h-6" />
          </button>

          <div class="relative flex-1">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="搜尋關鍵字..."
              class="w-full pl-10 pr-10 py-3 bg-white border-2 border-secondary-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition text-base"
              @keyup.enter="performSearch"
            />
            <button
              v-if="searchQuery"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary-100 rounded-full"
              @click="clearSearch"
            >
              <XIcon class="w-4 h-4 text-secondary-400" />
            </button>
          </div>

          <button
            class="hidden md:block px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px]"
            @click="performSearch"
          >
            搜尋
          </button>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mb-2">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition border-2',
              activeTab === tab.value
                ? 'bg-primary-700 text-white border-primary-700 shadow-primary-solid'
                : 'bg-white text-secondary-600 border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50',
            ]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div
          v-if="currentSubFilters.length > 0"
          class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-secondary-200"
        >
          <button
            v-for="filter in currentSubFilters"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border',
              activeSubFilter === filter
                ? 'bg-primary-100 text-primary-700 border-primary-300'
                : 'bg-white text-secondary-500 border-secondary-200 hover:bg-secondary-50',
            ]"
            @click="activeSubFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 w-full p-4 overflow-x-hidden">
      <div class="w-full min-w-0">
        <div
          v-if="!hasSearched"
          class="flex flex-col items-center justify-center mt-20 text-secondary-400 space-y-4"
        >
          <div class="bg-secondary-100 p-6 rounded-full animate-bounce-slow">
            <SearchIcon class="w-12 h-12 text-secondary-300" />
          </div>
          <p>輸入關鍵字來尋找旅伴或靈感吧！</p>

          <div class="flex flex-wrap justify-center gap-2 mt-4 max-w-xs">
            <span
              v-for="tag in ['#東京獨旅', '#京都賞楓', '#環島', '#美食']"
              :key="tag"
              class="px-3 py-1 bg-secondary-100 text-xs text-secondary-600 rounded-full cursor-pointer hover:bg-primary-100 hover:text-primary-600 transition"
              @click="quickSearch(tag.replace('#', ''))"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div v-else-if="filteredResults.length === 0" class="text-center mt-20 text-secondary-500">
          <p class="text-lg">
            找不到與「<span class="text-primary-600 font-bold">{{ searchQuery }}</span
            >」相關的結果
          </p>
          <p class="text-sm mt-2">試試看切換其他分類，或使用更通用的關鍵字。</p>
        </div>

        <div v-else class="space-y-4">
          <p class="text-sm text-secondary-500 mb-2 ml-1">
            在 <span class="font-bold text-secondary-700">{{ getTabLabel(activeTab) }}</span>
            <span v-if="activeSubFilter && activeSubFilter !== '全部'">
              ({{ activeSubFilter }})
            </span>
            中找到 {{ filteredResults.length }} 筆結果
          </p>

          <div
            v-for="item in paginatedResults"
            :key="`${item.type}-${item.id}`"
            class="bg-white p-4 rounded-xl border-2 border-secondary-100 hover:border-primary-300 hover:shadow-md transition cursor-pointer flex gap-4 group"
            @click="handleResultClick(item)"
          >
            <!-- 使用者和找旅伴：顯示圓形頭像 -->
            <div v-if="item.type === 'traveler' || item.type === 'user'" class="w-16 h-16 shrink-0 rounded-full bg-secondary-100 flex items-center justify-center overflow-hidden border-2 border-secondary-200 group-hover:border-primary-200 transition">
              <img
                v-if="item.avatar && isValidImageUrl(item.avatar) && !avatarErrors[`${item.type}-${item.id}`]"
                :src="item.avatar"
                :alt="item.title"
                class="w-full h-full object-cover"
                @error="handleAvatarError(`${item.type}-${item.id}`)"
              />
              <UserIcon
                v-else
                class="w-8 h-8 text-secondary-400"
              />
            </div>
            <!-- 討論區和行程：顯示方形圖片 -->
            <div
              v-else
              class="w-24 h-24 shrink-0 bg-secondary-100 rounded-lg overflow-hidden border border-secondary-100"
            >
              <img
                v-if="item.image"
                :src="item.image"
                class="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-secondary-300">
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
                <span class="text-xs text-secondary-400">{{ item.date }}</span>
              </div>

              <h3
                class="font-bold text-secondary-800 line-clamp-1 mb-1 group-hover:text-primary-600 transition"
                v-html="highlightText(item.title)"
              ></h3>

              <p
                class="text-xs text-secondary-500 line-clamp-2 leading-relaxed"
                v-html="highlightText(item.description)"
              ></p>

              <div v-if="item.tags && item.tags.length > 0" class="mt-2 flex gap-1">
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                  class="text-[10px] bg-secondary-100 text-secondary-500 px-1.5 py-0.5 rounded"
                  v-html="'#' + highlightText(tag)"
                >
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="totalPages > 1"
            class="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-secondary-200"
          >
            <button
              class="px-4 py-2 rounded-lg font-bold transition flex items-center gap-1"
              :class="
                currentPage === 1
                  ? 'text-secondary-300 cursor-not-allowed'
                  : 'text-secondary-600 hover:bg-secondary-100 hover:text-primary-600'
              "
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <ChevronLeftIcon class="w-5 h-5" />
              上一頁
            </button>

            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-secondary-800">
                {{ currentPage }} / {{ totalPages }}
              </span>
            </div>

            <button
              class="px-4 py-2 rounded-lg font-bold transition flex items-center gap-1"
              :class="
                currentPage === totalPages
                  ? 'text-secondary-300 cursor-not-allowed'
                  : 'text-secondary-600 hover:bg-secondary-100 hover:text-primary-600'
              "
              :disabled="currentPage === totalPages"
              @click="changePage(currentPage + 1)"
            >
              下一頁
              <ChevronRightIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <DiscussionDetailModal
      v-if="isModalOpen"
      :post="selectedPost"
      @close="closeDiscussionDetailModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  X as XIcon,
  Image as ImageIcon,
  User as UserIcon,
} from 'lucide-vue-next'

import { useDiscussionsStore } from '@/stores/discussions'
import { useTravelersStore } from '@/stores/travelers'
import { useItineraryStore } from '@/stores/itinerary'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import { getAllUsers } from '@/api/users'
import { isValidHttpImageUrl as isValidImageUrl } from '@/utils/image'
import { SEARCH_SUB_FILTER_OPTIONS, FILTER_KEYWORDS } from '@/utils/filterOptions'

const router = useRouter()
const route = useRoute()

const discussionsStore = useDiscussionsStore()
const travelersStore = useTravelersStore()
const itineraryStore = useItineraryStore()

const isModalOpen = ref(false)
const selectedPost = ref(null)

const searchInput = ref(null)
const searchQuery = ref('')
const hasSearched = ref(false)
const activeTab = ref('all')
const activeSubFilter = ref('全部') // 單選

const currentPage = ref(1)
const itemsPerPage = 10

const users = ref([])
const loadingUsers = ref(false)
const avatarErrors = ref({})

const tabs = [
  { label: '全部', value: 'all' },
  { label: '找旅伴', value: 'traveler' },
  { label: '討論區', value: 'discussion' },
  { label: '精選行程', value: 'itinerary' },
  { label: '使用者', value: 'user' },
]

const currentSubFilters = computed(() => {
  return SEARCH_SUB_FILTER_OPTIONS[activeTab.value] || []
})

// 共用的關鍵字匹配函數
const matchByKeywords = (filter, item, originalData, categoryValue) => {
  const keywords = FILTER_KEYWORDS[filter]
  if (!keywords) return false

  return (
    keywords.some((keyword) =>
      item.title.includes(keyword) ||
      item.description.includes(keyword) ||
      item.tags.some((t) => t.includes(keyword))
    ) || originalData.category === categoryValue
  )
}

// 共用的分類篩選函數
const matchCategoryFilter = (filter, item, originalData) => {
  // 首先檢查 category 是否直接匹配
  if (originalData.category === filter) {
    return true
  }

  // 國內旅遊、日韓旅遊、亞洲其他、歐美紐澳、海島度假 共用邏輯
  if (['國內旅遊', '日韓旅遊', '亞洲其他', '歐美紐澳', '海島度假'].includes(filter)) {
    return matchByKeywords(filter, item, originalData, filter)
  }

  // 攝影（找旅伴）
  if (filter === '攝影') {
    return matchByKeywords('攝影', item, originalData, '攝影')
  }

  // 攝影/興趣（精選行程）
  if (filter === '攝影/興趣') {
    return (
      matchByKeywords('攝影/興趣', item, originalData, '攝影/興趣') ||
      originalData.category === '攝影' ||
      originalData.category === '攝影/興趣'
    )
  }

  // 自駕共乘
  if (filter === '自駕共乘') {
    return matchByKeywords('自駕共乘', item, originalData, '自駕共乘')
  }

  // 其他
  if (filter === '其他') {
    return (
      originalData.category === '其他' ||
      !originalData.category || // 如果沒有分類，歸類為「其他」
      item.title.includes('其他') ||
      item.description.includes('其他') ||
      item.tags.some((t) => t.includes('其他'))
    )
  }

  return false
}

watch(activeTab, () => {
  currentPage.value = 1
  activeSubFilter.value = '全部'
})

watch(activeSubFilter, () => {
  currentPage.value = 1
})

const allData = computed(() => {
  const results = []
  if (discussionsStore.discussions) {
    discussionsStore.discussions.forEach((post) => {
      results.push({
        id: post.id,
        type: 'discussion',
        title: post.title,
        description: post.content,
        image: post.image || post.banner,
        date: post.time || post.created_at || '剛剛',
        tags: Array.isArray(post.tags) ? post.tags : [],
        originalData: post,
      })
    })
  }
  if (travelersStore.recommendations) {
    travelersStore.recommendations.forEach((traveler) => {
      // 過濾有效的頭像 URL
      const avatarUrl = traveler.avatar || traveler.image
      const validAvatar = avatarUrl && typeof avatarUrl === 'string' &&
                         !avatarUrl.startsWith('blob:') && !avatarUrl.startsWith('data:') &&
                         (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))
                         ? avatarUrl : null

      results.push({
        id: traveler.id,
        type: 'traveler',
        title: traveler.title,
        description: traveler.content || `地點：${traveler.location}`,
        avatar: validAvatar,
        date: traveler.date || traveler.created_at || '近期',
        tags: Array.isArray(traveler.tags)
          ? traveler.tags
          : traveler.tag
            ? [traveler.tag]
            : traveler.category
              ? [traveler.category]
              : [],
        originalData: traveler,
      })
    })
  }
  if (itineraryStore.itineraries) {
    itineraryStore.itineraries.forEach((plan) => {
      results.push({
        id: plan.id,
        type: 'itinerary',
        title: plan.title,
        description: plan.description || plan.content || '精彩的旅程規劃',
        image: plan.coverImage || plan.image || plan.banner_image,
        date: plan.date || plan.created_at || '隨時出發',
        tags: Array.isArray(plan.tags) ? plan.tags : [],
        originalData: plan,
      })
    })
  }
  if (users.value && users.value.length > 0) {
    users.value.forEach((user) => {
      // 過濾有效的頭像 URL
      const avatarUrl = user.avatar || user.photoURL
      const validAvatar = avatarUrl && typeof avatarUrl === 'string' &&
                         !avatarUrl.startsWith('blob:') && !avatarUrl.startsWith('data:') &&
                         (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))
                         ? avatarUrl : null

      results.push({
        id: user.uid,
        type: 'user',
        title: user.nickname || user.displayName || '使用者',
        description: user.bio || user.card_bio || `旅行夥伴 · ${user.location || '探索世界'}`,
        avatar: validAvatar,
        date: '活躍中',
        tags: Array.isArray(user.tags)
          ? user.tags
          : Array.isArray(user.card_tags)
            ? user.card_tags
            : [],
        originalData: user,
      })
    })
  }
  return results
})

const highlightText = (text) => {
  if (!text) return ''
  const query = searchQuery.value.trim()
  if (!query) return text

  const matchers = [query]
  if (query.length >= 2) {
    for (let i = 0; i < query.length - 1; i++) {
      matchers.push(query.slice(i, i + 2))
    }
  }

  // 2. 依照長度排序 (長詞優先，避免 "台北" 先被 "台" 取代壞掉)
  matchers.sort((a, b) => b.length - a.length)

  // 3. 建立 Regex: (Query|Bigram1|Bigram2)
  const pattern = matchers.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')

  // 4. 替換文字，加上 highlight class
  return text.replace(
    regex,
    '<span class="bg-primary-100 text-primary-700 font-bold rounded-sm px-0.5">$1</span>',
  )
}

const filteredResults = computed(() => {
  if (!hasSearched.value) return []

  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return []

  // Bigram 邏輯
  const bigrams = []
  if (query.length >= 2) {
    for (let i = 0; i < query.length - 1; i++) {
      bigrams.push(query.slice(i, i + 2))
    }
  }

  let scoredItems = allData.value.map((item) => {
    let score = 0
    const title = item.title ? item.title.toLowerCase() : ''
    const desc = item.description ? item.description.toLowerCase() : ''
    const itemTags = item.tags ? item.tags.map((t) => t.toLowerCase()) : []

    // 權重計分
    if (title.includes(query)) score += 50
    if (itemTags.some((t) => t.includes(query))) score += 30
    if (desc.includes(query)) score += 10

    if (bigrams.length > 0) {
      bigrams.forEach((bg) => {
        if (title.includes(bg)) score += 5
        if (itemTags.some((t) => t.includes(bg))) score += 3
        if (desc.includes(bg)) score += 1
      })
    } else if (query.length === 1) {
      if (title.includes(query)) score += 2
      if (desc.includes(query)) score += 1
    }

    return { ...item, score }
  })

  scoredItems = scoredItems.filter((item) => item.score > 0)

  scoredItems = scoredItems.filter((item) => {
    const matchTab = activeTab.value === 'all' || item.type === activeTab.value

    let matchSubFilter = true
    // 如果選中「全部」，顯示所有項目
    if (activeSubFilter.value === '全部') {
      matchSubFilter = true
    } else {
      // 單選：只顯示符合選中條件的項目
      const originalData = item.originalData || {}
      const filter = activeSubFilter.value
      matchSubFilter = (() => {
        // 找旅伴專屬篩選
        if (activeTab.value === 'traveler' || item.type === 'traveler') {
          if (filter === '招募中') {
            return (
              originalData.status === 'active' ||
              (!item.title.includes('額滿') && !item.title.includes('已成行'))
            )
          } else if (filter === '已額滿') {
            return (
              originalData.status === 'full' ||
              item.title.includes('額滿') ||
              item.title.includes('已成行')
            )
          } else {
            // 使用共用的分類篩選函數
            return matchCategoryFilter(filter, item, originalData)
          }
        }
        // 討論區專屬篩選
        else if (activeTab.value === 'discussion' || item.type === 'discussion') {
          // 國內旅遊、亞洲旅遊、歐美紐澳 使用共用邏輯
          if (['國內旅遊', '亞洲旅遊', '歐美紐澳'].includes(filter)) {
            return matchByKeywords(filter, item, originalData, filter)
          }

          // 攝影愛好
          if (filter === '攝影愛好') {
            return matchByKeywords('攝影愛好', item, originalData, '攝影愛好')
          }

          // 交通建議
          if (filter === '交通建議') {
            return matchByKeywords('交通建議', item, originalData, '交通建議')
          }

          // 美食分享
          if (filter === '美食分享') {
            return matchByKeywords('美食分享', item, originalData, '美食分享')
          }

          // 住宿推薦
          if (filter === '住宿推薦') {
            return matchByKeywords('住宿推薦', item, originalData, '住宿推薦')
          }

          // 行程請益
          if (filter === '行程請益') {
            return matchByKeywords('行程請益', item, originalData, '行程請益')
          }

          // 其他
          if (filter === '其他') {
            return (
              originalData.category === '其他' ||
              item.title.includes('其他') ||
              item.description.includes('其他') ||
              item.tags.some((t) => t.includes('其他'))
            )
          }
        }
        // 精選行程專屬篩選
        else if (activeTab.value === 'itinerary' || item.type === 'itinerary') {
          // 使用共用的分類篩選函數
          return matchCategoryFilter(filter, item, originalData)
        }
        // 使用者專屬篩選（目前只有「全部」選項，無需額外篩選邏輯）
        return false // 如果沒有匹配到任何條件，返回 false
      })()
    }

    return matchTab && matchSubFilter
  })

  return scoredItems.sort((a, b) => b.score - a.score)
})

const totalPages = computed(() => {
  return Math.ceil(filteredResults.value.length / itemsPerPage)
})

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredResults.value.slice(start, end)
})

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  if (route.query.q) {
    searchQuery.value = route.query.q
    performSearch()
  } else {
    searchInput.value?.focus()
  }

  // 載入所有需要的資料
  // 載入精選行程資料
  if (!itineraryStore.itineraries || itineraryStore.itineraries.length === 0) {
    await itineraryStore.fetchItineraries()
  }

  // 載入使用者資料
  loadingUsers.value = true
  try {
    users.value = await getAllUsers({ limit: 100 })
  } catch (error) {
    console.error('載入使用者列表失敗：', error)
  } finally {
    loadingUsers.value = false
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
  currentPage.value = 1
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


const getTabLabel = (val) => {
  const tab = tabs.find((t) => t.value === val)
  return tab ? tab.label : '全部'
}
const getCategoryLabel = (type) => {
  const map = { traveler: '找旅伴', discussion: '討論區', itinerary: '行程', user: '使用者' }
  return map[type] || '其他'
}
const getCategoryStyle = (type) => {
  const map = {
    traveler: 'bg-green-50 text-green-600 border-green-200',
    discussion: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    itinerary: 'bg-primary-50 text-primary-700 border-primary-200',
    user: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return map[type] || 'bg-secondary-50 text-secondary-600 border-secondary-200'
}

const handleResultClick = (item) => {
  if (item.type === 'user') {
    // 導航到使用者個人頁面
    router.push(`/profile/${item.id}`)
  } else {
    // 其他類型打開 modal
  selectedPost.value = item.originalData
  isModalOpen.value = true
  }
}

const closeDiscussionDetailModal = () => {
  isModalOpen.value = false
  selectedPost.value = null
}

// 頭像錯誤處理
const handleAvatarError = (key) => {
  avatarErrors.value[key] = true
}
</script>

<style scoped>
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

