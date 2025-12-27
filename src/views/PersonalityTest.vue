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
  <div class="bg-slate-50 w-full h-screen rounded-md">
    <div class="mx-auto max-w-3xl px-4 py-10">
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
