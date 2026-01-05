<script setup>
// 接收傳入的問題、選項、已選擇的答案
defineProps({
  question: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  selected: { type: String, default: null },
})

defineEmits(['select'])

// 內容：
// - 問題標題
// - 選項列表
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold">{{ question }}</h3>

    <div class="mt-4 space-y-3">
      <button
        v-for="opt in options"
        :key="opt.value"
        class="w-full rounded-2xl border px-4 py-3 text-left text-sm transition hover:bg-slate-50"
        :class="
          selected === opt.value
            ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
            : 'border-slate-200 bg-white text-slate-800'
        "
        @click="$emit('select', opt.value)"
      >
        <div class="flex items-center justify-between gap-3">
          <span>{{ opt.label }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
