<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import {
  Plus as PlusIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'
import { useDiscussionsStore } from '@/stores/discussions'
import { useUserStore } from '@/stores/user'
import { toggleLike, getLikesInfo } from '@/api/likes'

// 引入組件
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import PostDetailModal from '@/components/modals/PostDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'

const discussionsStore = useDiscussionsStore()
const userStore = useUserStore()

// ✅ 修改：改從 Store 取得目前使用者 ID
const currentUserUid = computed(() => userStore.currentUser?.id)

// ✅ 修改：監聽 UserStore 的變化來更新按讚狀態
watch(currentUserUid, async (newUid, oldUid) => {
  if (newUid && newUid !== oldUid && discussionsStore.discussions.length > 0) {
    await Promise.all(
      discussionsStore.discussions.map(async (post) => {
        try {
          const info = await getLikesInfo(post.id, newUid)
          post.isLiked = info.isLiked
          post.likes = info.likesCount || post.likes
        } catch (error) {
          // 忽略錯誤
        }
      }),
    )
  } else if (!newUid) {
    discussionsStore.discussions.forEach((post) => {
      post.isLiked = false
    })
  }
})

// 狀態管理
const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)
const shareLink = ref('')

// 發文處理
const handleOpenPosting = () => {
  if (!userStore.isLoggedIn) {
    alert('請先登入後才能發文')
    return
  }
  isPostingModalOpen.value = true
}

const handleSubmitPost = async (postData) => {
  // 這裡的邏輯通常在 PostingChoiceModal 裡面處理，
  // 但如果 Modal 透過 emit 傳回來，可以在這裡呼叫 store
  try {
    // 簡單轉發給 store (假設 postData 已經整理好)
    // 實際專案中通常 Modal 會自己處理 API
    console.log('DiscussionPage 收到發文:', postData)
    // 關閉 Modal
    isPostingModalOpen.value = false
    // 重新載入列表
    await discussionsStore.loadDiscussions()
  } catch (error) {
    console.error('發文失敗:', error)
  }
}

// 貼文互動處理
const handleLike = async (post) => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  try {
    const result = await toggleLike(post.id, currentUserUid.value)
    post.isLiked = result.liked
    post.likes = result.likesCount
  } catch (error) {
    console.error('按讚失敗:', error)
  }
}

const openPostDetail = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closePostDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPost.value = null
  shouldScrollToComments.value = false
}

const openShareModal = (postId) => {
  shareLink.value = `${window.location.origin}/post/${postId}`
  isShareModalOpen.value = true
}

const closeShareModal = () => {
  isShareModalOpen.value = false
  shareLink.value = ''
}

// Helper: 轉換格式給 userStore 的收藏功能用
const getPostData = (post) => ({
  id: post.id,
  type: 'discussion',
  title: post.title,
  image: post.image,
  author: post.author,
  avatar: post.avatar,
  content: post.content,
  time: post.time,
  tags: post.tags,
  likes: post.likes,
  comments: post.comments,
})

// 初始化載入
onMounted(async () => {
  try {
    await discussionsStore.loadDiscussions()

    // 如果已登入，載入按讚狀態
    if (currentUserUid.value) {
      await Promise.all(
        discussionsStore.discussions.map(async (post) => {
          try {
            const info = await getLikesInfo(post.id, currentUserUid.value)
            post.isLiked = info.isLiked
          } catch (error) {
            // 忽略錯誤
          }
        }),
      )
    }
  } catch (error) {
    console.error('載入討論區失敗:', error)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#fffef7]">
    <div class="max-w-4xl mx-auto pt-6 px-4">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold text-amber-900 border-l-4 border-orange-500 pl-4">
          旅伴討論區
        </h1>
        <button
          @click="handleOpenPosting"
          class="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-bold shadow-lg transition transform hover:-translate-y-1"
        >
          <PlusIcon class="w-5 h-5" />
          <span>發布貼文</span>
        </button>
      </div>

      <div v-if="discussionsStore.loading" class="text-center py-20 text-gray-500">載入中...</div>

      <div
        v-else-if="discussionsStore.discussions.length === 0"
        class="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-gray-300"
      >
        <p class="text-gray-500 mb-4">目前還沒有討論串，來當第一個發起人吧！</p>
        <button @click="handleOpenPosting" class="text-orange-500 font-bold hover:underline">
          立即發文
        </button>
      </div>

      <div v-else class="space-y-6 pb-20">
        <div
          v-for="post in discussionsStore.discussions"
          :key="post.id"
          class="pixel-card p-5 bg-white"
        >
          <div class="flex items-center space-x-3 mb-4">
            <img
              :src="post.avatar"
              class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-gray-800">{{ post.author }}</span>
                <span
                  class="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full"
                >
                  {{ post.spiritAnimal }}
                </span>
              </div>
              <div class="text-xs text-gray-400">{{ post.time }}</div>
            </div>
          </div>

          <h3
            class="text-lg font-bold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600 transition"
            @click="openPostDetail(post)"
          >
            {{ post.title }}
          </h3>

          <p class="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {{ post.content }}
          </p>

          <div
            v-if="post.image"
            class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100 bg-gray-50"
          >
            <img
              :src="post.image"
              class="w-full h-full object-cover hover:scale-105 transition duration-500"
            />
          </div>

          <div
            v-if="post.tags && post.tags.length"
            class="flex flex-wrap gap-2 mb-4 border-b border-gray-100 pb-3"
          >
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-gray-400 text-sm pt-1">
            <button
              class="flex items-center space-x-1 transition mr-6 group"
              :class="post.isLiked ? 'text-red-500' : 'hover:text-red-500'"
              @click.stop="handleLike(post)"
            >
              <HeartIcon
                class="w-4 h-4 transition-transform group-active:scale-125"
                :class="{ 'fill-current': post.isLiked }"
              />
              <span>{{ post.likes || 0 }}</span>
            </button>

            <button
              class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6"
              @click="openPostDetail(post, true)"
            >
              <MessageCircleIcon class="w-4 h-4" />
              <span>{{ post.comments }}</span>
            </button>

            <button
              class="flex items-center space-x-1 transition mr-6 group"
              :class="
                userStore.isCollected(getPostData(post))
                  ? 'text-yellow-500'
                  : 'hover:text-yellow-600'
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
              class="ml-auto flex items-center space-x-1 hover:text-gray-600 transition"
              @click="openShareModal(post.id)"
            >
              <Repeat2Icon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <PostingChoiceModal
    v-if="isPostingModalOpen"
    @close="isPostingModalOpen = false"
    @submit-post="handleSubmitPost"
  />
  <PostDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closePostDetailModal"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>

<style scoped>
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}
</style>
