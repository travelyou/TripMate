<script setup>
defineProps({
  current: { type: Number, required: true },
  total: { type: Number, required: true },
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between text-xs text-slate-500">
      <span>第 {{ current }} / {{ total }} 題</span>
      <span>{{ Math.round((current / total) * 100) }}%</span>
    </div>
    <div class="mt-2 h-2 w-full rounded-full bg-slate-100">
      <div
        class="h-2 rounded-full bg-slate-900 transition-all"
        :style="{ width: `${(current / total) * 100}%` }"
      />
    </div>
  </div>
</template>
