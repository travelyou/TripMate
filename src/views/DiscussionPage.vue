<script setup>
import { ref, onMounted, watch } from 'vue'
import { Plus as PlusIcon, MessageCircle as MessageCircleIcon } from 'lucide-vue-next'
import { useDiscussionsStore } from '@/stores/discussions'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

// 引入組件
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import DiscussionCard from '@/components/cards/DiscussionCard.vue'

const discussionsStore = useDiscussionsStore()
const userStore = useUserStore()

const currentUserUid = ref(null)

// --- 篩選狀態 ---
// ★ 修改：分類選項需與需求保持一致
const filterOptions = ref([
  '全部',
  '國內旅遊',
  '亞洲旅遊',
  '歐美紐澳',
  '攝影愛好',
  '交通建議',
  '美食分享',
  '住宿推薦',
  '行程請益',
  '其他',
])
const activeFilter = ref('全部')

// 載入文章 (帶入分類參數)
const loadDiscussionsData = async () => {
  try {
    const params = {}
    // 如果不是全部，就傳 category 給後端
    if (activeFilter.value !== '全部') {
      params.category = activeFilter.value
    }
    await discussionsStore.loadDiscussions(params)
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
}

// 監聽分類切換 -> 重新載入資料
watch(activeFilter, () => {
  loadDiscussionsData()
})

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (previousUid !== currentUserUid.value && currentUserUid.value) {
    loadDiscussionsData()
  }
})

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
  }
  // 初始載入
  loadDiscussionsData()
})

// 發文成功後的回調
const handlePostSuccess = async () => {
  isPostingModalOpen.value = false
  loadDiscussionsData()
}

// --- 模態框狀態管理 ---
const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)

const selectedPost = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)

const openDiscussionDetailModal = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closeDiscussionDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPost.value = null
  shouldScrollToComments.value = false
}

const openShareModal = (postId) => {
  shareLink.value = `/post/${postId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

const handleCardLike = (updatedPostInfo) => {
  const post = discussionsStore.discussions.find((p) => p.id === updatedPostInfo.id)
  if (post) {
    post.isLiked = updatedPostInfo.isLiked
    post.likes = updatedPostInfo.likes
  }
}
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div class="mb-6 mt-4 bg-primary rounded-xl p-5 shadow-primary-tall">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-white flex items-center">
            <MessageCircleIcon class="w-7 h-7 mr-3 text-white" />
            討論區
          </h1>
          <button
            class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-gray-200 transition shadow-md flex items-center"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            新增話題
          </button>
        </div>
      </div>

      <div
        class="p-4 bg-white mb-6 space-y-4 border-4 border-primary shadow-primary-tall rounded-xl"
      >
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="text-gray-400 font-bold self-center mr-2">分類：</span>
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2',
              activeFilter === filter
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="space-y-6">
        <div v-if="discussionsStore.isLoading" class="text-center py-20">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
          ></div>
        </div>

        <template v-else-if="discussionsStore.discussions.length > 0">
          <DiscussionCard
            v-for="post in discussionsStore.discussions"
            :key="post.id"
            :post="post"
            @click="openDiscussionDetailModal(post, false)"
            @comment="openDiscussionDetailModal(post, true)"
            @share="openShareModal(post.id)"
            @like="handleCardLike"
          />
        </template>

        <div v-else class="text-center py-20 text-gray-500">
          目前沒有這個分類的討論文章，來發一篇吧！
        </div>
      </div>
    </div>
  </div>

  <DiscussionPostModal
    v-if="isPostingModalOpen"
    @close="isPostingModalOpen = false"
    @success="handlePostSuccess"
  />

  <DiscussionDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
