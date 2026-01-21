<script setup>
import { AlarmClock, Sparkles, Puzzle } from 'lucide-vue-next'
defineEmits(['start'])

// 內容:
// - 標題+說明
// - 注意事項
// - 時間
// - 題數
</script>

<template>
  <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <div class="flex items-start gap-4">
      <Sparkles />

      <div>
        <h2 class="text-lg font-semibold">開始前，先跟你說明一下</h2>
        <ul class="mt-3 space-y-2 text-sm text-slate-600">
          <li>• 題目請依照直覺回答</li>
          <li>• 看你是屬於哪種「旅遊動物」</li>
          <li>• 測驗結果將展示於個人頁面</li>
        </ul>
      </div>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
        <div class="font-semibold flex gap-1">
          <AlarmClock class="h-5 w-4" />
          <p>時間</p>
        </div>
        <div class="mt-1 text-slate-600">約 1 分鐘</div>
      </div>
      <div class="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
        <div class="font-semibold flex gap-1">
          <Puzzle class="h-5 w-4" />
          <p>題數</p>
        </div>
        <div class="mt-1 text-slate-600">8 題</div>
      </div>
    </div>

    <button
      class="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      @click="$emit('start')"
    >
      開始測驗
    </button>
  </div>
</template>
