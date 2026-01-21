<script setup>
import { ref } from 'vue'
import { reportBankTransfer } from '@/api/payments'
import { Calendar as CalendarIcon, Star as StarIcon } from 'lucide-vue-next'

defineProps({
  itineraries: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['rate', 'clear', 'pay'])

const isRatingOpen = ref(false)
const ratingTarget = ref(null)
const ratingDraft = ref(0)
const commentDraft = ref('')
const ratingWarning = ref('')
const isBankInfoOpen = ref(false)
const isReportOpen = ref(false)
const reportTargetId = ref(null)
const reportAccountLast5 = ref('')
const reportWarning = ref('')
const reportedTransfers = ref({})
const isReportSubmitting = ref(false)

const openRatingModal = (item) => {
  ratingTarget.value = item
  ratingDraft.value = item.rating || 0
  commentDraft.value = item.comment || ''
  ratingWarning.value = ''
  isRatingOpen.value = true
}

const closeRatingModal = () => {
  isRatingOpen.value = false
  ratingTarget.value = null
  ratingDraft.value = 0
  commentDraft.value = ''
  ratingWarning.value = ''
}

const saveRating = () => {
  if (!ratingTarget.value) return
  if (!ratingDraft.value) {
    ratingWarning.value = '請先選擇星級，才能送出評價。'
    return
  }
  emit('rate', {
    id: ratingTarget.value.id,
    rating: ratingDraft.value,
    comment: commentDraft.value.trim(),
  })
  closeRatingModal()
}

const clearRating = (id) => {
  emit('clear', id)
}

const goToPay = (id) => {
  emit('pay', id)
}

const openReportModal = (id) => {
  reportTargetId.value = id
  reportAccountLast5.value = ''
  reportWarning.value = ''
  isReportOpen.value = true
}

const closeReportModal = () => {
  isReportOpen.value = false
  reportTargetId.value = null
  reportAccountLast5.value = ''
  reportWarning.value = ''
}

const submitReport = async () => {
  const value = String(reportAccountLast5.value || '').trim()
  if (!/^\d{5}$/.test(value)) {
    reportWarning.value = '請輸入帳號末 5 碼'
    return
  }
  if (!reportTargetId.value) return
  try {
    isReportSubmitting.value = true
    reportWarning.value = ''
    await reportBankTransfer({ orderId: reportTargetId.value, last5: value })
    reportedTransfers.value = {
      ...reportedTransfers.value,
      [reportTargetId.value]: value,
    }
    closeReportModal()
  } catch (error) {
    reportWarning.value = error?.message || '回報失敗，請稍後再試'
  } finally {
    isReportSubmitting.value = false
  }
}

const openBankInfo = () => {
  isBankInfoOpen.value = true
}

const closeBankInfo = () => {
  isBankInfoOpen.value = false
}

const statusLabels = {
  PENDING: '待付款',
  PAID: '已付款',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  FAILED: '付款失敗',
  REVIEW: '待審核',
}

const statusClasses = {
  PENDING: 'bg-gold-100 text-gold-700 border border-gold-200',
  PAID: 'bg-primary-100 text-primary-700 border border-primary-200',
  CANCELLED: 'bg-accent-100 text-accent-700 border border-accent-200',
  REFUNDED: 'bg-secondary-100 text-secondary-700 border border-secondary-200',
  FAILED: 'bg-accent-100 text-accent-700 border border-accent-200',
  REVIEW: 'bg-gold-100 text-gold-700 border border-gold-200',
}

const getStatusLabel = (status) => statusLabels[status] || status || '未知'
const getStatusClass = (status) =>
  statusClasses[status] || 'bg-secondary-100 text-secondary-600 border border-secondary-200'
const getDisplayStatus = (item) =>
  reportedTransfers.value[item.id] || item.paymentMeta?.last5 ? 'REVIEW' : item.status

const paymentLabels = {
  linepay: 'LINE Pay',
  bank: '銀行轉帳',
  credit: '信用卡',
  applepay: 'Apple Pay',
  googlepay: 'Google Pay',
}

const getPaymentLabel = (value) => paymentLabels[String(value || '').toLowerCase()] || value || '—'
const isBankPayment = (value) => String(value || '').toLowerCase() === 'bank'

const formatTaiwanDate = (value, { showSeconds = false } = {}) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
  })
  const parts = formatter.formatToParts(date)
  const pick = (type) => parts.find((part) => part.type === type)?.value || ''
  const year = pick('year')
  const month = pick('month')
  const day = pick('day')
  const hour = pick('hour')
  const minute = pick('minute')
  const second = pick('second')
  const dayPeriod = pick('dayPeriod')
  const time = showSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`
  return `${year}/${month}/${day} ${dayPeriod} ${time}`
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
        <h3 class="text-xl font-bold text-secondary-800">訂單管理</h3>
        <p class="text-sm text-secondary-500">查看你的訂單與付款狀態</p>
      </div>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in itineraries"
        :key="item.id"
        class="border-2 border-secondary-200 rounded-lg p-4 hover:shadow-md transition"
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
              {{ formatTaiwanDate(item.startDate) || '未定' }} -
              {{ formatTaiwanDate(item.endDate) || '未定' }}
            </div>

            <div class="text-sm text-secondary-600 space-y-1">
              <div class="font-semibold text-secondary-700">訂單詳細資訊</div>
              <div>訂單編號: {{ item.orderNumber || '—' }}</div>
              <div>
                訂單日期: {{ formatTaiwanDate(item.orderDate, { showSeconds: true }) || '—' }}
              </div>
              <div>付款方式: {{ getPaymentLabel(item.paymentMethod) }}</div>
              <div>出行狀態: {{ item.travelStatus || '—' }}</div>
            </div>
          </div>

          <div
            class="text-left sm:text-right sm:min-w-[120px] flex flex-col items-start sm:items-end self-stretch"
          >
            <div class="text-xs text-secondary-400 mb-2">狀態</div>
            <div
              class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
              :class="getStatusClass(getDisplayStatus(item))"
            >
              {{ getStatusLabel(getDisplayStatus(item)) }}
            </div>
            <button
              v-if="item.status === 'PENDING' && !isBankPayment(item.paymentMethod)"
              type="button"
              class="mt-auto inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
              @click="goToPay(item.id)"
            >
              前往付款
            </button>
            <button
              v-else-if="item.status === 'PENDING' && isBankPayment(item.paymentMethod)"
              type="button"
              class="mt-auto inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
              @click="openBankInfo"
            >
              查看轉帳資訊
            </button>
            <button
              v-if="
                item.status === 'PENDING' &&
                isBankPayment(item.paymentMethod) &&
                !reportedTransfers[item.id]
              "
              type="button"
              class="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-accent-500 text-accent-600 font-semibold hover:bg-accent-50 transition"
              @click="openReportModal(item.id)"
            >
              回報已付款
            </button>
          </div>
        </div>

        <div
          v-if="
            (item.status === 'PENDING' || getDisplayStatus(item) === 'REVIEW') &&
            isBankPayment(item.paymentMethod) &&
            (reportedTransfers[item.id] || item.paymentMeta?.last5)
          "
          class="mt-4 text-sm text-secondary-600 text-right"
        >
          匯款帳號末5碼：{{ reportedTransfers[item.id] || item.paymentMeta?.last5 }}
        </div>

        <div v-if="item.reviewable" class="mt-4 pt-3 border-t border-secondary-100">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-sm text-secondary-600 space-y-2">
              <div class="text-secondary-500 flex items-center gap-1">
                <template v-if="item.rating">
                  <StarIcon
                    v-for="star in 5"
                    :key="star"
                    class="w-4 h-4 fill-current"
                    :class="star <= item.rating ? 'text-gold-400' : 'text-secondary-300'"
                  />
                </template>
              </div>
              <div>
                <div class="font-semibold text-secondary-700">評論</div>
                <div v-if="item.comment" class="mt-1 text-secondary-600">
                  {{ item.comment }}
                </div>
                <div v-else class="mt-1 text-secondary-400">尚未評論</div>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-primary text-primary font-semibold hover:bg-primary-50 transition"
                @click="openRatingModal(item)"
              >
                {{ item.rating ? '修改評價' : '給評價' }}
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
      </div>

      <div
        v-if="itineraries.length === 0"
        class="text-center py-10 text-secondary-400 border-2 border-dashed border-secondary-200 rounded-lg"
      >
        目前沒有訂單
      </div>
    </div>

    <div v-if="isRatingOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-secondary-900/40" @click="closeRatingModal" />
      <div
        class="relative bg-white w-full max-w-md mx-4 rounded-xl border-2 border-primary shadow-primary-tall p-6"
      >
        <div class="text-lg font-bold text-secondary-800 mb-2">星級評價</div>
        <div class="text-sm text-secondary-500 mb-4">
          {{ ratingTarget?.title || '行程' }}
        </div>
        <div class="space-y-4 mb-6">
          <div class="flex items-center gap-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              class="p-2 rounded-lg transition"
              @click="((ratingDraft = star), (ratingWarning = ''))"
            >
              <StarIcon
                class="w-7 h-7 fill-current"
                :class="star <= ratingDraft ? 'text-gold-400' : 'text-secondary-300'"
              />
            </button>
          </div>
          <div>
            <div class="font-semibold text-secondary-700 mb-1">評論</div>
            <textarea
              v-model="commentDraft"
              class="w-full border border-secondary-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              rows="3"
              placeholder="留下你的評論"
            />
          </div>
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
            class="px-4 py-2 rounded-lg font-semibold transition"
            :class="
              ratingDraft
                ? 'bg-primary text-white hover:bg-primary-700'
                : 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
            "
            @click="saveRating"
          >
            儲存評價
          </button>
        </div>
        <div v-if="ratingWarning" class="mt-3 text-sm text-accent-600">
          {{ ratingWarning }}
        </div>
      </div>
    </div>

    <div v-if="isBankInfoOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-secondary-900/40" @click="closeBankInfo" />
      <div
        class="relative bg-white w-full max-w-md mx-4 rounded-xl border-2 border-primary shadow-primary-tall p-6"
      >
        <div class="text-lg font-bold text-secondary-800 mb-4">轉帳資訊</div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-secondary-500">銀行代碼</span>
            <span>004</span>
          </div>
          <div class="flex justify-between">
            <span class="text-secondary-500">銀行名稱</span>
            <span>台灣銀行</span>
          </div>
          <div class="flex justify-between">
            <span class="text-secondary-500">戶名</span>
            <span>旅伴探索股份有限公司</span>
          </div>
          <div class="flex justify-between">
            <span class="text-secondary-500">帳號</span>
            <span>123-456-789012</span>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 transition"
            @click="closeBankInfo"
          >
            關閉
          </button>
        </div>
      </div>
    </div>

    <div v-if="isReportOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-secondary-900/40" @click="closeReportModal" />
      <div
        class="relative bg-white w-full max-w-md mx-4 rounded-xl border-2 border-primary shadow-primary-tall p-6"
      >
        <div class="text-lg font-bold text-secondary-800 mb-4">回報已付款</div>
        <div class="space-y-3 text-sm">
          <div class="text-secondary-600">請輸入匯款帳號末 5 碼</div>
          <input
            v-model="reportAccountLast5"
            maxlength="5"
            inputmode="numeric"
            class="w-full border border-secondary-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            placeholder="00000"
          />
          <div v-if="reportWarning" class="text-accent-600 text-sm">{{ reportWarning }}</div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-secondary-200 text-secondary-600 hover:bg-secondary-50 transition"
            @click="closeReportModal"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-primary bg-primary text-white hover:bg-primary-700 transition disabled:opacity-60"
            @click="submitReport"
            :disabled="isReportSubmitting"
          >
            {{ isReportSubmitting ? '送出中...' : '送出回報' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
