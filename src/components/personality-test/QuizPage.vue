<script setup>
import { computed } from 'vue'
import ProgressBar from '@/components/personality-test/components/ProgressBar.vue'
import QuestionCard from '@/components/personality-test/components/QuestionCard.vue'
import { usePersonalityStore } from '@/stores/personality'

const store = usePersonalityStore()

// 計算屬性：從 store 取得測驗相關狀態
const total = computed(() => store.questions.length) // 總題數
const current = computed(() => store.currentIndex + 1) // 當前題號（從 1 開始顯示）
const currentQuestion = computed(() => store.currentQuestion) // 當前題目物件
const selected = computed(() => store.answers?.[store.currentIndex]) // 當前題目已選擇的答案
const isLast = computed(() => store.isLast) // 是否為最後一題

// 選擇答案：將答案儲存到 store.answers 陣列中對應的索引位置
const onSelect = (value) => {
  store.selectAnswer(value)
}

// 下一題或完成測驗：
// - 如果未選擇答案，直接返回（按鈕已被禁用，此為雙重保護）
// - 如果是最後一題，調用 finishTest() 計算結果並切換到結果頁
// - 否則，移動到下一題
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
