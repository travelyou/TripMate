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
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import ShareModal from '@/components/modals/ShareModal.vue'

const discussionsStore = useDiscussionsStore()
const userStore = useUserStore()

// 當前用戶 UID
const currentUserUid = ref(null)

// 監聽 Firebase 認證狀態
onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  console.log('認證狀態變化：', {
    previousUid,
    newUid: currentUserUid.value,
    userEmail: user?.email,
  })

  // 如果用戶登入狀態改變，重新載入按讚狀態
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
    // 如果登出，清除所有按讚狀態
    discussionsStore.discussions.forEach((post) => {
      post.isLiked = false
    })
  }
})

// 在組件掛載時載入貼文
onMounted(async () => {
  // 確保獲取當前用戶（如果已經登入）
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
    console.log('組件掛載時檢測到已登入用戶：', currentUserUid.value)
  }

  try {
    await discussionsStore.loadDiscussions()
    // 載入每個貼文的按讚狀態
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

// 處理貼文提交
const handleSubmitPost = async (postData) => {
  try {
    // 檢查用戶是否已登入（也檢查 Firebase Auth 的當前用戶）
    const firebaseUser = auth.currentUser
    const uid = currentUserUid.value || firebaseUser?.uid

    if (!uid) {
      alert('請先登入後才能發布貼文')
      console.error('發布貼文失敗：用戶未登入', {
        currentUserUid: currentUserUid.value,
        firebaseUser: firebaseUser?.uid,
      })
      return
    }

    console.log('準備發布貼文，用戶 UID：', uid)

    // 如果有圖片，先上傳圖片到 Supabase Storage
    let imageUrls = []
    if (postData.imageFiles && postData.imageFiles.length > 0) {
      try {
        const { uploadMultipleImages } = await import('@/api/storage')
        imageUrls = await uploadMultipleImages(postData.imageFiles, 'posts')
      } catch (error) {
        console.error('圖片上傳失敗：', error)
        // 詢問用戶是否要繼續發布（不帶圖片）
        const shouldContinue = confirm(
          '圖片上傳失敗：' + error.message + '\n\n是否要繼續發布貼文（不帶圖片）？',
        )
        if (!shouldContinue) {
          return
        }
        // 如果用戶選擇繼續，imageUrls 保持為空陣列
      }
    }

    // 準備提交的資料
    const submitData = {
      author_uid: uid,
      board: postData.board || 'general',
      title: postData.title,
      content: postData.content,
      tags: postData.tags || [],
      image_urls: imageUrls, // 使用上傳後的 URL
    }

    console.log('提交貼文資料：', {
      author_uid: submitData.author_uid,
      board: submitData.board,
      title: submitData.title?.substring(0, 50),
      contentLength: submitData.content?.length,
      tagsCount: submitData.tags?.length,
      imageUrlsCount: submitData.image_urls?.length,
    })

    // 調用 API 創建貼文
    const newPost = await discussionsStore.addPost(submitData)

    console.log('貼文發布成功：', newPost)

    // 關閉模態框
    isPostingModalOpen.value = false

    // 重新載入貼文列表以確保數據同步
    await discussionsStore.loadDiscussions()

    // 顯示成功訊息
    alert('貼文發布成功！')
  } catch (error) {
    console.error('發布貼文失敗：', error)
    console.error('錯誤詳情：', {
      message: error.message,
      stack: error.stack,
      currentUserUid: currentUserUid.value,
      firebaseUser: auth.currentUser?.uid,
    })
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
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div
        class="mb-6 mt-4"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-secondary flex items-center">
            <MessageCircleIcon class="w-7 h-7 mr-3 text-indigo-500 fill-white" />
            討論區
          </h1>
          <button
            class="bg-secondary-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 transition shadow-md flex items-center "
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            新增話題
          </button>
        </div>
      </div>

      <div class="mb-8 p-4 ">
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]',
              activeFilter === filter
                ? 'bg-primary text-gray-900'
                : 'bg-white text-gray-600 hover:bg-gray-200',
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
          class="p-5 bg-white ring-1 ring-gray-200 shadow-md rounded-2xl hover:shadow-lg transition cursor-pointer"
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
            @click="openDiscussionDetailModal(post, false)"
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
              @click="openDiscussionDetailModal(post, true)"
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
  <DiscussionDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeDiscussionDetailModal"
  />
  <ShareModal v-if="isShareModalOpen" :post-link="shareLink" @close="closeShareModal" />
</template>

<!-- 已移除 .pixel-card（已用 Tailwind 實作） -->
