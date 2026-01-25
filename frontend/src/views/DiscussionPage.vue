<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue' // ★ 加入 onUnmounted
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
import { DISCUSSION_CATEGORY_OPTIONS } from '@/utils/filterOptions'
import { showError } from '@/utils/alert'

const discussionsStore = useDiscussionsStore()
const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()
const { drafts } = storeToRefs(myItineraryStore)

const currentUserUid = ref(null)

// --- 篩選狀態 ---
const filterOptions = ref(DISCUSSION_CATEGORY_OPTIONS)
const activeFilter = ref('全部')

// --- ★ 分頁狀態 ---
const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null) // 綁定到底部的 DOM 元素
let observer = null // IntersectionObserver 實例

// ★ 修改：載入文章 (支援分頁)
const loadDiscussionsData = async (isLoadMore = false) => {
  if (discussionsStore.loading) return // 防止重複觸發

  try {
    // 如果不是載入更多 (代表是切換分類或初始化)，重置狀態
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
    }

    const params = {
      page: currentPage.value,
      limit: 10,
    }

    if (activeFilter.value !== '全部') {
      params.category = activeFilter.value
    }

    // 呼叫 Store，傳入是否為 loadMore
    const data = await discussionsStore.loadDiscussions(params, isLoadMore)

    // 判斷是否還有下一頁
    if (data && data.posts) {
      if (data.posts.length < 10) {
        hasMore.value = false // 回傳少於 10 筆，代表沒資料了
      } else {
        // 準備下一頁
        if (isLoadMore) {
          currentPage.value++
        } else {
          // 如果是第一頁載入完，且數量足夠，下一頁就是 2
          currentPage.value = 2
        }
      }
    }
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
}

// 監聽分類切換 -> 重新載入 (重置為第一頁)
watch(activeFilter, () => {
  loadDiscussionsData(false)
})

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (previousUid !== currentUserUid.value && currentUserUid.value) {
    // 登入狀態改變時，重新載入第一頁
    loadDiscussionsData(false)
  }
})

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
  }

  // 1. 初始載入第一頁
  await loadDiscussionsData(false)

  // 2. ★ 設定 IntersectionObserver (無限捲動偵測)
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      // 如果看到底部元素 && 還有更多資料 && 目前沒有在載入中
      if (entry.isIntersecting && hasMore.value && !discussionsStore.loading) {
        console.log('👀 看到底部了，載入更多...')
        loadDiscussionsData(true) // 載入更多
      }
    },
    {
      rootMargin: '100px', // 提早 100px 觸發，體驗更流暢
    },
  )

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
  // 檢查是否有草稿需要打開
  tryOpenDraft()
  // 檢查是否需要開啟編輯
  tryOpenEditPost()
  // 檢查是否有分享連結需要開啟
  tryOpenSharedPost()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// 監聽路由變化
watch(
  () => route.query.openDraft,
  (newDraftId) => {
    if (newDraftId) {
      nextTick(() => {
        tryOpenDraft()
      })
    }
  },
)

// 監聽 query 參數變化，處理通知跳轉等情況
watch(() => route.query.postId, async (newPostId) => {
  if (newPostId) {
    await nextTick()
    tryOpenSharedPost()
  }
})

watch(() => route.query.editPost, (newPostId) => {
  if (newPostId) {
    nextTick(() => {
      tryOpenEditPost()
    })
  }
})

// 發文成功後的回調
const handlePostSuccess = async () => {
  isPostingModalOpen.value = false
  postToEdit.value = null
  // 發文成功後，重新整理列表 (回到第一頁)
  loadDiscussionsData(false)
}

// --- 模態框狀態管理 ---
const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const selectedDraft = ref(null) // 用於存儲要打開的草稿
const selectedPost = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)
const postToEdit = ref(null)
const setAppLoading = (active) => {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active } }))
}

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

const handleEditPost = (post) => {
  setAppLoading(true)
  postToEdit.value = post
  closeDiscussionDetailModal()
  isPostingModalOpen.value = true
  nextTick(() => setAppLoading(false))
}

const handleCardEdit = (post) => {
  setAppLoading(true)
  postToEdit.value = post
  isPostingModalOpen.value = true
  nextTick(() => setAppLoading(false))
}

const handleDetailEdit = (post) => {
  handleEditPost(post)
}

