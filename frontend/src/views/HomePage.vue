<script setup>
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import DiscussionCard from '@/components/cards/DiscussionCard.vue'
import { useDiscussionsStore } from '@/stores/discussions'
import { useTravelersStore } from '@/stores/travelers' // 引入 Store
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Users as UsersIcon,
  Loader2 as Loader2Icon, // [新增] 引入 Loading Icon
} from 'lucide-vue-next'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const discussionsStore = useDiscussionsStore()
const travelersStore = useTravelersStore() // 使用 Store
useUserStore()
const router = useRouter()

const currentUserUid = ref(null)
let likeSyncTimer = null

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const scheduleLikesSync = (posts, uid) => {
  if (!uid || !Array.isArray(posts) || posts.length === 0) return
  if (likeSyncTimer) clearTimeout(likeSyncTimer)

  likeSyncTimer = setTimeout(async () => {
    for (const post of posts) {
      try {
        const { getLikesInfo } = await import('@/api/likes')
        const info = await getLikesInfo(post.id, uid)
        post.isLiked = info.isLiked
        post.likes = info.likesCount ?? post.likes
        await sleep(120)
      } catch (error) {
        // Error loading likes
      }
    }
  }, 800)
}

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (previousUid !== currentUserUid.value && currentUserUid.value) {
    scheduleLikesSync(discussionsStore.discussions, currentUserUid.value)
  } else if (!currentUserUid.value) {
    discussionsStore.discussions?.forEach((post) => {
      post.isLiked = false
    })
  }
})

onMounted(async () => {
  try {
    // [修改] 這裡只做初始載入 (isLoadMore = false)
    await Promise.all([
      discussionsStore.loadDiscussions(),
      travelersStore.loadRecommendations(false),
    ])

    if (currentUserUid.value) {
      scheduleLikesSync(discussionsStore.discussions, currentUserUid.value)
    }
  } catch (error) {
    // Error loading posts
  }
})

onBeforeUnmount(() => {
  if (likeSyncTimer) clearTimeout(likeSyncTimer)
})

const scrollContainer = ref(null)

// --- 討論區 Modal 狀態 ---
const isModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)

// --- 旅伴 Modal 狀態 ---
const isTravelerModalOpen = ref(false)
const selectedTraveler = ref(null)

const scroll = (direction) => {
  if (scrollContainer.value) {
    const scrollAmount = 260
    scrollContainer.value.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }
}

// [新增] 監聽水平捲動事件
const handleScroll = (e) => {
  const { scrollLeft, scrollWidth, clientWidth } = e.target
  // 當捲動到距離右邊剩 50px 時，且不是正在載入中，且還有更多資料
  if (
    scrollWidth - scrollLeft - clientWidth < 50 &&
    !travelersStore.loading &&
    travelersStore.hasMore
  ) {
    travelersStore.loadRecommendations(true) // true 代表載入更多
  }
}

// 開啟討論區詳情
const openDiscussionDetailModal = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isModalOpen.value = true
}

const closeDiscussionDetailModal = () => {
  isModalOpen.value = false
  selectedPost.value = null
  shouldScrollToComments.value = false
}

// 開啟旅伴詳情
const openTravelerDetailModal = (traveler) => {
  selectedTraveler.value = traveler
  isTravelerModalOpen.value = true
}

const closeTravelerDetailModal = () => {
  isTravelerModalOpen.value = false
  selectedTraveler.value = null
}

const isShareModalOpen = ref(false)
const shareLink = ref('')

