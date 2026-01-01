<script setup>
import { computed } from 'vue'
import StartPage from '@/components/personality-test/pages/StartPage.vue'
import QuizPage from '@/components/personality-test/pages/QuizPage.vue'
import ResultPage from '@/components/personality-test/pages/ResultPage.vue'
import { usePersonalityStore } from '@/stores/personality'

const store = usePersonalityStore()
const step = computed(() => store.step)
const result = computed(() => store.result)
</script>

<template>
  <div class="w-full min-h-screen rounded-md overflow-auto">
    <div class="mx-auto max-w-3xl py-10 sm:px-4">
      <header class="mb-6">
        <div class="flex items-center justify-between">
          <div class="px-4">
            <h1 class="text-2xl font-bold tracking-tight">旅遊動物人格測驗</h1>
            <p class="mt-1 text-sm text-slate-600">找出你的旅行風格</p>
          </div>

          <button
            v-if="step === 'quiz'"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            @click="store.resetTest"
          >
            重新開始
          </button>
        </div>
      </header>

      <main class="px-4 sm:px-0">
        <StartPage v-if="step === 'start'" @start="store.startTest" />
        <QuizPage v-else-if="step === 'quiz'" />
        <ResultPage
          v-else-if="step === 'result' && result"
          :result="result"
          @restart="store.resetTest"
        />
      </main>
    </div>
  </div>
</template>
