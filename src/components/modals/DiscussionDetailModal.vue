<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Heart as HeartIcon,
  RefreshCcw as RefreshCcwIcon,
  Repeat2 as Repeat2Icon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon, // 記得引入 Bookmark 圖示
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { createComment } from '@/api/comments'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { useDiscussionsStore } from '@/stores/discussions'

const userStore = useUserStore()
const router = useRouter()
const discussionsStore = useDiscussionsStore()

// 當前用戶 UID
const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(0)

// 顯示用讚數：注意 0 也要顯示，不能用 `likesCount || ...` 這種會把 0 當成 false 的寫法
const displayLikesCount = computed(() => {
  return typeof likesCount.value === 'number' ? likesCount.value : (props.post?.likes ?? 0)
})

// 監聽 Firebase 認證狀態
onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  // 如果用戶狀態改變，重新載入按讚狀態
  if (props.post?.id && previousUid !== currentUserUid.value) {
    if (currentUserUid.value) {
      await loadLikesInfo()
    } else {
      // 如果登出，重置按讚狀態
      isLiked.value = false
    }
  }
})

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

const emit = defineEmits(['close', 'post-updated'])

const newComment = ref('')
const isReplyingTo = ref(null)
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const isShareModalOpen = ref(false)

// 本地留言列表（用於即時更新）
const localComments = ref([])

// 3. 智慧判斷內容類型 (因為 Modal 是共用的)
const itemData = computed(() => {
  const p = props.post
  // 簡單的判斷邏輯：
  let type = 'discussion'
  if (p.type) {
    type = p.type
  } else if (p.price || p.agencyName) {
    type = 'itinerary'
  } else if (p.status || p.people) {
    type = 'traveler'
  }

  return {
    ...p,
    type, // 強制覆寫正確的 type
    id: p.id,
  }
})

// 統一取得留言陣列
const normalizedComments = computed(() => {
  // 優先使用本地留言列表（如果有更新的話）
  if (localComments.value.length > 0) {
    return localComments.value
  }
  if (!props.post) return []
  return props.post.commentsData || props.post.comments || []
})

// 計算留言總數 (含回覆)
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

// 處理留言按讚 (這部分僅影響當下顯示)
const toggleCommentLike = (item) => {
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

const cancelReply = () => {
  isReplyingTo.value = null
  newComment.value = ''
}

// 載入按讚資訊
const loadLikesInfo = async () => {
  if (!props.post?.id || !currentUserUid.value) return

  try {
    const info = await getLikesInfo(props.post.id, currentUserUid.value)
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error('載入按讚資訊失敗：', error)
  }
}

// 處理貼文按讚
const handlePostLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }

  if (!props.post?.id) {
    console.error('貼文 ID 不存在')
    alert('貼文 ID 不存在')
    return
  }

  try {
    console.log('開始按讚操作，貼文 ID：', props.post.id, '用戶 UID：', currentUserUid.value)
    const result = await toggleLike(props.post.id, currentUserUid.value)
    console.log('按讚操作成功，結果：', result)
    isLiked.value = result.liked
    likesCount.value = result.likesCount

    // 同步回寫到 post，讓 modal 內其他顯示/父層列表保持一致
    if (props.post) {
      props.post.isLiked = result.liked
      props.post.likes = result.likesCount
    }
    emit('post-updated', {
      ...props.post,
      isLiked: result.liked,
      likes: result.likesCount,
    })
  } catch (error) {
    console.error('按讚操作失敗：', error)
    console.error('錯誤詳情：', {
      message: error.message,
      stack: error.stack,
      postId: props.post?.id,
      userId: currentUserUid.value,
    })
    alert(`按讚操作失敗：${error.message || '請稍後再試'}`)
  }
}

