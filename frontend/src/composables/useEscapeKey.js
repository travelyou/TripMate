import { onMounted, onUnmounted } from 'vue'

/**
 * Composable for handling Escape key press
 * @param {Function} callback - Function to call when Escape key is pressed
 * @param {Object} options - Options object
 * @param {Function} options.condition - Optional condition function that returns boolean. If provided, callback only fires when condition returns true
 */
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

