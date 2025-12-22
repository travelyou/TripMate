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
  <section class="flex justify-center mt-5">
    <ul class="flex gap-3 sm:gap-5">
      <li v-for="(step, index) in steps" :key="step" class="flex gap-1 sm:gap-2">
        <p
          class="rounded-full w-4 h-4 text-center content-center text-[12px] sm:w-8 sm:h-8 sm:text-[15px]"
          :class="index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'"
        >
          {{ index + 1 }}
        </p>
        <p class="text-center text-[10px] sm:text-[15px]">{{ step }}</p>
      </li>
    </ul>
  </section>
</template>
