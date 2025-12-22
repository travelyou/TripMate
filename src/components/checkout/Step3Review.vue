<script setup>
import { computed } from 'vue'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import TourInfoBlock from './TourInfoBlock.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
const router = useRouter()

const agree = computed({
  get: () => checkoutStore.agree,
  set: (v) => (checkoutStore.agree = v),
})

function nextStep() {
  if (!agree.value) {
    window.alert('請先勾選：我已閱讀並同意服務條款及隱私權政策，並確認以上資料皆正確無誤')
    return
  }
  router.push('/checkout/step4')
}
function backStep() {
  router.push('/checkout/step2')
}
</script>

<template>
  <section >
    <div class="max-w-4xl mx-auto mt-10">
      <!-- 標題 -->
      <div>
        <h2 class="text-3xl font-bold">確認資料</h2>
        <div class="flex flex-col gap-5 mt-5">
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
          >我已閱讀並同意服務條款及隱私權政策，並確認以上資料皆正確無誤</label
        >
      </div>
      <!-- 按鈕區 -->
      <div class="mt-10 flex justify-between">
        <SubButton @click="backStep"> 上一步 </SubButton>
        <MainButton @click="nextStep"> 前往付款 </MainButton>
      </div>
    </div>
  </section>
</template>
