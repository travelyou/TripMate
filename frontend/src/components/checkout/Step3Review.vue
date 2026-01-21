<script setup>
import { computed, ref, onMounted } from 'vue'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const submitting = ref(false)

const agree = computed({
  get: () => checkoutStore.agree,
  set: (v) => (checkoutStore.agree = v),
})

// ✅ 進 step3 時也確保購物車資料存在（後端為準）
// 並支援 itineraryId query（防止 refresh/直連丟狀態）
onMounted(async () => {
  const itineraryId = Number(route.query.itineraryId)

  if (!checkoutStore.tourGroups.length) {
    await checkoutStore.loadCartFromDb()
  }

  if (Number.isFinite(itineraryId) && itineraryId > 0) {
    checkoutStore.selectedCartTourId = itineraryId
  }
})

async function nextStep() {
  if (!agree.value) {
    window.alert('請先勾選：我已閱讀並同意服務條款及隱私權政策，並確認以上資料皆正確無誤')
    return
  }

  // ✅ 後端為準：用 cartSelectedTour（不要用 selectedTour 相容層）
  const tour = checkoutStore.cartSelectedTour
  if (!tour) {
    window.alert('找不到要結帳的行程，請回購物車重新選擇')
    router.replace('/cart')
    return
  }

  submitting.value = true
  try {
    // 若 store 有 debounce 同步人數，先 flush（可選但建議）
    if (typeof checkoutStore.flushPersonsSync === 'function') {
      await checkoutStore.flushPersonsSync()
    }

    const orderId = await checkoutStore.createOrderFromSelectedCart()
    router.push(`/checkout/step4?orderId=${orderId}`)
  } catch (e) {
    console.error('[Step3 submit order] failed:', e)
    window.alert(e?.message || '送出訂單失敗')
  } finally {
    submitting.value = false
  }
}

function backStep() {
  router.push(`/checkout/step2?itineraryId=${checkoutStore.selectedCartTourId || ''}`)
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
