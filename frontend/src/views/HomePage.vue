<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Users as UsersIcon,
  Loader2 as Loader2Icon,
} from 'lucide-vue-next'

// 引入 Modal 與 Card 組件
import DiscussionCard from '@/components/cards/DiscussionCard.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import TravelerApplyModal from '@/components/modals/TravelerApplyModal.vue'
import TravelerApplicationsModal from '@/components/modals/TravelerApplicationsModal.vue'

import { useDiscussionsStore } from '@/stores/discussions'
import { useTravelersStore } from '@/stores/travelers'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { fetchPostById } from '@/api/discussions'
import { getTravelerById } from '@/api/travelers'

const discussionsStore = useDiscussionsStore()
const travelersStore = useTravelersStore()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const setAppLoading = (active) => {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active } }))
}

const currentUserUid = ref(null)
let likeSyncTimer = null

// --- Modal 狀態管理 ---
const isModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)

const isTravelerModalOpen = ref(false)
const isTravelerApplyModalOpen = ref(false)
const isTravelerApplicationsModalOpen = ref(false)
const selectedTraveler = ref(null)

// --- 討論區分頁狀態 (最新動態) ---
const discussionPage = ref(1)
const hasMoreDiscussions = ref(true)
const discussionTrigger = ref(null)
let discussionObserver = null

const loadMoreDiscussions = async (isLoadMore = false) => {
  if (discussionsStore.loading) return
  try {
    if (!isLoadMore) {
      discussionPage.value = 1
      hasMoreDiscussions.value = true
    }
    const params = { page: discussionPage.value, limit: 10 }
    const data = await discussionsStore.loadDiscussions(params, isLoadMore)
    if (data && data.posts) {
      if (data.posts.length < 10) hasMoreDiscussions.value = false
      else discussionPage.value = isLoadMore ? discussionPage.value + 1 : 2
    }
  } catch (error) {
    console.error('載入首頁討論失敗:', error)
  }
}

// --- 網址同步邏輯 (重要！) ---
// 監聽網址參數，處理深層連結開啟 Modal
watch(
  () => [route.query.postId, route.query.travelerId],
  async ([postId, travelerId]) => {
    if (postId) {
      setAppLoading(true)
      try {
        const post = await fetchPostById(postId)
        if (post) {
          selectedPost.value = post
          isModalOpen.value = true
        }
      } catch (e) {
        console.error(e)
      } finally {
        setAppLoading(false)
      }
    } else {
      isModalOpen.value = false
    }

    if (travelerId) {
      setAppLoading(true)
      try {
        const response = await getTravelerById(travelerId)
        if (response.success && response.data) {
          selectedTraveler.value = response.data
          isTravelerModalOpen.value = true
        }
      } catch (e) {
        console.error(e)
      } finally {
        setAppLoading(false)
      }
    } else {
      isTravelerModalOpen.value = false
    }
  },
  { immediate: true },
)

onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
})

onMounted(async () => {
  try {
    await travelersStore.loadRecommendations(false)
    await loadMoreDiscussions(false)

    discussionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreDiscussions.value && !discussionsStore.loading) {
          loadMoreDiscussions(true)
        }
      },
      { rootMargin: '150px' },
    )
    if (discussionTrigger.value) discussionObserver.observe(discussionTrigger.value)
  } catch (error) {}
})

onBeforeUnmount(() => {
  if (discussionObserver) discussionObserver.disconnect()
})

// --- 互動邏輯：更新 URL 而不跳轉頁面 ---
const openDiscussionDetailModal = (post, focusComment = false) => {
  router.push({ query: { ...route.query, postId: post.id } })
}

const closeDiscussionDetailModal = () => {
  const query = { ...route.query }
  delete query.postId
  router.push({ query })
}

const openTravelerDetailModal = (traveler) => {
  router.push({ query: { ...route.query, travelerId: traveler.id } })
}

const closeTravelerDetailModal = () => {
  const query = { ...route.query }
  delete query.travelerId
  router.push({ query })
}

const handleDiscussionEdit = (post) => {
  router.push({ name: 'discussion', query: { editPost: post.id } })
}

const handleTravelerEdit = (traveler) => {
  router.push({ name: 'travelers', query: { editTraveler: traveler.id } })
}

const handleTravelerOpenApply = (traveler) => {
  selectedTraveler.value = traveler
  isTravelerApplyModalOpen.value = true
}

const handleTravelerOpenApplications = (traveler) => {
  selectedTraveler.value = traveler
  isTravelerApplicationsModalOpen.value = true
}

const handleTravelerUpdated = () => {
  // 重新載入旅伴推薦列表
  travelersStore.loadRecommendations(false)
}

// --- 分享功能 ---
const isShareModalOpen = ref(false)
const shareLink = ref('')
const openShareModal = (postId) => {
  shareLink.value = `${window.location.origin}/discussion/${postId}`
  isShareModalOpen.value = true
}
const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

