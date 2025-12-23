<template>
  <Transition name="toast">
    <div
      v-if="isVisible"
      :class="[
        'fixed top-4 right-4 md:top-6 md:right-6 z-50 min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg border-2 flex items-start gap-3',
        type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : '',
        type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : '',
        type === 'warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : '',
        type === 'info' ? 'bg-blue-50 border-blue-300 text-blue-800' : '',
      ]"
    >
      <div class="flex-1">
        <p class="font-semibold">{{ message }}</p>
      </div>
      <button
        @click="close"
        class="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="關閉"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value),
  },
  duration: {
    type: Number,
    default: 3000,
  },
})

const emit = defineEmits(['close'])

const isVisible = ref(false)
let timeoutId = null

onMounted(() => {
  isVisible.value = true
  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      close()
    }, props.duration)
  }
})

const close = () => {
  isVisible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  setTimeout(() => {
    emit('close')
  }, 300) // 等待動畫完成
}

watch(
  () => props.message,
  () => {
    isVisible.value = true
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (props.duration > 0) {
      timeoutId = setTimeout(() => {
        close()
      }, props.duration)
    }
  },
)
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>


