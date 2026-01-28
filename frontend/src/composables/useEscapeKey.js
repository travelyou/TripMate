import { onMounted, onUnmounted } from 'vue'

export function useEscapeKey(callback, options = {}) {
  const { condition } = options

  const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
      if (condition && typeof condition === 'function') {
        if (condition()) {
          callback()
        }
      } else {
        callback()
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleEscapeKey)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscapeKey)
  })
}

