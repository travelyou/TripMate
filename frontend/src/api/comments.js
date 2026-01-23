import { API_BASE_URL } from './config'

// 創建留言
export async function createComment(postId, commentData) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '創建留言失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('創建留言錯誤：', error)
    throw error
  }
}

// 更新留言
export async function updateComment(id, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/comments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (!response.ok) {
      throw new Error('更新留言失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('更新留言錯誤：', error)
    throw error
  }
}

// 刪除留言
export async function deleteComment(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/comments/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('刪除留言失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('刪除留言錯誤：', error)
    throw error
  }
}

// 留言按讚/取消按讚（僅更新 likes_count）
export async function toggleCommentLike(commentId, action) {
  try {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '更新留言按讚失敗')
    }
    return await response.json()
  } catch (error) {
    console.error('更新留言按讚錯誤：', error)
    throw error
  }
}
