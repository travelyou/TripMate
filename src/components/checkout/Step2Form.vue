<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function nextStep() {
  router.push('/checkout/step3')
  //if () {} else {}
}
function backStep() {
  router.push('/checkout/step1')
  //if () {} else {}
}
</script>

<template>
  <div>
    <h1>Step 2 - 表單</h1>
  </div>
  <button
    class="p-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
    @click="backStep"
  >
    上一步
  </button>
  <button
    class="p-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600"
    @click="nextStep"
  >
    下一步
  </button>
</template>
