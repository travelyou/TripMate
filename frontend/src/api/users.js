import { API_BASE_URL } from './config'
import { auth, db } from '@/firebase/config'
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

function normalizeUserData(data) {
  if (!data) return null

  return {
    uid: data.uid || data.firebase_uid,
    displayName: data.displayName || data.display_name || 'User',
    nickname: data.nickname !== undefined ? data.nickname : (data.displayName || data.display_name || ''),
    real_name: data.real_name || data.realName || null,
    realName: data.realName || data.real_name || null,
    avatar: data.avatar !== undefined ? data.avatar : '',
    bio: data.bio || '',
    location: data.location || '',
    email: data.email || '',
    spirit_animal: data.spirit_animal || data.spiritAnimal || '',
    spiritAnimal: data.spiritAnimal || data.spirit_animal || '',
    role: data.role || 'user',
    vendor_id: data.vendor_id || data.vendorId || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
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
    const response = await fetch(`${API_BASE_URL}/users/${uid}?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      if (response.status === 404) return normalizeUserData({ uid })
      throw new Error('獲取用戶資料失敗')
    }
    const jsonResponse = await response.json()
    return normalizeUserData(jsonResponse.data || jsonResponse)
  } catch {
    return normalizeUserData({ uid, displayName: '載入失敗' })
  }
}

export async function updateUserProfile(uid, userData) {
  const url = `${API_BASE_URL}/users/${uid}`

  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
    } catch {
      // 靜默處理錯誤
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

  if (!response.ok) {
    let errorMessage = '更新用戶資料失敗'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`
    }
    const error = new Error(errorMessage)
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: await response.json().catch(() => null),
    }
    throw error
  }

  const result = await response.json()

  try {
    const userDocRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userDocRef)

    const firestoreData = {
      updatedAt: serverTimestamp(),
    }
    if (userData.nickname !== undefined) {
      firestoreData.nickname = userData.nickname
    }
    if (userData.avatar !== undefined) {
      firestoreData.avatar = userData.avatar
    }
    if (userData.bio !== undefined) {
      firestoreData.bio = userData.bio
    }
    if (userData.location !== undefined) {
      firestoreData.location = userData.location
    }
    if (userData.spirit_animal !== undefined) {
      firestoreData.spiritAnimal = userData.spirit_animal
    }
    if (userData.real_name !== undefined || userData.realName !== undefined) {
      firestoreData.realName = userData.real_name || userData.realName
    }

    if (userDoc.exists()) {
      await updateDoc(userDocRef, firestoreData)
    } else {
      const email = auth.currentUser?.email || ''
      await setDoc(userDocRef, {
        uid,
        email,
        ...firestoreData,
        createdAt: serverTimestamp(),
      })
    }
  } catch {
    // Firestore 更新失敗不影響主要流程
  }

  return result
}

export async function getAllUsers({ limit = 100 } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/users?limit=${limit}`)
    if (!response.ok) throw new Error('Fetch users failed')
    const data = await response.json()
    const rawList = Array.isArray(data) ? data : data.data || []
    return rawList.map(normalizeUserData)
  } catch {
    return []
  }
}

export async function deleteUserAccount(uid) {
  const url = `${API_BASE_URL}/users/${uid}`

  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
    } catch {
      // 靜默處理錯誤
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
