import { API_BASE_URL } from './config'

export async function createOrUpdateUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          error: '未知錯誤',
          message: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const errorMessage = errorData.message || errorData.error || errorData.details || '創建/更新用戶失敗'
      const error = new Error(errorMessage)
      error.response = { data: errorData, status: response.status }
      error.code = errorData.code
      throw error
    }

    const data = await response.json()
    return data.data || data
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      const networkError = new Error('無法連接到後端伺服器，請確認後端服務是否運行')
      networkError.originalError = error
      throw networkError
    }

    throw error
  }
}

export async function getUserProfile(uid) {
  const response = await fetch(`${API_BASE_URL}/users/${uid}`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
    throw new Error(errorData.error || errorData.message || errorData.details || '獲取用戶資料失敗')
  }
  const data = await response.json()
  return data
}

export async function updateUserProfile(uid, userData) {
  const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
    throw new Error(errorData.error || errorData.message || errorData.details || '更新用戶資料失敗')
  }
  const data = await response.json()
  return data
}