// 發送留言
const submitComment = async () => {
  if (!newComment.value.trim()) return

  // 檢查用戶是否已登入
  if (!currentUserUid.value) {
    alert('請先登入後才能留言')
    return
  }

  const content = newComment.value.trim()
  const isReply = isReplyingTo.value !== null

  // 如果是回覆，暫時不支持（需要後端支持 parent_comment_id）
  if (isReply) {
    alert('回覆功能暫時不支持，請直接留言')
    cancelReply()
    return
  }

  try {
    // 調用 API 創建留言
    const newCommentData = await createComment(props.post.id, {
      author_uid: currentUserUid.value,
      content: content,
    })

    console.log('留言創建成功：', newCommentData)

    // 重新載入貼文詳情以獲取最新留言（只載入一次）
    const updatedPost = await discussionsStore.loadPostById(props.post.id)

    // 更新本地留言列表
    if (
      updatedPost &&
      Array.isArray(updatedPost.commentsData) &&
      updatedPost.commentsData.length > 0
    ) {
      localComments.value = updatedPost.commentsData
    } else if (
      updatedPost &&
      Array.isArray(updatedPost.comments) &&
      updatedPost.comments.length > 0
    ) {
      localComments.value = updatedPost.comments
    }

    // 通過 emit 通知父組件更新
    emit('post-updated', updatedPost)

    newComment.value = ''
    isReplyingTo.value = null

    // 滾動到留言區
    await nextTick()
    if (commentsSectionRef.value) {
      commentsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch (error) {
    console.error('發布留言失敗：', error)
    alert(`發布留言失敗：${error.message || '請稍後再試'}`)
  }
}

// 載入貼文詳情（包含最新留言和按讚狀態）
const loadPostDetail = async () => {
  if (!props.post?.id) return

  try {
    console.log('載入貼文詳情，ID：', props.post.id)

    // 重新載入貼文詳情以獲取最新留言
    const updatedPost = await discussionsStore.loadPostById(props.post.id)

    console.log('載入的貼文詳情：', updatedPost)
    console.log('留言數據：', updatedPost?.commentsData)

    // 更新本地留言列表
    if (
      updatedPost &&
      Array.isArray(updatedPost.commentsData) &&
      updatedPost.commentsData.length > 0
    ) {
      localComments.value = updatedPost.commentsData
      console.log('已更新本地留言列表，數量：', localComments.value.length)
    } else if (
      updatedPost &&
      Array.isArray(updatedPost.comments) &&
      updatedPost.comments.length > 0
    ) {
      localComments.value = updatedPost.comments
      console.log('已更新本地留言列表（從 comments），數量：', localComments.value.length)
    } else {
      // 如果沒有留言，清空列表
      localComments.value = []
      console.log('沒有留言數據')
    }

    // 更新按讚數
    if (updatedPost && typeof updatedPost.likes === 'number') {
      likesCount.value = updatedPost.likes
    }

    // 如果有用戶登入，載入按讚狀態（優先載入，確保狀態正確）
    if (currentUserUid.value) {
      await loadLikesInfo()
    } else {
      // 如果沒有登入，重置按讚狀態
      isLiked.value = false
    }
  } catch (error) {
    console.error('載入貼文詳情失敗：', error)
  }
}

// 監聽 post.id 變化，當打開 modal 時重新載入
watch(
  () => props.post?.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // 重置狀態
      isLiked.value = false
      likesCount.value = props.post?.likes || 0
      localComments.value = []

      // 載入貼文詳情和按讚狀態
      await loadPostDetail()
    }
  },
  { immediate: true },
)

// 監聽用戶登入狀態變化
watch(currentUserUid, async (newUid, oldUid) => {
  if (props.post?.id && newUid !== oldUid) {
    if (newUid) {
      await loadLikesInfo()
    } else {
      isLiked.value = false
    }
  }
})

