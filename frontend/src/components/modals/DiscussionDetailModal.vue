<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon,
  FileText as FileTextIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { createComment } from '@/api/comments'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { formatTime } from '@/utils/time'
import { fetchPostById } from '@/api/discussions'

const userStore = useUserStore()
const router = useRouter()

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
  scrollToComments: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(0)
const newComment = ref('')
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const contentContainerRef = ref(null)
const activeSection = ref('content')
const localComments = ref([])
const localPostData = ref({ ...props.post })

const handleAuthorClick = () => {
  const authorUid = props.post.author_uid || props.post.author?.uid
  if (authorUid) {
    router.push(`/profile/${authorUid}`)
  }
}
const normalizedComments = computed(() => {
  if (localComments.value.length > 0) return localComments.value
  // 嘗試從多個可能的欄位獲取留言
  return localPostData.value.comments ||
         localPostData.value.commentsData ||
         []
})

const totalCommentCount = computed(() => {
  const comments = normalizedComments.value
  if (!comments.length) return 0
  let total = comments.length
  comments.forEach((comment) => {
    if (comment.replies) total += comment.replies.length
  })
  return total
})

// --- HTML 內容解碼處理 ---
const processedContent = computed(() => {
  const content = localPostData.value.content || ''

  try {
    const txt = document.createElement('textarea')
    txt.innerHTML = content
    return txt.value
  } catch (e) {
    console.error('HTML Decode Error', e)
    return content
  }
})

