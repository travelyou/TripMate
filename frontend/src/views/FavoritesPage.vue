<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue'
import { useUserStore } from '@/stores/user'
import { Heart, MessageCircle, Users, Map } from 'lucide-vue-next'
import { buildLikeKey, flushPendingLikesNow } from '@/api/likes'
import { onBeforeRouteUpdate } from 'vue-router'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'

// 引入你的卡片元件
import PostCard from '@/components/cards/DiscussionCard.vue'
import TravelerCard from '@/components/cards/TravelerCard.vue'
import ItineraryCard from '@/components/cards/ItineraryCard.vue'

// 2. 初始化 Store
const userStore = useUserStore()

const currentUserUid = computed(() => userStore.currentUser?.uid || userStore.currentUser?.id)

// --- 篩選邏輯 ---
const activeTab = ref('all')
const isLoadingFavorites = ref(true)

const tabs = [
  { id: 'all', label: '全部內容', icon: Heart },
  { id: 'discussion', label: '討論文章', icon: MessageCircle },
  { id: 'traveler', label: '旅伴招募', icon: Users },
  { id: 'itinerary', label: '精選行程', icon: Map },
]

// 3. 改成從 Store 讀取 favorites
const filteredItems = computed(() => {
  const items = userStore.favorites || []
  if (activeTab.value === 'all') return items
  return items.filter((item) => item.type === activeTab.value)
})

// --- 詳細內容 Modal 狀態 ---
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
  if (!post) {
    console.warn('openDiscussionDetail: post is null or undefined')
    return
  }
  selectedDiscussion.value = post
  discussionScrollToComments.value = focusComments
  isDiscussionModalOpen.value = true
}

const closeDiscussionDetail = () => {
  isDiscussionModalOpen.value = false
  discussionScrollToComments.value = false
  selectedDiscussion.value = null
}

const handleDiscussionDeleted = async () => {
  closeDiscussionDetail()
  await refreshFavorites()
}

const openTravelerDetail = (traveler, focusComments = false) => {
  selectedTraveler.value = traveler
  travelerScrollToComments.value = focusComments
  isTravelerModalOpen.value = true
}

const closeTravelerDetail = () => {
  isTravelerModalOpen.value = false
  travelerScrollToComments.value = false
  selectedTraveler.value = null
}

const handleTravelerUpdated = async () => {
  await refreshFavorites()
}

const openItineraryDetail = (itinerary, focusComments = false) => {
  selectedItinerary.value = itinerary
  itineraryScrollToComments.value = focusComments
  isItineraryModalOpen.value = true
}

const closeItineraryDetail = () => {
  isItineraryModalOpen.value = false
  itineraryScrollToComments.value = false
  selectedItinerary.value = null
}

const handleItineraryDeleted = async () => {
  closeItineraryDetail()
  await refreshFavorites()
}

const handleLikesUpdated = (event) => {
  const detail = event?.detail
  if (!detail) return

  const items = userStore.favorites || []
  const key = detail.key || ''
  const [board, postId] = key.split(':')

  if (currentUserUid.value) {
    items.forEach((item) => {
      if (!item?.id || !item?.type) return
      const userKey = buildLikeKey(item.id, currentUserUid.value, item.type)
      if (detail.key !== userKey) return
      item.likes = detail.likesCount
      item.isLiked = detail.liked
    })

    if (detail.key && detail.key.includes(`:${currentUserUid.value}`) && detail.liked === false) {
      const removeIndex = items.findIndex(
        (item) =>
          item?.id && item?.type && String(item.id) === String(postId) && item.type === board,
      )
      if (removeIndex > -1) items.splice(removeIndex, 1)
    }
  }
}

const refreshFavorites = async () => {
  isLoadingFavorites.value = true
  try {
    flushPendingLikesNow({ keepalive: true })
    if (currentUserUid.value) {
      await userStore.loadUserProfile(currentUserUid.value)
      await userStore.fetchFavorites()
    }
  } finally {
    isLoadingFavorites.value = false
  }
}

