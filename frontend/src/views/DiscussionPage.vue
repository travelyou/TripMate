<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus as PlusIcon, MessageCircle as MessageCircleIcon } from 'lucide-vue-next'
import { useDiscussionsStore } from '@/stores/discussions'
import { useMyItineraryStore } from '@/stores/myItinerary'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { storeToRefs } from 'pinia'
import { fetchPostById } from '@/api/discussions'

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

const filterOptions = ref(DISCUSSION_CATEGORY_OPTIONS)
const activeFilter = ref('全部')

const currentPage = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref(null)
let observer = null

const loadDiscussionsData = async (isLoadMore = false) => {
  if (discussionsStore.loading) return

  try {
    if (route.params.id && !isLoadMore) {
      setAppLoading(true)
      const post = await fetchPostById(route.params.id)
      if (post) {
        discussionsStore.discussions = [post]
        hasMore.value = false
        selectedPost.value = post
        isDetailModalOpen.value = true

        const shouldScroll = route.query.scrollTo === 'comments'
        if (shouldScroll) {
          shouldScrollToComments.value = true
        }
      } else {
        discussionsStore.discussions = []
        hasMore.value = false
      }
      setAppLoading(false)
      return
    }
    if (!isLoadMore) {
      currentPage.value = 1
      hasMore.value = true
    }

    const params = {
      page: currentPage.value,
      limit: 10,
      category: activeFilter.value !== '全部' ? activeFilter.value : null,
    }

    const data = await discussionsStore.loadDiscussions(params, isLoadMore)

    if (data && data.posts) {
      if (data.posts.length < 10) {
        hasMore.value = false
      } else {
        currentPage.value = isLoadMore ? currentPage.value + 1 : 2
      }
    }
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
}

watch(
  () => route.params.id,
  () => {
    loadDiscussionsData(false)
  },
  { immediate: true },
)

watch(activeFilter, () => {
  if (route.params.id) {
    router.push('/discussion')
  } else {
    loadDiscussionsData(false)
  }
})

onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
  if (currentUserUid.value) loadDiscussionsData(false)
})

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) currentUserUid.value = firebaseUser.uid

  await loadDiscussionsData(false)

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !discussionsStore.loading) {
        loadDiscussionsData(true)
      }
    },
    { rootMargin: '100px' },
  )

  if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value)

  tryOpenDraft()
  tryOpenEditPost()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

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

const handlePostSuccess = async () => {
  isPostingModalOpen.value = false
  postToEdit.value = null
  loadDiscussionsData(false)
}

const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const selectedDraft = ref(null)
const selectedPost = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)
const postToEdit = ref(null)

const setAppLoading = (active) => {
  window.dispatchEvent(new CustomEvent('app-loading', { detail: { active } }))
}

const openDiscussionDetailModal = (post, focusComment = false) => {
  router.push({
    path: `/discussion/${post.id}`,
    query: focusComment ? { scrollTo: 'comments' } : {},
  })
}

const closeDiscussionDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPost.value = null
  router.push('/discussion')
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

const handleDetailDeleted = () => loadDiscussionsData(false)
const handlePostModalClose = () => {
  isPostingModalOpen.value = false
  postToEdit.value = null
}

const openShareModal = (postId) => {
  shareLink.value = `${window.location.origin}/discussion/${postId}`
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

const openDraft = (draft) => {
  if (draft.type === 'discussion' && draft.data) {
    selectedDraft.value = draft
    isPostingModalOpen.value = true
  }
}

const tryOpenDraft = () => {
  const draftId = route.query.openDraft
  if (draftId) {
    const draft = drafts.value.find((d) => String(d.id) === String(draftId))
    if (draft && draft.type === 'discussion') {
      nextTick(() => {
        openDraft(draft)
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
  
  if (isDetailModalOpen.value && String(selectedPost.value?.id) === String(postId)) {
    return
  }
  
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
        await router.replace({ path: '/discussion', query: {}, hash: '' })
        await showError('無法找到該貼文，可能已被刪除或不存在')
        return
      }
    }
    
    if (postToOpen) {
      await router.replace({ path: '/discussion', query: {}, hash: '' })
      await nextTick()
      openDiscussionDetailModal(postToOpen, shouldScroll)
    } else {
      await router.replace({ path: '/discussion', query: {}, hash: '' })
      await showError('無法找到該貼文')
    }
  } catch (error) {
    console.error('開啟分享貼文失敗：', error)
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
            @delete="handlePostModalClose"
          />
        </template>

        <div v-else-if="!discussionsStore.loading" class="text-center py-20 text-gray-500">
          目前沒有任何討論文章，來發一篇吧！
        </div>

        <div ref="loadMoreTrigger" class="py-4 text-center">
          <div
            v-if="discussionsStore.loading"
            class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
          ></div>
          <div
            v-else-if="!hasMore && discussionsStore.discussions.length > 0 && !route.params.id"
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
    :draft-data="selectedDraft"
    @close="handlePostModalClose"
    @success="handlePostSuccess"
  />
  <DiscussionDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
    @edit="handleEditPost"
    @deleted="handleDetailDeleted"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>
