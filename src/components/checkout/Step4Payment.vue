<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { checkoutStore } from '@/stores/checkout'
import MainButton from './MainButton.vue'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

const router = useRouter()
const route = useRoute()

const orderLoading = ref(false)
const orderError = ref('')
const payableAmount = ref(0)

const orderId = computed(() => route.query.orderId || checkoutStore.lastOrder?.id)

onMounted(async () => {
  if (!orderId.value) return

  orderLoading.value = true
  orderError.value = ''
  try {
    const { data } = await axios.get(`${API_BASE_URL}/orders/${orderId.value}`)
    if (!data?.ok) throw new Error(data?.message || '讀取訂單失敗')

    // 後端訂單金額（不會因 cart 被清掉而變 0）
    payableAmount.value = Number(data.order?.amount ?? 0)

    // （可選）順便把 store 的 lastOrder 補齊，方便其他步驟用
    checkoutStore.lastOrder = {
      id: data.order.id,
      orderNo: data.order.orderNo,
      amount: Number(data.order.amount ?? 0),
      status: data.order.status,
    }
  } catch (e) {
    orderError.value = e?.message || '讀取訂單失敗'
    payableAmount.value = 0
  } finally {
    orderLoading.value = false
  }
})

// =====================
// 付款方式（兩層 UI）
// =====================
const paymentMethod = ref('') // 'credit' | 'mobile' | 'bank'
const mobileProvider = ref('') // 'linepay' | 'applepay' | 'googlepay' | ...

// 你要「擴充付款方式」主要就改這兩個設定：
// 1) PAYMENT_PROVIDER：把 UI value 映射成後端 providerKey（不想映射就讓 value 本身就是 providerKey）
// 2) REDIRECT_PROVIDERS：哪些 provider 需要導去第三方付款頁（如 linepay）
const PAYMENT_PROVIDER = {
  credit: 'credit',
  bank: 'bank',
  mobile: {
    linepay: 'linepay',
    applepay: 'applepay',
    googlepay: 'googlepay',
    // jkopay: 'jkopay',
    // easywallet: 'easywallet',
  },
}

const providerKey = computed(() => {
  const method = paymentMethod.value
  if (!method) return ''

  if (method === 'mobile') {
    const p = mobileProvider.value
    if (!p) return ''
    return PAYMENT_PROVIDER.mobile[p] || p
  }

  return PAYMENT_PROVIDER[method] || method
})

const REDIRECT_PROVIDERS = new Set([
  'linepay',
  'applepay',
  'googlepay',
  // 'jkopay',
  // 'easywallet',
])

const shouldRedirect = computed(() => REDIRECT_PROVIDERS.has(providerKey.value))

// =====================
// 信用卡欄位及錯誤訊息
// =====================
const cardNumber = ref('')
const cardName = ref('')
const cardCVV = ref('')
const cardExpiryMonth = ref('')
const cardExpiryYear = ref('')

const expiryMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

const expiryYears = Array.from({ length: 12 }, (_, i) => {
  const yy = (new Date().getFullYear() + i) % 100
  return String(yy).padStart(2, '0')
})

const cardNumberError = ref('')
const cardNameError = ref('')
const cardExpiryError = ref('')
const cardCVVError = ref('')

function clearCardErrors() {
  cardNumberError.value = ''
  cardNameError.value = ''
  cardExpiryError.value = ''
  cardCVVError.value = ''
}

