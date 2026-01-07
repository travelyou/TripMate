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

// ✅ 修改 1：改用 Store 取得目前使用者 ID (Supabase)
const currentUserUid = computed(() => userStore.currentUser?.id)

// ✅ 修改 2：監聽 currentUserUid 變化來更新按讚狀態
watch(currentUserUid, async (newUid, oldUid) => {
  if (newUid && newUid !== oldUid && discussionsStore.discussions.length > 0) {
    await Promise.all(
      discussionsStore.discussions.map(async (post) => {
        try {
          const info = await getLikesInfo(post.id, newUid)
          post.isLiked = info.isLiked
          post.likes = info.likesCount || post.likes
        } catch (error) {
          console.error(`載入貼文 ${post.id} 按讚狀態失敗：`, error)
        }
      }),
    )
  } else if (!newUid) {
    // 登出，清除按讚狀態
    discussionsStore.discussions.forEach((post) => {
      post.isLiked = false
    })
  }
})

// 在組件掛載時載入貼文
onMounted(async () => {
  try {
    await discussionsStore.loadDiscussions()
    // 載入每個貼文的按讚狀態
    if (currentUserUid.value) {
      await Promise.all(
        discussionsStore.discussions.map(async (post) => {
          try {
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

// 處理貼文按讚
const handlePostLike = async (post) => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }

  try {
    const result = await toggleLike(post.id, currentUserUid.value)
    post.isLiked = result.liked
    post.likes = result.likesCount
  } catch (error) {
    console.error('按讚操作失敗：', error)
    alert('按讚操作失敗，請稍後再試')
  }
}

// 處理貼文提交 (保留原本的圖片上傳邏輯)
const handleSubmitPost = async (postData) => {
  try {
    if (!userStore.isLoggedIn || !currentUserUid.value) {
      alert('請先登入後才能發布貼文')
      return
    }

    console.log('準備發布貼文，用戶 UID：', currentUserUid.value)

    // 如果有圖片，先上傳圖片到 Supabase Storage
    let imageUrls = []
    if (postData.imageFiles && postData.imageFiles.length > 0) {
      try {
        const { uploadMultipleImages } = await import('@/api/storage')
        imageUrls = await uploadMultipleImages(postData.imageFiles, 'posts')
      } catch (error) {
        console.error('圖片上傳失敗：', error)
        const shouldContinue = confirm(
          '圖片上傳失敗：' + error.message + '\n\n是否要繼續發布貼文（不帶圖片）？',
        )
        if (!shouldContinue) return
      }
    }

    // 準備提交的資料
    const submitData = {
      author_uid: currentUserUid.value,
      board: postData.board || 'general',
      title: postData.title,
      content: postData.content,
      tags: postData.tags || [],
      image_urls: imageUrls,
    }

    // 調用 API 創建貼文
    const newPost = await discussionsStore.addPost(submitData)

    console.log('貼文發布成功：', newPost)

    // 關閉模態框
    isPostingModalOpen.value = false

    // 重新載入貼文列表
    await discussionsStore.loadDiscussions()

    alert('貼文發布成功！')
  } catch (error) {
    console.error('發布貼文失敗：', error)
    alert(`發布貼文失敗：${error.message || '請稍後再試'}`)
  }
}

// --- 模態框狀態管理 ---
const isPostingModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isShareModalOpen = ref(false)

const selectedPost = ref(null)
const shareLink = ref('')
const shouldScrollToComments = ref(false)

// 這些是用來開啟 Modal 的函式 (綁定在 template 上的 @click)
const handleOpenPosting = () => {
  if (!userStore.isLoggedIn) {
    alert('請先登入後才能發文')
    return
  }
  isPostingModalOpen.value = true
}

const openPostDetailModal = (post, focusComment = false) => {
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

// --- 篩選/搜尋狀態 (保留你的分類功能！) ---
const filterOptions = ref(['全部', '有圖', '新貼文', '找旅伴', '找話題'])
const activeFilter = ref('全部')

// Helper
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
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-hidden">
    <div class="w-full">
      <div
        class="bg-pink-100 p-5 rounded-xl mb-6 mt-4 border-4 border-pink-300 shadow-[4px_4px_0px_0px_rgba(236,72,153,0.5)]"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-amber-900 flex items-center">
            <MessageCircleIcon class="w-7 h-7 mr-3 text-indigo-500 fill-indigo-100" />
            討論區
          </h1>
          <button
            class="bg-red-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 transition shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center border-4 border-gray-800"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            新增話題
          </button>
        </div>
      </div>

      <div class="mb-8 p-4 bg-white/90">
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]',
              activeFilter === filter
                ? 'bg-amber-400 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
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
          class="pixel-card p-5 bg-[#fffef7]"
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
              <div class="text-xs text-gray-400">{{ post.time }} • 討論區</div>
            </div>
          </div>

          <h3
            class="text-lg font-bold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600"
            @click="openPostDetailModal(post, false)"
          >
            {{ post.title }}
          </h3>

          <p class="text-gray-600 text-sm mb-4 line-clamp-4 leading-relaxed">
            {{ post.content }}
          </p>

          <div class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100">
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
              class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-200 transition"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-gray-400 text-sm pt-1">
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
              class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6"
              @click="openPostDetailModal(post, true)"
            >
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ post.comments }}</span>
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
