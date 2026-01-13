<script setup>
import { ref } from 'vue'
import { Calendar as CalendarIcon, Star as StarIcon } from 'lucide-vue-next'

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['rate', 'clear'])

const isRatingOpen = ref(false)
const ratingTarget = ref(null)
const ratingDraft = ref(0)

const openRatingModal = (item) => {
  ratingTarget.value = item
  ratingDraft.value = item.rating || 0
  isRatingOpen.value = true
}

const closeRatingModal = () => {
  isRatingOpen.value = false
  ratingTarget.value = null
  ratingDraft.value = 0
}

const saveRating = () => {
  if (!ratingTarget.value) return
  emit('rate', { id: ratingTarget.value.id, rating: ratingDraft.value })
  closeRatingModal()
}

const clearRating = (id) => {
  emit('clear', id)
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
        <h3 class="text-xl font-bold text-secondary-800">精選行程</h3>
        <p class="text-sm text-secondary-500">查看你的訂單與參加狀態</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="border-2 border-secondary-200 rounded-lg p-4 hover:shadow-md transition"
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

            <div class="text-sm text-secondary-600 space-y-1">
              <div class="font-semibold text-secondary-700">訂單詳細資訊</div>
              <div>訂單編號: {{ item.orderNumber || '—' }}</div>
              <div>訂單日期: {{ item.orderDate || '—' }}</div>
            </div>
          </div>

          <div class="text-right min-w-[120px]">
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
          <div class="flex items-center gap-3">
            <div class="text-sm text-secondary-500 flex items-center gap-1">
              <template v-if="item.rating">
                <StarIcon
                  v-for="star in 5"
                  :key="star"
                  class="w-4 h-4 fill-current"
                  :class="star <= item.rating ? 'text-amber-400' : 'text-secondary-300'"
                />
              </template>
              <span v-else>尚未評價</span>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
              @click="openRatingModal(item)"
            >
              給評價
            </button>
            <button
              v-if="item.rating"
              type="button"
              class="px-3 py-1.5 rounded-lg border border-accent-600 text-accent-600 font-semibold transition"
              @click="clearRating(item.id)"
            >
              取消評價
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="itineraries.length === 0"
        class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
      >
        目前沒有精選行程
      </div>
    </div>

    <div v-if="isRatingOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeRatingModal" />
      <div
        class="relative bg-white w-full max-w-md mx-4 rounded-xl border-2 border-primary shadow-primary-tall p-6"
      >
        <div class="text-lg font-bold text-secondary-800 mb-2">星級評價</div>
        <div class="text-sm text-secondary-500 mb-4">
          {{ ratingTarget?.title || '行程' }}
        </div>
        <div class="flex items-center gap-2 mb-6">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="p-2 rounded-lg hover:bg-primary-50 transition"
            @click="ratingDraft = star"
          >
            <StarIcon
              class="w-7 h-7 fill-current"
              :class="star <= ratingDraft ? 'text-amber-400' : 'text-secondary-300'"
            />
          </button>
        </div>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 transition"
            @click="closeRatingModal"
          >
            關閉
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-700 transition"
            @click="saveRating"
          >
            儲存評價
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
