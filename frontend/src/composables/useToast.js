import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = nextId++
    const toast = {
      id,
      message,
      type,
      visible: true
    }

    toasts.value.push(toast)

    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }, duration)
  }

  const success = (message, duration) => showToast(message, 'success', duration)
  const error = (message, duration) => showToast(message, 'error', duration)
  const warning = (message, duration) => showToast(message, 'warning', duration)
  const info = (message, duration) => showToast(message, 'info', duration)

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info
  }
}
