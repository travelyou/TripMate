import { createApp } from 'vue'
import Toast from '@/components/common/Toast.vue'

let toastId = 0

export function useToast() {
  const showToast = (message, type = 'info', duration = 3000) => {
    const id = toastId++
    const container = document.createElement('div')
    container.id = `toast-${id}`
    document.body.appendChild(container)

    const app = createApp(Toast, {
      message,
      type,
      duration,
      onClose: () => {
        setTimeout(() => {
          const toastElement = document.getElementById(`toast-${id}`)
          if (toastElement) {
            app.unmount()
            toastElement.remove()
          }
        }, 300)
      },
    })

    app.mount(container)
  }

  return {
    showToast,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration),
  }
}

