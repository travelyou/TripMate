<script setup>
defineProps({
  result: { type: Object, required: true },
})
defineEmits(['restart'])
</script>

<template>
  <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <ResultCard :result="result" />

    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <button
        class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        儲存到個人頁
      </button>

      <button
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"
        @click="$emit('restart')"
      >
        重新測驗
      </button>
    </div>

    <div class="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
      <div class="font-semibold">此測驗僅供娛樂參考</div>
      <ul class="mt-2 list-disc pl-5 text-slate-600">
        <li>123</li>
        <li>456</li>
      </ul>
    </div>
  </div>
</template>
