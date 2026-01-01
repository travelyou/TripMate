<script setup>
import { computed } from 'vue'
import ProgressBar from '@/components/personality-test/components/ProgressBar.vue'
import QuestionCard from '@/components/personality-test/components/QuestionCard.vue'
import { usePersonalityStore } from '@/stores/personality'

const store = usePersonalityStore()

const total = computed(() => store.questions.length)
const current = computed(() => store.currentIndex + 1)
const currentQuestion = computed(() => store.currentQuestion)
const selected = computed(() => store.answers?.[store.currentIndex])
const isLast = computed(() => store.isLast)

const onSelect = (value) => {
  store.selectAnswer(value)
}

const nextOrFinish = () => {
  if (selected.value == null) return
  if (isLast.value) store.finishTest()
  else store.next()
}
</script>

<template>
  <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <ProgressBar :current="current" :total="total" />

    <div class="mt-6">
      <QuestionCard
        :question="currentQuestion?.question"
        :options="currentQuestion?.options || []"
        :selected="selected"
        @select="onSelect"
      />
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button
        class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
        :disabled="store.currentIndex === 0"
        @click="store.prev"
      >
        上一題
      </button>

      <button
        class="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        :disabled="selected == null"
        @click="nextOrFinish"
      >
        {{ isLast ? '完成測驗' : '下一題' }}
      </button>
    </div>

    <p class="mt-4 text-center text-xs text-slate-400">選好答案才能前進</p>
  </div>
</template>