onMounted(async () => {
  window.addEventListener('likes-updated', handleLikesUpdated)
  await refreshFavorites()
})

onActivated(async () => {
  await refreshFavorites()
})

onBeforeRouteUpdate(async (to, from, next) => {
  await refreshFavorites()
  next()
})

onUnmounted(() => {
  window.removeEventListener('likes-updated', handleLikesUpdated)
})
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
          <Heart class="w-12 h-12 text-white fill-white" />
        </div>
        <div>
          <h1 class="text-3xl font-black mb-2 tracking-wide">我的最愛</h1>
          <p class="text-secondary-100 font-medium">這裡收藏了你喜歡的所有內容，隨時回味！</p>
        </div>

        <div
          class="hidden md:flex ml-auto gap-8 bg-white/10 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10"
        >
          <div class="text-center">
            <div class="text-2xl font-bold">{{ userStore.favorites.length }}</div>
            <div class="text-xs text-secondary-100">收藏總數</div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-2 mb-6 flex overflow-x-auto custom-scroll"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 min-w-24 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
        :class="
          activeTab === tab.id
            ? 'bg-primary-50 text-primary-600 shadow-sm ring-2 ring-primary-100'
            : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700'
        "
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-4 h-4" :class="{ 'fill-current': tab.id === 'all' }" />
        {{ tab.label }}
      </button>
    </div>

    <div class="space-y-6 min-h-[400px]">
      <div
        v-if="isLoadingFavorites"
        class="text-center py-20 text-secondary-400 bg-white/90 rounded-3xl border-2 border-dashed border-secondary-200"
      >
        <p class="font-bold text-lg">載入中...</p>
        <p class="text-sm">正在同步你的收藏資料</p>
      </div>

      <div
        v-else-if="filteredItems.length === 0"
        class="text-center py-20 text-secondary-400 bg-white/90 rounded-3xl border-2 border-dashed border-secondary-200"
      >
        <Heart class="w-16 h-16 mx-auto mb-4 text-secondary-300" />
        <p class="font-bold text-lg">這裡目前是空的</p>
        <p class="text-sm">快去探索並點擊愛心收藏吧！</p>
      </div>

      <TransitionGroup v-else name="list">
        <div v-for="item in filteredItems" :key="`${item.type}-${item.id}`">
          <TravelerCard
            v-if="item.type === 'traveler'"
            :traveler="item"
            @open-detail="openTravelerDetail"
          />

          <PostCard
            v-else-if="item.type === 'discussion'"
            :post="item"
            class="cursor-pointer"
            @click="(post) => openDiscussionDetail(post || item, false)"
            @comment="(post) => openDiscussionDetail(post || item, true)"
          />

          <ItineraryCard
            v-else-if="item.type === 'itinerary'"
            :itinerary="item"
            @open-detail="openItineraryDetail"
          />
        </div>
      </TransitionGroup>
    </div>
    <DiscussionDetailModal
      v-if="isDiscussionModalOpen && selectedDiscussion"
      :post="selectedDiscussion"
      :scroll-to-comments="discussionScrollToComments"
      @close="closeDiscussionDetail"
      @deleted="handleDiscussionDeleted"
    />
    <TravelerDetailModal
      v-if="isTravelerModalOpen && selectedTraveler"
      :traveler="selectedTraveler"
      :scroll-to-comments="travelerScrollToComments"
      @close="closeTravelerDetail"
      @traveler-updated="handleTravelerUpdated"
    />
    <ItineraryDetailModal
      v-if="isItineraryModalOpen && selectedItinerary"
      :itinerary="selectedItinerary"
      :scroll-to-comments="itineraryScrollToComments"
      @close="closeItineraryDetail"
      @deleted="handleItineraryDeleted"
    />
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
