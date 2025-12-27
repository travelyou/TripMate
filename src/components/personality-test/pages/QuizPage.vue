<script setup>
import { computed, ref } from 'vue'
import ProgressBar from '@/components/personality-test/components/ProgressBar.vue'
import QuestionCard from '@/components/personality-test/components/QuestionCard.vue'

const props = defineProps({
  questions: { type: Array, required: true },
})
const emit = defineEmits(['finish'])

const currentIndex = ref(0)
const answers = ref([]) // 之後可換成 store.answers

const currentQuestion = computed(() => props.questions[currentIndex.value])
const isLast = computed(() => currentIndex.value >= props.questions.length - 1)

const onSelect = (value) => {
  answers.value[currentIndex.value] = value
}

const prev = () => {
  if (currentIndex.value > 0) currentIndex.value -= 1
}

const nextOrFinish = () => {
  if (answers.value[currentIndex.value] == null) return

  if (isLast.value) emit('finish', { answers: answers.value })
  else currentIndex.value += 1
}
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
