import { API_BASE_URL } from './config'
import { auth } from '@/firebase/config'

// 輔助函數：統一將資料轉為前端元件需要的格式
function normalizeUserData(data) {
  if (!data) return null

  return {
    // ID 容錯
    uid: data.uid || data.firebase_uid,

    // 名稱容錯
    displayName: data.displayName || data.display_name || 'User',
    nickname: data.nickname || data.displayName || data.display_name || '',

    // 頭像容錯
    photoURL: data.photoURL || data.photo_url || '',
    avatar: data.avatar || data.photoURL || data.photo_url || '',

    // 個人檔案資料
    bio: data.bio || '',
    location: data.location || '',
    email: data.email || '',
    spirit_animal: data.spirit_animal || data.spiritAnimal || '',
    spiritAnimal: data.spiritAnimal || data.spirit_animal || '',
    role: data.role || 'user',
    vendor_id: data.vendor_id || data.vendorId || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],

    // [NEW] 這是關鍵！加上卡片專屬欄位，前端才讀得到
    card_bio: data.card_bio || '',
    card_photo: data.card_photo || '',
    card_tags: Array.isArray(data.card_tags) ? data.card_tags : [],
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    is_matching_enabled:
      typeof data.is_matching_enabled === 'boolean'
        ? data.is_matching_enabled
        : typeof data.isMatchingEnabled === 'boolean'
          ? data.isMatchingEnabled
          : true,

    // [NEW] 去過的地方 (自主簽證旅行)
    visitedPlaces: data.visitedPlaces || {
      domestic: [],
      international: [],
    },

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      let errorMessage = `創建/更新用戶失敗 (${response.status})`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        errorMessage = `${errorMessage}: ${response.statusText}`
      }

      const error = new Error(errorMessage)
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => null),
      }
      throw error
    }

    const data = await response.json()
    return data.data || data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(`無法連接到伺服器：${API_BASE_URL}/users`)
      networkError.originalError = error
      networkError.isNetworkError = true
      throw networkError
    }
    throw error
  }
}

export async function getUserProfile(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`)
    if (!response.ok) {
      if (response.status === 404) return normalizeUserData({ uid })
      throw new Error('獲取用戶資料失敗')
    }
    const jsonResponse = await response.json()
    return normalizeUserData(jsonResponse.data || jsonResponse)
  } catch (error) {
    console.error('獲取用戶資料錯誤：', error)
    return normalizeUserData({ uid, displayName: '載入失敗' })
  }
}

// 更新用戶資料 (PUT)
export async function updateUserProfile(uid, userData) {
  const url = `${API_BASE_URL}/users/${uid}`

  // 獲取 Firebase 認證 token
  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
      console.log('✅ 已獲取認證 token')
    } catch (tokenError) {
      console.warn('⚠️ 獲取 token 失敗:', tokenError)
    }
  }

  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(userData),
  })
  if (!response.ok) throw new Error('更新用戶資料失敗')
  return await response.json()
}

// 取得所有用戶（抽卡用）
export async function getAllUsers({ limit = 100 } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/users?limit=${limit}`)
    if (!response.ok) throw new Error('Fetch users failed')
    const data = await response.json()
    // 這裡也要過 normalization，確保列表資料格式一致
    const rawList = Array.isArray(data) ? data : data.data || []
    return rawList.map(normalizeUserData)
  } catch (e) {
    console.error(e)
    return []
  }
}

// 刪除用戶帳號
export async function deleteUserAccount(uid) {
  const url = `${API_BASE_URL}/users/${uid}`

  // 獲取 Firebase 認證 token
  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
    } catch (tokenError) {
      console.warn('⚠️ 獲取 token 失敗:', tokenError)
    }
  }

  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  })
  if (!response.ok) throw new Error('刪除帳號失敗')
  return await response.json()
}
