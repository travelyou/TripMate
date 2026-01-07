<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 1. 保留你原本的大型廣告資料庫
const largeAds = [
  {
    id: 1,
    title: '探索日本古都',
    subtitle: '京都大阪五日遊',
    image: 'https://picsum.photos/300/500?random=1',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-500',
  },
  {
    id: 2,
    title: '泰國海島假期',
    subtitle: '普吉島奢華七日',
    image: 'https://picsum.photos/300/500?random=2',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-500',
  },
  {
    id: 3,
    title: '歐洲列車之旅',
    subtitle: '瑞士冰河列車體驗',
    image: 'https://picsum.photos/300/500?random=3',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    textColor: 'text-green-500',
  },
  {
    id: 4,
    title: '韓國潮流購物',
    subtitle: '首爾設計師品牌逛街',
    image: 'https://picsum.photos/300/500?random=4',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-500',
  },
  {
    id: 5,
    title: '澳洲大堡礁潛水',
    subtitle: '凱恩斯潛水證照班',
    image: 'https://picsum.photos/300/500?random=5',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-500',
  },
  {
    id: 6,
    title: '美西國家公園',
    subtitle: '黃石公園深度探索',
    image: 'https://picsum.photos/300/500?random=6',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-500',
  },
  {
    id: 7,
    title: '越南古鎮風情',
    subtitle: '會安燈籠節體驗',
    image: 'https://picsum.photos/300/500?random=7',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-500',
  },
  {
    id: 8,
    title: '紐西蘭南島自駕',
    subtitle: '魔戒場景巡禮',
    image: 'https://picsum.photos/300/500?random=8',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-500',
  },
  {
    id: 9,
    title: '日本滑雪勝地',
    subtitle: '北海道粉雪天堂',
    image: 'https://picsum.photos/300/500?random=9',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-500',
  },
  {
    id: 10,
    title: '中東奢華之旅',
    subtitle: '杜拜七星級體驗',
    image: 'https://picsum.photos/300/500?random=10',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-500',
  },
]

// 2. 保留你原本的方形廣告資料庫
const squareAds = [
  {
    id: 11,
    title: '旅遊保險推薦',
    subtitle: '安心保障每一程',
    image: 'https://picsum.photos/300/300?random=11',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    textColor: 'text-blue-300',
  },
  {
    id: 12,
    title: '機場接送服務',
    subtitle: '專車直達輕鬆行',
    image: 'https://picsum.photos/300/300?random=12',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-100',
    textColor: 'text-green-300',
  },
  {
    id: 13,
    title: '國際漫遊上網',
    subtitle: '高速網路吃到飽',
    image: 'https://picsum.photos/300/300?random=13',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    textColor: 'text-purple-300',
  },
  {
    id: 14,
    title: '外幣兌換優惠',
    subtitle: '線上預約享折扣',
    image: 'https://picsum.photos/300/300?random=14',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    textColor: 'text-red-300',
  },
  {
    id: 15,
    title: '行李箱租借',
    subtitle: '輕巧方便免煩惱',
    image: 'https://picsum.photos/300/300?random=15',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-100',
    textColor: 'text-yellow-300',
  },
  {
    id: 16,
    title: '當地導遊服務',
    subtitle: '深度體驗在地文化',
    image: 'https://picsum.photos/300/300?random=16',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
    textColor: 'text-indigo-300',
  },
  {
    id: 17,
    title: '飯店訂房平台',
    subtitle: '全球住宿比價',
    image: 'https://picsum.photos/300/300?random=17',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-100',
    textColor: 'text-pink-300',
  },
  {
    id: 18,
    title: '租車自駕方案',
    subtitle: '彈性行程自由行',
    image: 'https://picsum.photos/300/300?random=18',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    textColor: 'text-orange-300',
  },
  {
    id: 19,
    title: '特色民宿推薦',
    subtitle: '體驗當地生活',
    image: 'https://picsum.photos/300/300?random=19',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-100',
    textColor: 'text-cyan-300',
  },
  {
    id: 20,
    title: '旅遊活動預訂',
    subtitle: '門票行程一站購足',
    image: 'https://picsum.photos/300/300?random=20',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-100',
    textColor: 'text-gray-300',
  },
]

const selectedLargeAd = ref(null)
const selectedSquareAd = ref(null)

const selectRandomAds = () => {
  // 隨機選取一個大型廣告
  selectedLargeAd.value = largeAds[Math.floor(Math.random() * largeAds.length)]
  // 隨機選取一個方形廣告
  selectedSquareAd.value = squareAds[Math.floor(Math.random() * squareAds.length)]
}

// 在組件掛載時執行隨機選擇
onMounted(() => {
  selectRandomAds()
})

// ⭐️ 關鍵修改：監聽路由變化
// 當網址改變時 (route.path)，重新執行 selectRandomAds
watch(
  () => route.path,
  () => {
    selectRandomAds()
  },
)
</script>

<template>
  <div class="hidden lg:block shrink-0 space-y-6 self-start mt-10">
    <div v-if="selectedLargeAd" class="p-4 bg-white shadow-md rounded-xl">
      <h3 class="font-bold text-gray-800 mb-3 text-center">贊助廣告</h3>
      <div
        :class="[selectedLargeAd.bgColor, selectedLargeAd.borderColor]"
        class="h-[500px] rounded-xl flex flex-col items-center justify-center text-sm hover:opacity-80 cursor-pointer transition relative overflow-hidden"
      >
        <img
          v-if="selectedLargeAd.image"
          :src="selectedLargeAd.image"
          alt="廣告圖片"
          class="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div
          class="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white p-4"
        >
          <p class="mb-2 font-bold text-lg">{{ selectedLargeAd.title }}</p>
          <p class="text-sm">{{ selectedLargeAd.subtitle }}</p>
        </div>
      </div>
    </div>
    <div v-else class="p-4 bg-white shadow-md rounded-xl">
      <h3 class="font-bold text-gray-800 mb-3 text-center">贊助廣告</h3>
      <div
        class="h-[500px] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 text-sm"
      >
        <p class="mb-2 font-bold">載入中...</p>
      </div>
    </div>

    <div v-if="selectedSquareAd" class="p-4 bg-white shadow-md rounded-xl">
      <h3 class="font-bold text-gray-800 mb-3 text-center">合作夥伴</h3>
      <div
        :class="[selectedSquareAd.bgColor, selectedSquareAd.borderColor]"
        class="h-72 rounded-xl flex flex-col items-center justify-center text-sm hover:opacity-80 cursor-pointer transition relative overflow-hidden"
      >
        <img
          v-if="selectedSquareAd.image"
          :src="selectedSquareAd.image"
          alt="廣告圖片"
          class="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div
          class="absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white p-4"
        >
          <p class="mb-2 font-bold text-base">{{ selectedSquareAd.title }}</p>
          <p class="text-xs">{{ selectedSquareAd.subtitle }}</p>
        </div>
      </div>
    </div>
    <div v-else class="p-4 bg-white shadow-md rounded-xl">
      <h3 class="font-bold text-gray-800 mb-3 text-center">合作夥伴</h3>
      <div
        class="h-72 bg-indigo-50 rounded-xl flex flex-col items-center justify-center text-indigo-300 text-sm"
      >
        <p class="mb-2 font-bold">載入中...</p>
      </div>
    </div>
  </div>
</template>

<!-- 移除已轉換為 Tailwind 的舊樣式 -->
