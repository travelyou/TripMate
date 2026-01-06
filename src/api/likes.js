import { API_BASE_URL } from './config'

// 按讚/取消按讚
export async function toggleLike(postId, authorUid) {
  try {
    const url = `${API_BASE_URL}/posts/${postId}/likes`
    console.log('按讚 API 請求 URL：', url)
    console.log('請求參數：', { author_uid: authorUid })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ author_uid: authorUid }),
    })
    
    console.log('按讚 API 響應狀態：', response.status, response.statusText)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('按讚 API 錯誤響應：', errorData)
      throw new Error(errorData.error || errorData.details || '按讚操作失敗')
    }
    const data = await response.json()
    console.log('按讚 API 成功響應：', data)
    return data
  } catch (error) {
    console.error('按讚操作錯誤：', error)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('無法連接到伺服器，請確認後端服務是否運行')
    }
    throw error
  }
}

// 獲取貼文的按讚資訊
export async function getLikesInfo(postId, authorUid = null) {
  try {
    const url = authorUid
      ? `${API_BASE_URL}/posts/${postId}/likes?author_uid=${authorUid}`
      : `${API_BASE_URL}/posts/${postId}/likes`
    
    const response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取按讚資訊失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('獲取按讚資訊錯誤：', error)
    throw error
  }
}