const openShareModal = (postId) => {
  shareLink.value = `https://tripmate.com/post/${postId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

const getTagColor = (tagText) => {
  const colors = [
    'bg-[#c75a5a]',
    'bg-[#c77a4a]',
    'bg-[#c7943f]',
    'bg-[#b9a348]',
    'bg-[#8aa651]',
    'bg-[#5f9a63]',
    'bg-[#4f9b85]',
    'bg-[#4f9a9f]',
    'bg-[#4f93b2]',
    'bg-[#4e85b8]',
    'bg-[#5573b4]',
    'bg-[#6a66b0]',
    'bg-[#7d60a6]',
    'bg-[#9a5d9a]',
    'bg-[#a85a84]',
    'bg-[#b0586a]',
  ]

  if (!tagText) return colors[0]

  let hash = 0
  for (let i = 0; i < tagText.length; i++) {
    hash = tagText.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

const getFirstTag = (item) => {
  if (item.tag) return item.tag
  if (item.tags && item.tags.length > 0) return item.tags[0]
  return '旅遊'
}
</script>

<template>
  <div class="p-4">
    <div class="w-full min-w-0">
      <div
        class="my-4 p-4 relative group bg-white border-4 border-primary shadow-primary-tall rounded-xl"
      >
        <div>
          <h2 class="inline-flex items-center text-2xl font-bold text-primary px-5 py-2 rounded-xl">
            旅伴推薦
          </h2>
        </div>

        <button
          class="absolute left-2 top-[60%] -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-amber-900 p-2 rounded-full shadow-xl backdrop-blur-sm transition hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300"
          @click="scroll('left')"
        >
          <ChevronLeftIcon class="w-6 h-6" />
        </button>

        <button
          class="absolute right-2 top-[60%] -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-amber-900 p-2 rounded-full shadow-xl backdrop-blur-sm transition hover:scale-110 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300"
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
            class="flex-shrink-0 w-[32%] min-w-56 h-48 rounded-2xl p-4 shadow-primary-tall cursor-pointer hover:-translate-y-1 transition relative overflow-hidden group/card bg-gray-800 snap-start"
            @click="openTravelerDetailModal(item)"
          >
            <img
              :src="item.image"
              class="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover/card:scale-110 opacity-90"
            />
            <div
              class="absolute inset-0 bg-primary/50 group-hover/card:bg-primary/60 transition"
            ></div>

            <div class="relative z-10 h-full flex flex-col justify-between">
              <div class="flex justify-between items-start">
                <span
                  :class="[
                    getTagColor(getFirstTag(item)),
                    'text-white px-3 py-1.5 text-[10px] font-bold rounded -rotate-2 shadow-sm border border-white',
                  ]"
                >
                  {{ getFirstTag(item) }}
                </span>

                <div
                  class="flex items-center bg-primary-600 text-white px-3 py-1.5 text-[10px] font-bold rounded rotate-2 shadow-sm border border-white"
                >
                  <UsersIcon class="w-3 h-3 mr-1" />
                  {{ item.people }}
                </div>
              </div>

              <div class="mt-auto text-center">
                <h3
                  class="font-bold text-sm text-white leading-snug mb-2 line-clamp-2"
                  style="text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8)"
                >
                  {{ item.title }}
                </h3>
                <button
                  class="text-[10px] bg-white text-secondary px-3 py-1 rounded-full font-extrabold hover:bg-gray-100 shadow-lg transition"
                >
                  探索行程
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="travelersStore.loading && travelersStore.hasMore"
            class="flex-shrink-0 w-[10%] min-w-24 h-48 rounded-2xl flex items-center justify-center snap-start"
          >
            <Loader2Icon class="w-8 h-8 text-primary animate-spin" />
          </div>

          <div
            v-if="!travelersStore.hasMore && travelersStore.recommendations.length > 0"
            class="flex-shrink-0 w-8 h-48 flex items-center justify-center text-gray-300 writing-vertical-lr text-xs font-bold tracking-widest"
            style="writing-mode: vertical-rl"
          >
            THE END
          </div>
        </div>
      </div>

      <div>
        <div class="my-6 bg-primary p-5 rounded-xl shadow-primary-tall">
          <h2 class="inline-flex items-center text-2xl font-bold text-white px-2 py-2 rounded-xl">
            最新動態
          </h2>
        </div>

        <div
          v-if="discussionsStore.loading && !discussionsStore.discussions.length"
          class="space-y-6"
        >
          <div
            v-for="n in 3"
            :key="`skeleton-${n}`"
            class="p-5 bg-white ring-2 ring-secondary-200 shadow-md rounded-2xl animate-pulse"
          >
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-gray-200"></div>
              <div class="space-y-2">
                <div class="h-4 w-32 bg-gray-200 rounded"></div>
                <div class="h-3 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div class="h-5 w-2/3 bg-gray-200 rounded mb-3"></div>
            <div class="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div class="h-4 w-5/6 bg-gray-200 rounded mb-4"></div>
            <div class="w-full h-64 rounded-xl bg-gray-200"></div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <DiscussionCard
            v-for="post in discussionsStore.discussions"
            :key="post.id"
            :post="post"
            @click="openDiscussionDetailModal(post, false)"
            @comment="openDiscussionDetailModal(post, true)"
            @share="openShareModal(post.id)"
          />
        </div>
      </div>
    </div>
  </div>

  <DiscussionDetailModal
    v-if="isModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
  />

  <TravelerDetailModal
    v-if="isTravelerModalOpen"
    :traveler="selectedTraveler"
    @close="closeTravelerDetailModal"
  />

  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
