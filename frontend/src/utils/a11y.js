export function focusElement(element) {
  if (typeof document === 'undefined') return false
  
  try {
    if (typeof element === 'string') {
      element = document.querySelector(element)
    }
    if (element && typeof element.focus === 'function') {
      element.focus()
      return true
    }
  } catch (error) {
    console.warn('focusElement 失敗:', error)
  }
  return false
}

export function trapFocus(container, firstFocusable, lastFocusable) {
  if (typeof document === 'undefined') return () => {}
  
  try {
    if (typeof container === 'string') {
      container = document.querySelector(container)
    }
    if (!container) return () => {}

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = firstFocusable || focusableElements[0]
    const lastElement = lastFocusable || focusableElements[focusableElements.length - 1]

    if (!firstElement || !lastElement) return () => {}

    function handleTabKey(e) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    return () => {
      try {
        container.removeEventListener('keydown', handleTabKey)
      } catch {
      }
    }
  } catch (error) {
    console.warn('trapFocus 失敗:', error)
    return () => {}
  }
}

export function announceToScreenReader(message, priority = 'polite') {
  if (typeof document === 'undefined' || !message) return
  
  try {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = String(message)

    document.body.appendChild(announcement)

    setTimeout(() => {
      try {
        if (announcement.parentNode) {
          document.body.removeChild(announcement)
        }
      } catch {
      }
    }, 1000)
  } catch (error) {
    console.warn('announceToScreenReader 失敗:', error)
  }
}

export function getAriaLabel(icon, action) {
  if (action) return action
  if (typeof icon === 'string') return icon
  return ''
}

export function handleEscapeKey(callback) {
  if (typeof document === 'undefined' || typeof callback !== 'function') {
    return () => {}
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      try {
        callback()
      } catch (error) {
        console.warn('handleEscapeKey callback 執行失敗:', error)
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  return () => {
    try {
      document.removeEventListener('keydown', handleKeyDown)
    } catch {
    }
  }
}

export function handleEnterKey(element, callback) {
  if (typeof document === 'undefined' || typeof callback !== 'function') {
    return () => {}
  }
  
  try {
    if (typeof element === 'string') {
      element = document.querySelector(element)
    }
    if (!element) return () => {}

    function handleKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        try {
          callback()
        } catch (error) {
          console.warn('handleEnterKey callback 執行失敗:', error)
        }
      }
    }
    
    element.addEventListener('keydown', handleKeyDown)
    return () => {
      try {
        element.removeEventListener('keydown', handleKeyDown)
      } catch {
      }
    }
  } catch (error) {
    console.warn('handleEnterKey 失敗:', error)
    return () => {}
  }
}

