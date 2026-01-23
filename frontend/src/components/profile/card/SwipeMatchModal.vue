<script setup>
import { ref, computed, watch } from 'vue'
import {
  X as XIcon,
  Heart as HeartIcon,
  MapPin as MapPinIcon,
  Sparkles as SparklesIcon,
  Info as InfoIcon,
  ChevronDown as ChevronDownIcon,
  Calendar as CalendarIcon,
  Camera as CameraIcon,
  Tent as TentIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getAllUsers } from '@/api/users'
// [修正] 更新路徑
import WishBallPool from '@/components/profile/WishBallPool.vue'

// ... (參數設定省略，保持不變)
const SWIPE_THRESHOLD = 100
const FEEDBACK_THRESHOLD = 50
const AUTO_SWIPE_DISTANCE = 1000
const ROTATION_FACTOR = 0.2
const ANIMATION_DURATION = 500
const MAX_DAILY_SWIPES = 5
const REAPPEAR_DAYS = 90
const REAPPEAR_MS = REAPPEAR_DAYS * 24 * 60 * 60 * 1000

defineEmits(['close'])
const userStore = useUserStore()
const candidates = ref([])
const isLoading = ref(true)

const getTodayKey = () => new Date().toISOString().slice(0, 10)
const getStateKey = (uid) => `swipe_match_state_${uid || 'guest'}`

const loadSwipeState = (uid) => {
  const stateKey = getStateKey(uid)
  try {
    const raw = localStorage.getItem(stateKey)
    const parsed = raw ? JSON.parse(raw) : null
    const baseState = { date: getTodayKey(), count: 0, rejections: {} }
    if (!parsed) return baseState
    const rejections =
      parsed.rejections && typeof parsed.rejections === 'object' ? parsed.rejections : {}
    const isSameDay = parsed.date === baseState.date
    return {
      date: baseState.date,
      count: isSameDay ? Number(parsed.count || 0) : 0,
      rejections: pruneRejections(rejections),
    }
  } catch (error) {
    console.warn('[SwipeMatch] 讀取抽卡狀態失敗，已重置', error)
    return { date: getTodayKey(), count: 0, rejections: {} }
  }
}

const pruneRejections = (rejections) => {
  const cutoff = Date.now() - REAPPEAR_MS
  const cleaned = { ...rejections }
  Object.keys(cleaned).forEach((uid) => {
    if (Number(cleaned[uid]) < cutoff) delete cleaned[uid]
  })
  return cleaned
}

const saveSwipeState = (uid, state) => {
  const stateKey = getStateKey(uid)
  const payload = { ...state, rejections: pruneRejections(state.rejections || {}) }
  try {
    localStorage.setItem(stateKey, JSON.stringify(payload))
  } catch (error) {
    console.warn('[SwipeMatch] 保存抽卡狀態失敗', error)
  }
}

const getCurrentUserId = () => userStore.currentUser?.uid || userStore.currentUser?.id
const swipeState = ref(loadSwipeState(getCurrentUserId()))

const currentIndex = ref(0)
const currentCard = computed(() => candidates.value[currentIndex.value])
const remainingSwipes = computed(() =>
  Math.max(0, MAX_DAILY_SWIPES - (swipeState.value.count || 0)),
)
const isLimitReached = computed(() => !isLoading.value && remainingSwipes.value <= 0)
const isOutOfCards = computed(() => !isLoading.value && !currentCard.value)
const isFinished = computed(() => isLimitReached.value || isOutOfCards.value)
const isProcessing = ref(false)
const loadSeq = ref(0)
const isDetailOpen = ref(false)

const openDetail = () => {
  isDetailOpen.value = true
}
const closeDetail = () => {
  isDetailOpen.value = false
}

const startX = ref(0)
const currentX = ref(0)
const isDragging = ref(false)
const cardElement = ref(null)

const cardStyle = computed(() => {
  if (autoSwipeDirection.value) {
    const rotate = autoSwipeDirection.value === 'right' ? 20 : -20
    const translateX =
      autoSwipeDirection.value === 'right' ? AUTO_SWIPE_DISTANCE : -AUTO_SWIPE_DISTANCE
    const durationSec = ANIMATION_DURATION / 1000
    return {
      transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      opacity: 0,
      transition: `transform ${durationSec}s ease-out, opacity ${durationSec}s ease-out`,
    }
  }
  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    const rotate = xDiff * ROTATION_FACTOR
    return {
      transform: `translateX(${xDiff}px) rotate(${rotate}deg)`,
      transition: 'none',
      cursor: 'grabbing',
    }
  }
  return { transform: 'translateX(0) rotate(0)', transition: 'transform 0.3s ease-out' }
})

