<script setup>
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import DiscussionCard from '@/components/cards/DiscussionCard.vue' // ★ 引入卡片
import { useDiscussionsStore } from '@/stores/discussions'
import { useTravelersStore } from '@/stores/travelers'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Users as UsersIcon,
} from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const discussionsStore = useDiscussionsStore()
const travelersStore = useTravelersStore()
const userStore = useUserStore()

const currentUserUid = ref(null)

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  // 重新載入資料邏輯... (略，保持原樣即可，Card 會自己處理按讚狀態)
})

onMounted(async () => {
  try {
    await discussionsStore.loadDiscussions()
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
})

const scrollContainer = ref(null)
const isModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)

const scroll = (direction) => {
  if (scrollContainer.value) {
    const scrollAmount = 260
    scrollContainer.value.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }
}

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

// 根據標籤文字自動產生固定顏色
const getTagColor = (tagText) => {
  const colors = [
    'bg-red-500 border-red-400',
    'bg-orange-500 border-orange-400',
    'bg-amber-500 border-amber-400',
    'bg-green-500 border-green-400',
    'bg-emerald-500 border-emerald-400',
    'bg-teal-500 border-teal-400',
    'bg-cyan-500 border-cyan-400',
    'bg-sky-500 border-sky-400',
    'bg-blue-500 border-blue-400',
    'bg-indigo-500 border-indigo-400',
    'bg-violet-500 border-violet-400',
    'bg-fuchsia-500 border-fuchsia-400',
    'bg-pink-500 border-pink-400',
    'bg-rose-500 border-rose-400',
  ]

  if (!tagText) return colors[0]

  let hash = 0
  for (let i = 0; i < tagText.length; i++) {
    hash = tagText.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
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
        >
          <div
            v-for="item in travelersStore.recommendations"
            :key="item.id"
            class="flex-shrink-0 w-[32%] min-w-56 h-48 rounded-2xl p-4 shadow-primary-tall cursor-pointer hover:-translate-y-1 transition relative overflow-hidden group/card bg-gray-800 snap-start"
            @click="openDiscussionDetailModal(item, false)"
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
                    getTagColor(item.tag),
                    'text-white border-2 border-white/50 px-2 py-0.5 text-[10px] font-bold rounded -rotate-2 shadow-sm',
                  ]"
                >
                  {{ item.tag }}
                </span>

                <div
                  class="flex items-center bg-red-500 text-white border-2 border-white px-2 py-0.5 text-[10px] font-bold rounded rotate-2 shadow-sm"
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
        </div>
      </div>

      <div>
        <div class="my-6 bg-primary p-5 rounded-xl shadow-primary-tall">
          <h2 class="inline-flex items-center text-2xl font-bold text-white px-2 py-2 rounded-xl">
            最新動態
          </h2>
        </div>

        <div class="space-y-6">
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
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
