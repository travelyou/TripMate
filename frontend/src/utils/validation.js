export function sanitizeInput(input) {
  if (typeof input !== 'string') return input

  return input
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim().toLowerCase())
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false
  if (password.length < 6) return false

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasOnlyLettersAndNumbers = /^[A-Za-z0-9]+$/.test(password)

  return hasUpperCase && hasLowerCase && hasNumber && hasOnlyLettersAndNumbers
}

export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function escapeHtml(text) {
  if (typeof text !== 'string') return text
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

export function sanitizeHtml(html) {
  if (typeof html !== 'string') return html

  const tempDiv = document.createElement('div')
  tempDiv.textContent = html
  return tempDiv.innerHTML
}

export function validateLength(text, min = 0, max = Infinity) {
  if (typeof text !== 'string') return false
  const length = text.trim().length
  return length >= min && length <= max
}