const swipeFeedback = computed(() => {
  if (autoSwipeDirection.value) return autoSwipeDirection.value === 'right' ? 'like' : 'nope'
  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    if (xDiff > FEEDBACK_THRESHOLD) return 'like'
    if (xDiff < -FEEDBACK_THRESHOLD) return 'nope'
  }
  return null
})

const autoSwipeDirection = ref(null)

const handleButtonClick = (direction) => {
  if (isFinished.value || !currentCard.value || autoSwipeDirection.value || isProcessing.value)
    return
  isDetailOpen.value = false
  isProcessing.value = true
  autoSwipeDirection.value = direction
  finishSwipe(direction)
}

const onTouchStart = (e) => {
  if (
    isFinished.value ||
    !currentCard.value ||
    autoSwipeDirection.value ||
    isDetailOpen.value ||
    isProcessing.value
  )
    return
  isDragging.value = true
  startX.value = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
  currentX.value = startX.value
}

const onTouchMove = (e) => {
  if (!isDragging.value) return
  const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX
  currentX.value = clientX
}

const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  const xDiff = currentX.value - startX.value
  if (xDiff > SWIPE_THRESHOLD) {
    handleButtonClick('right')
  } else if (xDiff < -SWIPE_THRESHOLD) {
    handleButtonClick('left')
  } else {
    currentX.value = 0
    startX.value = 0
  }
}

const finishSwipe = (direction) => {
  const swipedCard = currentCard.value
  setTimeout(() => {
    if (swipedCard) {
      const uid = getCurrentUserId()
      swipeState.value = {
        ...swipeState.value,
        date: getTodayKey(),
        count: (swipeState.value.count || 0) + 1,
        rejections:
          direction === 'left' && swipedCard.uid
            ? { ...(swipeState.value.rejections || {}), [swipedCard.uid]: Date.now() }
            : { ...(swipeState.value.rejections || {}) },
      }
      saveSwipeState(uid, swipeState.value)
      if (direction === 'right') {
        handleSwipeLike(swipedCard)
      }
    }
    currentIndex.value++
    autoSwipeDirection.value = null
    startX.value = 0
    currentX.value = 0
    isProcessing.value = false
  }, ANIMATION_DURATION)
}

const handleSwipeLike = async (swipedCard) => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid || !swipedCard?.uid) return
  try {
    const { likeSwipe } = await import('@/api/swipes')
    const result = await likeSwipe(currentUid, swipedCard.uid)
    if (result?.matched) {
      try {
        const { getProfile } = await import('@/api/profile')
        const profileData = await getProfile(currentUid)
        if (profileData?.friends) {
          userStore.currentUser.friends = profileData.friends
        }
      } catch (error) {
        console.warn('[SwipeMatch] 更新好友列表失敗：', error)
      }
      const chatUser = {
        uid: swipedCard.uid,
        name: swipedCard.name,
        nickname: swipedCard.name,
        avatar: swipedCard.image,
      }
      window.dispatchEvent(new CustomEvent('open-chat', { detail: { user: chatUser } }))
    }
  } catch (error) {
    console.error('[SwipeMatch] 抽卡喜歡失敗：', error)
  }
}

