import { API_BASE_URL } from './config'

// 創建或更新用戶資料
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
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '創建/更新用戶失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('創建/更新用戶錯誤：', error)
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