onMounted(async () => {
  // 初始化時載入貼文詳情和按讚狀態
  if (props.post) {
    likesCount.value = props.post.likes || 0
    // 如果有用戶登入，立即載入按讚狀態
    if (currentUserUid.value) {
      await loadLikesInfo()
    }
  }

  await loadPostDetail()

  if (props.scrollToComments) {
    await nextTick()
    if (commentsSectionRef.value) {
      commentsSectionRef.value.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      if (commentInputRef.value) commentInputRef.value.focus()
    }
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border-2 border-primary-600 shadow-primary-2xl"
    >
      <header
        class="p-4 border-b border-secondary-200 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl"
      >
        <h3 class="text-xl font-bold text-secondary-800">
          {{ post.price || post.agencyName ? '行程詳情與諮詢' : '貼文詳情與討論' }}
        </h3>
        <button
          class="text-secondary-500 hover:text-secondary-800 transition"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </header>

      <div class="flex-grow overflow-y-auto custom-scrollbar p-5">
        <div class="mb-6 pb-4 border-b-2 border-primary-200">
          <div class="flex items-center space-x-3 mb-3">
            <img
              :src="post.avatar || post.author?.avatar"
              class="w-10 h-10 rounded-full object-cover border-2 border-secondary-200"
            />
            <div>
              <span class="font-bold text-secondary-800">{{
                post.author?.nickname || post.author
              }}</span>
              <div class="text-xs text-secondary-400">
                {{ post.time || '剛剛' }} • {{ post.spiritAnimal || post.author?.spiritAnimal }}
                <span v-if="post.agencyName" class="text-primary-600 font-bold ml-1">
                  (由 {{ post.agencyName }} 提供)
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="post.image || post.coverImage"
            class="w-full max-h-96 object-cover rounded-lg overflow-hidden mb-4 bg-secondary-100"
          >
            <img :src="post.image || post.coverImage" class="w-full h-full object-cover" />
          </div>

          <h4 class="text-xl font-bold text-secondary-900 mb-3">{{ post.title }}</h4>

          <p class="text-secondary-700 text-base mb-4 leading-relaxed whitespace-pre-wrap">
            {{ post.fullContent || post.content }}
          </p>

          <div v-if="post.tags && post.tags.length" class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div
            class="flex items-center text-secondary-400 text-sm mt-4 border-t border-secondary-100 pt-3"
          >
            <button
              :class="[
                'flex items-center space-x-1 transition mr-6 group',
                isLiked ? 'text-red-500' : 'hover:text-red-500',
              ]"
              @click="handlePostLike"
            >
              <HeartIcon
                :class="[
                  'w-4 h-4 transition-transform group-active:scale-125',
                  { 'fill-current': isLiked },
                ]"
              />
              <span>{{ displayLikesCount }}</span>
            </button>

            <div class="flex items-center space-x-1 text-primary-600 mr-6">
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ totalCommentCount }} 留言</span>
            </div>

            <button
              :class="[
                'flex items-center space-x-1 transition mr-6 group',
                userStore.isCollected(itemData) ? 'text-primary-500' : 'hover:text-primary-600',
              ]"
              @click="
                userStore.isCollected(itemData)
                  ? userStore.removeFromCollection(itemData)
                  : userStore.openCollectionModal(itemData)
              "
            >
              <BookmarkIcon
                :class="[
                  'w-4 h-4 transition-transform group-active:scale-125',
                  { 'fill-current': userStore.isCollected(itemData) },
                ]"
              />
            </button>

            <button
              class="ml-auto flex items-center space-x-1 hover:text-secondary-600 transition"
              @click="isShareModalOpen = true"
            >
              <Repeat2Icon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref="commentsSectionRef">
          <div v-if="normalizedComments.length">
            <h4 class="font-bold text-lg mb-4 text-primary-700">
              所有留言 ({{ totalCommentCount }})
            </h4>

            <div
              v-for="comment in normalizedComments"
              :key="comment.id"
              class="mb-6 p-4 rounded-lg bg-white border-b border-secondary-100"
            >
              <div class="flex items-start space-x-3">
                <img
                  :src="comment.avatar"
                  class="w-8 h-8 rounded-full object-cover border-2 border-secondary-100 mt-1"
                />
                <div class="flex-1">
                  <div class="flex justify-between items-start">
                    <span class="font-bold text-secondary-800 text-sm">{{ comment.author }}</span>
                    <span class="text-xs text-secondary-400">{{ comment.time }}</span>
                  </div>
                  <p class="text-secondary-700 text-sm mt-1">{{ comment.content }}</p>

                  <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                    <button
                      class="flex items-center space-x-1 hover:text-red-500 transition"
                      @click="toggleCommentLike(comment)"
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
                      class="hover:text-primary-600 transition font-medium"
                      @click="startReply(comment.id, comment.author)"
                    >
                      回覆
                    </button>
                  </div>

                  <div
                    v-if="comment.replies && comment.replies.length"
                    class="mt-3 pl-4 border-l-2 border-primary-200 space-y-3"
                  >
                    <div v-for="reply in comment.replies" :key="reply.id" class="pt-1">
                      <div class="flex items-start space-x-2">
                        <img
                          :src="reply.avatar"
                          class="w-6 h-6 rounded-full object-cover border border-secondary-100 mt-1"
                        />
                        <div class="flex-1">
                          <span class="font-bold text-secondary-800 text-xs">{{
                            reply.author
                          }}</span>
                          <span class="text-xs text-secondary-400 ml-2">{{ reply.time }}</span>
                          <p class="text-secondary-700 text-xs mt-0.5">{{ reply.content }}</p>
                          <div
                            class="flex items-center space-x-4 mt-1 text-[10px] text-secondary-500"
                          >
                            <button
                              class="flex items-center space-x-1 hover:text-red-500 transition"
                              @click="toggleCommentLike(reply)"
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
          <div v-else class="text-center text-secondary-500 pt-10">
            目前沒有留言，來當第一個吧！
          </div>
        </div>
      </div>

      <footer class="p-4 border-t border-secondary-200 sticky bottom-0 bg-white rounded-b-xl">
        <div v-if="isReplyingTo" class="text-sm text-primary-600 mb-2 flex items-center">
          <RefreshCcwIcon class="w-4 h-4 mr-2" />
          正在回覆 {{ newComment.split(' ')[0].replace('@', '') }}...
          <button class="ml-2 text-secondary-400 hover:text-secondary-600" @click="cancelReply">
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
            class="flex-1 p-3 border-2 border-secondary-300 rounded-lg focus:border-primary-500 transition shadow-inner bg-secondary-50 focus:bg-white outline-none"
            @keyup.enter="submitComment"
          />
          <button
            :disabled="!newComment.trim()"
            class="bg-primary-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center shadow-md active:shadow-sm active:translate-y-0.5"
            @click="submitComment"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center p-1 bg-secondary-50 rounded-lg border-2 border-secondary-200"
        >
          <p class="text-secondary-600 mb-1">登入後才能回覆</p>
          <button
            class="bg-primary-600 text-white px-6 py-1 rounded-lg font-bold hover:bg-primary-700 transition"
            @click="router.push('/login')"
          >
            登入
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