const shuffle = (list) => {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const mapUserToCandidate = (user) => {
  const uid = user.uid || user.id
  const displayName =
    user.nickname || user.real_name || (user.email ? user.email.split('@')[0] : '旅伴')

  // 1. 圖片優先使用 card_photo (方形)
  const displayImage =
    user.card_photo ||
    user.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid || displayName}`

  // 2. 標籤優先使用 card_tags
  const tags =
    Array.isArray(user.card_tags) && user.card_tags.length > 0
      ? user.card_tags
      : Array.isArray(user.tags)
        ? user.tags
        : []

  // 3. 自介優先使用 card_bio
  const bio = user.card_bio || user.bio || '期待一起出發的新旅伴。'

  return {
    id: uid,
    uid,
    name: displayName,
    age: user.age || '—',
    location: user.location || '台灣',
    spiritAnimal: user.spirit_animal || user.spiritAnimal || '🐾 旅伴',
    image: displayImage,
    bio: bio,
    wishlist: user.wishlist || [],
    activities: [],
    tags,
    gallery: user.gallery || [],
    pastTrips: [],
  }
}

const loadCandidates = async (uid, state = swipeState.value) => {
  isLoading.value = true
  const seq = ++loadSeq.value
  try {
    const allUsers = await getAllUsers()
    if (seq !== loadSeq.value) return
    const rejections = state?.rejections || {}
    const cutoff = Date.now() - REAPPEAR_MS

    const filtered = allUsers
      .filter((user) => (user.uid || user.id) && (uid ? (user.uid || user.id) !== uid : true))
      .filter((user) => {
        const userId = user.uid || user.id
        if (!userId) return false
        const rejectedAt = Number(rejections[userId])
        return !rejectedAt || rejectedAt < cutoff
      })
      .map(mapUserToCandidate)

    if (seq !== loadSeq.value) return
    candidates.value = shuffle(filtered)
    currentIndex.value = 0
  } catch (error) {
    console.error('[SwipeMatch] 載入用戶列表失敗', error)
    if (seq !== loadSeq.value) return
    candidates.value = []
    currentIndex.value = 0
  } finally {
    if (seq === loadSeq.value) {
      isLoading.value = false
    }
  }
}

watch(
  () => getCurrentUserId(),
  async (uid) => {
    const state = loadSwipeState(uid)
    swipeState.value = state
    await loadCandidates(uid, state)
  },
  { immediate: true },
)
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <div
      class="relative w-full max-w-sm h-[650px] max-h-[calc(100dvh-2rem)] flex flex-col perspective-1000"
    >
      <div
        v-if="isLimitReached"
        class="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-2xl border-2 border-secondary-200 z-0"
      >
        <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
          <SparklesIcon class="w-10 h-10 text-primary-600" />
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">今日配對次數已用完</h3>
        <p class="text-gray-500 mb-6 text-sm">明天再來看看有沒有新的旅伴吧！</p>
        <button
          class="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition shadow-md"
          @click="$emit('close')"
        >
          關閉視窗
        </button>
      </div>

      <div
        v-else-if="currentCard"
        ref="cardElement"
        class="relative w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-primary flex flex-col z-10 select-none touch-none"
        :style="cardStyle"
        @mousedown="onTouchStart"
        @mousemove="onTouchMove"
        @mouseup="onTouchEnd"
        @mouseleave="onTouchEnd"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="relative h-[60%] w-full overflow-hidden bg-gray-100">
          <img
            :src="currentCard.image"
            :alt="currentCard.name"
            class="w-full h-full object-cover pointer-events-none"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
          ></div>
          <button
            class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-secondary-600 border border-white/80 backdrop-blur-md flex items-center justify-center hover:bg-white transition shadow-sm"
            title="停止抽卡"
            @click="$emit('close')"
          >
            <XIcon class="w-5 h-5" />
          </button>

          <div class="absolute top-4 left-4">
            <span
              class="inline-flex items-center px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white text-primary-700 text-xs font-bold shadow-sm"
            >
              {{ currentCard.spiritAnimal }}
            </span>
          </div>

          <div class="absolute bottom-0 left-0 p-5 text-white w-full pointer-events-none">
            <h2 class="text-3xl font-black mb-1 flex items-end gap-2 drop-shadow-md">
              {{ currentCard.name }}
              <span class="text-xl font-medium opacity-90">{{ currentCard.age }}</span>
            </h2>
            <div class="flex items-center text-sm font-bold opacity-90">
              <MapPinIcon class="w-4 h-4 mr-1 text-primary-200 fill-primary-200" />
              {{ currentCard.location }}
            </div>
          </div>

          <div
            v-if="swipeFeedback === 'like'"
            class="absolute top-10 right-10 border-4 border-green-400 text-green-400 px-4 py-2 rounded-xl text-3xl font-black -rotate-12 uppercase tracking-widest opacity-80 scale-125 z-20"
          >
            LIKE
          </div>
          <div
            v-if="swipeFeedback === 'nope'"
            class="absolute top-10 left-10 border-4 border-red-500 text-red-500 px-4 py-2 rounded-xl text-3xl font-black rotate-12 uppercase tracking-widest opacity-80 scale-125 z-20"
          >
            NOPE
          </div>
        </div>

        <div class="flex-1 flex flex-col p-5 bg-white">
          <div class="mb-4 pointer-events-none">
            <p class="text-xs font-bold text-gray-400 mb-2 flex items-center">
              <SparklesIcon class="w-3 h-3 mr-1" /> 也想去的地方 (城市/國家)
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="place in currentCard.wishlist"
                :key="place"
                class="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold border border-primary-100"
              >
                {{ place }}
              </span>
            </div>
          </div>

          <div class="mb-auto pointer-events-none">
            <p class="text-gray-600 text-sm leading-relaxed line-clamp-2">
              {{ currentCard.bio }}
            </p>
          </div>

          <div class="flex justify-center items-center gap-6 mt-4" @touchstart.stop @mousedown.stop>
            <button class="action-btn-nope" @click.stop="handleButtonClick('left')">
              <XIcon class="w-8 h-8 pointer-events-none" />
            </button>
            <button
              class="w-10 h-10 rounded-full bg-secondary-100 text-secondary-500 border border-secondary-200 flex items-center justify-center hover:bg-primary-50 hover:text-primary-600 transition cursor-pointer"
              @click.stop="openDetail"
            >
              <InfoIcon class="w-5 h-5" />
            </button>
            <button class="action-btn-like" @click.stop="handleButtonClick('right')">
              <HeartIcon class="w-8 h-8 fill-current pointer-events-none" />
            </button>
          </div>
        </div>

        <Transition name="slide-up">
          <div
            v-if="isDetailOpen"
            class="absolute inset-0 bg-white z-50 overflow-y-auto detail-scrollbar flex flex-col"
            @mousedown.stop
            @touchstart.stop
          >
            <div class="relative h-[45%] shrink-0 bg-gray-100">
              <img
                :src="currentCard.image"
                :alt="currentCard.name"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"
              ></div>

              <button
                class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-primary-700 border-2 border-primary backdrop-blur-md flex items-center justify-center hover:bg-primary-50 transition z-50 shadow-primary-sm"
                @click="closeDetail"
              >
                <ChevronDownIcon class="w-6 h-6" />
              </button>

              <div class="absolute bottom-0 left-0 p-6 w-full">
                <h2 class="text-3xl font-black text-secondary-900 mb-1">
                  {{ currentCard.name }}, {{ currentCard.age }}
                </h2>
                <div class="flex items-center text-secondary-600 font-bold text-sm">
                  <MapPinIcon class="w-4 h-4 mr-1" /> {{ currentCard.location }}
                </div>
              </div>
            </div>

            <div class="p-6 pt-2 space-y-8 pb-32">
              <section>
                <h3 class="section-title">關於我</h3>
                <p class="text-gray-700 leading-relaxed font-medium">{{ currentCard.bio }}</p>
              </section>

              <section v-if="currentCard.wishlist && currentCard.wishlist.length">
                <h3 class="section-title flex items-center">
                  <SparklesIcon class="w-4 h-4 mr-1 text-primary-500" /> 也想去的地方 (許願球池)
                </h3>
                <div
                  class="h-48 rounded-2xl overflow-hidden shadow-inner bg-gray-50 border border-gray-100"
                >
                  <WishBallPool :wishlist="currentCard.wishlist" />
                </div>
              </section>

              <section v-if="currentCard.tags && currentCard.tags.length">
                <h3 class="section-title flex items-center">
                  <TentIcon class="w-4 h-4 mr-1 text-green-600" /> 喜歡的活動
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="act in currentCard.tags"
                    :key="act"
                    class="px-3 py-1.5 border border-secondary-200 bg-secondary-50 text-secondary-700 rounded-lg text-sm font-bold"
                  >
                    {{ act }}
                  </span>
                </div>
              </section>

              <section v-if="currentCard.gallery && currentCard.gallery.length">
                <h3 class="section-title flex items-center">
                  <CameraIcon class="w-4 h-4 mr-1" /> 旅遊相簿
                </h3>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="(photo, idx) in currentCard.gallery"
                    :key="photo"
                    class="aspect-square rounded-xl overflow-hidden bg-gray-200"
                  >
                    <img
                      :src="photo"
                      class="w-full h-full object-cover hover:scale-110 transition duration-500"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div
              class="sticky bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-white via-white to-transparent flex justify-center gap-12 border-t border-secondary-100/60 backdrop-blur-sm z-40"
            >
              <button
                class="action-btn-nope scale-110 shadow-md"
                @click="handleButtonClick('left')"
              >
                <XIcon class="w-8 h-8 pointer-events-none" />
              </button>
              <button
                class="action-btn-like scale-110 shadow-primary-sm"
                @click="handleButtonClick('right')"
              >
                <HeartIcon class="w-8 h-8 fill-current pointer-events-none" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <div
        v-else
        class="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-2xl border-2 border-secondary-200 z-0"
      >
        <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
          <SparklesIcon class="w-10 h-10 text-primary-600" />
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">
          {{ isLoading ? '正在載入旅伴...' : '目前沒有可抽的旅伴' }}
        </h3>
        <p class="text-gray-500 mb-6 text-sm">
          {{ isLoading ? '請稍候一下下' : '稍後再回來看看吧！' }}
        </p>
        <button
          class="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition shadow-md"
          @click="$emit('close')"
        >
          關閉視窗
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.touch-none {
  touch-action: none;
}

.action-btn-nope {
  @apply w-14 h-14 rounded-full bg-white border-2 border-secondary-200 text-secondary-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 cursor-pointer;
}
.action-btn-like {
  @apply w-16 h-16 rounded-full bg-primary-600 text-white shadow-primary-sm hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer;
}

.section-title {
  @apply text-sm font-bold text-secondary-400 uppercase tracking-wider mb-3;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* scrollbar rules moved to src/assets/main.css */
</style>
