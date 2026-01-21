<script setup>
import { FlagTriangleRight, TriangleAlert, Dot } from 'lucide-vue-next'

defineProps({
  result: { type: Object, required: true },
})

// 內容：
// - 動物圖像、動物名稱、簡短描述、標籤
// - 優勢列表
// - 可能踩的雷列表
// - 一句建議
// - 相容旅伴
</script>

<template>
  <div class="space-y-6">
    <!-- 主要結果卡片 -->
    <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="text-base opacity-90">你的旅遊動物人格</div>
          <div class="mt-2 flex items-baseline gap-3">
            <span class="text-4xl">{{ result.animalEmoji }}</span>
            <h2 class="text-2xl font-bold">{{ result.animalName }}</h2>
          </div>
          <p class="mt-3 text-sm opacity-90">{{ result.summary }}</p>

          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in result.tags"
              :key="tag"
              class="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <!-- Left: highlights -->
        <div class="rounded-2xl bg-slate-50 p-4 border border-slate-200">
          <div class="flex gap-2">
            <FlagTriangleRight class="h-5 w-4" />
            <div class="font-semibold">你在旅途中的優勢</div>
          </div>
          <ul class="mt-3 space-y-2 text-sm opacity-95">
            <li v-for="item in result.strengths || []" :key="item" class="flex gap-2">
              <Dot class="h-5 w-4" />

              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <!-- Right: pitfalls -->
        <div class="rounded-2xl bg-slate-50 p-4 border border-slate-200">
          <div v-if="(result.pitfalls || []).length">
            <div class="flex gap-2">
              <TriangleAlert class="h-5 w-4" />
              <div class="font-semibold">可能會踩的雷</div>
            </div>

            <ul class="mt-3 space-y-2 text-sm opacity-95">
              <li v-for="item in result.pitfalls" :key="item" class="flex gap-2">
                <Dot class="h-5 w-4" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
        <!-- bottom: one lines -->
        <div
          v-if="result.oneLiner"
          class="col-span-1 rounded-xl bg-slate-50 p-3 text-sm sm:col-span-2 sm:mt-5 border border-slate-200"
        >
          <div class="text-xs opacity-80">一句給你的建議</div>
          <div class="mt-1 font-semibold">{{ result.oneLiner }}</div>
        </div>
      </div>
    </div>

    <!-- 相容旅伴 -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-900">相容旅伴</h3>
      </div>

      <p class="mt-2 text-sm text-slate-600">這些旅伴類型通常跟你玩得很順：節奏合拍、衝突少。</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div
          v-for="buddy in result.compatibleBuddies || []"
          :key="buddy.id || buddy.name"
          class="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div class="flex items-center gap-3">
            <div class="text-3xl">{{ buddy.emoji }}</div>
            <div>
              <div class="font-semibold text-slate-900">{{ buddy.name }}</div>
              <div class="text-xs text-slate-500">{{ buddy.tagline }}</div>
            </div>
          </div>

          <p class="mt-3 text-sm text-slate-600">{{ buddy.reason }}</p>

          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="t in buddy.tags || []"
              :key="t"
              class="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 ring-1 ring-slate-200"
            >
              {{ t }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
