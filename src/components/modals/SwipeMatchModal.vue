<script setup>
import { ref, computed } from 'vue'
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

const emit = defineEmits(['close'])

const candidates = ref([
  {
    id: 1,
    name: '小雅',
    age: 23,
    location: '台北市',
    spiritAnimal: '🐱 好奇寶寶',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Lisa&backgroundColor=b6e3f4',
    bio: '剛畢業想去環島！找人一起騎機車吹風，我不怕曬，只怕餓肚子 🛵',
    wishlist: ['蘭嶼', '綠島', '台南'],
    activities: ['逛夜市', '看海', '騎機車', '探店'],
    tags: ['機車環島', '銅板美食'], // 資料留著備用，但畫面不顯示
    gallery: [
      'https://images.unsplash.com/photo-1558273614-2575dc29f427?q=60&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=60&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=60&w=600&auto=format&fit=crop',
    ],
    pastTrips: [
      { id: 101, title: '花蓮三天兩夜', date: '2023.12', rating: 5 },
      { id: 102, title: '澎湖花火節', date: '2023.06', rating: 4 },
    ],
  },
  {
    id: 2,
    name: '阿豪',
    age: 28,
    location: '台中市',
    spiritAnimal: '🦁 登山客',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Brian&backgroundColor=ffdfbf',
    bio: '百岳進度 25/100。週末不想待在家，徵求山友一起撿三角點！⛰️',
    wishlist: ['嘉明湖', '玉山', '富士山'],
    activities: ['登山', '露營', '野炊', '看日出'],
    tags: ['百岳', '野營'],
    gallery: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=60&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=60&w=600&auto=format&fit=crop',
    ],
    pastTrips: [
      { id: 201, title: '雪山主東峰', date: '2024.01', rating: 5 },
      { id: 202, title: '奇萊南華', date: '2023.11', rating: 5 },
      { id: 203, title: '合歡北峰', date: '2023.09', rating: 4 },
    ],
  },
  {
    id: 3,
    name: 'Kiki',
    age: 26,
    location: '高雄市',
    spiritAnimal: '🦊 攝影迷',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Jessica&backgroundColor=ffd5dc',
    bio: '喜歡帶著底片機隨處走走，想去日本拍櫻花，行程不用太趕 🌸',
    wishlist: ['京都', '鎌倉', '北海道'],
    activities: ['街拍', '逛美術館', '咖啡廳', '二手市集'],
    tags: ['日系', '文青'],
    gallery: [
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=60&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=60&w=600&auto=format&fit=crop',
    ],
    pastTrips: [{ id: 301, title: '東京獨旅', date: '2023.10', rating: 5 }],
  },
  {
    id: 4,
    name: '傑森',
    age: 30,
    location: '新竹市',
    spiritAnimal: '🐻 咖啡控',
    image: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Christopher&backgroundColor=c0aede',
    bio: '工程師的逃亡之旅，只想找個安靜的地方喝咖啡放空，不排行程就是最好的行程 ☕️',
    wishlist: ['清邁', '墨爾本', '西雅圖'],
    activities: ['手沖咖啡', '看書', '發呆', '散步'],
    tags: ['放鬆', '不趕路'],
    gallery: [
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=60&w=600&auto=format&fit=crop',
    ],
    pastTrips: [],
  },
])

const currentIndex = ref(0)
const currentCard = computed(() => candidates.value[currentIndex.value])
const isFinished = computed(() => !currentCard.value)

// 詳情頁狀態
const isDetailOpen = ref(false)

const openDetail = () => {
  isDetailOpen.value = true
}
const closeDetail = () => {
  isDetailOpen.value = false
}

// 觸控拖曳邏輯變數
const startX = ref(0)
const currentX = ref(0)
const isDragging = ref(false)
const cardElement = ref(null)

const cardStyle = computed(() => {
  if (autoSwipeDirection.value) {
    const rotate = autoSwipeDirection.value === 'right' ? 20 : -20
    const translateX = autoSwipeDirection.value === 'right' ? 1000 : -1000
    return {
      transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      opacity: 0,
      transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
    }
  }

  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    const rotate = xDiff * 0.1
    return {
      transform: `translateX(${xDiff}px) rotate(${rotate}deg)`,
      transition: 'none',
      cursor: 'grabbing',
    }
  }

  return {
    transform: 'translateX(0) rotate(0)',
    transition: 'transform 0.3s ease-out',
  }
})

const swipeFeedback = computed(() => {
  if (autoSwipeDirection.value) return autoSwipeDirection.value === 'right' ? 'like' : 'nope'
  if (isDragging.value) {
    const xDiff = currentX.value - startX.value
    if (xDiff > 50) return 'like'
    if (xDiff < -50) return 'nope'
  }
  return null
})

const autoSwipeDirection = ref(null)

const handleButtonClick = (direction) => {
  if (isFinished.value || autoSwipeDirection.value) return
  isDetailOpen.value = false
  autoSwipeDirection.value = direction
  finishSwipe(direction)
}

