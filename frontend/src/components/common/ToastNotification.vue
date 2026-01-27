<script setup>
import { useToast } from '@/composables/useToast'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-vue-next'

const { toasts } = useToast()

const getIcon = (type) => {
  switch (type) {
    case 'success': return CheckCircle
    case 'error': return XCircle
    case 'warning': return AlertTriangle
    case 'info': return Info
    default: return Info
  }
}

const getColorClasses = (type) => {
  switch (type) {
    case 'success': return 'bg-green-50 border-green-200 text-green-800'
    case 'error': return 'bg-red-50 border-red-200 text-red-800'
    case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
    default: return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getIconColor = (type) => {
  switch (type) {
    case 'success': return 'text-green-600'
    case 'error': return 'text-red-600'
    case 'warning': return 'text-yellow-600'
    case 'info': return 'text-blue-600'
    default: return 'text-gray-600'
  }
}
</script>

<template>
  <div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl border-2 pointer-events-auto',
          'animate-slide-in-down min-w-[400px] max-w-[600px]',
          getColorClasses(toast.type)
        ]"
      >
        <component :is="getIcon(toast.type)" :class="['w-6 h-6 flex-shrink-0', getIconColor(toast.type)]" />
        <span class="font-semibold text-base">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active {
  animation: slide-in 0.4s ease-out;
}

.toast-leave-active {
  animation: slide-out 0.3s ease-in;
}

@keyframes slide-in {
  from {
    transform: translateY(-100%) translateX(-50%);
    opacity: 0;
  }
  to {
    transform: translateY(0) translateX(-50%);
    opacity: 1;
  }
}

@keyframes slide-out {
  from {
    transform: translateY(0) translateX(-50%);
    opacity: 1;
  }
  to {
    transform: translateY(-100%) translateX(-50%);
    opacity: 0;
  }
}
</style>
