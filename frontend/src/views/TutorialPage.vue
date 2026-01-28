<script setup>
/* eslint-disable vue/no-v-html */
import { useRouter } from 'vue-router'
import {
  Sparkles as SparklesIcon,
  Users as UsersIcon,
  BookOpen as BookIcon,
  Compass as CompassIcon,
  Calendar as CalendarIcon,
  Map as MapIcon,
  LayoutGrid as GridIcon,
  User as UserIcon,
} from 'lucide-vue-next'

const router = useRouter()

const processTextWithLinks = (text) => {
  const linkMap = {
    '討論區': '/discussion',
    '找旅伴': '/travelers',
    '精選行程': '/featured-itinerary',
  }

  let processed = text
  Object.keys(linkMap).forEach((key) => {
    const regex = new RegExp(`<strong class='text-primary-700'>${key}</strong>`, 'g')
      processed = processed.replace(
        regex,
        `<strong class="text-primary-700 cursor-pointer hover:text-primary-800" data-route="${linkMap[key]}">${key}</strong>`
      )
  })

  return processed
}

const handleLinkClick = (event) => {
  const target = event.target.closest('[data-route]')
  if (target) {
    const route = target.getAttribute('data-route')
    if (route) {
      router.push(route)
    }
  }
}

const steps = [
  {
    title: '1. 三大探索版圖 (Public Boards)',
    icon: CompassIcon,
    content: [
      'TripMate 分為三個主要的公開區域，滿足不同需求：',
      '1. **討論區**：分享遊記、美食情報，或詢問旅遊建議。',
      '2. **找旅伴**：瀏覽網友發起的揪團活動，尋找免費的旅遊夥伴。',
      '3. **精選行程**：由專業旅行社提供的付費行程，省心省力的選擇。',
    ],
  },
  {
    title: '2. 你的旅行控制台',
    icon: GridIcon,
    isComparison: true,
    items: [
      {
        name: '我的行程',
        icon: CalendarIcon,
        color: 'text-indigo-600 bg-indigo-50',
        desc: '你的創作與管理中心。',
        feature: '規劃個人行程 / 管理主揪團',
        detail: '你可以從零規劃行程，也能將做好的行程「匯入」到找旅伴貼文中，讓揪團更專業！',
        route: '/my-itinerary',
        btnText: '前往我的行程',
      },
      {
        name: '訂單管理',
        icon: MapIcon,
        color: 'text-amber-600 bg-amber-50',
        desc: '你的購買紀錄。',
        feature: '查看已購買的精選行程',
        detail: '你在「精選行程」購買的付費商品，會統一歸檔在這裡，不會跟自己排的行程混在一起。',
        route: '/my-order',
        btnText: '前往我的訂單',
      },
    ],
  },
  {
    title: '3. 打造最好的旅行名片',
    icon: UserIcon,
    content: [
      '你的**個人檔案 (Profile)**就是在 TripMate 上的名片。',
      '別人會透過你的靈魂動物、許願池城市以及過去的旅遊護照戳章來認識你。',
      '把檔案填寫完整，能大幅增加找旅伴配對成功的機率喔！',
    ],
    action: { text: '去完善個人檔案', route: '/profile' },
  },
  {
    title: '4. 右下角懸浮按鈕 (Quick Actions)',
    icon: SparklesIcon,
    content: [
      '不管在哪個頁面，右下角的按鈕隨時待命：',
      '1. **發文 (Post)**：想揪人、想分享、想排行程？按這裡就對了。',
      '2. **抽卡 (Draw)**：隨機抽取一位契合的旅伴，展開奇妙際遇。',
      '3. **聊天室 (Chat)**：查看與好友的私訊，或揪團成功後的群組討論。',
      '4. **AI 助手(AiChat)**：旅遊問題或網站操作不會用？問它就對了！',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-secondary-50 pb-20">
    <div class="relative w-full bg-primary-800 overflow-hidden">
      <div
        class="relative max-w-[1000px] mx-auto px-6 py-16 flex flex-col items-center text-center z-10"
      >
        <div class="bg-white/10 p-4 rounded-full mb-6 backdrop-blur-sm border border-white/20">
          <BookIcon class="w-12 h-12 text-yellow-300" />
        </div>
        <h1 class="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-md">新手村指南</h1>
        <p class="text-xl text-primary-100 max-w-2xl font-medium leading-relaxed">
          歡迎來到 TripMate！<br />
          花 3 分鐘了解我們的<span class="text-yellow-300 font-bold">三大版圖</span>與<span
            class="text-yellow-300 font-bold"
            >兩大後台</span
          >， 讓你快速上手，找到靈魂旅伴！
        </p>
      </div>
      <div class="absolute inset-0 bg-primary-900/20 pattern-dots"></div>
    </div>

    <div class="max-w-[900px] mx-auto px-4 -mt-8 relative z-20 space-y-6">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="bg-white rounded-3xl p-6 md:p-10 shadow-primary-tall border border-secondary-100 transition hover:-translate-y-1 hover:shadow-xl duration-300"
      >
        <div class="flex items-center gap-4 mb-6 border-b border-secondary-100 pb-4">
          <div class="bg-primary-50 p-3 rounded-xl">
            <component :is="step.icon" class="w-8 h-8 text-primary-600" />
          </div>
          <h2 class="text-2xl font-bold text-primary-800">{{ step.title }}</h2>
        </div>

        <div v-if="!step.isComparison" class="space-y-4">
          <ul class="space-y-4">
            <li
              v-for="(line, idx) in step.content"
              :key="idx"
              class="flex items-start text-lg text-secondary-600 leading-relaxed"
              @click="handleLinkClick"
            >
              <template v-if="line.match(/^.{1,2} /)">
                <span class="shrink-0 text-xl mr-3">{{ line.split(' ')[0] }}</span>
                <span
                  class="flex-1 min-w-0"
                  v-html="
                    processTextWithLinks(
                      line
                        .replace(/\*\*(.*?)\*\*/g, '<strong class=\'text-primary-700\'>$1</strong>')
                        .replace(/^.{1,2} /, '')
                    )
                  "
                ></span>
              </template>
              <template v-else>
                <span
                  class="flex-1 min-w-0"
                  v-html="
                    processTextWithLinks(
                      line.replace(/\*\*(.*?)\*\*/g, '<strong class=\'text-primary-700\'>$1</strong>')
                    )
                  "
                ></span>
              </template>
            </li>
          </ul>

          <div v-if="step.action" class="mt-8 pt-4">
            <button
              class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition transform active:scale-95"
              @click="router.push(step.action.route)"
            >
              {{ step.action.text }}
              <UserIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="item in step.items"
            :key="item.name"
            class="rounded-2xl border border-secondary-200 p-6 flex flex-col bg-white hover:border-primary-300 hover:shadow-md transition relative overflow-hidden"
          >
            <div class="flex items-center gap-3 mb-4">
              <div :class="`p-3 rounded-xl ${item.color}`">
                <component :is="item.icon" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold text-gray-800">{{ item.name }}</h3>
            </div>

            <p class="text-sm font-bold text-gray-500 mb-2">{{ item.desc }}</p>
            <div class="text-secondary-700 text-sm leading-relaxed mb-4 flex-grow">
              {{ item.detail }}
            </div>

            <div class="mt-auto pt-4 border-t border-secondary-50">
              <button
                class="w-full text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 py-2.5 px-3 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-2"
                @click="router.push(item.route)"
              >
                 {{ item.feature }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center py-12">
        <h3 class="text-2xl font-bold text-primary-700 mb-6">現在，開始你的旅程！</h3>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            class="bg-yellow-400 hover:bg-yellow-500 text-primary-900 font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            @click="router.push('/test')"
          >
            <SparklesIcon class="w-5 h-5" />
            測驗靈魂動物
          </button>
          <button
            class="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            @click="router.push('/travelers')"
          >
            <UsersIcon class="w-5 h-5" />
            去逛逛找旅伴
          </button>
        </div>
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
