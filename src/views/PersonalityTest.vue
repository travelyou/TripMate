<script setup>
import { ref } from 'vue'

import StartPage from '@/components/personality-test/pages/StartPage.vue'
import QuizPage from '@/components/personality-test/pages/QuizPage.vue'
import ResultPage from '@/components/personality-test/pages/ResultPage.vue'

// 暫時展示用題目
const questions = ref([
  {
    id: 1,
    question: '出發前一週，你通常在做什麼？',
    options: [
      { label: '行程、交通、餐廳都查好了 ✈️', value: 'J' },
      { label: '到時候再看心情 😎', value: 'P' },
    ],
  },
  {
    id: 2,
    question: '旅行中突然多出半天空檔，你會？',
    options: [
      { label: '揪大家一起決定要去哪 🗺️', value: 'E' },
      { label: '自己找個地方放空 ☕', value: 'I' },
    ],
  },
])

// 暫時假測驗結果
const mockResult = ref({
  animalEmoji: '🦦',
  animalName: '水獺樂天',
  summary: '開心最重要，計畫只是參考。',
  tags: ['隨性', '愛體驗', '新鮮感', '氣氛王'],
  strengths: [
    '很會把平凡行程玩成精彩回憶',
    '遇到變動不容易崩潰，能快速轉念',
    '很適合帶動氣氛，旅伴跟你不無聊',
  ],
  pitfalls: ['太隨性可能錯過熱門景點/餐廳的預約時段', '行程彈性太大時，旅伴可能跟不上節奏'],

  oneLiner: '把「1 個必做預約」加進行程，其餘全部留給當下的驚喜。',

  compatibleBuddies: [
    {
      id: 'dog_leader',
      emoji: '🐶',
      name: '狗狗領隊',
      tagline: '合群照顧型',
      reason: '你負責玩，他負責把大家照顧好；節奏輕鬆但不會亂。',
      tags: ['好相處', '氣氛穩', '能協調'],
    },
    {
      id: 'monkey_adventure',
      emoji: '🐒',
      name: '猴子闖關',
      tagline: '點子多、愛嘗鮮',
      reason: '你們都不怕變動，臨時改行程反而更有趣。',
      tags: ['嘗鮮', '冒險', '即興'],
    },
    {
      id: 'bear_caretaker',
      emoji: '🐻',
      name: '熊熊管家',
      tagline: '舒適安心派',
      reason: '你們能互補：他幫你守住住宿與交通，你讓旅程更有驚喜。',
      tags: ['安心感', '互補', '不容易吵架'],
    },
  ],

  shareLink: '', // 之後可由後端回傳或前端塞你站上的連結
})

const step = ref('start') // start | quiz | result

// 切換頁面
const goStart = () => (step.value = 'start')
const goQuiz = () => (step.value = 'quiz')
const goResult = () => (step.value = 'result')

// 運作方式
// header：標題+重新開始按鈕
// main：切換3個頁面(開始、問題頁、結果頁)
</script>

<template>
  <div class="w-full min-h-screen rounded-md overflow-auto">
    <div class="mx-auto max-w-3xl py-10 sm:px-4">
      <header class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">旅遊動物人格測驗</h1>
            <p class="mt-1 text-sm text-slate-600">8–10 題，找出你的旅行風格</p>
          </div>
          <button
            v-if="step !== 'start'"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            @click="goStart"
          >
            重新開始
          </button>
        </div>
      </header>

      <main>
        <StartPage v-if="step === 'start'" @start="goQuiz" />

        <QuizPage v-else-if="step === 'quiz'" :questions="questions" @finish="goResult" />

        <ResultPage v-else :result="mockResult" @restart="goStart" />
      </main>
    </div>
  </div>
</template>
