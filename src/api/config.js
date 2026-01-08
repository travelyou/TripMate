// API 基礎配置
// 一律只用 IPv4：避免 localhost 解析到非 IPv4 位址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api'

export { API_BASE_URL }
