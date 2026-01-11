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
import { getTravelerById, incrementView } from '@/api/travelers'
import { formatTime } from '@/utils/time'

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

const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(0)
const activeTab = ref('itinerary')
const newComment = ref('')
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const localComments = ref([])

// 建立一個本地變數來存「完整資料」，預設先用傳進來的 props 擋著
const localTravelerData = ref({ ...props.traveler })

// ★★★ 修改重點 1：計算屬性現在改看 localTravelerData ★★★
const itineraryData = computed(() => {
  // 優先使用後端抓回來的完整行程
  if (localTravelerData.value.itinerary && localTravelerData.value.itinerary.days) {
    return {
      days: localTravelerData.value.itinerary.days,
      // 把散落在外面的 packingList 整合進來，讓樣板讀得到
      packingList: localTravelerData.value.packingList || [],
    }
  }

  // 如果真的沒有資料（例如讀取失敗），才顯示「暫無行程」或保持空白，不要顯示假資料了
  return {
    days: [],
    packingList: [],
  }
})

const activeDayIndex = ref(0)
const activeDay = computed(() => {
  if (!itineraryData.value.days || itineraryData.value.days.length === 0) return { activities: [] }
  return itineraryData.value.days[activeDayIndex.value] || { activities: [] }
})

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

const normalizedComments = computed(() => {
  if (localComments.value.length > 0) {
    return localComments.value
  }
  return localTravelerData.value.commentsData || []
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

const loadLikesInfo = async () => {
  if (!props.traveler?.id || !currentUserUid.value) return

  try {
    const info = await getLikesInfo(props.traveler.id, currentUserUid.value)
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error(error)
  }
}

// ★★★ 修改重點 2：抓取完整資料的函式 ★★★
const fetchFullTravelerDetails = async () => {
  try {
    console.log('正在抓取詳細資料 ID:', props.traveler.id)
    const response = await getTravelerById(props.traveler.id, currentUserUid.value)

    if (response.success) {
      // 更新本地資料
      localTravelerData.value = {
        ...localTravelerData.value, // 保留原本的
        ...response.data, // 用新的詳細資料覆蓋 (包含 itinerary, packingList)
      }
      console.log('詳細資料更新成功:', localTravelerData.value)

      // 單獨呼叫增加瀏覽數
      incrementView(props.traveler.id)
    }
  } catch (error) {
    console.error('抓取詳細資料失敗:', error)
  }
}

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
    console.error(error)
  }
}

const toggleCommentLike = (item) => {
  if (typeof item.likes !== 'number') item.likes = 0
  if (item.isLiked) {
    item.likes--
  } else {
    item.likes++
  }
  item.isLiked = !item.isLiked
}

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

    localComments.value = [
      {
        id: Date.now(),
        author: userStore.currentUser?.displayName || '我',
        avatar:
          userStore.currentUser?.photoURL ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserUid.value}`,
        content: content,
        time: '剛剛',
        likes: 0,
        isLiked: false,
        replies: [],
      },
      ...localComments.value,
    ]

    newComment.value = ''

    await nextTick()
    if (commentsSectionRef.value) {
      commentsSectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch (error) {
    console.error(error)
  }
}

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

const getDayLabel = (index) => {
  const startDateStr = localTravelerData.value.date || '2026/01/15'
  const parts = startDateStr.split(/[/-]/)
  if (parts.length >= 3) {
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])

    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + index)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}/${d}`
  }
  return `Day ${index + 1}`
}

const itemData = computed(() => ({
  id: localTravelerData.value.id,
  type: 'traveler',
  title: localTravelerData.value.title,
  content: localTravelerData.value.content,
  image: localTravelerData.value.image,
  author: localTravelerData.value.author,
  avatar: localTravelerData.value.avatar,
  location: localTravelerData.value.location,
  date: localTravelerData.value.date,
  status: localTravelerData.value.status,
  people: localTravelerData.value.people,
  tags: localTravelerData.value.tags,
  comments: localTravelerData.value.comments,
}))

