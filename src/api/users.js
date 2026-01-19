import { API_BASE_URL } from './config'

// 輔助函數：統一將資料轉為前端元件需要的格式
// 這樣無論後端給 display_name 還是 displayName，前端都能拿到 displayName
function normalizeUserData(data) {
  if (!data) return null

  return {
    // ID 容錯
    uid: data.uid || data.firebase_uid,

    // 名稱容錯 (優先使用 displayName，沒有則找 display_name，再沒有就顯示 User)
    displayName: data.displayName || data.display_name || 'User',

    // 頭像容錯
    photoURL: data.photoURL || data.photo_url || '',

    // 其他文字欄位
    bio: data.bio || '',
    location: data.location || '',
    email: data.email || '',

    stats: data.stats || {
      followers: 0,
      following: 0,
      trips: 0,
    },
  }
}

// 創建或更新用戶資料
export async function createOrUpdateUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 這裡可以保持原樣，因為我們後端已經寫好可以接收 camelCase
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '創建/更新用戶失敗')
    }

    const data = await response.json()
    // 回傳前先標準化
    return normalizeUserData(data.data || data)
  } catch (error) {
    console.error('創建/更新用戶錯誤：', error)
    throw error
  }
}

// 獲取用戶資料 (GET)
export async function getUserProfile(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`)

    if (!response.ok) {
      if (response.status === 404) {
        // 如果找不到用戶，回傳一個安全的預設物件，而不是 null，防止頁面崩潰
        console.warn(`User ${uid} not found, returning default structure.`)
        return normalizeUserData({ uid })
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取用戶資料失敗')
    }

    const jsonResponse = await response.json()

    // 根據你後端的寫法，資料可能在 jsonResponse.data 裡，也可能直接就是 jsonResponse
    const rawData = jsonResponse.data || jsonResponse

    return normalizeUserData(rawData)
  } catch (error) {
    console.error('獲取用戶資料錯誤：', error)
    // 發生錯誤時，至少回傳一個基本結構，避免全頁白屏
    return normalizeUserData({ uid, displayName: '載入失敗' })
  }
}

// 更新用戶資料 (PUT)
export async function updateUserProfile(uid, userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
      method: 'PUT', // 確保這裡跟後端路由一致 (後端是 PUT /:uid)
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '更新用戶資料失敗')
    }

    const jsonResponse = await response.json()
    const rawData = jsonResponse.data || jsonResponse

    return normalizeUserData(rawData)
  } catch (error) {
    console.error('更新用戶資料錯誤：', error)
    throw error
  }
}
