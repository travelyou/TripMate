import { API_BASE_URL } from './config'

// 輔助函數：統一將資料轉為前端元件需要的格式
function normalizeUserData(data) {
  if (!data) return null

  return {
    // ID 容錯
    uid: data.uid || data.firebase_uid,

    // 名稱
    displayName: data.displayName || data.display_name || 'User',
    nickname: data.nickname || data.displayName || data.display_name || '',

    // 頭像
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

    // [NEW] 名片專屬欄位 (必須要在這裡宣告，前端才能讀到)
    card_bio: data.card_bio || '',
    card_photo: data.card_photo || '',
    card_tags: Array.isArray(data.card_tags) ? data.card_tags : [],

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
    if (!response.ok) throw new Error('創建/更新用戶失敗')
    const data = await response.json()
    return data.data || data
  } catch (error) {
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
  const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  })
  if (!response.ok) throw new Error('更新用戶資料失敗')
  return await response.json()
}

export async function getAllUsers({ limit = 100 } = {}) {
  // 簡化版 getAllUsers，直接呼叫後端 list 接口
  try {
    const response = await fetch(`${API_BASE_URL}/users?limit=${limit}`)
    if (!response.ok) throw new Error('Fetch users failed')
    const data = await response.json()
    return Array.isArray(data) ? data : data.data || []
  } catch (e) {
    console.error(e)
    return []
  }
}
