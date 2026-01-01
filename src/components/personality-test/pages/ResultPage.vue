<script setup>
import { computed, ref } from 'vue'
import ResultCard from '@/components/personality-test/components/ResultCard.vue'

const props = defineProps({
  result: { type: Object, required: true },
})
defineEmits(['restart'])

const copied = ref(false)

const shareText = computed(() => props.result?.shareText || '')

const copyShareText = async () => {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1500)
  } catch (e) {
    alert('複製失敗，請手動選取文字複製')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <ResultCard :result="result" />
    </div>

    <!-- 相容旅伴 -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-900">相容旅伴</h3>
        <span class="text-xs text-slate-500">（參考用）</span>
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

    <!-- 分享結果 -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-900">分享結果</h3>
        <button
          class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          @click="copyShareText"
        >
          {{ copied ? '已複製 ✅' : '一鍵複製' }}
        </button>
      </div>

      <p class="mt-2 text-sm text-slate-600">貼到自介、限動或聊天室都很方便。</p>

      <textarea
        class="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/20"
        :value="shareText"
        rows="6"
        readonly
      />
    </section>

    <!-- 說明 -->
    <section class="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-100">
      <div class="text-sm font-semibold text-slate-800">說明</div>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>測驗結果是旅遊偏好參考，不代表真實人格。</li>
        <li>適合用於自介與旅伴配對，但不要用來貼標籤下定論。</li>
      </ul>
    </section>

    <!-- 按鈕列：放最底下 -->
    <div class="grid gap-3 sm:grid-cols-2">
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
  </div>
</template>
