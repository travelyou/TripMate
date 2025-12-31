<script setup>
import { computed, ref } from 'vue'
import ProgressBar from '@/components/personality-test/components/ProgressBar.vue'
import QuestionCard from '@/components/personality-test/components/QuestionCard.vue'

// 接收傳入的問題
const props = defineProps({
  questions: { type: Array, required: true },
})
const emit = defineEmits(['finish'])

// 狀態：目前題目索引、答案、目前題目、是否最後一題
const currentIndex = ref(0)
const answers = ref([]) // 之後可換成 store.answers
const currentQuestion = computed(() => props.questions[currentIndex.value])
const isLast = computed(() => currentIndex.value >= props.questions.length - 1)

// 選擇答案
const onSelect = (value) => {
  answers.value[currentIndex.value] = value
}

// 回到上一題
const prev = () => {
  if (currentIndex.value > 0) currentIndex.value -= 1
}

// 到下一題 or 完成測驗
const nextOrFinish = () => {
  if (answers.value[currentIndex.value] == null) return

  if (isLast.value) emit('finish', { answers: answers.value })
  else currentIndex.value += 1
}

// 內容：
// - 進度條(import)
// - 問題+選項(import)
// - 按鈕
</script>

<template>
  <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <ProgressBar :current="currentIndex + 1" :total="questions.length" />

    <div class="mt-6">
      <QuestionCard
        :question="currentQuestion?.question"
        :options="currentQuestion?.options || []"
        :selected="answers[currentIndex]"
        @select="onSelect"
      />
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button
        class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
        :disabled="currentIndex === 0"
        @click="prev"
      >
        上一題
      </button>

      <button
        class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        :disabled="answers[currentIndex] == null"
        @click="nextOrFinish"
      >
        {{ isLast ? '完成測驗' : '下一題' }}
      </button>
    </div>

    <p class="mt-4 text-center text-xs text-slate-400">選好答案才能前進</p>
  </div>
</template>
