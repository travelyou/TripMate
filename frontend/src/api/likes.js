import { API_BASE_URL } from './config'
import { auth } from '@/firebase/config'

// 按讚/取消按讚
export async function toggleLike(postId, authorUid, board = 'discussion') {
  try {
    const url = `${API_BASE_URL}/likes`

    // 獲取 Firebase 認證 token
    let token = null
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken()
      } catch (tokenError) {
        console.warn('[Likes API] 獲取 token 失敗:', tokenError)
      }
    }

    const payload = {
      post_id: postId,
      author_uid: authorUid,
      board: board,
    }
    const headers = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('[Likes API] 錯誤響應:', errorData)
      throw new Error(errorData.error || errorData.details || '按讚操作失敗')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[Likes API] 錯誤:', error)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('無法連接到伺服器，請確認後端服務是否運行')
    }
    throw error
  }
}

// 獲取貼文的按讚資訊
export async function getLikesInfo(postId, authorUid = null, board = 'discussion') {
  try {
    let url = `${API_BASE_URL}/likes/${postId}?board=${board}`

    if (authorUid) {
      url += `&author_uid=${authorUid}`
    }

    // 獲取 Firebase 認證 token
    let token = null
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken()
      } catch (tokenError) {
        console.warn('[Likes API] 獲取 token 失敗:', tokenError)
      }
    }

    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('[Likes API] 錯誤響應:', errorData)
      throw new Error(errorData.error || errorData.details || '獲取按讚資訊失敗')
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('404')
    ) {
      console.warn(`獲取按讚資訊失敗，返回默認值。貼文 ID: ${postId}`, error.message)
      return {
        likesCount: 0,
        isLiked: false,
      }
    }

    console.error('獲取按讚資訊錯誤：', error)
    return {
      likesCount: 0,
      isLiked: false,
    }
  }
}
