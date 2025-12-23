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
  <section class="flex justify-center pt-5">
    <ul class="flex gap-3 sm:gap-5 lg:gap-6">
      <li v-for="(step, index) in steps" :key="step" class="flex gap-1">
        <p
          class="rounded-full w-4 h-4 text-center content-center text-[12px] sm:w-8 sm:h-8 sm:text-base lg:w-10 lg:h-10 lg:text-lg"
          :class="index + 1 <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-800'"
        >
          {{ index + 1 }}
        </p>
        <p class="text-center text-[10px] sm:text-base/8 lg:text-lg/10">{{ step }}</p>
      </li>
    </ul>
  </section>
</template>
