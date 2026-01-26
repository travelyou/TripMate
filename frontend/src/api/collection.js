import { API_BASE_URL } from './config'
import { auth } from '@/firebase/config'

const getAuthToken = async () => {
  const user = auth.currentUser
  if (!user) return null
  return await user.getIdToken()
}

export const saveToCollection = async (userUid, postId, postType, categoryId = null) => {
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_BASE_URL}/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        user_uid: userUid,
        post_id: postId,
        post_type: postType,
        category_id: categoryId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '收藏失敗')
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

export const removeFromCollection = async (userUid, postId, postType) => {
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_BASE_URL}/collection`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        user_uid: userUid,
        post_id: postId,
        post_type: postType,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '取消收藏失敗')
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

export const getUserCollections = async (userUid, categoryId = null) => {
  try {
    const token = await getAuthToken()
    const url = categoryId
      ? `${API_BASE_URL}/collection/user/${userUid}?category_id=${categoryId}`
      : `${API_BASE_URL}/collection/user/${userUid}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '獲取收藏列表失敗')
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    throw error
  }
}

export const checkIsCollected = async (userUid, postId, postType) => {
  try {
    const token = await getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/collection/check?user_uid=${userUid}&post_id=${postId}&post_type=${postType}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '檢查收藏狀態失敗')
    }

    const result = await response.json()
    return result.isCollected || false
  } catch (error) {
    return false
  }
}

