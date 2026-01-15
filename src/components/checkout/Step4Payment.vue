<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { checkoutStore } from '@/stores/checkout'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
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
      orderNo: data.order.order_no,
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

// 付款方式
const paymentMethod = ref('')
// 行動支付選項
const mobileProvider = ref('')

// 信用卡欄位及錯誤訊息
const cardNumber = ref('')
const cardName = ref('')
const cardExpiry = ref('')
const cardCVV = ref('')

// 錯誤訊息
const cardNumberError = ref('')
const cardNameError = ref('')
const cardExpiryError = ref('')
const cardCVVError = ref('')

// 清除信用卡錯誤訊息
function clearCardErrors() {
  cardNumberError.value = ''
  cardNameError.value = ''
  cardExpiryError.value = ''
  cardCVVError.value = ''
}

// 驗證信用卡卡號
function isValidCardNumber(value) {
  if (!value) return false
  const s = String(value).replace(/[^0-9]/g, '')
  if (s.length < 13 || s.length > 19) return false
  //  盧恩算法 (Luhn algorithm) 檢查
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

// 驗證有效期限 MM/YY 格式且未過期
function isValidExpiry(value) {
  if (!value) return false
  const m = String(value).trim()
  const re = /^(0[1-9]|1[0-2])\/\d{2}$/
  if (!re.test(m)) return false
  const parts = m.split('/')
  const month = parseInt(parts[0], 10)
  const year = parseInt(parts[1], 10) + 2000
  const expiryDate = new Date(year, month - 1 + 1, 1) // 到期後，次月的第一天
  const now = new Date()
  // MM/YY 是否未過期
  return expiryDate > now
}

// 驗證 CVV 為 3 或 4 位數字
function isValidCVV(value) {
  if (!value) return false
  return /^\d{3,4}$/.test(String(value).trim())
}

// 選擇付款方式
const showCreditForm = computed(() => paymentMethod.value === 'credit')
const showMobilePay = computed(() => paymentMethod.value === 'mobile')
const showBankInfo = computed(() => paymentMethod.value === 'bank')

// 前往完成訂單
async function confirmPayment() {
  if (!paymentMethod.value) {
    alert('請選擇付款方式')
    return
  }

  // 信用卡驗證（你原本的保留）
  if (paymentMethod.value === 'credit') {
    clearCardErrors()
    let valid = true

    if (!cardName.value || !String(cardName.value).trim()) {
      cardNameError.value = '請輸入持卡人姓名'
      valid = false
    }
    if (!isValidCardNumber(cardNumber.value)) {
      cardNumberError.value = '請輸入正確卡號'
      valid = false
    }
    if (!isValidExpiry(cardExpiry.value)) {
      cardExpiryError.value = '請輸入有效期限'
      valid = false
    }
    if (!isValidCVV(cardCVV.value)) {
      cardCVVError.value = '請輸入 CVV'
      valid = false
    }
    if (!valid) return
  }

  // 把付款方式存到 store（可選）
  checkoutStore.paymentMethod = paymentMethod.value
  checkoutStore.mobileProvider = mobileProvider.value

  // 🔑 取得 Step3 建好的 orderId
  const orderId = route.query.orderId || checkoutStore.lastOrder?.id
  if (!orderId) {
    alert('找不到訂單編號，請重新結帳')
    router.replace('/cart')
    return
  }

  try {
    // 🔥 這裡用你後端的 mock-pay 模擬付款成功
    const { data } = await axios.get(`${API_BASE_URL}/payments/mock-pay`, {
      params: { orderId },
    })

    if (!data?.ok) throw new Error(data?.message || '付款失敗')

    // 成功 → 進 Step5，用 orderId 查狀態
    router.push(`/checkout/step5?orderId=${orderId}`)
  } catch (e) {
    console.error(e)
    alert(e?.message || '付款失敗')
  }
}

// 上一步
function backStep() {
  router.push('/checkout/step3')
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
                <input
                  v-model="cardExpiry"
                  class="border border-gray-300 rounded p-1"
                  placeholder="MM/YY"
                  @input="cardExpiryError = ''"
                />
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
              :class="mobileProvider === 'apple' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="apple" />
              <span>Apple Pay</span>
            </label>

            <label
              class="flex items-center gap-3 border p-4 rounded-lg cursor-pointer"
              :class="mobileProvider === 'google' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="google" />
              <span>Google Pay</span>
            </label>

            <label
              class="flex items-center gap-3 border p-4 rounded-lg cursor-pointer"
              :class="mobileProvider === 'line' ? 'border-blue-500 bg-blue-50' : ''"
            >
              <input v-model="mobileProvider" type="radio" value="line" />
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
              <span>NT$ {{ checkoutStore.cartTotalPrice }}</span>
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

          <SubButton @click="backStep"> 上一步 </SubButton>
        </div>
        <div class="text-green-600 text-sm text-center">✔ 安全加密付款</div>
      </div>
    </div>
  </section>
</template>
