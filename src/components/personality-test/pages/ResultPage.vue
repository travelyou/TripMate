<script setup>
import { computed, ref } from 'vue'
import ResultCard from '@/components/personality-test/components/ResultCard.vue'

const props = defineProps({
  result: { type: Object, required: true },
})
defineEmits(['restart'])

// 複製狀態：追蹤是否已成功複製分享文字
const copied = ref(false)

// 分享文字：從 result 物件中取得已格式化的分享文字
// 格式：emoji + 動物名稱 + 描述 + hashtags + 邀請連結
const shareText = computed(() => props.result?.shareText || '')

// 複製分享文字到剪貼簿
// 使用瀏覽器 Clipboard API，成功後顯示「已複製」提示 1.5 秒
const copyShareText = async () => {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1500)
  } catch {
    alert('複製失敗，請手動選取文字複製')
  }
}
</script>

<template>
  <div class="space-y-6">
    <ResultCard :result="result" />

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

    <!-- 按鈕列 -->
    <div class="grid gap-3 sm:grid-cols-2">
      <router-link
        to="/profile"
        class="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-center font-semibold text-white hover:bg-slate-800"
      >
        儲存到個人頁
      </router-link>

      <button
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"
        @click="$emit('restart')"
      >
        重新測驗
      </button>
    </div>
  </div>
</template>
