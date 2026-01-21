<script setup>
import { useRouter } from 'vue-router'
import {
  Users as UsersIcon,
  MessageCircle as MessageCircleIcon,
  BookOpen as BookIcon,
  ShoppingBag as ShoppingBagIcon,
  Layout as LayoutIcon,
  Code as CodeIcon,
  Server as ServerIcon,
  Database as DatabaseIcon,
  Zap as ZapIcon, // 新增：用於 Neon 的閃電圖示
} from 'lucide-vue-next'

// 1. 引入本地圖片
import heroPixelImg from '@/assets/pic/mayoyo.png'
import yuanImg from '@/assets/pic/yuan.jpg'
import thomasImg from '@/assets/pic/thomas.webp'
import hannahImg from '@/assets/pic/Hannah.jpg'
import abiaoImg from '@/assets/pic/biaou.jpg'
import chungImg from '@/assets/pic/Jhong.jpg'

const router = useRouter()

// 2. 成員資料
const teamMembers = [
  {
    name: '源泰',
    role: '後端領導',
    avatar: yuanImg,
    github: 'https://github.com/yuntailee',
  },
  {
    name: '多馬',
    role: '串聯前端介面與資料庫',
    avatar: thomasImg,
    github: 'https://github.com/redpiigpig',
  },
  {
    name: '漢娜',
    role: '個人與廠商介面',
    avatar: hannahImg,
    github: 'https://github.com/HannahKo99',
  },
  {
    name: '阿飆',
    role: '發文介面',
    avatar: abiaoImg,
    github: 'https://github.com/a00680701-coder',
  },
  {
    name: '鍾',
    role: '金流結帳與性格測驗',
    avatar: chungImg,
    github: 'https://github.com/chyt93620',
  },
]

const features = [
  {
    title: '智慧旅伴配對',
    desc: '透過旅遊性格測驗生成最適合你的旅行靈魂動物，並透過直覺的抽卡機制，幫你找到性格最合拍的旅遊夥伴。',
    icon: UsersIcon,
    color: 'bg-rose-100 text-rose-600',
  },
  {
    title: '旅遊社群論壇',
    desc: '分享你的旅遊故事、提問或尋求建議。這裡不僅是資訊交換站，更是「馬遊友」們溫暖的家。',
    icon: MessageCircleIcon,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    title: '專屬旅遊護照',
    desc: '記錄你的每一個足跡。透過我們獨特的護照系統，蒐集旅行勳章，打造屬於你的旅行成就牆。',
    icon: BookIcon,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    title: '行程市集',
    desc: '直接瀏覽並購買優質旅行社或達人規劃的行程，從規劃到結帳，一站搞定。',
    icon: ShoppingBagIcon,
    color: 'bg-emerald-100 text-emerald-600',
  },
]
</script>

