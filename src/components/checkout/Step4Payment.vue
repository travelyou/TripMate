<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { checkoutStore } from '@/stores/checkout'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'

const router = useRouter()

// 付款方式
const paymentMethod = ref('')
// 行動支付選項
const mobileProvider = ref('')

// 選擇付款方式
const showCreditForm = computed(() => paymentMethod.value === 'credit')
const showMobilePay = computed(() => paymentMethod.value === 'mobile')
const showBankInfo = computed(() => paymentMethod.value === 'bank')

// 前往完成訂單
function confirmPayment() {
  if (!paymentMethod.value) {
    alert('請選擇付款方式')
    return
  }
  checkoutStore.paymentMethod = paymentMethod.value
  if (paymentMethod.value === 'mobile') {
    if (!mobileProvider.value) {
      alert('請選擇行動支付方式')
      return
    }
    checkoutStore.mobileProvider = mobileProvider.value
  }

  // 儲存為已完成的訂單並清空 checkoutStore
  if (typeof checkoutStore.completeOrder === 'function') {
    checkoutStore.completeOrder()
  }

  router.push('/checkout/step5')
}

// 上一步
function backStep() {
  router.push('/checkout/step3')
}
</script>

<template>
  <section class="max-w-5xl mx-auto mt-10">
    <div class="flex gap-10">
      <!-- 左側：付款方式 -->
      <div class="flex-1 space-y-6">
        <!-- 安全提示 -->
        <div
          class="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg"
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
                class="border border-gray-300 rounded p-1 w-full"
                placeholder="1234 5678 9012 3456"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label>持卡人姓名 <span class="text-red-500">*</span></label>
              <input
                class="border border-gray-300 rounded p-1 w-full"
                placeholder="CARDHOLDER NAME"
              />
            </div>

            <div class="flex gap-4">
              <div class="flex flex-col gap-2">
                <label>有效期限 <span class="text-red-500">*</span></label>
                <input class="border border-gray-300 rounded p-1" placeholder="MM/YY" />
              </div>
              <div class="flex flex-col gap-2">
                <label>安全碼 <span class="text-red-500">*</span></label>
                <input class="border border-gray-300 rounded p-1" placeholder="CVV" />
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
              <span>NT$ {{ checkoutStore.totalPrice }}</span>
            </div>
          </div>

          <p class="mt-4 text-sm text-gray-500">請於轉帳後將收據上傳至系統，我們將於確認後通知您</p>
        </div>
      </div>

      <!-- 右側：訂單摘要 -->
      <div class="w-80 bg-white p-6 rounded-xl max-h-[500px] flex flex-col gap-5">
        <h3 class="text-xl font-bold">訂單摘要</h3>

        <div class="space-y-2">
          <div class="mb-12 text-md">
            <p class="text-gray-500">行程名稱</p>
            <p>{{ checkoutStore.selectedTour?.title }}</p>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-gray-500">出發日期</span>
            <span>{{ checkoutStore.selectedTour?.date }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-gray-500">人數</span>
            <span>{{ checkoutStore.selectedTour?.persons }} 人</span>
          </div>

          <hr />

          <div class="flex justify-between font-bold text-blue-600 text-lg">
            <span>應付金額</span>
            <span>NT$ {{ checkoutStore.totalPrice }}</span>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <MainButton @click="confirmPayment">
            確認付款 NT$ {{ checkoutStore.totalPrice }}
          </MainButton>

          <SubButton @click="backStep"> 上一步 </SubButton>
        </div>
        <div class="text-green-600 text-sm text-center">✔ 安全加密付款</div>
      </div>
    </div>
  </section>
</template>
