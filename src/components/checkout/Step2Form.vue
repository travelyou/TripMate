<script setup>
import { ref } from 'vue'
import MainButton from './MainButton.vue'
import SubButton from './SubButton.vue'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
const router = useRouter()

const formRef = ref(null)

const phoneError = ref('')
const emergencyPhoneError = ref('')

function clearPhoneError() {
  phoneError.value = ''
}

function clearEmergencyPhoneError() {
  emergencyPhoneError.value = ''
}

function isValidPhone(phone) {
  if (!phone) return false
  const s = String(phone).trim()
  // Accept formats: 09XXXXXXXX or 09XX-XXX-XXX
  const rePlain = /^09\d{8}$/
  const reHyphen = /^09\d{2}-\d{3}-\d{3}$/
  return rePlain.test(s) || reHyphen.test(s)
}

function onSubmit() {
  if (formRef.value && !formRef.value.checkValidity()) {
    formRef.value.reportValidity()
    return
  }

  // 電話格式驗證
  const contactPhone = checkoutStore.contact.phone
  const emergencyPhone = checkoutStore.emergencyContact.phone

  let valid = true

  if (!isValidPhone(contactPhone)) {
    phoneError.value = '請輸入正確手機號碼，格式例如 0987-654-321 或 0987654321'
    valid = false
  }

  if (!isValidPhone(emergencyPhone)) {
    emergencyPhoneError.value = '請輸入正確手機號碼，格式例如 0987-654-321 或 0987654321'
    valid = false
  }

  if (!valid) return

  router.push('/checkout/step3')
}

function backStep() {
  router.push('/checkout/step1')
}
</script>

<template>
  <section>
    <!-- 標題 -->
    <div class="mb-5">
      <h2 class="text-3xl font-bold">填寫資料</h2>
      <p class="text-gray-600">請填寫您的聯絡資訊</p>
    </div>
    <!-- 表單 -->
    <form ref="formRef" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-5 justify-center">
        <div class="bg-white p-5 rounded-xl">
          <!-- 個人聯絡資訊 -->
          <h1 class="mb-5 text-xl">聯絡資訊</h1>
          <div class="flex flex-col gap-2">
            <div>
              <p>聯絡人姓名<span class="text-red-500">*</span></p>
              <input
                v-model="checkoutStore.contact.name"
                placeholder="請輸入真實姓名"
                class="border border-gray-300 rounded p-2 my-2"
                name="contactName"
                required
              />
            </div>
            <div>
              <p>聯絡電話(手機)<span class="text-red-500">*</span></p>
              <input
                v-model="checkoutStore.contact.phone"
                @input="clearPhoneError"
                placeholder="0900-000-000"
                type="tel"
                class="border border-gray-300 rounded p-2 my-2"
                name="contactPhone"
                inputmode="tel"
                required
              />
              <p v-if="phoneError" class="text-red-500 text-sm mt-1">{{ phoneError }}</p>
            </div>
            <div>
              <p>電子郵件<span class="text-red-500">*</span></p>
              <input
                v-model="checkoutStore.contact.email"
                type="email"
                placeholder="example@email.com"
                class="border border-gray-300 rounded p-2 my-2"
                name="contactEmail"
                required
              />
            </div>
          </div>
        </div>

        <!-- 緊急連絡人資訊 -->
        <div class="bg-white p-5 rounded-xl">
          <h1 class="mb-5 text-xl">緊急聯絡人</h1>
          <div>
            <div>
              <p>緊急聯絡人姓名<span class="text-red-500">*</span></p>
              <input
                v-model="checkoutStore.emergencyContact.name"
                placeholder="緊急聯絡人姓名"
                class="border border-gray-300 rounded p-2 my-2"
                name="emergencyName"
                required
              />
            </div>
            <div>
              <p>緊急聯絡人電話<span class="text-red-500">*</span></p>
              <input
                v-model="checkoutStore.emergencyContact.phone"
                @input="clearEmergencyPhoneError"
                placeholder="0900-000-000"
                class="border border-gray-300 rounded p-2 my-2"
                name="emergencyPhone"
                inputmode="tel"
                required
              />
              <p v-if="emergencyPhoneError" class="text-red-500 text-sm mt-1">
                {{ emergencyPhoneError }}
              </p>
            </div>
          </div>
        </div>

        <!-- 備註欄 -->
        <div class="bg-white p-5 rounded-xl">
          <h1 class="mb-2 text-xl">特殊需求（選填）</h1>
          <textarea
            v-model="checkoutStore.contact.note"
            placeholder="例如：飲食限制、身體狀況、特殊需求等..."
            class="w-full border border-gray-300 rounded p-2 my-2"
          ></textarea>
        </div>
      </div>

      <!-- 按鈕區 -->

      <div class="flex justify-between mt-10">
        <SubButton @click="backStep"> 上一步 </SubButton>
        <MainButton type="submit"> 下一步 </MainButton>
      </div>
    </form>
  </section>
</template>
