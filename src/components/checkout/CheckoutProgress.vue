<script setup>
//定義「現在第幾步」
//props = 父層丟資料進來
const props = defineProps({
  currentStep: {
    type: Number,
    required: true,
  },
})

const steps = ['確認商品', '填寫資料', '確認資料', '付款', '完成訂單']
</script>

<template>
  <section class="flex justify-center m-5">
    <ul class="flex gap-20">
      <li v-for="(step, index) in steps" :key="step">
        <p
          class="rounded-full w-14 h-14 text-center content-center"
          :class="index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'"
        >
          {{ index + 1 }}
        </p>
        <p class="text-center mt-3">{{ step }}</p>
      </li>
    </ul>
  </section>
</template>
