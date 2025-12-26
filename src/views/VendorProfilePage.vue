<script setup>
import { ref, onMounted } from 'vue'
import {
  Star as StarIcon,
  MapPin as MapPinIcon,
  Users as UsersIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  UserPlus as UserPlusIcon,
  Award as AwardIcon,
  FileText as FileTextIcon,
  Map as MapIcon,
  Calendar as CalendarIcon,
  DollarSign as DollarSignIcon,
  ShoppingCart as ShoppingCartIcon,
} from 'lucide-vue-next'

// 廠商基本資料 (模擬數據)
const vendor = {
  id: 'vendor001',
  name: '環遊世界旅行社',
  slogan: '帶您探索世界的每一個角落',
  avatar: 'https://picsum.photos/200?random=vendor',
  coverImage: 'https://picsum.photos/1200/400?random=travel',
  rating: 4.8,
  reviewCount: 328,
  postsCount: 45,
  itineraryCount: 28,
  followersCount: 1520,
  description:
    '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。',
  isVerified: true,
}

// 廠商貼文 (模擬數據)
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

// 精選行程 (模擬數據)
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
    tags: [],
    highlights: ['在地小吃', '咖啡文化', '法式建築'],
  },
]
</script>

<template>
  <div class="p-4 md:p-0">
    <!-- 廠商封面與頭像區塊 -->
    <div class="bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-amber-100 mb-6 pixel-card">
    </div>
  </div>
</template>