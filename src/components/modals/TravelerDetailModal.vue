<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Map as MapIcon,
  Coffee as CoffeeIcon,
  Camera as CameraIcon,
  CheckSquare as CheckSquareIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { createComment } from '@/api/comments'
import { toggleLike, getLikesInfo } from '@/api/likes'

const userStore = useUserStore()
const router = useRouter()

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
  scrollToComments: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'traveler-updated'])

// 當前用戶
const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(0)

// Tab 切換：'itinerary' 或 'comments'
const activeTab = ref('itinerary')

// 留言相關
const newComment = ref('')
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const localComments = ref([])

// 行程相關（
const itineraryData = computed(() => {
  if (props.traveler.itinerary) {
    return props.traveler.itinerary
  }
  return {
    days: [
      {
        day: 1,
        date: props.traveler.date || '2026/01/15',
        activities: [
          {
            id: 1,
            time: '09:00',
            icon: 'map-pin',
            title: '集合出發',
            desc: '機場集合，準備開始美好的旅程',
          },
          {
            id: 2,
            time: '14:00',
            icon: 'coffee',
            title: '當地美食體驗',
            desc: '品嚐當地特色料理',
          },
        ],
      },
    ],
    packingList: [
      {
        category: '必備物品',
        items: [
          { id: 1, name: '護照', checked: false },
          { id: 2, name: '信用卡', checked: false },
          { id: 3, name: '充電器', checked: false },
        ],
      },
    ],
  }
})

const activeDayIndex = ref(0)
const activeDay = computed(() => {
  return itineraryData.value.days[activeDayIndex.value] || { activities: [] }
})

// 監聽 Firebase 認證狀態
onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null

  if (props.traveler?.id && previousUid !== currentUserUid.value) {
    if (currentUserUid.value) {
      await loadLikesInfo()
    } else {
      isLiked.value = false
    }
  }
})

// 計算留言總數
const normalizedComments = computed(() => {
  if (localComments.value.length > 0) {
    return localComments.value
  }
  return props.traveler.commentsData || []
})

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

// 載入按讚資訊
const loadLikesInfo = async () => {
  if (!props.traveler?.id || !currentUserUid.value) return

  try {
    const info = await getLikesInfo(props.traveler.id, currentUserUid.value)
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error('載入按讚資訊失敗：', error)
  }
}

// 處理按讚
const handleLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }

  try {
    const result = await toggleLike(props.traveler.id, currentUserUid.value)
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error('按讚操作失敗：', error)
    alert(`按讚操作失敗：${error.message || '請稍後再試'}`)
  }
}

// 處理留言按讚
const toggleCommentLike = (item) => {
  if (typeof item.likes !== 'number') item.likes = 0
  if (item.isLiked) {
    item.likes--
  } else {
    item.likes++
  }
  item.isLiked = !item.isLiked
}

