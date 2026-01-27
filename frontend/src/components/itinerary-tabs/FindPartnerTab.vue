<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar as CalendarIcon, Heart, ThumbsUp } from 'lucide-vue-next'

const router = useRouter()

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update'])

const handleClick = (item) => {
  if (item.id) {
    router.push(`/travelers/${item.id}`)
  }
}

const isReviewOpen = ref(false)
const reviewTarget = ref(null)
const reviewDraft = ref(null)
const drafts = ref({})
const reviewWarning = ref('')

const ensureDraft = (item) => {
  if (!drafts.value[item.id]) {
    const normalizedLabel =
      item.reviewLabel === 'like' || item.reviewLabel === 'super_like' ? item.reviewLabel : ''
    drafts.value[item.id] = {
      comment: item.comment || '',
      reviewLabel: normalizedLabel,
    }
  }
  return drafts.value[item.id]
}

const openReviewModal = (item) => {
  reviewTarget.value = item
  const draft = ensureDraft(item)
  draft.comment = item.comment || ''
  const normalizedLabel =
    item.reviewLabel === 'like' || item.reviewLabel === 'super_like' ? item.reviewLabel : ''
  draft.reviewLabel = normalizedLabel || draft.reviewLabel || 'like'
  reviewDraft.value = { ...draft }
  reviewWarning.value = ''
  isReviewOpen.value = true
}

const closeReviewModal = () => {
  isReviewOpen.value = false
  reviewTarget.value = null
  reviewDraft.value = null
  reviewWarning.value = ''
}

const submitReview = () => {
  if (!reviewTarget.value || !reviewDraft.value) return
  const draft = reviewDraft.value
  if (!draft.comment || !draft.comment.trim()) {
    reviewWarning.value = '未輸入評論，無法送出。'
    return
  }
  emit('update', {
    id: reviewTarget.value.id,
    comment: draft.comment.trim(),
    reviewLabel: draft.reviewLabel,
  })
  drafts.value[reviewTarget.value.id] = {
    comment: draft.comment.trim(),
    reviewLabel: draft.reviewLabel,
  }
  closeReviewModal()
}
</script>

<template>
  <div
    class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall"
  >
    <div class="flex items-center mb-6 pb-4 border-b-2 border-secondary-100">
      <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-4">
        <CalendarIcon class="w-6 h-6 text-primary-600" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-secondary-800">找旅伴</h3>
        <p class="text-sm text-secondary-500">查看參加狀態與互動評價</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition cursor-pointer"
        @click="handleClick(item)"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div class="flex-1">
            <h4 class="font-bold text-lg text-secondary-800 mb-1">
              {{ item.title }}
            </h4>
            <div class="flex items-center text-sm text-secondary-500 mb-3">
              <span
                class="bg-secondary-100 px-2 py-0.5 rounded text-xs mr-2 border border-secondary-300"
              >
                日期
              </span>
              {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
            </div>
          </div>

          <div class="text-left sm:text-right sm:min-w-[120px]">
            <div class="text-xs text-secondary-400 mb-2">狀態</div>
            <div
              class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
              :class="
                item.status === 'joined'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-secondary-100 text-secondary-600 border border-secondary-200'
              "
            >
              {{ item.status === 'joined' ? '已參加' : '未參加' }}
            </div>
          </div>
        </div>

        <div v-if="item.status === 'joined'" class="mt-4 pt-3 border-t border-secondary-100">
          <div
            class="text-sm text-secondary-600 space-y-5 flex flex-col sm:flex-row sm:justify-between sm:items-center"
          >
            <div class="space-y-2">
              <div class="text-base font-semibold text-secondary-700">評論</div>
              <div v-if="item.comment" class="text-secondary-600">
                {{ item.comment }}
              </div>
              <div v-else class="text-secondary-400">尚未評論</div>
              <div v-if="item.comment" class="text-secondary-500">
                <span
                  v-if="item.reviewLabel === 'super_like'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-600 border border-rose-200"
                >
                  <Heart class="w-3 h-3 fill-current" />
                  超讚
                </span>
                <span
                  v-else-if="item.reviewLabel === 'like'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-600 border border-blue-200"
                >
                  <ThumbsUp class="w-3 h-3 fill-current" />
                  讚
                </span>
                <span v-else class="text-xs text-secondary-400">未標籤</span>
              </div>
            </div>
            <button
              type="button"
              class="mt-2 px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
              @click.stop="openReviewModal(item)"
            >
              {{ item.comment ? '修改評論' : '評論' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="itineraries.length === 0"
        class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
      >
        目前沒有找旅伴行程
      </div>
    </div>

    <div v-if="isReviewOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeReviewModal" />
      <div
        class="relative bg-white w-full max-w-md mx-4 rounded-xl border-2 border-primary shadow-primary-tall p-6"
      >
        <div class="text-lg font-bold text-secondary-800 mb-2">找旅伴評價</div>
        <div class="text-sm text-secondary-500 mb-4">
          {{ reviewTarget?.title || '行程' }}
        </div>
        <div class="space-y-4">
          <div>
            <div class="font-semibold text-secondary-700 mb-1">評論</div>
            <textarea
              v-model="reviewDraft.comment"
              class="w-full border border-secondary-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              rows="3"
              placeholder="留下你的評論"
              @input="reviewWarning = ''"
            />
          </div>
          <div>
            <div class="font-semibold text-secondary-700 mb-1">給個鼓勵</div>
            <select
              v-model="reviewDraft.reviewLabel"
              class="w-full border border-secondary-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="like">讚</option>
              <option value="super_like">超讚</option>
            </select>
          </div>
        </div>
        <div v-if="reviewWarning" class="mt-3 text-sm text-rose-600">
          {{ reviewWarning }}
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 transition"
            @click="closeReviewModal"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-700 transition"
            @click="submitReview"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
