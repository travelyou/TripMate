const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://tripmate-backend.zeabur.app')

const normalizedBase = RAW_API_BASE_URL.replace(/\/+$/, '')
const API_BASE_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`

export { API_BASE_URL }
