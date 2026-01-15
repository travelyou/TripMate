import { API_BASE_URL } from './config'

// 創建或更新用戶資料
export async function createOrUpdateUser(userData) {
  try {
    console.log('[Users API] 準備發送請求到：', `${API_BASE_URL}/users`)
    console.log('[Users API] 請求資料：', userData)

    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    console.log('[Users API] 回應狀態：', response.status, response.statusText)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch (parseError) {
        errorData = { 
          error: '未知錯誤', 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }
      }
      
      console.error('[Users API] 錯誤回應：', errorData)
      console.error('[Users API] 回應狀態：', response.status)

      // 創建一個包含更多資訊的錯誤物件
      const errorMessage = errorData.message || errorData.error || errorData.details || '創建/更新用戶失敗'
      const error = new Error(errorMessage)
      error.response = { data: errorData, status: response.status }
      error.code = errorData.code
      throw error
    }

    const data = await response.json()
    console.log('[Users API] 成功回應：', data)
    return data
  } catch (error) {
    console.error('[Users API] 請求失敗：', error)

    // 如果是網路錯誤，提供更詳細的訊息
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      const networkError = new Error('無法連接到後端伺服器，請確認後端服務是否運行')
      networkError.originalError = error
      throw networkError
    }

    throw error
  }
}

// 獲取用戶資料
export async function getUserProfile(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null // 用戶不存在
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取用戶資料失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('獲取用戶資料錯誤：', error)
    throw error
  }
}

// 更新用戶資料
export async function updateUserProfile(uid, userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '更新用戶資料失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('更新用戶資料錯誤：', error)
    throw error
  }
}
