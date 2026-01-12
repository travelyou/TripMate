import { API_BASE_URL } from './config'

// 獲取所有貼文
export async function fetchPosts(page = 1, limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts?page=${page}&limit=${limit}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('API 錯誤詳情：', errorData)
      throw new Error(errorData.error || errorData.details || '獲取貼文失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('獲取貼文錯誤：', error)
    throw error
  }
}

// 獲取單個貼文詳情
export async function fetchPostById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`)
    if (!response.ok) {
      throw new Error('獲取貼文失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('獲取貼文錯誤：', error)
    throw error
  }
}

// 創建新貼文
export async function createPost(postData) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '創建貼文失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('創建貼文錯誤：', error)
    throw error
  }
}

// 更新貼文
export async function updatePost(id, postData) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })
    if (!response.ok) {
      throw new Error('更新貼文失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('更新貼文錯誤：', error)
    throw error
  }
}

// 刪除貼文
export async function deletePost(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('刪除貼文失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('刪除貼文錯誤：', error)
    throw error
  }
}
