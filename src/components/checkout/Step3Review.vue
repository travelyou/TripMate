<script setup>
import { computed, ref } from 'vue'
import axios from 'axios'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
import { API_BASE_URL } from '@/api/config'

const router = useRouter()
const submitting = ref(false)

const agree = computed({
  get: () => checkoutStore.agree,
  set: (v) => (checkoutStore.agree = v),
})

async function nextStep() {
  if (!agree.value) {
    window.alert('請先勾選：我已閱讀並同意服務條款及隱私權政策，並確認以上資料皆正確無誤')
    return
  }

  const tour = checkoutStore.selectedTour
  if (!tour) {
    window.alert('找不到要結帳的行程，請回購物車重新選擇')
    router.replace('/cart')
    return
  }

  submitting.value = true
  try {
    const payload = {
      itineraryId: tour.id, // 單選結帳：指定要 checkout 哪個 cart item
      contact: checkoutStore.contact,
      emergencyContact: checkoutStore.emergencyContact,
      paymentMethod: checkoutStore.paymentMethod || 'mock', // 你如果在 step4 才選付款方式也沒關係
    }

    // 注意：你的 API_BASE_URL 目前是 .../api
    // 所以這裡用 `${API_BASE_URL}/orders/from-cart`（不再加 /api）
    const { data } = await axios.post(`${API_BASE_URL}/orders/from-cart`, payload)

    if (!data?.ok) throw new Error(data?.message || '建立訂單失敗')

    // 把後端回來的訂單資訊先存起來（Step4/Step5 會用到）
    checkoutStore.lastOrder = {
      id: data.orderId,
      orderNo: data.orderNo,
      amount: data.amount,
      paymentId: data.paymentId,
      status: data.status,
    }

    // 後端已把該項從 cart 移除 → 重新載入購物車避免 UI 不一致
    await checkoutStore.loadCartFromDb()

    // 前往付款頁：用 query 帶 orderId，重整也不怕
    router.push(`/checkout/step4?orderId=${data.orderId}`)
  } catch (e) {
    console.error('[Step3 submit order] failed:', e)
    window.alert(e?.message || '送出訂單失敗')
  } finally {
    submitting.value = false
  }
}

function backStep() {
  router.push('/checkout/step2')
}
</script>

<template>
  <section>
    <div class="max-w-4xl mx-auto">
      <!-- 標題 -->
      <div>
        <h2 class="text-3xl font-bold mb-2">確認資料</h2>
        <p class="text-lg mb-5">點擊送出後將會為您建立訂單</p>
        <div class="flex flex-col gap-5">
          <!-- 旅程資訊 -->
          <TourInfoBlock />
          <!-- 資料確認區 -->
          <div class="bg-white p-5 rounded-xl">
            <h1 class="mb-5 text-xl font-bold">聯絡資訊</h1>
            <div class="flex flex-col gap-5">
              <div>
                <p class="text-gray-500">姓名</p>
                <p>{{ checkoutStore.contact.name }}</p>
              </div>
              <div>
                <p class="text-gray-500">電話</p>
                <p>{{ checkoutStore.contact.phone }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-xl">
            <h1 class="mb-5 text-xl font-bold">緊急聯絡人</h1>
            <div class="flex flex-col gap-5">
              <div>
                <p class="text-gray-500">緊急聯絡人姓名</p>
                <p>{{ checkoutStore.emergencyContact.name }}</p>
              </div>
              <div>
                <p class="text-gray-500">緊急聯絡人電話</p>
                <p>{{ checkoutStore.emergencyContact.phone }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 同意勾選區 -->
      <div class="mt-4 flex items-start gap-3 bg-white p-5 rounded-xl">
        <input id="agree" type="checkbox" v-model="agree" class="mt-1 w-4 h-4" />
        <label for="agree" class="text-sm"
          >我已閱讀並同意<span class="text-blue-600">服務條款</span>及<span class="text-blue-600"
            >隱私權政策</span
          >，並確認以上資料皆<span class="font-bold">正確無誤</span></label
        >
      </div>
      <!-- 按鈕區 -->
      <div class="mt-10 flex justify-between">
        <SubButton @click="backStep"> 上一步 </SubButton>
        <MainButton :disabled="submitting" @click="nextStep">
          {{ submitting ? '送出中…' : '前往付款' }}
        </MainButton>
      </div>
    </div>
  </section>
</template>
