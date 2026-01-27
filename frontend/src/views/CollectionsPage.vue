<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { Bookmark, FolderOpen, Plus, Trash2 } from 'lucide-vue-next'
import { showConfirm, showPrompt } from '@/utils/alert'
import { fetchPostById } from '@/api/discussions'
import { getTravelerById } from '@/api/travelers'
import { getItineraryById } from '@/api/itinerary'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'

// 引入卡片元件
import PostCard from '@/components/cards/DiscussionCard.vue'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import ItineraryCard from '@/components/cards/ItineraryCard.vue'

const userStore = useUserStore()

// 當前選中的分類 ID (預設 'all')
const activeCategoryId = ref('all')
const hydratedItems = ref({})
const loadingItems = ref({})

const buildAvatarFallback = (uid) =>
  uid ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}` : ''

const normalizeHydratedPayload = (payload, item) => {
  if (!payload) return payload
  if (item.type === 'discussion') {
    return {
      ...payload,
      avatar:
        payload.avatar ||
        payload.author_avatar ||
        buildAvatarFallback(payload.author_uid || payload.authorUid),
      author:
        payload.author ||
        payload.author_name ||
        payload.author_nickname ||
        payload.author_uid ||
        '匿名用戶',
      likes: payload.likes ?? payload.likes_count ?? 0,
      comments:
        payload.comments ??
        payload.comments_count ??
        (payload.commentsData ? payload.commentsData.length : 0),
    }
  }
  return payload
}

const buildKey = (item) => `${item?.type || 'unknown'}:${item?.id}`

const storeHydratedItem = (key, data) => {
  hydratedItems.value = {
    ...hydratedItems.value,
    [key]: data,
  }
}

const clearHydratedItem = (key) => {
  if (!hydratedItems.value[key]) return
  const updated = { ...hydratedItems.value }
  delete updated[key]
  hydratedItems.value = updated
}

const markLoading = (key) => {
  loadingItems.value = {
    ...loadingItems.value,
    [key]: true,
  }
}

const unmarkLoading = (key) => {
  if (!loadingItems.value[key]) return
  const updated = { ...loadingItems.value }
  delete updated[key]
  loadingItems.value = updated
}

const hydrateItem = async (item) => {
  if (!item?.id || !item?.type) return
  const key = buildKey(item)
  if (hydratedItems.value[key] || loadingItems.value[key]) return
  markLoading(key)
  try {
    let payload = null
    if (item.type === 'discussion') {
      payload = await fetchPostById(item.id)
    } else if (item.type === 'traveler') {
      const response = await getTravelerById(item.id, userStore.currentUser?.uid)
      payload = response?.data || response
    } else if (item.type === 'itinerary') {
      const response = await getItineraryById(item.id)
      payload = response?.data || response?.item || response
    }

    if (payload) {
      const normalized = normalizeHydratedPayload(payload, item)
      storeHydratedItem(key, {
        ...normalized,
        id: normalized.id || item.id,
        type: item.type,
      })
    }
  } catch (error) {
    console.error('[Collections] 載入收藏內容失敗:', error)
  } finally {
    unmarkLoading(key)
  }
}

// --- 動作：新增分類 ---
const createNewCategory = async () => {
  const name = await showPrompt('請輸入新分類名稱：')
  if (name) {
    userStore.createCategoryAndSave(name)
    const newCat = userStore.collectionCategories[userStore.collectionCategories.length - 1]
    if (newCat) activeCategoryId.value = newCat.id
  }
}

// --- 動作：刪除目前分類 ---
const deleteCurrentCategory = async () => {
  // 保護預設分類不被刪除
  const protectedIds = ['all', 'default', 'domestic', 'international']
  if (protectedIds.includes(activeCategoryId.value)) return

  const confirmed = await showConfirm('確定要刪除這個分類嗎？裡面的收藏會變回「未分類」狀態。')
  if (confirmed) {
    const index = userStore.collectionCategories.findIndex((c) => c.id === activeCategoryId.value)
    if (index > -1) {
      userStore.collectionCategories.splice(index, 1)
      activeCategoryId.value = 'all'
    }
  }
}

// --- 動作：從分類中移除項目 ---
const removeItem = async (item) => {
  const confirmed = await showConfirm('確定要取消收藏嗎？')
  if (confirmed) {
    const targetCatId = activeCategoryId.value === 'all' ? null : activeCategoryId.value
    userStore.removeFromCollection(item, targetCatId)
    clearHydratedItem(buildKey(item))
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

const displayItems = computed(() =>
  filteredItems.value.map((item) => hydratedItems.value[buildKey(item)]).filter((item) => !!item),
)

const currentCategoryName = computed(() => {
  const tab = tabs.value.find((t) => t.id === activeCategoryId.value)
  return tab ? tab.label : '收藏'
})

const isHydrating = ref(true)
let hydrationRunId = 0

const hydrateVisibleItems = async () => {
  const items = filteredItems.value.slice()
  const runId = ++hydrationRunId

  if (items.length === 0) {
    isHydrating.value = false
    return
  }

  isHydrating.value = true
  try {
    await Promise.all(items.map((item) => hydrateItem(item)))
  } finally {
    if (runId === hydrationRunId) {
      isHydrating.value = false
    }
  }
}

watch(
  [activeCategoryId, () => userStore.collections.map((item) => buildKey(item)).join('|')],
  () => {
    hydrateVisibleItems()
  },
  { immediate: true },
)

const isDiscussionModalOpen = ref(false)
const isTravelerModalOpen = ref(false)
const isItineraryModalOpen = ref(false)

const selectedDiscussion = ref(null)
const selectedTraveler = ref(null)
const selectedItinerary = ref(null)

const discussionScrollToComments = ref(false)
const travelerScrollToComments = ref(false)
const itineraryScrollToComments = ref(false)

const openDiscussionDetail = (post, focusComments = false) => {
  selectedDiscussion.value = post
  discussionScrollToComments.value = !!focusComments
  isDiscussionModalOpen.value = true
}

const closeDiscussionDetail = () => {
  isDiscussionModalOpen.value = false
  discussionScrollToComments.value = false
  selectedDiscussion.value = null
}

const openTravelerDetail = (traveler, focusComments = false) => {
  selectedTraveler.value = traveler
  travelerScrollToComments.value = !!focusComments
  isTravelerModalOpen.value = true
}

const closeTravelerDetail = () => {
  isTravelerModalOpen.value = false
  travelerScrollToComments.value = false
  selectedTraveler.value = null
}

const openItineraryDetail = (itinerary, focusComments = false) => {
  selectedItinerary.value = itinerary
  itineraryScrollToComments.value = !!focusComments
  isItineraryModalOpen.value = true
}

const closeItineraryDetail = () => {
  isItineraryModalOpen.value = false
  itineraryScrollToComments.value = false
  selectedItinerary.value = null
}

// 統一橘色系樣式
const getTabStyle = (isActive) => {
  let baseStyle = 'text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700'
  let activeStyle = 'bg-primary-50 text-primary-600 shadow-sm ring-2 ring-primary-200'
  return isActive ? activeStyle : baseStyle
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full mt-6 px-4">
    <div
      class="relative bg-gradient-to-r from-primary-700 to-primary-500 rounded-3xl p-8 mb-8 text-white shadow-lg overflow-hidden"
    >
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 w-60 h-60 bg-primary-900/20 rounded-full blur-3xl"></div>

      <div class="relative z-10 flex items-center gap-6">
        <div
          class="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner"
        >
          <Bookmark class="w-12 h-12 text-white fill-white" />
        </div>
        <div>
          <h1 class="text-3xl font-black mb-2 tracking-wide">我的收藏</h1>
          <p class="text-secondary-100 font-medium">建立專屬分類，規劃你的夢想旅程！</p>
        </div>

        <div
          class="hidden md:flex ml-auto gap-8 bg-white/10 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10"
        >
          <div class="text-center">
            <div class="text-2xl font-bold">{{ userStore.collections.length }}</div>
            <div class="text-xs text-secondary-100">口袋名單</div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-2 mb-6 flex overflow-x-auto custom-scroll items-center gap-2"
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
          :class="
            activeCategoryId === tab.id ? 'bg-white/40' : 'bg-secondary-200 text-secondary-500'
          "
        >
          {{ tab.count }}
        </span>
      </button>

      <div class="w-px h-8 bg-secondary-200 mx-1 flex-shrink-0"></div>

      <button
        class="flex-shrink-0 px-4 py-2.5 text-sm font-bold text-primary-600 hover:bg-primary-50 rounded-xl transition flex items-center gap-1"
        @click="createNewCategory"
      >
        <Plus class="w-4 h-4" />
        新增分類
      </button>
    </div>

    <div class="space-y-6 min-h-[400px]">
      <div class="flex justify-between items-end px-1">
        <div
          class="bg-white/90 backdrop-blur-sm px-5 py-2 rounded-2xl shadow-sm border border-secondary-100 flex items-center"
        >
          <h2 class="text-xl font-black text-secondary-800 flex items-center">
            <FolderOpen class="w-6 h-6 mr-2 text-primary-500 fill-primary-100" />
            {{ currentCategoryName }}
          </h2>
        </div>

        <button
          v-if="!['all', 'default', 'domestic', 'international'].includes(activeCategoryId)"
          class="text-red-500 hover:text-red-600 text-sm flex items-center font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-secondary-100 hover:bg-red-50 transition"
          @click="deleteCurrentCategory"
        >
          <Trash2 class="w-4 h-4 mr-1" /> 刪除此分類
        </button>
      </div>

      <div
        v-if="isHydrating"
        class="text-center py-20 text-secondary-400 bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-dashed border-secondary-200 shadow-sm"
      >
        <Bookmark class="w-16 h-16 mx-auto mb-4 text-secondary-300" />
        <p class="font-bold text-lg">載入中...</p>
        <p class="text-sm">正在同步收藏內容，請稍候</p>
      </div>

      <div
        v-else-if="filteredItems.length === 0"
        class="text-center py-20 text-secondary-400 bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-dashed border-secondary-200 shadow-sm"
      >
        <Bookmark class="w-16 h-16 mx-auto mb-4 text-secondary-300" />
        <p class="font-bold text-lg">這裡目前是空的</p>
        <p class="text-sm">快去逛逛，把喜歡的內容加進來吧！</p>
      </div>

      <div
        v-else-if="displayItems.length === 0"
        class="text-center py-20 text-secondary-400 bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-dashed border-secondary-200 shadow-sm"
      >
        <Bookmark class="w-16 h-16 mx-auto mb-4 text-secondary-300" />
        <p class="font-bold text-lg">尚未取得內容</p>
        <p class="text-sm">可能是網路較慢，請重新整理或稍候再試。</p>
      </div>

      <TransitionGroup v-else name="list">
        <div v-for="item in displayItems" :key="item.id" class="relative group">
          <button
            class="absolute top-4 right-4 z-20 p-2 bg-white/90 hover:bg-red-500 hover:text-white text-secondary-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition duration-200 border border-secondary-100"
            title="移除收藏"
            @click.stop="removeItem(item)"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <TravelerCard
            v-if="item.type === 'traveler'"
            :traveler="item"
            @open-detail="openTravelerDetail"
          />

          <PostCard
            v-else-if="item.type === 'discussion'"
            :post="item"
            @click="openDiscussionDetail(item, false)"
            @comment="openDiscussionDetail(item, true)"
          />

          <ItineraryCard
            v-else-if="item.type === 'itinerary'"
            :itinerary="item"
            @open-detail="openItineraryDetail"
          />
        </div>
      </TransitionGroup>
      <DiscussionDetailModal
        v-if="isDiscussionModalOpen && selectedDiscussion"
        :post="selectedDiscussion"
        :scroll-to-comments="discussionScrollToComments"
        @close="closeDiscussionDetail"
      />
      <TravelerDetailModal
        v-if="isTravelerModalOpen && selectedTraveler"
        :traveler="selectedTraveler"
        :scroll-to-comments="travelerScrollToComments"
        @close="closeTravelerDetail"
      />
      <ItineraryDetailModal
        v-if="isItineraryModalOpen && selectedItinerary"
        :itinerary="selectedItinerary"
        :scroll-to-comments="itineraryScrollToComments"
        @close="closeItineraryDetail"
      />
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

/* scrollbar rules moved to src/assets/main.css */
</style>