// 觸控事件
const onTouchStart = (e) => {
  if (isFinished.value || autoSwipeDirection.value || isDetailOpen.value) return
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
  const threshold = 100

  if (xDiff > threshold) {
    handleButtonClick('right')
  } else if (xDiff < -threshold) {
    handleButtonClick('left')
  } else {
    currentX.value = 0
    startX.value = 0
  }
}

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
        class="absolute inset-0 bg-[#fffef7] rounded-3xl flex flex-col items-center justify-center p-8 text-center shadow-2xl border-4 border-gray-800 z-0"
      >
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <SparklesIcon class="w-10 h-10 text-yellow-500" />
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">今日配對次數已用完</h3>
        <p class="text-gray-500 mb-6 text-sm">明天再來看看有沒有新的旅伴吧！</p>
        <button
          @click="$emit('close')"
          class="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-700 transition"
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

        <div class="flex-1 flex flex-col p-5 bg-[#fffef7]">
          <div class="mb-4 pointer-events-none">
            <p class="text-xs font-bold text-gray-400 mb-2 flex items-center">
              <SparklesIcon class="w-3 h-3 mr-1" /> 也想去的地方 (城市/國家)
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
            <button @click.stop="handleButtonClick('left')" class="action-btn-nope">
              <XIcon class="w-8 h-8 pointer-events-none" />
            </button>
            <button
              @click.stop="openDetail"
              class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-blue-100 hover:text-blue-500 transition cursor-pointer"
            >
              <InfoIcon class="w-5 h-5" />
            </button>
            <button @click.stop="handleButtonClick('right')" class="action-btn-like">
              <HeartIcon class="w-8 h-8 fill-current pointer-events-none" />
            </button>
          </div>
        </div>

        <Transition name="slide-up">
          <div
            v-if="isDetailOpen"
            class="absolute inset-0 bg-[#fffef7] z-50 overflow-y-auto detail-scrollbar flex flex-col"
            @mousedown.stop
            @touchstart.stop
          >
            <div class="relative h-[45%] shrink-0 bg-gray-100">
              <img :src="currentCard.image" class="w-full h-full object-cover" />
              <div
                class="absolute inset-0 bg-gradient-to-t from-[#fffef7] via-transparent to-transparent"
              ></div>

              <button
                @click="closeDetail"
                class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition z-50"
              >
                <ChevronDownIcon class="w-6 h-6" />
              </button>

              <div class="absolute bottom-0 left-0 p-6 w-full">
                <h2 class="text-3xl font-black text-gray-900 mb-1">
                  {{ currentCard.name }}, {{ currentCard.age }}
                </h2>
                <div class="flex items-center text-gray-600 font-bold text-sm">
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
                  <SparklesIcon class="w-4 h-4 mr-1 text-orange-500" /> 也想去的地方
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="place in currentCard.wishlist"
                    :key="place"
                    class="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold border-2 border-orange-200 shadow-sm"
                  >
                    {{ place }}
                  </span>
                </div>
              </section>

              <section v-if="currentCard.activities && currentCard.activities.length">
                <h3 class="section-title flex items-center">
                  <TentIcon class="w-4 h-4 mr-1 text-green-600" /> 喜歡的活動
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="act in currentCard.activities"
                    :key="act"
                    class="px-3 py-1.5 border border-green-200 bg-green-50 text-green-700 rounded-lg text-sm font-bold"
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
                    :key="idx"
                    class="aspect-square rounded-xl overflow-hidden bg-gray-200"
                  >
                    <img
                      :src="photo"
                      class="w-full h-full object-cover hover:scale-110 transition duration-500"
                    />
                  </div>
                </div>
              </section>

              <section v-if="currentCard.pastTrips && currentCard.pastTrips.length">
                <h3 class="section-title flex items-center">
                  <CalendarIcon class="w-4 h-4 mr-1" /> 過往旅程
                </h3>
                <div class="space-y-4">
                  <div v-for="trip in currentCard.pastTrips" :key="trip.id" class="flex gap-4">
                    <div class="flex flex-col items-center">
                      <div class="w-3 h-3 rounded-full bg-orange-400 ring-4 ring-orange-100"></div>
                      <div class="w-0.5 h-full bg-gray-200 my-1"></div>
                    </div>
                    <div class="pb-2">
                      <h4 class="font-bold text-gray-800">{{ trip.title }}</h4>
                      <span class="text-xs text-gray-500 block mb-1">{{ trip.date }}</span>
                      <div class="flex text-yellow-400 text-xs">
                        <span v-for="i in trip.rating" :key="i">★</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div
              class="sticky bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-[#fffef7] via-[#fffef7] to-transparent flex justify-center gap-12 border-t border-gray-100/50 backdrop-blur-sm z-40"
            >
              <button
                @click="handleButtonClick('left')"
                class="action-btn-nope scale-110 shadow-md"
              >
                <XIcon class="w-8 h-8 pointer-events-none" />
              </button>
              <button
                @click="handleButtonClick('right')"
                class="action-btn-like scale-110 shadow-lg shadow-orange-200"
              >
                <HeartIcon class="w-8 h-8 fill-current pointer-events-none" />
              </button>
            </div>
          </div>
        </Transition>
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
  @apply w-14 h-14 rounded-full bg-white border-2 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 cursor-pointer;
}
.action-btn-like {
  @apply w-16 h-16 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 text-white shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer;
}

.section-title {
  @apply text-sm font-bold text-gray-400 uppercase tracking-wider mb-3;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.detail-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.detail-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 3px;
}
</style>
