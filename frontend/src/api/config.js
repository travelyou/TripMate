// API 基礎配置
// 一律只用 IPv4：避免 localhost 解析到非 IPv4 位址
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://tripmate-backend.zeabur.app')

// 防呆：如果環境變數只給到 backend root（例如 https://xxx.zeabur.app），自動補上 /api
const normalizedBase = RAW_API_BASE_URL.replace(/\/+$/, '')
const API_BASE_URL = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`

export { API_BASE_URL }
