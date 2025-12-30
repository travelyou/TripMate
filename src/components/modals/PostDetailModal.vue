<script setup>
import { defineProps, defineEmits, ref, computed, nextTick, onMounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Heart as HeartIcon,
  RefreshCcw as RefreshCcwIcon,
  Repeat2 as Repeat2Icon,
  MessageCircle as MessageCircleIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

// 不需要引入特定的 Store，直接操作 props 即可通用

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

const newComment = ref('')
const isReplyingTo = ref(null)
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const isLiked = ref(false)
const isBookmarked = ref(false)
const isShareModalOpen = ref(false)

// --- 核心修正 1: 統一取得留言陣列 ---
const normalizedComments = computed(() => {
  if (!props.post) return []
  return props.post.commentsData || props.post.comments || []
})

// --- 核心修正 2: 計算留言總數 (含回覆) ---
const totalCommentCount = computed(() => {
  const comments = normalizedComments.value
  if (!comments.length) return 0

  let total = comments.length
  comments.forEach((comment) => {
    if (comment.replies) {
      total += comment.replies.length
    }
  })
  return total
})

const toggleLike = (item) => {
  if (typeof item.likes !== 'number') item.likes = 0

  if (item.isLiked) {
    item.likes--
  } else {
    item.likes++
  }
  item.isLiked = !item.isLiked
}

const startReply = (commentId, authorName) => {
  isReplyingTo.value = commentId
  newComment.value = `@${authorName} `
  if (commentInputRef.value) {
    commentInputRef.value.focus()
  }
}

// 🟢 新增：取消回覆函式 (解決格式化報錯問題)
const cancelReply = () => {
  isReplyingTo.value = null
  newComment.value = ''
}

// 模擬發送留言
const submitComment = () => {
  if (!newComment.value.trim()) return

  const isReply = isReplyingTo.value !== null
  const content = newComment.value

  const newCommentObj = {
    id: Date.now(),
    author: '當前用戶', // 之後可改為從 UserStore 拿
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    time: '剛剛',
    content: content,
    likes: 0,
    isLiked: false,
    replies: [],
  }

  // --- 核心修正 3: 直接操作 props.post，不依賴特定 Store ---
  const targetPost = props.post

  if (isReply) {
    // 找出父留言
    const commentsList = targetPost.commentsData || targetPost.comments || []
    const parentComment = commentsList.find((c) => c.id === isReplyingTo.value)

    if (parentComment) {
      if (!parentComment.replies) parentComment.replies = []
      parentComment.replies.push(newCommentObj)
    }
  } else {
    // 新增主留言
    if (Array.isArray(targetPost.commentsData)) {
      targetPost.commentsData.unshift(newCommentObj)
    } else if (Array.isArray(targetPost.comments)) {
      targetPost.comments.unshift(newCommentObj)
    } else {
      targetPost.comments = [newCommentObj]
    }
  }

  // 更新計數 (相容兩種命名)
  if (typeof targetPost.comments === 'number') targetPost.comments++
  if (typeof targetPost.commentsCount === 'number') targetPost.commentsCount++

  newComment.value = ''
  isReplyingTo.value = null
}

onMounted(() => {
  if (props.scrollToComments) {
    nextTick(() => {
      if (commentsSectionRef.value) {
        commentsSectionRef.value.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
        if (commentInputRef.value) commentInputRef.value.focus()
      }
    })
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col pixel-modal"
    >
      <header
        class="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl"
      >
        <h3 class="text-xl font-bold text-gray-800">
          {{ post.price || post.agencyName ? '行程詳情與諮詢' : '貼文詳情與討論' }}
        </h3>
        <button class="text-gray-500 hover:text-gray-800 transition" @click="emit('close')">
          <XIcon class="w-6 h-6" />
        </button>
      </header>

      <div class="flex-grow overflow-y-auto custom-scrollbar p-5">
        <div class="mb-6 pb-4 border-b-2 border-amber-300">
          <div class="flex items-center space-x-3 mb-3">
            <img
              :src="post.avatar || post.author?.avatar"
              class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
            <div>
              <span class="font-bold text-gray-800">{{
                post.author?.nickname || post.author
              }}</span>
              <div class="text-xs text-gray-400">
                {{ post.time || '剛剛' }} • {{ post.spiritAnimal || post.author?.spiritAnimal }}
                <span v-if="post.agencyName" class="text-orange-500 font-bold ml-1">
                  (由 {{ post.agencyName }} 提供)
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="post.image || post.coverImage"
            class="w-full max-h-96 object-cover rounded-lg overflow-hidden mb-4 bg-gray-100"
          >
            <img :src="post.image || post.coverImage" class="w-full h-full object-cover" />
          </div>

          <h4 class="text-xl font-bold text-gray-900 mb-3">{{ post.title }}</h4>

          <p class="text-gray-700 text-base mb-4 leading-relaxed whitespace-pre-wrap">
            {{ post.fullContent || post.content }}
          </p>

          <div v-if="post.tags && post.tags.length" class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-gray-400 text-sm mt-4 border-t border-gray-100 pt-3">
            <button
              :class="[
                'flex items-center space-x-1 hover:text-red-500 transition mr-6',
                { 'text-red-500': isLiked },
              ]"
              @click="isLiked = !isLiked"
            >
              <HeartIcon :class="['w-4 h-4', { 'fill-red-500': isLiked }]" />
              <span>{{ post.likes || post.totalSaves || 0 }}</span>
            </button>
            <div class="flex items-center space-x-1 text-indigo-600 mr-6">
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ totalCommentCount }} 留言</span>
            </div>
            <button
              :class="[
                'flex items-center space-x-1 hover:text-yellow-600 transition mr-6',
                { 'text-yellow-600': isBookmarked },
              ]"
              @click="isBookmarked = !isBookmarked"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                :fill="isBookmarked ? 'currentColor' : 'none'"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button
              class="ml-auto flex items-center space-x-1 hover:text-gray-600 transition"
              @click="isShareModalOpen = true"
            >
              <Repeat2Icon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref="commentsSectionRef">
          <div v-if="normalizedComments.length">
            <h4 class="font-bold text-lg mb-4 text-amber-800">
              所有留言 ({{ totalCommentCount }})
            </h4>

            <div
              v-for="comment in normalizedComments"
              :key="comment.id"
              class="mb-6 p-4 rounded-lg bg-white border-b border-gray-100"
            >
              <div class="flex items-start space-x-3">
                <img
                  :src="comment.avatar"
                  class="w-8 h-8 rounded-full object-cover border-2 border-gray-100 mt-1"
                />
                <div class="flex-1">
                  <div class="flex justify-between items-start">
                    <span class="font-bold text-gray-800 text-sm">{{ comment.author }}</span>
                    <span class="text-xs text-gray-400">{{ comment.time }}</span>
                  </div>
                  <p class="text-gray-700 text-sm mt-1">{{ comment.content }}</p>

                  <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <button
                      class="flex items-center space-x-1 hover:text-red-500 transition"
                      @click="toggleLike(comment)"
                    >
                      <HeartIcon
                        :class="[
                          'w-3 h-3 transition',
                          comment.isLiked ? 'fill-red-500 text-red-500' : '',
                        ]"
                      />
                      <span>{{ comment.likes || 0 }}</span>
                    </button>
                    <button
                      class="hover:text-amber-600 transition font-medium"
                      @click="startReply(comment.id, comment.author)"
                    >
                      回覆
                    </button>
                  </div>

                  <div
                    v-if="comment.replies && comment.replies.length"
                    class="mt-3 pl-4 border-l-2 border-indigo-200 space-y-3"
                  >
                    <div v-for="reply in comment.replies" :key="reply.id" class="pt-1">
                      <div class="flex items-start space-x-2">
                        <img
                          :src="reply.avatar"
                          class="w-6 h-6 rounded-full object-cover border border-gray-100 mt-1"
                        />
                        <div class="flex-1">
                          <span class="font-bold text-gray-800 text-xs">{{ reply.author }}</span>
                          <span class="text-xs text-gray-400 ml-2">{{ reply.time }}</span>
                          <p class="text-gray-700 text-xs mt-0.5">{{ reply.content }}</p>
                          <div class="flex items-center space-x-4 mt-1 text-[10px] text-gray-500">
                            <button
                              class="flex items-center space-x-1 hover:text-red-500 transition"
                              @click="toggleLike(reply)"
                            >
                              <HeartIcon
                                :class="[
                                  'w-3 h-3 transition',
                                  reply.isLiked ? 'fill-red-500 text-red-500' : '',
                                ]"
                              />
                              <span>{{ reply.likes || 0 }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-gray-500 pt-10">目前沒有留言，來當第一個吧！</div>
        </div>
      </div>

      <footer class="p-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-xl">
        <div v-if="isReplyingTo" class="text-sm text-indigo-600 mb-2 flex items-center">
          <RefreshCcwIcon class="w-4 h-4 mr-2" />
          正在回覆 {{ newComment.split(' ')[0].replace('@', '') }}...
          <button class="ml-2 text-gray-400 hover:text-gray-600" @click="cancelReply">
            <XIcon class="w-3 h-3" />
          </button>
        </div>

        <div v-if="userStore.isLoggedIn" class="flex space-x-3">
          <input
            id="comment-input"
            ref="commentInputRef"
            v-model="newComment"
            type="text"
            placeholder="發表你的看法..."
            class="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 transition shadow-inner bg-gray-50 focus:bg-white outline-none"
            @keyup.enter="submitComment"
          />
          <button
            :disabled="!newComment.trim()"
            class="bg-amber-500 text-white px-5 py-3 rounded-lg font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center shadow-md active:shadow-sm active:translate-y-0.5"
            @click="submitComment"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </div>
        <div v-else class="flex flex-col items-center justify-center p-1 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p class="text-gray-600 mb-1">登入後才能回覆</p>
          <button
            class="bg-orange-500 text-white px-6 py-1 rounded-lg font-bold hover:bg-orange-600 transition"
            @click="router.push('/login')"
          >登入
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.pixel-modal {
  border: 4px solid #8b6f47;
  box-shadow: 10px 10px 0px 0px rgba(139, 111, 71, 0.5);
}
.custom-scrollbar::-webkit-scrollbar {
  display: none;
}
.custom-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
