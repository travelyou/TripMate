<script setup>
import ResultCard from '@/components/personality-test/components/ResultCard.vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  result: { type: Object, required: true },
})

defineEmits(['restart'])

const copied = ref(false)

// 分享文字內容
const shareText = computed(() => {
  const name = props.result?.animalName || ''
  const emoji = props.result?.animalEmoji || ''
  const tags = Array.isArray(props.result?.tags) ? props.result.tags : []
  const summary = props.result?.summary || ''

  // 目前是連到網站首頁，可以把網址換成邀請註冊連結或個人頁連結
  const link = props.result?.shareLink || `${window.location.origin}`

  return `${emoji} 我是「${name}」\n${summary}\n\n#旅遊動物人格 ${tags.map((t) => `#${t}`).join(' ')}\n\n來測看看：${link}`.trim()
})

// 複製分享文字到剪貼簿
const copyShareText = async () => {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1500)
  } catch (err) {
    copied.value = false
    alert('複製失敗，請手動選取文字複製')
  }
}

const goToProfile = () => {
  router.push({ name: 'profile' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- 結果卡 -->
    <ResultCard :result="result" />

    <!-- 相容旅伴 -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h3 class="text-2xl font-semibold text-slate-900">相容旅伴</h3>
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

          <p class="mt-3 text-sm text-slate-600">
            {{ buddy.reason }}
          </p>

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

      <div
        v-if="!(result.compatibleBuddies || []).length"
        class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"
      >
        目前沒有相容旅伴資料
      </div>
    </section>

    <!-- 分享結果 -->
    <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div class="flex items-center justify-between">
        <h3 class="text-2xl font-semibold text-slate-900">分享結果</h3>
        <button
          class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          @click="copyShareText"
        >
          {{ copied ? '已複製 √' : '一鍵複製' }}
        </button>
      </div>

      <p class="mt-2 text-sm text-slate-600">給你的親朋好友看看測驗結果吧！</p>

      <textarea
        class="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/20"
        :value="shareText"
        rows="6"
        readonly
      />
    </section>

    <!-- 按鈕列 -->
    <div class="grid gap-3 sm:grid-cols-2">
      <button
        class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        @click="goToProfile"
      >
        回到個人頁
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