function isValidCardNumber(value) {
  if (!value) return false
  const s = String(value).replace(/[^0-9]/g, '')
  if (s.length < 13 || s.length > 19) return false
  let sum = 0
  let shouldDouble = false
  for (let i = s.length - 1; i >= 0; i--) {
    let digit = parseInt(s.charAt(i), 10)
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

function isValidExpiryMMYY(monthYY, yearYY) {
  if (!monthYY || !yearYY) return false
  const month = parseInt(monthYY, 10)
  if (Number.isNaN(month) || month < 1 || month > 12) return false

  const year = 2000 + parseInt(yearYY, 10)
  if (Number.isNaN(year)) return false

  // 到期日：下一個月 1 號 00:00
  const expiryBoundary = new Date(year, month, 1) // month 直接用 1~12，JS 會當成 next month
  const now = new Date()
  return expiryBoundary > now
}

function isValidCVV(value) {
  if (!value) return false
  return /^\d{3,4}$/.test(String(value).trim())
}

// 顯示控制
const showCreditForm = computed(() => paymentMethod.value === 'credit')
const showMobilePay = computed(() => paymentMethod.value === 'mobile')
const showBankInfo = computed(() => paymentMethod.value === 'bank')

// （可選）信用卡驗證：你想嚴謹一點就打開這段
function validateCreditForm() {
  clearCardErrors()

  if (!isValidCardNumber(cardNumber.value)) cardNumberError.value = '卡號格式不正確'
  if (!cardName.value?.trim()) cardNameError.value = '請輸入持卡人姓名'
  if (!isValidExpiryMMYY(cardExpiryMonth.value, cardExpiryYear.value)) {
    cardExpiryError.value = '請選擇到期月/年'
  }

  if (!isValidCVV(cardCVV.value)) cardCVVError.value = 'CVV 格式不正確'

  return (
    !cardNumberError.value && !cardNameError.value && !cardExpiryError.value && !cardCVVError.value
  )
}

// =====================
// 付款流程
// =====================
const confirmPayment = async () => {
  if (!orderId.value) {
    alert('找不到訂單編號 orderId')
    return
  }
  if (!paymentMethod.value) {
    alert('請選擇付款方式')
    return
  }
  if (paymentMethod.value === 'mobile' && !mobileProvider.value) {
    alert('請選擇行動支付方式')
    return
  }
  if (!providerKey.value) {
    alert('付款方式設定錯誤（providerKey 空值）')
    return
  }

  // （可選）若是信用卡，先驗證欄位
  if (paymentMethod.value === 'credit') {
    const ok = validateCreditForm()
    if (!ok) return
  }

  try {
    // 1) 建立付款（後端用 paymentMethod/providerKey 來分流：mock 或 linepay）
    const createRes = await axios.post(`${API_BASE_URL}/payments/create`, {
      orderId: orderId.value,
      paymentMethod: providerKey.value, // 永遠送 providerKey（例如 linepay）
      // 你若想保留 UI 原始選擇，後端除錯可用：
      // uiPaymentMethod: paymentMethod.value,
      // uiMobileProvider: mobileProvider.value,
    })

    if (!createRes.data?.ok) throw new Error(createRes.data?.message || '建立付款失敗')

    const { paymentId, paymentUrl } = createRes.data || {}
    if (!paymentId) throw new Error('缺少 paymentId')

    // 2) 需要跳第三方付款頁（LINE Pay 等）：直接 redirect
    if (shouldRedirect.value) {
      if (!paymentUrl) throw new Error('缺少 paymentUrl')
      window.location.href = paymentUrl
      return
    }

    // 3) 其他方式：先用 mock-pay 測試（之後真的串卡/轉帳再換成對應流程）
    const payRes = await axios.get(`${API_BASE_URL}/payments/mock-pay`, {
      params: { paymentId },
    })

    if (!payRes.data?.ok) throw new Error(payRes.data?.message || '付款失敗')

    router.push(`/checkout/step5?orderId=${orderId.value}`)
  } catch (err) {
    console.error(err)
    alert(err?.message || '付款失敗')
  }
}
</script>

<template>
  <section class="max-w-5xl mx-auto">
    <div class="flex flex-col gap-10 lg:flex-row">
      <!-- 左側：付款方式 -->
      <div class="flex-1 space-y-6">
        <!-- 安全提示 -->
        <div
          class="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg text-sm sm:text-base"
        >
          🔒 您的付款資訊經過加密保護，我們不會儲存您的信用卡資訊
        </div>

        <!-- 付款方式 -->
        <div class="bg-white p-6 rounded-xl">
          <h2 class="text-xl font-bold mb-5">選擇付款方式</h2>

          <div class="space-y-4">
            <!-- 信用卡 -->
            <label
              class="flex gap-4 items-start border p-4 rounded-lg cursor-pointer"
              :class="paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="paymentMethod" type="radio" value="credit" />
              <div>
                <p class="font-bold">信用卡付款</p>
                <p class="text-sm text-gray-500">支援 Visa・MasterCard・JCB</p>
              </div>
            </label>

            <!-- 行動支付 -->
            <label
              class="flex gap-4 items-start border p-4 rounded-lg cursor-pointer"
              :class="paymentMethod === 'mobile' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="paymentMethod" type="radio" value="mobile" />
              <div>
                <p class="font-bold">行動支付</p>
                <p class="text-sm text-gray-500">Apple Pay・Google Pay・LINE Pay</p>
              </div>
            </label>

            <!-- 銀行轉帳 -->
            <label
              class="flex gap-4 items-start border p-4 rounded-lg cursor-pointer"
              :class="paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="paymentMethod" type="radio" value="bank" />
              <div>
                <p class="font-bold">銀行轉帳</p>
                <p class="text-sm text-gray-500">ATM 轉帳或網路銀行</p>
              </div>
            </label>
          </div>
        </div>

        <!-- 信用卡付款資訊 -->
        <div v-if="showCreditForm" class="bg-white p-6 rounded-xl">
          <h3 class="text-lg font-bold mb-4">信用卡資訊</h3>

          <div class="space-y-6">
            <div class="flex flex-col gap-2">
              <label>卡號 <span class="text-red-500">*</span></label>
              <input
                v-model="cardNumber"
                class="border border-gray-300 rounded p-1 w-full"
                placeholder="1234 5678 9012 3456"
                @input="cardNumberError = ''"
              />
              <p v-if="cardNumberError" class="text-red-500 text-sm">{{ cardNumberError }}</p>
            </div>

            <div class="flex flex-col gap-2">
              <label>持卡人姓名 <span class="text-red-500">*</span></label>
              <input
                v-model="cardName"
                class="border border-gray-300 rounded p-1 w-full"
                placeholder="CARDHOLDER NAME"
                @input="cardNameError = ''"
              />
              <p v-if="cardNameError" class="text-red-500 text-sm">{{ cardNameError }}</p>
            </div>

            <div class="flex flex-col gap-4 md:flex-row md:gap-8">
              <div class="flex flex-col gap-2">
                <label>有效期限 <span class="text-red-500">*</span></label>
                <div class="flex gap-2">
                  <select
                    v-model="cardExpiryMonth"
                    class="border border-gray-300 rounded p-1 w-20 text-center"
                    @change="cardExpiryError = ''"
                  >
                    <option value="" disabled>MM</option>
                    <option v-for="month in expiryMonths" :key="month" :value="month">
                      {{ month }}
                    </option>
                  </select>
                  <span class="self-center">/</span>
                  <select
                    v-model="cardExpiryYear"
                    class="border border-gray-300 rounded p-1 w-20 text-center"
                    @change="cardExpiryError = ''"
                  >
                    <option value="" disabled>YY</option>
                    <option v-for="year in expiryYears" :key="year" :value="year">
                      {{ year }}
                    </option>
                  </select>
                </div>
                <p v-if="cardExpiryError" class="text-red-500 text-sm">
                  {{ cardExpiryError }}
                </p>
              </div>
              <div class="flex flex-col gap-2">
                <label>安全碼 <span class="text-red-500">*</span></label>
                <input
                  v-model="cardCVV"
                  class="border border-gray-300 rounded p-1"
                  placeholder="CVV"
                  @input="cardCVVError = ''"
                />
                <p v-if="cardCVVError" class="text-red-500 text-sm">{{ cardCVVError }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 行動支付選項 -->
        <div v-if="showMobilePay" class="bg-white p-6 rounded-xl">
          <h3 class="text-lg font-bold mb-4">選擇行動支付</h3>

          <div class="flex flex-col gap-5">
            <label
              class="flex items-center gap-3 border p-4 rounded-lg cursor-pointer"
              :class="mobileProvider === 'applepay' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="applepay" />
              <span>Apple Pay</span>
            </label>

            <label
              class="flex items-center gap-3 border p-4 rounded-lg cursor-pointer"
              :class="mobileProvider === 'googlepay' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="googlepay" />
              <span>Google Pay</span>
            </label>

            <label
              class="flex items-center gap-3 border p-4 rounded-lg cursor-pointer"
              :class="mobileProvider === 'linepay' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="linepay" />
              <span>LINE Pay</span>
            </label>
          </div>

          <p class="text-sm text-gray-500 mt-4">將於下一步導向第三方支付頁面</p>
        </div>

        <!-- 銀行轉帳資訊 -->
        <div v-if="showBankInfo" class="bg-white p-6 rounded-xl">
          <h3 class="text-lg font-bold mb-4">銀行轉帳資訊</h3>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">銀行名稱</span>
              <span>台灣銀行（004）</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">戶名</span>
              <span>旅伴尋股份有限公司</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">帳號</span>
              <span>123-456-789012</span>
            </div>
            <div class="flex justify-between font-bold text-blue-600">
              <span>轉帳金額</span>
              <span>NT$ {{ payableAmount }}</span>
            </div>
          </div>

          <p class="mt-4 text-sm text-gray-500">請於轉帳後將收據上傳至系統，我們將於確認後通知您</p>
        </div>
      </div>

      <!-- 右側：訂單摘要 -->
      <div class="min-w-64 bg-white p-6 rounded-xl max-h-[500px] flex flex-col gap-5">
        <h3 class="text-xl font-bold">訂單摘要</h3>

        <div class="space-y-4">
          <div class="mb-12 text-md">
            <p class="text-gray-500">行程名稱</p>
            <p>{{ checkoutStore.selectedTour?.title }}</p>
          </div>

          <div class="flex flex-col gap-2 justify-between text-sm">
            <span class="text-gray-500">行程日期</span>
            <span>{{ checkoutStore.selectedTour?.date }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-gray-500">人數</span>
            <span>{{ checkoutStore.selectedTour?.persons }} 人</span>
          </div>

          <hr />
          <div v-if="orderLoading">訂單金額載入中...</div>
          <div v-else-if="orderError">{{ orderError }}</div>
          <div v-else>
            <div class="flex justify-between font-bold text-blue-600 text-lg">
              <span>應付金額</span>
              <span>NT$ {{ payableAmount }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <MainButton @click="confirmPayment"> 確認付款 </MainButton>
        </div>
        <div class="text-green-600 text-sm text-center">✔ 安全加密付款</div>
      </div>
    </div>
  </section>
</template>
