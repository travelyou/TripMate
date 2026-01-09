<script setup>
import {
  Star as StarIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  UserPlus as UserPlusIcon,
  Award as AwardIcon,
  FileText as FileTextIcon,
  Map as MapIcon,
  Calendar as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  // ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next'

// 廠商基本資料 (模擬數據 - 靜態展示用)
const vendor = {
  id: 'vendor001',
  name: '環遊世界旅行社',
  slogan: '帶您探索世界的每一個角落',
  avatar: 'https://picsum.photos/200?random=vendor',
  coverImage: 'https://picsum.photos/1200/400?random=travel',
  bannerImage: 'https://picsum.photos/1200/600?random=banner',
  regionTags: ['日本', '韓國', '東南亞', '歐洲', '美洲'],
  rating: 4.8,
  reviewCount: 328,
  postsCount: 45,
  itineraryCount: 28,
  followersCount: 1520,
  description:
    '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。',
  isVerified: true,
}

// 廠商貼文 (模擬數據 - 靜態展示用)
const vendorPosts = [
  {
    id: 1,
    title: '京都賞楓最佳時機分享',
    content:
      '每年11月中旬到12月初，是京都賞楓的黃金時期。清水寺、嵐山、東福寺都是絕佳的賞楓景點，建議避開週末人潮...',
    image: 'https://picsum.photos/600/400?random=kyoto',
    likes: 245,
    comments: 38,
    time: '3 天前',
    tags: ['日本', '賞楓', '京都'],
  },
  {
    id: 2,
    title: '峇里島私房景點大公開',
    content:
      '除了烏布和庫塔，峇里島還有許多鮮為人知的絕美景點。今天要跟大家分享我們最近發掘的幾個私房景點，包括隱藏版瀑布和秘境海灘...',
    image: 'https://picsum.photos/600/400?random=bali',
    likes: 189,
    comments: 25,
    time: '5 天前',
    tags: ['峇里島', '印尼', '秘境'],
  },
  {
    id: 3,
    title: '冰島極光攝影技巧',
    content:
      '想要拍出震撼的極光照片嗎？相機設置、拍攝地點、時機選擇都是關鍵。這篇文章分享我們多年來累積的極光攝影經驗...',
    image: 'https://picsum.photos/600/400?random=aurora',
    likes: 412,
    comments: 56,
    time: '1 週前',
    tags: ['冰島', '極光', '攝影'],
  },
]

// 精選行程 (模擬數據 - 靜態展示用)
// 僅展示靜態結構，不做動態過濾
const featuredItineraries = [
  {
    id: 1,
    name: '日本關西經典五日遊',
    image: 'https://picsum.photos/400/300?random=osaka',
    price: 32800,
    originalPrice: 38800,
    days: 5,
    nights: 4,
    rating: 4.9,
    reviewCount: 156,
    region: '日本',
    tags: ['熱門', '限時優惠'],
    highlights: ['大阪環球影城', '京都古寺巡禮', '奈良餵鹿'],
  },
  {
    id: 2,
    name: '峇里島奢華度假七日',
    image: 'https://picsum.photos/400/300?random=bali2',
    price: 45600,
    originalPrice: null,
    days: 7,
    nights: 6,
    rating: 4.8,
    reviewCount: 89,
    region: '東南亞',
    tags: ['精選'],
    highlights: ['五星級Villa', '私人海灘', 'SPA體驗'],
  },
  {
    id: 3,
    name: '冰島極光追尋八日',
    image: 'https://picsum.photos/400/300?random=iceland',
    price: 89900,
    originalPrice: 95900,
    days: 8,
    nights: 7,
    rating: 5.0,
    reviewCount: 42,
    region: '歐洲',
    tags: ['熱門', '小團限定'],
    highlights: ['極光獵人', '藍湖溫泉', '冰川健行'],
  },
  {
    id: 4,
    name: '泰國清邁慢活五日',
    image: 'https://picsum.photos/400/300?random=chiangmai',
    price: 18900,
    originalPrice: null,
    days: 5,
    nights: 4,
    rating: 4.7,
    reviewCount: 203,
    region: '東南亞',
    tags: [],
    highlights: ['水燈節體驗', '大象保護區', '手作工藝課程'],
  },
  {
    id: 5,
    name: '紐西蘭南島自駕十日',
    image: 'https://picsum.photos/400/300?random=newzealand',
    price: 76800,
    originalPrice: 82800,
    days: 10,
    nights: 9,
    rating: 4.9,
    reviewCount: 67,
    region: '美洲',
    tags: ['限時優惠'],
    highlights: ['米佛峽灣', '皇后鎮跳傘', '魔戒拍攝地'],
  },
  {
    id: 6,
    name: '越南胡志明美食三日',
    image: 'https://picsum.photos/400/300?random=vietnam',
    price: 12800,
    originalPrice: null,
    days: 3,
    nights: 2,
    rating: 4.6,
    reviewCount: 124,
    region: '東南亞',
    tags: [],
    highlights: ['在地小吃', '咖啡文化', '法式建築'],
  },
]
</script>

<template>
  <div class="p-4 md:p-8 max-w-7xl mx-auto">
    <!-- 廠商封面與頭像區塊 -->
    <div
      class="bg-white rounded-3xl overflow-hidden mb-6 border-4 border-primary-600 shadow-primary"
    >
      <!-- 封面圖片 -->
      <div
        class="h-48 md:h-64 bg-cover bg-center relative"
        :style="{ backgroundImage: `url(${vendor.coverImage})` }"
      >
        <div class="absolute inset-0 bg-black/20"></div>
      </div>

      <!-- 廠商資訊 -->
      <div class="bg-gradient-to-r from-primary-700 to-primary-500 text-white p-4 md:p-6 relative">
        <div class="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20">
          <!-- 廠商頭像 -->
          <div class="relative group">
            <img
              :src="vendor.avatar"
              class="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
            />
            <!-- 認證徽章 -->
            <div
              v-if="vendor.isVerified"
              class="absolute bottom-2 right-2 bg-primary-500 p-1.5 rounded-full border-2 border-white"
            >
              <AwardIcon class="w-4 h-4 text-white" />
            </div>
          </div>

          <!-- 廠商名稱與統計資訊 -->
          <div class="flex-1 text-center md:text-left mt-3 md:mt-0 md:ml-6 mb-2">
            <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 class="text-2xl md:text-3xl font-black tracking-wide">{{ vendor.name }}</h1>
            </div>
            <p class="text-secondary-100 text-sm font-medium mb-3">{{ vendor.slogan }}</p>

            <!-- 評分 -->
            <div class="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div class="flex items-center">
                <StarIcon class="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <span class="ml-1 font-bold text-lg">{{ vendor.rating }}</span>
              </div>
              <span class="text-secondary-100 text-sm">({{ vendor.reviewCount }} 則評價)</span>
            </div>

            <!-- 統計資訊 -->
            <div class="flex justify-center md:justify-start space-x-6">
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.postsCount }}</div>
                <div class="text-xs text-secondary-100">貼文</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.itineraryCount }}</div>
                <div class="text-xs text-secondary-100">行程</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.followersCount }}</div>
                <div class="text-xs text-secondary-100">追蹤者</div>
              </div>
            </div>
          </div>

          <!-- 追蹤按鈕 -->
          <button
            class="mb-4 md:mb-2 bg-white text-primary-600 px-6 py-2.5 rounded-lg font-bold hover:bg-primary-50 transition shadow-md border-2 border-primary-200 flex items-center gap-2"
          >
            <UserPlusIcon class="w-5 h-5" />
            追蹤廠商
          </button>
        </div>
      </div>

      <!-- 廠商簡介 -->
      <div class="p-6 bg-secondary-50 border-t-2 border-primary-100">
        <p class="text-secondary-700 leading-relaxed text-sm md:text-base">
          {{ vendor.description }}
        </p>
      </div>
    </div>

    <!-- 廠商 Banner 區塊 -->
    <div
      class="mb-8 rounded-3xl overflow-hidden h-40 md:h-64 relative border-4 border-primary-600 shadow-primary"
    >
      <img :src="vendor.bannerImage" class="w-full h-full object-cover" />
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6"
      >
        <h2 class="text-white text-2xl md:text-3xl font-black drop-shadow-lg tracking-wide">
          本季主打行程
        </h2>
      </div>
    </div>

    <!-- 精選行程區塊 -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2
          class="inline-flex items-center text-2xl font-black text-primary-700 bg-secondary-50 px-6 py-3 rounded-2xl border-4 border-primary-200 shadow-primary-xl"
        >
          <MapIcon class="w-6 h-6 mr-2" />
          精選行程
        </h2>

        <!-- 地區標籤 Tabs (示意 UI) -->
        <div class="flex overflow-x-auto pb-2 md:pb-0 gap-2 custom-scrollbar">
          <button
            v-for="region in ['全部', ...vendor.regionTags]"
            :key="region"
            class="px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border-2"
            :class="[
              region === '全部'
                ? 'bg-primary-600 text-white border-primary-700 shadow-md'
                : 'bg-white text-secondary-600 border-secondary-200 hover:bg-primary-50',
            ]"
          >
            {{ region }}
          </button>
        </div>
      </div>

      <!-- 響應式網格與手機版輪播 (CSS Only) -->

      <!-- Desktop/Tablet View (md:block): Static Grid -->
      <div class="hidden md:block">
        <!-- Grid of 6 items -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="itinerary in featuredItineraries.slice(0, 6)"
            :key="itinerary.id"
            class="bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer h-full flex flex-col border-4 border-primary-600 shadow-primary"
          >
            <!-- 行程圖片 -->
            <div class="relative h-52 overflow-hidden shrink-0">
              <img
                :src="itinerary.image"
                class="w-full h-full object-cover transition duration-500 hover:scale-110"
              />
              <div class="absolute top-3 left-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in itinerary.tags"
                  :key="tag"
                  class="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md border-2 border-white"
                >
                  {{ tag }}
                </span>
              </div>
              <div
                class="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md"
              >
                <StarIcon class="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span class="font-bold text-sm text-secondary-800">{{ itinerary.rating }}</span>
              </div>
            </div>

            <!-- 行程資訊 -->
            <div class="p-5 flex-1 flex flex-col">
              <h3 class="text-lg font-bold text-secondary-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                {{ itinerary.name }}
              </h3>
              <div class="flex items-center gap-4 mb-2 text-sm text-secondary-600">
                <div class="flex items-center gap-1 bg-primary-50 px-3 py-1 rounded-full">
                  <CalendarIcon class="w-4 h-4 text-primary-600" />
                  <span class="font-semibold text-primary-600"
                    >{{ itinerary.days }}天{{ itinerary.nights }}夜</span
                  >
                </div>
              </div>
              <div class="mb-3 flex-1">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="highlight in itinerary.highlights"
                    :key="highlight"
                    class="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded border border-primary-200"
                  >
                    {{ highlight }}
                  </span>
                </div>
              </div>
              <div class="pt-3 border-t-2 border-secondary-100 mt-auto">
                <div class="flex items-baseline gap-1 mb-3">
                  <span class="text-3xl font-black text-primary-600">{{
                    itinerary.price.toLocaleString()
                  }}</span>
                  <span class="text-sm text-secondary-500 font-medium">起</span>
                  <span
                    v-if="itinerary.originalPrice"
                    class="ml-2 text-sm text-secondary-400 line-through"
                    >NT$ {{ itinerary.originalPrice.toLocaleString() }}</span
                  >
                </div>
                <button
                  class="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white px-5 py-2 rounded-xl font-bold hover:from-primary-700 hover:to-primary-600 transition shadow-md flex items-center justify-center gap-2"
                >
                  <ShoppingCartIcon class="w-4 h-4" /> 立即預訂
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Controls (Static UI) -->
        <div class="flex justify-center mt-6 gap-2">
          <span class="w-6 h-3 rounded-full bg-primary-600"></span>
          <span class="w-3 h-3 rounded-full bg-secondary-300"></span>
          <span class="w-3 h-3 rounded-full bg-secondary-300"></span>
        </div>
      </div>

      <!-- Mobile View (md:hidden): CSS Scroll Snap Carousel -->
      <div class="md:hidden">
        <div class="relative w-full">
          <!-- Scroll Snap Container -->
          <div class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 custom-scrollbar">
            <div
              v-for="itinerary in featuredItineraries"
              :key="itinerary.id"
              class="snap-center w-[calc(50%-8px)] shrink-0 first:ml-0"
            >
              <div
                class="bg-white overflow-hidden h-full flex flex-col border-4 border-primary-600 shadow-primary"
              >
                <div class="relative h-40 overflow-hidden">
                  <img :src="itinerary.image" class="w-full h-full object-cover" />
                  <div
                    v-if="itinerary.tags && itinerary.tags[0]"
                    class="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md border border-white"
                  >
                    {{ itinerary.tags[0] }}
                  </div>
                </div>
                <div class="p-3">
                  <h3 class="text-sm font-bold text-secondary-900 mb-2 line-clamp-2 h-10">
                    {{ itinerary.name }}
                  </h3>
                  <div class="flex flex-col gap-1">
                    <div>
                      <span class="text-lg font-black text-primary-600"
                        >NT${{ itinerary.price.toLocaleString() }}</span
                      >
                      <span class="text-xs text-secondary-500">起</span>
                    </div>
                  </div>
                  <button
                    class="w-full mt-3 bg-primary-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm"
                  >
                    查看
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Expand Button (Static UI) -->
      <div class="flex justify-center mt-4">
        <button
          class="flex items-center gap-2 bg-white text-primary-700 border-2 border-primary-200 px-8 py-3 rounded-full font-bold shadow-sm hover:bg-primary-50 hover:border-primary-400 transition-all hover:shadow-md"
        >
          <span>查看全部行程</span>
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- 廠商貼文區塊 (放置在精選行程下方) -->
    <div class="mb-8">
      <div class="mb-6">
        <h2
          class="inline-flex items-center text-xl font-bold text-primary-700 bg-primary-50 px-5 py-2 rounded-xl border-4 border-primary-200 shadow-primary-strong"
        >
          <FileTextIcon class="w-5 h-5 mr-2" />
          廠商貼文
        </h2>
      </div>

      <div class="space-y-6">
        <div
          v-for="post in vendorPosts"
          :key="post.id"
          class="p-5 bg-secondary-50 hover:shadow-lg transition-shadow cursor-pointer border-4 border-primary-600 shadow-primary"
        >
          <h3 class="text-lg font-bold text-secondary-900 mb-2">
            {{ post.title }}
          </h3>

          <p class="text-secondary-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {{ post.content }}
          </p>

          <div class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-primary-100">
            <img
              :src="post.image"
              class="w-full h-full object-cover hover:scale-105 transition duration-500"
            />
          </div>

          <div
            v-if="post.tags && post.tags.length"
            class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-secondary-100"
          >
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full cursor-pointer hover:bg-primary-200 transition"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-secondary-400 text-sm">
            <button class="flex items-center space-x-1 hover:text-red-500 transition mr-6">
              <HeartIcon class="w-4 h-4" /> <span>{{ post.likes }}</span>
            </button>

            <button class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6">
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ post.comments }}</span>
            </button>

            <span class="ml-auto text-xs text-secondary-400">{{ post.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


