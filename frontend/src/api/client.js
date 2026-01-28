import { API_BASE_URL } from './config'
import { handleApiError } from '@/utils/errorHandler'

async function request(url, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    timeout = 30000,
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    }

    if (body && method !== 'GET' && method !== 'HEAD') {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(url, config)
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw handleApiError({
        message: '請求超時，請稍後再試',
        code: 'TIMEOUT_ERROR',
      })
    }
    throw handleApiError(error)
  }
}

export async function get(url, params = {}, options = {}) {
  const queryString = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      queryString.append(key, String(value))
    }
  })

  const fullUrl = queryString.toString()
    ? `${url}?${queryString.toString()}`
    : url

  return request(fullUrl, { ...options, method: 'GET' })
}

export async function post(url, data = {}, options = {}) {
  return request(url, { ...options, method: 'POST', body: data })
}

export async function put(url, data = {}, options = {}) {
  return request(url, { ...options, method: 'PUT', body: data })
}

export async function del(url, options = {}) {
  return request(url, { ...options, method: 'DELETE' })
}

export function buildApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${normalizedEndpoint}`
}


