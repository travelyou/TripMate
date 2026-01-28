const isDevelopment = import.meta.env.DEV

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

export function handleApiError(error) {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
    return new AppError('無法連接到伺服器，請檢查網路連線', 'NETWORK_ERROR', 0)
  }

  if (error.response) {
    const status = error.response.status || 500
    const data = error.response.data || {}
    const message = data.error || data.message || data.details || '請求失敗'
    
    return new AppError(message, data.code || 'API_ERROR', status, data)
  }

  if (error.request) {
    return new AppError('無法連接到伺服器，請檢查網路連線', 'NETWORK_ERROR', 0)
  }

  if (error.message) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500)
  }

  return new AppError('發生未知錯誤', 'UNKNOWN_ERROR', 500)
}

export function logError(error, context = '') {
  if (!isDevelopment) {
    return
  }

  const errorInfo = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  }

  console.error(`[Error${context ? ` - ${context}` : ''}]`, errorInfo)
}

export function handleError(error, context = '') {
  const appError = handleApiError(error)
  logError(appError, context)
  return appError
}

