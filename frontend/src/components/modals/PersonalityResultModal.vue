<script setup>
import { X } from 'lucide-vue-next'
import ResultCard from '@/components/personality-test/ResultCard.vue'

const props = defineProps({
  result: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up"
    >
      <!-- Header -->
      <header
        class="p-6 border-b border-secondary-100 flex justify-between items-center sticky top-0 bg-white z-10"
      >
        <h2 class="text-2xl font-bold text-secondary-900">性格測驗結果</h2>
        <button
          class="p-2 hover:bg-secondary-50 rounded-full transition text-secondary-500 hover:text-secondary-900"
          @click="emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </header>

      <!-- Content -->
      <div class="flex-grow overflow-y-auto custom-scrollbar p-6">
        <ResultCard v-if="props.result" :result="props.result" />
        <div v-else class="py-16 text-center text-secondary-400">尚未測驗</div>
        <div v-if="props.result" class="mt-6 flex justify-center">
          <router-link
            to="/test"
            class="px-4 py-2 text-sm font-bold rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition"
          >
            重新測驗
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>








