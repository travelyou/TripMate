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
  <section class="flex justify-center mt-5 min-w-[400px]">
    <ul class="flex gap-3 ">
      <li v-for="(step, index) in steps" :key="step" class="flex">
        <p
          class="rounded-full w-5 h-5 text-center content-center text-sm"
          :class="index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'"
        >
          {{ index + 1 }}
        </p>
        <p class="text-center text-sm">{{ step }}</p>
      </li>
    </ul>
  </section>
</template>
