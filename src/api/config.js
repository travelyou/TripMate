const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const API_BASE_URL = `${API_HOST.replace(/\/$/, '')}/api`

export { API_BASE_URL }