onMounted(async () => {
  if (props.traveler) {
    likesCount.value = props.traveler.likes || 0
    localComments.value = props.traveler.commentsData || []

    // ★★★ 一掛載就去抓詳細資料 ★★★
    await fetchFullTravelerDetails()

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
      class="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border-2 border-primary overflow-hidden relative"
    >
      <button
        class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
        @click="emit('close')"
      >
        <XIcon class="w-6 h-6" />
      </button>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="relative w-full h-72 overflow-hidden">
          <img
            :src="localTravelerData.image"
            :alt="localTravelerData.title"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

          <div
            :class="getStatusClasses(localTravelerData.status)"
            class="absolute top-4 left-4 px-4 py-2 font-bold text-sm rounded-lg border-2 border-primary"
          >
            {{ localTravelerData.status }}
          </div>
        </div>

        <div class="p-6">
          <div class="mb-6">
            <h1 class="text-3xl font-black text-secondary-900 mb-4">
              {{ localTravelerData.title }}
            </h1>

            <div class="flex items-center space-x-3 mb-4">
              <img
                :src="localTravelerData.avatar"
                class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
              />
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-secondary-900">{{ localTravelerData.author }}</span>
                  <span
                    class="text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full"
                  >
                    {{ localTravelerData.spiritAnimal }}
                  </span>
                </div>
                <div class="text-sm text-secondary-500">
                  發布於 {{ localTravelerData.created_at || '最近' }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">地點</span>
                </div>
                <div class="font-bold text-secondary-900">{{ localTravelerData.location }}</div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">日期</span>
                </div>
                <div class="font-bold text-secondary-900">{{ localTravelerData.date }}</div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">人數</span>
                </div>
                <div class="font-bold text-primary-600">{{ localTravelerData.people }}</div>
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

          <div
            v-if="localTravelerData.tags && localTravelerData.tags.length"
            class="flex flex-wrap gap-2 mb-6"
          >
            <span
              v-for="tag in localTravelerData.tags"
              :key="tag"
              class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="prose prose-lg max-w-none mb-6">
            <p class="text-secondary-700 leading-relaxed whitespace-pre-wrap">
              {{ localTravelerData.content }}
            </p>
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
              v-if="localTravelerData.status === '招募中'"
              class="ml-auto bg-primary-600 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-700 transition shadow-md"
            >
              聯繫作者
            </button>
            <div v-else class="ml-auto text-secondary-400 font-bold">
              {{ localTravelerData.status }}
            </div>
          </div>

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

          <div v-if="activeTab === 'itinerary'" class="space-y-6">
            <div v-if="itineraryData.days && itineraryData.days.length > 0">
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

              <div class="space-y-4">
                <div v-if="activeDay.activities && activeDay.activities.length > 0">
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
                <div v-else class="text-center text-gray-500 py-4">當天無活動安排</div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-10 bg-gray-50 rounded-lg">
              作者尚未新增詳細行程
            </div>

            <div
              v-if="itineraryData.packingList && itineraryData.packingList.length > 0"
              class="mt-8"
            >
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
                      <span class="text-xs text-secondary-400">{{ formatTime(comment.time) }}</span>
                    </div>
                    <p class="text-secondary-700 text-sm mb-2">{{ comment.content }}</p>

                    <div class="flex items-center space-x-4 text-xs text-secondary-500">
                      <button
                        class="flex items-center space-x-1 hover:text-accent-600 transition"
                        @click="toggleCommentLike(comment)"
                      >
                        <HeartIcon
                          :class="[
                            'w-3 h-3',
                            comment.isLiked ? 'fill-current text-accent-600' : '',
                          ]"
                        />
                        <span>{{ comment.likes || 0 }}</span>
                      </button>
                    </div>

                    <div
                      v-if="comment.replies && comment.replies.length"
                      class="mt-3 pl-4 border-l-2 border-primary-200 space-y-2"
                    >
                      <div v-for="reply in comment.replies" :key="reply.id">
                        <div class="flex items-start space-x-2">
                          <img :src="reply.avatar" class="w-7 h-7 rounded-full object-cover" />
                          <div class="flex-1">
                            <span class="font-bold text-secondary-900 text-xs">{{
                              reply.author
                            }}</span>
                            <span class="text-xs text-secondary-400 ml-2">{{
                              formatTime(reply.time)
                            }}</span>
                            <p class="text-secondary-700 text-xs mt-0.5">{{ reply.content }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-secondary-400 py-10">
              目前沒有留言，來當第一個吧！
            </div>
          </div>
        </div>
      </div>

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