// 發送留言
const submitComment = async () => {
  if (!newComment.value.trim()) return

  if (!currentUserUid.value) {
    alert('請先登入後才能留言')
    return
  }

  const content = newComment.value.trim()

  try {
    const newCommentData = await createComment(props.traveler.id, {
      author_uid: currentUserUid.value,
      content: content,
    })

    console.log('留言創建成功：', newCommentData)

    // 更新本地留言列表（簡化版，實際應該重新載入）
    localComments.value = [
      ...localComments.value,
      {
        id: Date.now(),
        author: '我',
        avatar:
          currentUserUid.value.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserUid.value}`,
        content: content,
        time: '剛剛',
        likes: 0,
        isLiked: false,
        replies: [],
      },
    ]

    newComment.value = ''

    await nextTick()
    if (commentsSectionRef.value) {
      commentsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch (error) {
    console.error('發布留言失敗：', error)
    alert(`發布留言失敗：${error.message || '請稍後再試'}`)
  }
}

// 獲取圖標組件
const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'camera':
      return CameraIcon
    case 'coffee':
      return CoffeeIcon
    case 'map-pin':
      return MapPinIcon
    default:
      return MapIcon
  }
}

// 獲取狀態樣式
const getStatusClasses = (status) => {
  switch (status) {
    case '招募中':
      return 'bg-primary-600 text-white'
    case '已額滿':
      return 'bg-secondary-600 text-white'
    case '已出發':
      return 'bg-secondary-500 text-white'
    default:
      return 'bg-primary-100 text-primary-800'
  }
}

// 獲取日期標籤
const getDayLabel = (index) => {
  const startDateStr = props.traveler.date || '2026/01/15'
  const [year, month, day] = startDateStr.split(/[/-]/).map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + index)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d}`
}

// 計算項目數據（用於收藏）
const itemData = computed(() => ({
  id: props.traveler.id,
  type: 'traveler',
  title: props.traveler.title,
  content: props.traveler.content,
  image: props.traveler.image,
  author: props.traveler.author,
  avatar: props.traveler.avatar,
  location: props.traveler.location,
  date: props.traveler.date,
  status: props.traveler.status,
  people: props.traveler.people,
  tags: props.traveler.tags,
  comments: props.traveler.comments,
}))

onMounted(async () => {
  if (props.traveler) {
    likesCount.value = props.traveler.likes || 0
    localComments.value = props.traveler.commentsData || []

    if (currentUserUid.value) {
      await loadLikesInfo()
    }
  }

  if (props.scrollToComments) {
    activeTab.value = 'comments'
    await nextTick()
    if (commentsSectionRef.value) {
      commentsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      class="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border-2 border-primary  overflow-hidden relative"
    >
      <!-- 關閉按鈕 -->
      <button
        class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
        @click="emit('close')"
      >
        <XIcon class="w-6 h-6" />
      </button>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- Banner 圖片 -->
        <div class="relative w-full h-72 overflow-hidden ">
          <img :src="traveler.image" :alt="traveler.title" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

          <!-- 狀態標籤 -->
          <div
            :class="getStatusClasses(traveler.status)"
            class="absolute top-4 left-4 px-4 py-2 font-bold text-sm rounded-lg border-2 border-primary"
          >
            {{ traveler.status }}
          </div>
        </div>

        <!-- 內容區 -->
        <div class="p-6">
          <div class="mb-6">
            <h1 class="text-3xl font-black text-secondary-900 mb-4">
              {{ traveler.title }}
            </h1>

            <div class="flex items-center space-x-3 mb-4">
              <img
                :src="traveler.avatar"
                class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
              />
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-secondary-900">{{ traveler.author }}</span>
                  <span
                    class="text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full"
                  >
                    {{ traveler.spiritAnimal }}
                  </span>
                </div>
                <div class="text-sm text-secondary-500">發布於 {{ traveler.date || '最近' }}</div>
              </div>
            </div>

            <!-- 旅行資訊卡片 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">地點</span>
                </div>
                <div class="font-bold text-secondary-900">{{ traveler.location }}</div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">日期</span>
                </div>
                <div class="font-bold text-secondary-900">{{ traveler.date }}</div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">人數</span>
                </div>
                <div class="font-bold text-primary-600">{{ traveler.people }}</div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MessageCircleIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">留言</span>
                </div>
                <div class="font-bold text-secondary-900">{{ totalCommentCount }}</div>
              </div>
            </div>
          </div>

          <!-- 標籤 -->
          <div v-if="traveler.tags && traveler.tags.length" class="flex flex-wrap gap-2 mb-6">
            <span
              v-for="tag in traveler.tags"
              :key="tag"
              class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <!-- 內容描述 -->
          <div class="prose prose-lg max-w-none mb-6">
            <p class="text-secondary-700 leading-relaxed whitespace-pre-wrap">
              {{ traveler.content }}
            </p>
          </div>

          <!-- 互動按鈕 -->
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
              <span class="font-bold">{{ likesCount || 0 }}</span>
            </button>

            <button
              :class="[
                'flex items-center space-x-1 transition group',
                userStore.isCollected(itemData)
                  ? 'text-primary-600'
                  : 'text-secondary-400 hover:text-primary-600',
              ]"
              @click="
                userStore.isCollected(itemData)
                  ? userStore.removeFromCollection(itemData)
                  : userStore.openCollectionModal(itemData)
              "
            >
              <BookmarkIcon
                :class="[
                  'w-5 h-5 transition-transform group-active:scale-125',
                  { 'fill-current': userStore.isCollected(itemData) },
                ]"
              />
            </button>

            <button
              v-if="traveler.status === '招募中'"
              class="ml-auto bg-primary-600 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-700 transition shadow-md"
            >
              聯繫作者
            </button>
            <div v-else class="ml-auto text-secondary-400 font-bold">
              {{ traveler.status }}
            </div>
          </div>

          <!-- Tab 切換 -->
          <div class="border-b-2 border-primary-200 mb-6">
            <div class="flex space-x-1">
              <button
                :class="[
                  'px-6 py-3 font-bold transition relative',
                  activeTab === 'itinerary'
                    ? 'text-primary-600 border-b-4 border-primary-600'
                    : 'text-secondary-400 hover:text-secondary-600',
                ]"
                @click="activeTab = 'itinerary'"
              >
                <MapIcon class="w-5 h-5 inline mr-2" />
                行程規劃
              </button>
              <button
                :class="[
                  'px-6 py-3 font-bold transition relative',
                  activeTab === 'comments'
                    ? 'text-primary-600 border-b-4 border-primary-600'
                    : 'text-secondary-400 hover:text-secondary-600',
                ]"
                @click="activeTab = 'comments'"
              >
                <MessageCircleIcon class="w-5 h-5 inline mr-2" />
                留言討論 ({{ totalCommentCount }})
              </button>
            </div>
          </div>

          <!-- 行程內容區 -->
          <div v-if="activeTab === 'itinerary'" class="space-y-6">
            <div class="flex overflow-x-auto space-x-2 pb-2">
              <button
                v-for="(day, index) in itineraryData.days"
                :key="index"
                :class="[
                  'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                  activeDayIndex === index
                    ? 'bg-primary-600 text-white border-primary-700'
                    : 'bg-white text-secondary-500 border-secondary-200 hover:bg-secondary-50',
                ]"
                @click="activeDayIndex = index"
              >
                Day {{ index + 1 }} - {{ getDayLabel(index) }}
              </button>
            </div>

            <!-- 活動列表 -->
            <div class="space-y-4">
              <div
                v-for="activity in activeDay.activities"
                :key="activity.id"
                class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm"
              >
                <div class="flex gap-4">
                  <div class="w-20 shrink-0">
                    <div class="text-2xl font-black text-primary-600">
                      {{ activity.time }}
                    </div>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <component
                        :is="getIconComponent(activity.icon)"
                        class="w-5 h-5 text-primary-500"
                      />
                      <h4 class="text-lg font-bold text-secondary-900">{{ activity.title }}</h4>
                    </div>
                    <p class="text-secondary-600 text-sm">{{ activity.desc }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 打包清單 -->
            <div v-if="itineraryData.packingList" class="mt-8">
              <h3 class="font-black text-lg text-secondary-900 flex items-center mb-4">
                <CheckSquareIcon class="w-5 h-5 mr-2 text-primary" />
                建議攜帶物品
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(cat, catIndex) in itineraryData.packingList"
                  :key="catIndex"
                  class="bg-white border-2 border-secondary-200 rounded-lg p-4"
                >
                  <h4 class="font-bold text-secondary-700 mb-3">{{ cat.category }}</h4>
                  <div class="space-y-2">
                    <div v-for="item in cat.items" :key="item.id" class="flex items-center">
                      <input
                        v-model="item.checked"
                        type="checkbox"
                        class="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 mr-2"
                        disabled
                      />
                      <span
                        :class="[
                          'text-sm',
                          item.checked ? 'text-secondary-400 line-through' : 'text-secondary-700',
                        ]"
                      >
                        {{ item.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 留言區 -->
          <div v-if="activeTab === 'comments'" ref="commentsSectionRef">
            <div v-if="normalizedComments.length" class="space-y-4">
              <div
                v-for="comment in normalizedComments"
                :key="comment.id"
                class="bg-white p-4 rounded-lg border-2 border-secondary-200"
              >
                <div class="flex items-start space-x-3">
                  <img
                    :src="comment.avatar"
                    class="w-10 h-10 rounded-full object-cover border-2 border-secondary-100"
                  />
                  <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                      <span class="font-bold text-secondary-900">{{ comment.author }}</span>
                      <span class="text-xs text-secondary-400">{{ comment.time }}</span>
                    </div>
                    <p class="text-secondary-700 text-sm mb-2">{{ comment.content }}</p>

                    <div class="flex items-center space-x-4 text-xs text-secondary-500">
                      <button
                        class="flex items-center space-x-1 hover:text-accent-600 transition"
                        @click="toggleCommentLike(comment)"
                      >
                        <HeartIcon
                          :class="['w-3 h-3', comment.isLiked ? 'fill-current text-accent-600' : '']"
                        />
                        <span>{{ comment.likes || 0 }}</span>
                      </button>
                    </div>

                    <!-- 回覆 -->
                    <div
                      v-if="comment.replies && comment.replies.length"
                      class="mt-3 pl-4 border-l-2 border-primary-200 space-y-2"
                    >
                      <div v-for="reply in comment.replies" :key="reply.id">
                        <div class="flex items-start space-x-2">
                          <img :src="reply.avatar" class="w-7 h-7 rounded-full object-cover" />
                          <div class="flex-1">
                            <span class="font-bold text-secondary-900 text-xs">{{ reply.author }}</span>
                            <span class="text-xs text-secondary-400 ml-2">{{ reply.time }}</span>
                            <p class="text-secondary-700 text-xs mt-0.5">{{ reply.content }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-secondary-400 py-10">目前沒有留言，來當第一個吧！</div>
          </div>
        </div>
      </div>

      <!-- 留言輸入區（固定底部） -->
      <div v-if="activeTab === 'comments'" class="p-4 border-t-2 border-secondary-200 bg-white">
        <div v-if="userStore.isLoggedIn" class="flex space-x-3">
          <input
            ref="commentInputRef"
            v-model="newComment"
            type="text"
            placeholder="發表你的看法..."
            class="flex-1 p-3 border-2 border-secondary-300 rounded-lg focus:border-primary-500 transition shadow-inner bg-secondary-50 focus:bg-white outline-none"
            @keyup.enter="submitComment"
          />
          <button
            :disabled="!newComment.trim()"
            class="bg-primary-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center shadow-md"
            @click="submitComment"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center p-3 bg-secondary-50 rounded-lg border-2 border-secondary-200"
        >
          <p class="text-secondary-600 mb-2">登入後才能回覆</p>
          <button
            class="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
            @click="router.push('/login')"
          >
            登入
          </button>
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
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.prose {
  max-width: none;
}
</style>

