import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

/**
 * 顯示 toast 通知
 * @param {string} message - 通知訊息
 * @param {string} type - 通知類型：'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - 顯示時長（毫秒），預設 3000ms
 */
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

    // 自動移除
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
