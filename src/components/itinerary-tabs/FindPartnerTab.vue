<script setup>
import { ref, computed } from 'vue'
import { Calendar as CalendarIcon } from 'lucide-vue-next'

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

defineEmits(['update'])

const isReviewOpen = ref(false)
const reviewTarget = ref(null)
const drafts = ref({})
const reviewWarning = ref('')

const reviewLabelText = computed(() => ({
  positive: '好評',
  excellent: '超好評',
}))

const ensureDraft = (item) => {
  if (!drafts.value[item.id]) {
    drafts.value[item.id] = {
      comment: item.comment || '',
      reviewLabel: item.reviewLabel || '好評',
    }
  }
  return drafts.value[item.id]
}

const openReviewModal = (item) => {
  reviewTarget.value = item
  const draft = ensureDraft(item)
  if (!draft.reviewLabel) draft.reviewLabel = 'positive'
  reviewWarning.value = ''
  isReviewOpen.value = true
}

const closeReviewModal = () => {
  isReviewOpen.value = false
  reviewTarget.value = null
  reviewWarning.value = ''
}

const submitReview = (emit) => {
  if (!reviewTarget.value) return
  const draft = ensureDraft(reviewTarget.value)
  if (!draft.comment || !draft.comment.trim()) {
    reviewWarning.value = '未輸入評論，無法送出。'
    return
  }
  emit('update', {
    id: reviewTarget.value.id,
    comment: draft.comment.trim(),
    reviewLabel: draft.reviewLabel,
  })
  closeReviewModal()
}

const getReviewLabel = (value) => reviewLabelText.value[value] || ''
</script>

<template>
  <div class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall">
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
        class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition"
      >
        <div class="flex justify-between items-start gap-4">
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

          <div class="text-right min-w-[120px]">
            <div class="text-xs text-secondary-400 mb-2">狀態</div>
            <div
              class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
              :class="item.status === 'joined'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-secondary-100 text-secondary-600 border border-secondary-200'"
            >
              {{ item.status === 'joined' ? '已參加' : '未參加' }}
            </div>
          </div>
        </div>

        <div v-if="item.status === 'joined'" class="mt-4 pt-3 border-t border-secondary-100">
          <div class="text-sm text-secondary-600 space-y-2">
            <div class="font-semibold text-secondary-700">評論</div>
            <div v-if="item.comment" class="text-secondary-600">
              {{ item.comment }}
            </div>
            <div v-else class="text-secondary-400">尚未評價</div>
            <div v-if="item.comment" class="text-secondary-500">
              {{ getReviewLabel(item.reviewLabel) }}
            </div>
            <button
              type="button"
              class="mt-2 px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
              @click="openReviewModal(item)"
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
              class="w-full border border-secondary-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              rows="3"
              placeholder="留下你的評論"
              :value="ensureDraft(reviewTarget || {}).comment"
              @input="ensureDraft(reviewTarget || {}).comment = $event.target.value"
            />
          </div>
          <div>
            <div class="font-semibold text-secondary-700 mb-1">好評等級</div>
            <select
              class="w-full border border-secondary-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
              :value="ensureDraft(reviewTarget || {}).reviewLabel"
              @change="ensureDraft(reviewTarget || {}).reviewLabel = $event.target.value"
            >
              <option value="positive">好評</option>
              <option value="excellent">超好評</option>
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
            @click="submitReview($emit)"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
