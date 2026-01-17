<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus as PlusIcon, MessageCircle as MessageCircleIcon } from 'lucide-vue-next'
import { useDiscussionsStore } from '@/stores/discussions'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { storeToRefs } from 'pinia'

// 引入組件
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'
import DiscussionCard from '@/components/cards/DiscussionCard.vue'

const discussionsStore = useDiscussionsStore()
const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()
const { drafts } = storeToRefs(myItineraryStore)

const currentUserUid = ref(null)

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (
    previousUid !== currentUserUid.value &&
    currentUserUid.value &&
    discussionsStore.discussions.length > 0
  ) {
    await discussionsStore.loadDiscussions()
  }
})

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
  }
  try {
    await discussionsStore.loadDiscussions()
    // 檢查是否有草稿需要打開
    tryOpenDraft()
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
})

// 監聽路由變化
watch(() => route.query.openDraft, (newDraftId) => {
  if (newDraftId) {
    nextTick(() => {
      tryOpenDraft()
    })
  }
})

// 發文成功後的回調
const handlePostSuccess = async () => {
  isPostingModalOpen.value = false
  await discussionsStore.loadDiscussions()
}

// --- 模態框狀態管理 ---
const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const selectedDraft = ref(null) // 用於存儲要打開的草稿

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

// --- 篩選/搜尋狀態 ---
const filterOptions = ref([
  '全部',
  '國內旅遊',
  '國外旅遊',
  '攝影交流',
  '美食分享',
  '住宿推薦',
  '交通機票',
  '其他',
])
const activeFilter = ref('全部')

// 開啟草稿編輯
const openDraft = (draft) => {
  if (draft.type === 'discussion' && draft.data) {
    // 設置草稿數據並打開 Modal
    selectedDraft.value = draft
    isPostingModalOpen.value = true
  }
}

// 嘗試打開草稿的函數
const tryOpenDraft = () => {
  const draftId = route.query.openDraft
  if (draftId) {
    const draft = drafts.value.find((d) => String(d.id) === String(draftId))
    if (draft && draft.type === 'discussion') {
      nextTick(() => {
        openDraft(draft)
        // 清除查詢參數
        router.replace({ path: '/discussion', query: {} })
      })
    }
  }
}

const filteredDiscussions = computed(() => {
  // 如果選的是「全部」，就回傳所有文章
  if (activeFilter.value === '全部') {
    return discussionsStore.discussions
  }
  // 否則只回傳 category 等於目前篩選標籤的文章
  return discussionsStore.discussions.filter((post) => post.category === activeFilter.value)
})
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
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-secondary-800 shadow-primary-solid',
              activeFilter === filter
                ? 'bg-primary text-secondary-50'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="space-y-6">
        <DiscussionCard
          v-for="post in filteredDiscussions"
          :key="post.id"
          :post="post"
          @click="openDiscussionDetailModal(post, false)"
          @comment="openDiscussionDetailModal(post, true)"
          @share="openShareModal(post.id)"
          @like="handleCardLike"
        />

        <div v-if="filteredDiscussions.length === 0" class="text-center text-gray-500 py-10">
          目前這個分類還沒有文章喔，來發一篇吧！
        </div>
      </div>
    </div>
  </div>

  <DiscussionPostModal
    v-if="isPostingModalOpen"
    :draft-data="selectedDraft"
    @close="isPostingModalOpen = false; selectedDraft = null"
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
