<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { createComment } from '@/api/comments'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { formatTime } from '@/utils/time'

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
const localComments = ref([])

// 本地資料副本
const localPostData = ref({ ...props.post })

// 計算留言總數
const normalizedComments = computed(() => {
  return localComments.value.length > 0 ? localComments.value : localPostData.value.comments || []
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

// 初始化載入按讚資訊
const loadLikesInfo = async () => {
  if (!props.post?.id || !currentUserUid.value) return
  try {
    const info = await getLikesInfo(props.post.id, currentUserUid.value, 'discussion')
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error(error)
  }
}

// 處理按讚
const handleLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  try {
    const result = await toggleLike(props.post.id, currentUserUid.value)
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error(error)
  }
}

// 提交留言
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
      content: content,
    })

    // 前端樂觀更新
    localComments.value = [
      {
        id: Date.now(),
        author: userStore.currentUser?.displayName || '我',
        avatar:
          userStore.currentUser?.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserUid.value}`,
        content: content,
        time: new Date().toISOString(),
        likes: 0,
        replies: [],
      },
      ...normalizedComments.value,
    ]
    newComment.value = ''
    await nextTick()
    commentsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) {
    console.error(error)
  }
}

// 監聽 Auth
import { onAuthStateChanged } from 'firebase/auth'
onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
  if (currentUserUid.value) {
    await loadLikesInfo()
  }
})

onMounted(async () => {
  localComments.value = props.post.comments || []
  likesCount.value = props.post.likes || 0

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
    <div
      class="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border-2 border-primary overflow-hidden relative"
    >
      <button
        class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
        @click="emit('close')"
      >
        <XIcon class="w-6 h-6" />
      </button>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div class="mb-6">
          <div class="flex items-center space-x-3 mb-4">
            <img
              :src="
                localPostData.authorAvatar ||
                'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
              "
              class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
            />
            <div>
              <div class="font-bold text-secondary-900">
                {{ localPostData.authorName || '匿名用戶' }}
              </div>
              <div class="text-sm text-secondary-500">
                {{ formatTime(localPostData.createdAt || localPostData.time) }}
              </div>
            </div>
          </div>

          <h1 class="text-2xl font-black text-secondary-900 mb-4">{{ localPostData.title }}</h1>

          <div
            v-if="localPostData.tags && localPostData.tags.length"
            class="flex flex-wrap gap-2 mb-4"
          >
            <span
              v-for="tag in localPostData.tags"
              :key="tag"
              class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="prose prose-lg max-w-none mb-6">
            <p class="text-secondary-700 leading-relaxed whitespace-pre-wrap">
              {{ localPostData.content }}
            </p>
          </div>

          <div
            v-if="localPostData.images && localPostData.images.length"
            class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            <img
              v-for="(img, idx) in localPostData.images"
              :key="idx"
              :src="img"
              class="rounded-lg border-2 border-secondary-200 w-full h-64 object-cover"
            />
          </div>

          <div class="flex items-center space-x-4 py-4 border-t border-b border-secondary-200 mb-6">
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
        <div v-else class="text-center p-3 bg-secondary-50 rounded-lg border border-secondary-200">
          <button class="text-primary-600 font-bold hover:underline" @click="router.push('/login')">
            登入
          </button>
          <span class="text-secondary-500"> 後才能參與討論</span>
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
</style>