<template>
  <div class="min-h-screen bg-secondary-50 pb-20">
    <div class="relative w-full bg-primary-800 overflow-hidden">
      <div
        class="relative max-w-[1200px] mx-auto px-6 py-16 md:py-24 flex flex-col items-center text-center z-10"
      >
        <h1 class="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-md">
          讓旅行不再孤單，下一站，我們一起出發。
        </h1>
        <p class="text-xl md:text-2xl text-primary-100 mb-8 font-medium">
          想要找到一起旅遊的夥伴嗎？<br class="md:hidden" />那就加入我們，一起成為<span
            class="text-yellow-300 font-bold text-2xl md:text-3xl"
            >馬遊友</span
          >吧！
        </p>

        <div
          class="w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl border-4 border-white/20 transform hover:scale-[1.01] transition duration-500 bg-white"
        >
          <img
            :src="heroPixelImg"
            alt="TripMate Pixel Art Team"
            class="w-full h-auto object-cover"
          />
        </div>
      </div>

      <div class="absolute inset-0 bg-primary-900/20 pattern-dots"></div>
    </div>

    <div class="max-w-[1000px] mx-auto px-6 -mt-10 relative z-20">
      <div class="bg-white rounded-3xl p-8 md:p-12 shadow-primary-tall mb-12">
        <h2 class="text-2xl md:text-3xl font-bold text-primary-700 mb-6 text-center">
          關於 TripMate
        </h2>
        <div class="space-y-4 text-secondary-600 leading-relaxed text-lg">
          <p>
            你是否曾經因為找不到合適的旅伴，而放棄了期待已久的旅行？或是為了規劃行程，在無數個網站與論壇之間切換，感到心力交瘁？
          </p>
          <p>
            我們懂這種感覺。在網路上尋找頻率相投的旅伴並不容易，交換旅遊資訊的管道也往往零散瑣碎。於是，我們決定改變這一切。TripMate
            就在這樣的初衷下誕生了。我們致力於打造一個結合
            <strong class="text-primary-600"
              >「旅遊論壇」、「行程規劃」、「旅伴配對」與「旅遊交友」</strong
            >
            的一站式平台。
          </p>
          <p>
            我們是一群來自不同背景，但擁有相同熱情的
            <strong class="bg-yellow-100 px-1 rounded">轉職工程師</strong
            >。從零開始，我們學習技術、面對挑戰，就像踏上一場未知的冒險。TripMate
            是我們共同打磨的心血結晶，也是我們向這個世界遞出的第一張名片。
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="bg-white p-6 rounded-2xl shadow-sm border border-secondary-100 hover:shadow-lg transition hover:-translate-y-1"
        >
          <div
            :class="`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`"
          >
            <component :is="feature.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-600 text-sm leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>

      <div class="text-center mb-16">
        <h2 class="text-2xl font-bold text-primary-700 mb-8">Meet the Team</h2>
        <div class="flex flex-wrap justify-center gap-6 md:gap-8">
          <div
            v-for="member in teamMembers"
            :key="member.name"
            class="group flex flex-col items-center w-40"
          >
            <a
              :href="member.github"
              target="_blank"
              rel="noopener noreferrer"
              title="前往個人git頁面"
              class="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3 bg-secondary-200 transition duration-300 group-hover:scale-110 group-hover:shadow-xl cursor-pointer"
            >
              <img :src="member.avatar" :alt="member.name" class="w-full h-full object-cover" />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <CodeIcon class="text-white w-8 h-8" />
              </div>
            </a>

            <h4 class="font-bold text-gray-800 text-lg">{{ member.name }}</h4>
            <span
              class="text-xs text-primary-700 bg-primary-50 px-3 py-1 rounded-lg mt-1 font-bold leading-tight min-h-[2.5em] flex items-center justify-center"
            >
              {{ member.role }}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-3xl p-8 text-center text-gray-400">
        <h3 class="text-white font-bold text-lg mb-6">Built with Modern Tech</h3>
        <div class="flex flex-wrap justify-center gap-8 md:gap-12 items-center opacity-80">
          <div class="flex flex-col items-center gap-2">
            <LayoutIcon class="w-8 h-8 text-green-400" />
            <span class="text-xs">Vue 3</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <CodeIcon class="w-8 h-8 text-blue-400" />
            <span class="text-xs">Tailwind</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <ServerIcon class="w-8 h-8 text-green-600" />
            <span class="text-xs">Node.js</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <DatabaseIcon class="w-8 h-8 text-green-500" />
            <span class="text-xs">MongoDB</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <ZapIcon class="w-8 h-8 text-green-300" />
            <span class="text-xs">Neon</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <div
              class="w-8 h-8 flex items-center justify-center font-bold text-yellow-500 border-2 border-yellow-500 rounded-lg"
            >
              F
            </div>
            <span class="text-xs">Firebase</span>
          </div>
        </div>
      </div>

      <div class="mt-16 text-center">
        <button
          @click="router.push('/login')"
          class="bg-primary hover:bg-primary-600 text-white font-bold py-4 px-12 rounded-full shadow-primary-tall transition transform hover:scale-105 active:scale-95"
        >
          立即成為馬遊友
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pattern-dots {
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 20px 20px;
}
</style>
