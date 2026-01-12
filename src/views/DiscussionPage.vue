<script setup>
import { ref, onMounted } from 'vue'
import {
  Plus as PlusIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'
import { useDiscussionsStore } from '@/stores/discussions'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { toggleLike } from '@/api/likes'

// 引入組件
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'

const discussionsStore = useDiscussionsStore()
const userStore = useUserStore()

const currentUserUid = ref(null)

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (
    previousUid !== currentUserUid.value &&
    currentUserUid.value &&
    discussionsStore.discussions.length > 0
  ) {
    await Promise.all(
      discussionsStore.discussions.map(async (post) => {
        try {
          const { getLikesInfo } = await import('@/api/likes')
          const info = await getLikesInfo(post.id, currentUserUid.value)
          post.isLiked = info.isLiked
          post.likes = info.likesCount || post.likes
        } catch (error) {
          console.error(`載入貼文 ${post.id} 按讚狀態失敗：`, error)
        }
      }),
    )
  } else if (!currentUserUid.value) {
    discussionsStore.discussions.forEach((post) => {
      post.isLiked = false
    })
  }
})

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
  }

  try {
    await discussionsStore.loadDiscussions()
    if (currentUserUid.value) {
      await Promise.all(
        discussionsStore.discussions.map(async (post) => {
          try {
            const { getLikesInfo } = await import('@/api/likes')
            const info = await getLikesInfo(post.id, currentUserUid.value)
            post.isLiked = info.isLiked
            post.likes = info.likesCount || post.likes
          } catch (error) {
            console.error(`載入貼文 ${post.id} 按讚狀態失敗：`, error)
          }
        }),
      )
    }
  } catch (error) {
    console.error('載入貼文失敗：', error)
  }
})

const handlePostLike = async (post) => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }

  try {
    const result = await toggleLike(post.id, currentUserUid.value, 'discussion')
    post.isLiked = result.liked
    post.likes = result.likesCount
  } catch (error) {
    console.error('按讚操作失敗：', error)
    alert('按讚操作失敗，請稍後再試')
  }
}

// 發文成功後的回調
const handlePostSuccess = async () => {
  isPostingModalOpen.value = false
  await discussionsStore.loadDiscussions()
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

// --- 篩選/搜尋狀態 ---
const filterOptions = ref(['全部', '有圖', '新貼文', '找旅伴', '找話題'])
const activeFilter = ref('全部')

// Helper
const getPostData = (post) => ({
  id: post.id,
  type: 'discussion',
  title: post.title,
  image: post.banner,
  author: post.author,
  avatar: post.avatar,
  content: post.content,
  time: post.time,
  tags: post.tags,
  likes: post.likes,
  comments: post.comments,
})
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div
        class="mb-6 mt-4 bg-primary rounded-xl p-5 border border-secondary-100 shadow-primary-tall"
      >
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
        <div
          v-for="post in discussionsStore.discussions"
          :key="post.id"
          class="p-5 bg-white ring-1 ring-secondary-200 shadow-md rounded-2xl hover:shadow-lg transition cursor-pointer"
        >
          <div class="flex items-center space-x-3 mb-4">
            <img
              :src="post.avatar"
              class="w-10 h-10 rounded-full object-cover border-2 border-secondary-200"
            />
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-secondary-800">{{ post.author }}</span>
                <span
                  class="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full"
                >
                  {{ post.spiritAnimal }}
                </span>
              </div>
              <div class="text-xs text-secondary-400">{{ post.time }} • 討論區</div>
            </div>
          </div>

          <h3
            class="text-lg font-bold text-secondary-900 mb-2 cursor-pointer hover:text-primary-600"
            @click="openDiscussionDetailModal(post, false)"
          >
            {{ post.title }}
          </h3>

          <p class="text-secondary-600 text-sm mb-4 line-clamp-4 leading-relaxed">
            {{ post.content }}
          </p>

          <!-- 顯示封面圖（banner） -->
          <div
            v-if="post.banner"
            class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-primary-100"
          >
            <img
              :src="post.banner"
              class="w-full h-full object-cover hover:scale-105 transition duration-500"
              alt="討論封面"
            />
          </div>

          <!-- 顯示內文圖片（image_urls），最多顯示 4 張 -->
          <div
            v-if="post.image_urls && post.image_urls.length > 0"
            class="grid gap-2 mb-4"
            :class="{
              'grid-cols-1': post.image_urls.length === 1,
              'grid-cols-2': post.image_urls.length >= 2,
            }"
          >
            <img
              v-for="(url, idx) in post.image_urls.slice(0, 4)"
              :key="idx"
              :src="url"
              class="w-full h-32 object-cover rounded-lg hover:opacity-90 transition"
              :alt="`圖片 ${idx + 1}`"
            />
          </div>

          <div
            v-if="post.tags && post.tags.length"
            class="flex flex-wrap gap-2 mb-4 border-b border-secondary-100 pb-3"
          >
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full cursor-pointer hover:bg-primary-200 transition"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-secondary-400 text-sm pt-1">
            <button
              class="flex items-center space-x-1 transition mr-6 group"
              :class="post.isLiked ? 'text-red-500' : 'hover:text-red-500'"
              @click.stop="handlePostLike(post)"
            >
              <HeartIcon
                class="w-4 h-4 transition-transform group-active:scale-125"
                :class="{ 'fill-current': post.isLiked }"
              />
              <span>{{ post.likes || 0 }}</span>
            </button>

            <button
              class="flex items-center space-x-1 hover:text-primary-600 transition mr-6"
              @click="openDiscussionDetailModal(post, true)"
            >
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ post.comments }}</span>
            </button>

            <button
              class="flex items-center space-x-1 transition mr-6 group"
              :class="
                userStore.isCollected(getPostData(post))
                  ? 'text-primary-500'
                  : 'hover:text-primary-600'
              "
              @click.stop="
                userStore.isCollected(getPostData(post))
                  ? userStore.removeFromCollection(getPostData(post))
                  : userStore.openCollectionModal(getPostData(post))
              "
            >
              <BookmarkIcon
                class="w-4 h-4 transition-transform group-active:scale-125"
                :class="{ 'fill-current': userStore.isCollected(getPostData(post)) }"
              />
            </button>

            <button
              class="ml-auto flex items-center space-x-1 hover:text-secondary-600 transition"
              @click="openShareModal(post.id)"
            >
              <Repeat2Icon class="w-4 h-4" />
            </button>
          </div>
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
