<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  Heart as HeartIcon,
  MapPin as MapPinIcon,
  Sparkles as SparklesIcon,
  Info as InfoIcon,
} from 'lucide-vue-next'

const emit = defineEmits(['close'])

// 1. 冒險家卡通風格資料
const candidates = ref([
  {
    id: 1,
    name: '小雅',
    age: 23,
    location: '台北市',
    spiritAnimal: '🐱 好奇寶寶',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Lisa&backgroundColor=b6e3f4',
    bio: '剛畢業想去環島！找人一起騎機車吹風 🛵',
    wishlist: ['蘭嶼', '綠島', '台南吃透透'],
    tags: ['騎車', '美食'],
  },
  {
    id: 2,
    name: '阿豪',
    age: 28,
    location: '台中市',
    spiritAnimal: '🦁 登山客',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Brian&backgroundColor=ffdfbf',
    bio: '百岳進度 25/100，週末不想待在家，徵求山友！⛰️',
    wishlist: ['嘉明湖', '玉山', '富士山'],
    tags: ['登山', '戶外'],
  },
  {
    id: 3,
    name: 'Kiki',
    age: 26,
    location: '高雄市',
    spiritAnimal: '🦊 攝影迷',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica&backgroundColor=ffd5dc',
    bio: '喜歡帶著底片機隨處走走，想去日本拍櫻花 🌸',
    wishlist: ['京都', '鎌倉', '底片沖洗'],
    tags: ['攝影', '日系'],
  },
  {
    id: 4,
    name: '傑森',
    age: 30,
    location: '新竹市',
    spiritAnimal: '🐻 咖啡控',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Christopher&backgroundColor=c0aede',
    bio: '工程師的逃亡之旅，只想找個安靜的地方喝咖啡放空 ☕️',
    wishlist: ['清邁', '墨爾本', '自家烘焙'],
    tags: ['咖啡', '放鬆'],
  },
])

const currentIndex = ref(0)
const currentCard = computed(() => candidates.value[currentIndex.value])
const isFinished = computed(() => !currentCard.value)

// 2. 觸控拖曳邏輯變數
const startX = ref(0)
const currentX = ref(0)
const isDragging = ref(false)
const cardElement = ref(null) // 綁定卡片 DOM 元素

// 計算卡片目前的位移樣式
const cardStyle = computed(() => {
  // 如果是按鈕觸發的飛出動畫 (自動)
  if (autoSwipeDirection.value) {
    const rotate = autoSwipeDirection.value === 'right' ? 20 : -20
    const translateX = autoSwipeDirection.value === 'right' ? 1000 : -1000
    return {
      transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      opacity: 0,
      transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
    }
  }

  // 如果是用手指在拖曳 (手動)
  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    const rotate = xDiff * 0.1 // 稍微旋轉
    return {
      transform: `translateX(${xDiff}px) rotate(${rotate}deg)`,
      transition: 'none', // 拖曳時不要有過渡動畫，才跟手跟得緊
      cursor: 'grabbing',
    }
  }

  // 靜止狀態
  return {
    transform: 'translateX(0) rotate(0)',
    transition: 'transform 0.3s ease-out',
  }
})

// 用來判斷要顯示 LIKE 還是 NOPE 印章
const swipeFeedback = computed(() => {
  if (autoSwipeDirection.value) {
    return autoSwipeDirection.value === 'right' ? 'like' : 'nope'
  }
  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    if (xDiff > 50) return 'like'
    if (xDiff < -50) return 'nope'
  }
  return null
})

// 3. 自動滑動 (點擊按鈕時)
const autoSwipeDirection = ref(null)

const handleButtonClick = (direction) => {
  if (isFinished.value || autoSwipeDirection.value) return
  autoSwipeDirection.value = direction
  finishSwipe(direction)
}

// 4. 手指觸控事件處理
const onTouchStart = (e) => {
  if (isFinished.value || autoSwipeDirection.value) return
  isDragging.value = true
  // 兼顧滑鼠與觸控
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
  const threshold = 100 // 滑動超過 100px 才算數

  if (xDiff > threshold) {
    handleButtonClick('right')
  } else if (xDiff < -threshold) {
    handleButtonClick('left')
  } else {
    // 滑不夠遠，彈回去
    currentX.value = 0
    startX.value = 0
  }
}

// 5. 完成滑動後的清理
const finishSwipe = (direction) => {
  console.log(`User swiped ${direction} on ${currentCard.value.name}`)

  setTimeout(() => {
    currentIndex.value++
    autoSwipeDirection.value = null
    startX.value = 0
    currentX.value = 0
  }, 300)
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <div class="relative w-full max-w-sm h-[650px] flex flex-col perspective-1000">
      <div
        v-if="isFinished"
        class="absolute inset-0 bg-[#fffef7] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-2xl border-4 border-gray-800 animate-pop-in z-0"
      >
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <SparklesIcon class="w-10 h-10 text-yellow-500" />
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">今日配對次數已用完</h3>
        <p class="text-gray-500 mb-6 text-sm">明天再來看看有沒有新的旅伴吧！</p>
        <button
          @click="$emit('close')"
          class="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-700 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"
        >
          關閉視窗
        </button>
      </div>

      <div
        v-else
        ref="cardElement"
        class="relative w-full h-full bg-[#fffef7] rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-800 flex flex-col z-10 select-none touch-none"
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
          <img :src="currentCard.image" class="w-full h-full object-cover pointer-events-none" />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
          ></div>

          <div class="absolute top-4 left-4">
            <span
              class="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white text-xs font-bold shadow-sm"
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
              <MapPinIcon class="w-4 h-4 mr-1 text-red-400 fill-red-400" />
              {{ currentCard.location }}
            </div>
          </div>

          <div
            v-if="swipeFeedback === 'like'"
            class="absolute top-10 right-10 border-4 border-green-400 text-green-400 px-4 py-2 rounded-xl text-3xl font-black -rotate-12 uppercase tracking-widest opacity-80 scale-125 z-20 pointer-events-none"
          >
            LIKE
          </div>
          <div
            v-if="swipeFeedback === 'nope'"
            class="absolute top-10 left-10 border-4 border-red-500 text-red-500 px-4 py-2 rounded-xl text-3xl font-black rotate-12 uppercase tracking-widest opacity-80 scale-125 z-20 pointer-events-none"
          >
            NOPE
          </div>
        </div>

        <div class="flex-1 flex flex-col p-5 bg-[#fffef7]">
          <div class="mb-4 pointer-events-none">
            <p class="text-xs font-bold text-gray-400 mb-2 flex items-center">
              <SparklesIcon class="w-3 h-3 mr-1" /> 也想去的地方
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="place in currentCard.wishlist"
                :key="place"
                class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border border-orange-200"
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
            <button
              @click.stop="handleButtonClick('left')"
              class="w-14 h-14 rounded-full bg-white border-2 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 cursor-pointer"
            >
              <XIcon class="w-8 h-8 pointer-events-none" />
            </button>

            <button
              class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition"
            >
              <InfoIcon class="w-5 h-5 pointer-events-none" />
            </button>

            <button
              @click.stop="handleButtonClick('right')"
              class="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 text-white shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
            >
              <HeartIcon class="w-8 h-8 fill-current pointer-events-none" />
            </button>
          </div>
        </div>
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

.animate-pop-in {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
