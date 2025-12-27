<script setup>
defineProps({
  result: { type: Object, required: true },
})
</script>

<template>
  <div class="rounded-3xl bg-slate-900 p-6 text-white">
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-sm opacity-90">你的旅遊動物人格</div>
        <div class="mt-2 flex items-baseline gap-3">
          <span class="text-4xl">{{ result.animalEmoji }}</span>
          <h2 class="text-2xl font-bold">{{ result.animalName }}</h2>
        </div>
        <p class="mt-3 text-sm opacity-90">{{ result.summary }}</p>
      </div>
      <div class="rounded-2xl bg-white/10 px-3 py-2 text-xs">Demo Result</div>
    </div>

    <div class="mt-5 flex flex-wrap gap-2">
      <span
        v-for="tag in result.tags"
        :key="tag"
        class="rounded-full bg-white/10 px-3 py-1 text-xs"
      >
        {{ tag }}
      </span>
    </div>
  </div>
</template>
