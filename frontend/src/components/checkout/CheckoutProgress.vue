<script setup>
const props = defineProps({
  currentStep: {
    type: Number,
    required: true,
  },
})

const steps = ['確認商品', '填寫資料', '確認資料', '付款', '完成訂單']
</script>

<template>
  <section class="flex justify-center py-3 sm:py-5 lg:py-8">
    <ul class="flex gap-6 sm:gap-16 lg:gap-30">
      <li v-for="(step, index) in steps" :key="step" class="flex gap-1 flex-col items-center">
        <p
          class="rounded-full w-4 h-4 text-center content-center text-[8px] sm:w-8 sm:h-8 sm:text-base lg:w-10 lg:h-10 lg:text-lg"
          :class="index + 1 <= currentStep ? 'bg-primary text-white' : 'bg-gray-300 text-gray-800'"
        >
          {{ index + 1 }}
        </p>
        <p class="text-center text-[10px] sm:text-base/8 lg:text-lg/10">{{ step }}</p>
      </li>
    </ul>
  </section>
</template>