const scrollToTop = () => {
  activeSection.value = 'content'
  contentContainerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

// 滑動到留言區
const scrollToCommentsSection = () => {
  activeSection.value = 'comments'
  commentsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 初始化載入按讚資訊
const loadLikesInfo = async () => {
  if (!props.post?.id || !currentUserUid.value) return
  try {
    const info = await getLikesInfo(props.post.id, currentUserUid.value, 'discussion')
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch {
    // Error handling
  }
}

// 載入完整的貼文詳情和留言
const loadFullPostDetails = async () => {
  if (!props.post?.id) return

  try {
    const postData = await fetchPostById(props.post.id)

    // 更新本地資料
    localPostData.value = {
      ...localPostData.value,
      ...postData,
      // 確保 commentsData 被正確處理
      comments: postData.commentsData || postData.comments || [],
      commentsData: postData.commentsData || postData.comments || [],
    }

    // 格式化留言資料
    if (localPostData.value.commentsData && Array.isArray(localPostData.value.commentsData)) {
      localComments.value = localPostData.value.commentsData.map(comment => {
        const formatTime = (timestamp) => {
          if (!timestamp) return '剛剛'
          const now = new Date()
          const postTime = new Date(timestamp)
          const diffMs = now - postTime
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffDays = Math.floor(diffHours / 24)
          if (diffDays > 0) return `${diffDays}天前`
          if (diffHours > 0) return `${diffHours}小時前`
          const diffMins = Math.floor(diffMs / (1000 * 60))
          if (diffMins > 0) return `${diffMins}分鐘前`
          return '剛剛'
        }

        return {
          id: comment.id,
          author: comment.author_nickname || comment.author_name || comment.author_uid || '匿名用戶',
          author_uid: comment.author_uid,
          avatar: comment.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_uid}`,
          content: comment.content,
          time: comment.created_at || comment.timestamp,
          likes: comment.likes || 0,
          replies: comment.replies || [],
        }
      })
    } else {
      localComments.value = []
    }

    // 更新按讚數
    if (postData.likes_count !== undefined) {
      likesCount.value = postData.likes_count
    }
  } catch (error) {
    console.error('載入貼文詳情失敗：', error)
  }
}

const handleLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  try {
    const result = await toggleLike(props.post.id, currentUserUid.value, 'discussion')
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error('按讚操作失敗：', error)
    alert('按讚操作失敗，請稍後再試')
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  if (!currentUserUid.value) {
    alert('請先登入後才能留言')
    return
  }

  const content = newComment.value.trim()
  try {
    await createComment(props.post.id, {
      author_uid: currentUserUid.value,
      content,
      post_type: 'discussion',
    })

    // 重新載入完整的貼文詳情以獲取最新留言
    await loadFullPostDetails()

    newComment.value = ''
    await nextTick()
    commentsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) {
    console.error('提交留言失敗：', error)
    alert('提交留言失敗，請稍後再試')
  }
}

// 監聽 Auth
onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (props.post?.id && previousUid !== currentUserUid.value) {
    if (currentUserUid.value) {
      await loadLikesInfo()
    } else {
      isLiked.value = false
    }
  }
})

onMounted(async () => {
  // 初始化本地資料
  localComments.value = props.post.comments || props.post.commentsData || []
  likesCount.value = props.post.likes || props.post.likes_count || 0

  // 如果 props.post 中沒有完整的留言資料，主動載入
  if (!props.post.commentsData && props.post.id) {
    await loadFullPostDetails()
  } else if (props.post.commentsData && Array.isArray(props.post.commentsData)) {
    // 格式化已有的留言資料
    localComments.value = props.post.commentsData.map(comment => {
      const formatTime = (timestamp) => {
        if (!timestamp) return '剛剛'
        const now = new Date()
        const postTime = new Date(timestamp)
        const diffMs = now - postTime
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays > 0) return `${diffDays}天前`
        if (diffHours > 0) return `${diffHours}小時前`
        const diffMins = Math.floor(diffMs / (1000 * 60))
        if (diffMins > 0) return `${diffMins}分鐘前`
        return '剛剛'
      }

      return {
        id: comment.id,
        author: comment.author_nickname || comment.author_name || comment.author || comment.author_uid || '匿名用戶',
        author_uid: comment.author_uid,
        avatar: comment.author_avatar || comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_uid}`,
        content: comment.content,
        time: comment.created_at || comment.timestamp || comment.time,
        likes: comment.likes || 0,
        replies: comment.replies || [],
      }
    })
  }

  if (currentUserUid.value) {
    await loadLikesInfo()
  }

  if (props.scrollToComments) {
    await nextTick()
    commentsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    commentInputRef.value?.focus()
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div class="lg:hidden relative z-0 flex items-center justify-end gap-2 mr-4 -mb-2">
        <button
          :class="[
            'bg-tag-amber text-white px-3 pt-2 pb-3 rounded-t-xl rounded-b-none shadow-md inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-transform',
            activeSection === 'content' ? '-translate-y-1' : '',
          ]"
          title="回到內文"
          @click="scrollToTop"
        >
          <FileTextIcon class="w-4 h-4" />
          內文
        </button>
        <button
          :class="[
            'bg-tag-blue text-white px-3 pt-2 pb-3 rounded-t-xl rounded-b-none shadow-md inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-transform',
            activeSection === 'comments' ? '-translate-y-1' : '',
          ]"
          title="跳轉至留言區"
          @click="scrollToCommentsSection"
        >
          <MessageCircleIcon class="w-4 h-4" />
          留言區
        </button>
      </div>
      <button
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-2 lg:top-24 z-20 lg:z-0 bg-tag-amber text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-amber min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        title="回到內文"
        @click="scrollToTop"
      >
        <FileTextIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
        >
          內文&emsp;
        </span>
      </button>

      <button
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-20 lg:top-40 z-20 lg:z-0 bg-tag-blue text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-blue min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        title="跳轉至留言區"
        @click="scrollToCommentsSection"
      >
        <MessageCircleIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
        >
          留言區
        </span>
      </button>

      <div
        class="bg-white w-full h-full flex flex-col rounded-xl border-2 border-primary overflow-hidden relative z-10"
      >
        <button
          class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>

        <div ref="contentContainerRef" class="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div class="mb-6">
            <div v-if="localPostData.banner" class="-mx-6 -mt-6 h-64 sm:h-80 overflow-hidden mb-6">
              <img :src="localPostData.banner" class="w-full h-full object-cover" alt="文章封面" />
            </div>

            <div class="flex items-center space-x-3 mb-4">
              <img
                :src="
                  localPostData.authorAvatar ||
                  localPostData.avatar ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                "
                class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
              />
              <div>
                <div class="font-bold text-secondary-900">
                  {{ localPostData.authorName || localPostData.author || '匿名用戶' }}
                </div>
                <div class="text-sm text-secondary-500">
                  {{ formatTime(localPostData.time) }}
                  <span v-if="localPostData.category" class="ml-2 text-primary-600 font-bold">
                    @ {{ localPostData.category }}
                  </span>
                </div>
              </div>
            </div>
            <h1 class="text-3xl font-black text-secondary-900 mb-4">{{ localPostData.title }}</h1>

            <div
              v-if="localPostData.tags && localPostData.tags.length"
              class="flex flex-wrap gap-2 mb-6"
            >
              <span
                v-for="tag in localPostData.tags"
                :key="tag"
                class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
              >
                #{{ tag }}
              </span>
            </div>

            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              class="prose prose-lg max-w-none mb-8 text-gray-900 rich-content"
              v-html="processedContent"
            ></div>

            <div
              class="flex items-center space-x-4 py-4 border-t border-b border-secondary-200 mb-6"
            >
              <button
                :class="[
                  'flex items-center space-x-1 transition group',
                  isLiked ? 'text-accent-600' : 'text-secondary-400 hover:text-accent-600',
                ]"
                @click="handleLike"
              >
                <HeartIcon
                  :class="[
                    'w-5 h-5 transition-transform group-active:scale-125',
                    { 'fill-current': isLiked },
                  ]"
                />
                <span class="font-bold">{{ likesCount }}</span>
              </button>

              <div class="flex items-center space-x-1 text-secondary-400">
                <MessageCircleIcon class="w-5 h-5" />
                <span class="font-bold">{{ totalCommentCount }}</span>
              </div>

              <button class="ml-auto text-secondary-400 hover:text-primary-600">
                <BookmarkIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref="commentsSectionRef">
            <h3 class="font-bold text-lg text-secondary-900 mb-4">留言討論區</h3>

            <div v-if="normalizedComments.length" class="space-y-4">
              <div
                v-for="comment in normalizedComments"
                :key="comment.id"
                class="bg-secondary-50 p-4 rounded-lg border border-secondary-200"
              >
                <div class="flex items-start space-x-3">
                  <img :src="comment.avatar" class="w-10 h-10 rounded-full object-cover" />
                  <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                      <span class="font-bold text-secondary-900">{{ comment.author }}</span>
                      <span class="text-xs text-secondary-400">{{ formatTime(comment.time) }}</span>
                    </div>
                    <p class="text-secondary-700 text-sm">{{ comment.content }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-center text-secondary-400 py-10 border-2 border-dashed border-secondary-200 rounded-lg"
            >
              目前沒有留言，來當第一個吧！
            </div>
          </div>
        </div>

        <div class="p-4 border-t-2 border-secondary-200 bg-white">
          <div v-if="userStore.isLoggedIn" class="flex space-x-3">
            <input
              ref="commentInputRef"
              v-model="newComment"
              type="text"
              placeholder="發表你的看法..."
              class="flex-1 p-3 border-2 border-secondary-300 rounded-lg focus:border-primary-500 outline-none bg-secondary-50 focus:bg-white transition"
              @keyup.enter="submitComment"
            />
            <button
              :disabled="!newComment.trim()"
              class="bg-primary-600 text-white px-5 py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center shadow-md"
              @click="submitComment"
            >
              <SendIcon class="w-5 h-5" />
            </button>
          </div>
          <div
            v-else
            class="text-center p-3 bg-secondary-50 rounded-lg border border-secondary-200"
          >
            <button
              class="text-primary-600 font-bold hover:underline"
              @click="router.push('/login')"
            >
              登入
            </button>
            <span class="text-secondary-500"> 後才能參與討論</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

:deep(.rich-content) {
  font-size: 1rem;
  line-height: 1.75;
}

:deep(.rich-content h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2em;
  margin-bottom: 1em;
  color: #111827;
  border-left: 4px solid #2563eb;
  padding-left: 1em;
  padding-top: 0.5em;
  padding-bottom: 0.5em;
  background-color: #eff6ff;
  border-radius: 0 0.5rem 0.5rem 0;
}

:deep(.rich-content h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  color: #374151;
  border-left: 4px solid #60a5fa;
  padding-left: 0.875em;
  padding-top: 0.375em;
  padding-bottom: 0.375em;
  background-color: #f0f9ff;
  border-radius: 0 0.375rem 0.375rem 0;
}

:deep(.rich-content p) {
  color: #111827;
  margin-bottom: 1.25em;
  font-size: 1.1rem;
}

:deep(.rich-content ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 1.25em;
}

:deep(.rich-content ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 1.25em;
}

:deep(.rich-content blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1em;
  color: #4b5563;
  font-style: italic;
  margin: 1.5em 0;
}

:deep(.rich-content img) {
  border-radius: 0.5rem;
  margin-top: 1em;
  margin-bottom: 1em;
  margin-left: 0;
  margin-right: auto;
  max-width: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: block;
}

:deep(.rich-content [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