const handleCardDelete = (post) => {
  // 刪除已經在卡片組件中處理，這裡只需要重新整理列表
  loadDiscussionsData(false)
}

const handleDetailDeleted = () => {
  loadDiscussionsData(false)
}

const handlePostModalClose = () => {
  isPostingModalOpen.value = false
  postToEdit.value = null
  selectedDraft.value = null
}

const openShareModal = (postId) => {
  shareLink.value = `${window.location.origin}/discussion?postId=${postId}`
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

const tryOpenSharedPost = async () => {
  let postId = route.query.postId
  if (!postId && route.hash) {
    const match = route.hash.match(/^#post-(.+)$/)
    if (match?.[1]) {
      postId = match[1]
    }
  }
  if (!postId) return
  
  // 防止重複打開
  if (isDetailModalOpen.value && String(selectedPost.value?.id) === String(postId)) {
    return
  }
  
  // 檢查是否需要滾動到留言區
  const shouldScroll = route.query.scrollToComments === 'true'
  
  setAppLoading(true)
  try {
    const existing = discussionsStore.discussions.find((p) => String(p.id) === String(postId))
    let postToOpen = null
    
    if (existing) {
      postToOpen = existing
    } else {
      const { fetchPostById } = await import('@/api/discussions')
      try {
      postToOpen = await fetchPostById(postId)
      } catch (apiError) {
        console.error('API 獲取貼文失敗：', apiError)
        // 清除 URL 參數
        await router.replace({ path: '/discussion', query: {}, hash: '' })
        await showError('無法找到該貼文，可能已被刪除或不存在')
        return
      }
    }
    
    if (postToOpen) {
      // 先清除 URL 參數，避免重複觸發
      await router.replace({ path: '/discussion', query: {}, hash: '' })
      
      // 確保 URL 更新後再打開模態框
      await nextTick()
      
      openDiscussionDetailModal(postToOpen, shouldScroll)
    } else {
      // 清除 URL 參數
      await router.replace({ path: '/discussion', query: {}, hash: '' })
      await showError('無法找到該貼文')
    }
  } catch (error) {
    console.error('開啟分享貼文失敗：', error)
    // 清除 URL 參數
    await router.replace({ path: '/discussion', query: {}, hash: '' }).catch(() => {})
    await showError('開啟貼文時發生錯誤，請稍後再試')
  } finally {
    setAppLoading(false)
  }
}

const tryOpenEditPost = async () => {
  const postId = route.query.editPost
  if (!postId) return
  setAppLoading(true)
  try {
    const { fetchPostById } = await import('@/api/discussions')
    const post = await fetchPostById(postId)
    if (post) {
      postToEdit.value = post
      isPostingModalOpen.value = true
      router.replace({ path: '/discussion', query: {} })
    }
  } catch (error) {
    console.error('開啟編輯貼文失敗：', error)
  } finally {
    setAppLoading(false)
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
        <template v-if="discussionsStore.loading && discussionsStore.discussions.length === 0">
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
        </template>

        <template v-else-if="discussionsStore.discussions.length > 0">
          <DiscussionCard
            v-for="post in discussionsStore.discussions"
            :key="post.id"
            :post="post"
            @click="openDiscussionDetailModal(post, false)"
            @comment="openDiscussionDetailModal(post, true)"
            @share="openShareModal(post.id)"
            @like="handleCardLike"
            @edit="handleCardEdit"
            @delete="handleCardDelete"
          />
        </template>

        <div v-else-if="!discussionsStore.loading" class="text-center py-20 text-gray-500">
          目前沒有這個分類的討論文章，來發一篇吧！
        </div>

        <div ref="loadMoreTrigger" class="py-4 text-center">
          <div
            v-if="discussionsStore.loading"
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
          ></div>
          <div
            v-else-if="!hasMore && discussionsStore.discussions.length > 0"
            class="text-gray-400 text-sm"
          >
            已經到底囉，沒有更多貼文了 🏝️
          </div>
        </div>
      </div>
    </div>
  </div>

  <DiscussionPostModal
    v-if="isPostingModalOpen"
    :post-to-edit="postToEdit"
    @close="handlePostModalClose"
    :draft-data="selectedDraft"
    @success="handlePostSuccess"
  />

  <DiscussionDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
    @edit="handleDetailEdit"
    @deleted="handleDetailDeleted"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