// --- 輔助函式 (略) ---
const scrollContainer = ref(null)
const scroll = (direction) => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' })
  }
}
const handleScroll = (e) => {
  const { scrollLeft, scrollWidth, clientWidth } = e.target
  if (
    scrollWidth - scrollLeft - clientWidth < 50 &&
    !travelersStore.loading &&
    travelersStore.hasMore
  ) {
    travelersStore.loadRecommendations(true)
  }
}
const getTagColor = (tagText) => {
  const colors = [
    'bg-tag-red',
    'bg-tag-orange',
    'bg-tag-amber',
    'bg-tag-olive',
    'bg-tag-lime',
    'bg-tag-green',
    'bg-tag-teal',
    'bg-tag-cyan',
    'bg-tag-sky',
    'bg-tag-blue',
    'bg-tag-indigo',
    'bg-tag-slate',
    'bg-tag-purple',
    'bg-tag-magenta',
    'bg-tag-rose',
    'bg-tag-wine',
  ]
  if (!tagText) return colors[0]
  let hash = 0
  for (let i = 0; i < tagText.length; i++) {
    hash = tagText.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
const getFirstTag = (item) => item.tag || (item.tags && item.tags[0]) || '旅遊'
</script>

<template>
  <div class="p-4">
    <div class="w-full min-w-0">
      <div
        class="my-4 p-4 relative group bg-white border-4 border-primary shadow-primary-tall rounded-xl"
      >
        <h2 class="inline-flex items-center text-2xl font-bold text-primary px-5 py-2">旅伴推薦</h2>

        <button
          class="absolute left-2 top-[60%] -translate-y-1/2 z-20 bg-white/90 p-2 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition duration-300"
          @click="scroll('left')"
        >
          <ChevronLeftIcon class="w-6 h-6" />
        </button>
        <button
          class="absolute right-2 top-[60%] -translate-y-1/2 z-20 bg-white/90 p-2 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition duration-300"
          @click="scroll('right')"
        >
          <ChevronRightIcon class="w-6 h-6" />
        </button>

        <div
          ref="scrollContainer"
          class="flex overflow-x-auto space-x-4 p-4 rounded-2xl custom-scrollbar snap-x snap-mandatory scroll-smooth shadow-sm ml-2"
          @scroll="handleScroll"
        >
          <div
            v-for="item in travelersStore.recommendations"
            :key="item.id"
            class="flex-shrink-0 w-[32%] min-w-56 h-48 rounded-2xl p-4 shadow-primary-tall cursor-pointer hover:-translate-y-1 transition relative overflow-hidden group/card snap-start"
            @click="openTravelerDetailModal(item)"
          >
            <img
              :src="item.image"
              class="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover/card:scale-110 opacity-90"
            />
            <div class="absolute inset-0 bg-primary/50"></div>
            <div class="relative z-10 h-full flex flex-col justify-between">
              <div class="flex justify-between items-start">
                <span
                  :class="[
                    getTagColor(getFirstTag(item)),
                    'text-white px-3 py-1.5 text-[10px] font-bold rounded -rotate-2 border border-white',
                  ]"
                  >{{ getFirstTag(item) }}</span
                >
                <div
                  class="flex items-center bg-primary-600 text-white px-3 py-1.5 text-[10px] font-bold rounded rotate-2 border border-white"
                >
                  <UsersIcon class="w-3 h-3 mr-1" />{{ item.people }}
                </div>
              </div>
              <div class="mt-auto text-center">
                <h3 class="font-bold text-sm text-white mb-2 line-clamp-2">{{ item.title }}</h3>
                <button
                  class="text-[10px] bg-white text-secondary px-3 py-1 rounded-full font-extrabold shadow-lg"
                >
                  探索行程
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="!travelersStore.hasMore && travelersStore.recommendations.length > 0"
            class="flex-shrink-0 w-8 h-48 flex items-center justify-center text-gray-300 text-xs font-bold tracking-widest"
            style="writing-mode: vertical-rl"
          >
            THE END
          </div>
        </div>
      </div>

      <div>
        <div class="my-6 bg-primary p-5 rounded-xl shadow-primary-tall">
          <h2 class="text-2xl font-bold text-white px-2 py-2">最新動態</h2>
        </div>

        <div
          v-if="discussionsStore.loading && !discussionsStore.discussions.length"
          class="space-y-6"
        >
          <div
            v-for="n in 3"
            :key="n"
            class="p-5 bg-white ring-2 ring-secondary-200 shadow-md rounded-2xl animate-pulse h-64"
          ></div>
        </div>

        <div v-else class="space-y-6">
          <DiscussionCard
            v-for="post in discussionsStore.discussions"
            :key="post.id"
            :post="post"
            @click="openDiscussionDetailModal(post, false)"
            @comment="openDiscussionDetailModal(post, true)"
            @share="openShareModal(post.id)"
            @edit="handleDiscussionEdit"
          />
          <div ref="discussionTrigger" class="py-10 text-center w-full">
            <div v-if="discussionsStore.loading" class="flex justify-center">
              <Loader2Icon class="w-8 h-8 text-primary animate-spin" />
            </div>
            <div
              v-else-if="!hasMoreDiscussions && discussionsStore.discussions.length > 0"
              class="text-gray-300 text-xs font-bold tracking-widest"
            >
              沒有更多動態了 🏝️
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <DiscussionDetailModal
    v-if="isModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
    @edit="handleDiscussionEdit"
  />

  <TravelerDetailModal
    v-if="isTravelerModalOpen"
    :traveler="selectedTraveler"
    @close="closeTravelerDetailModal"
    @traveler-updated="handleTravelerUpdated"
    @open-apply="handleTravelerOpenApply"
    @open-applications="handleTravelerOpenApplications"
    @edit="handleTravelerEdit"
  />

  <TravelerApplyModal
    v-if="isTravelerApplyModalOpen"
    :traveler="selectedTraveler"
    @close="isTravelerApplyModalOpen = false"
  />
  <TravelerApplicationsModal
    v-if="isTravelerApplicationsModalOpen"
    :traveler="selectedTraveler"
    @close="isTravelerApplicationsModalOpen = false"
    @application-updated="handleTravelerUpdated"
    @traveler-updated="handleTravelerUpdated"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
