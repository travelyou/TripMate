<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StartPage from '@/components/personality-test/StartPage.vue'
import QuizPage from '@/components/personality-test/QuizPage.vue'
import ResultPage from '@/components/personality-test/ResultPage.vue'
import { usePersonalityStore } from '@/stores/personality'

const store = usePersonalityStore()
const router = useRouter()
const step = computed(() => store.step)
const result = computed(() => store.result)

const handleSave = async () => {
  try {
    const saved = await store.saveResult()
    if (!saved) {
      alert('儲存失敗，請確認已登入且後端服務正常。如果問題持續，請重新整理頁面後再試。')
      return
    }
    alert('性格測驗結果已成功儲存！')
    router.push('/profile')
  } catch (error) {
    alert('儲存失敗，請稍後再試。如果問題持續，請聯繫管理員。')
  }
}
</script>

<template>
  <div class="w-full overflow-auto">
    <div class="mx-auto max-w-3xl py-10 sm:px-4">
      <header class="mb-6">
        <div class="flex items-center justify-between">
          <div class="px-4">
            <h1 class="text-2xl font-bold tracking-tight text-secondary-900">旅遊動物人格測驗</h1>
            <p class="mt-1 text-sm text-secondary-600">找出你的旅行風格</p>
          </div>

          <button
            v-if="step === 'quiz'"
            class="rounded-xl border border-primary-600 bg-primary px-3 py-2 text-sm text-white hover:bg-primary-700"
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
          @save="handleSave"
        />
      </main>
    </div>
  </div>
</template>
