import { API_BASE_URL } from './config'

// 按讚/取消按讚
export async function toggleLike(postId, authorUid, board = 'discussion') {
  console.log('🔵 [Likes API] toggleLike 開始')
  console.log('📊 [Likes API] 參數:', { postId, authorUid, board })

  try {
    const url = `${API_BASE_URL}/likes`
    console.log('🔵 [Likes API] 請求 URL:', url)

    const payload = {
      post_id: postId,
      author_uid: authorUid,
      board: board,
    }
    console.log('🔵 [Likes API] Payload:', payload)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('🔵 [Likes API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('❌ [Likes API] 錯誤響應:', errorData)
      throw new Error(errorData.error || errorData.details || '按讚操作失敗')
    }

    const data = await response.json()
    console.log('✅ [Likes API] 成功響應:', data)
    return data
  } catch (error) {
    console.error('❌ [Likes API] 錯誤:', error)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('無法連接到伺服器，請確認後端服務是否運行')
    }
    throw error
  }
}

// 獲取貼文的按讚資訊
export async function getLikesInfo(postId, authorUid = null, board = 'discussion') {
  console.log('🔵 [Likes API] getLikesInfo 開始')
  console.log('📊 [Likes API] 參數:', { postId, authorUid, board })

  try {
    let url = `${API_BASE_URL}/likes/${postId}?board=${board}`

    if (authorUid) {
      url += `&author_uid=${authorUid}`
    }

    console.log('🔵 [Likes API] 請求 URL:', url)

    const response = await fetch(url)
    console.log('🔵 [Likes API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('❌ [Likes API] 錯誤響應:', errorData)
      throw new Error(errorData.error || errorData.details || '獲取按讚資訊失敗')
    }

    const data = await response.json()
    console.log('✅ [Likes API] 成功響應:', data)
    return data
  } catch (error) {
    if (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('404')) {
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
