import { API_BASE_URL } from './config'

// 獲取所有貼文
export async function fetchPosts(params = {}) {
  const { page = 1, limit: finalLimit = 10, category: finalCategory = null, author_uid } = params

  try {
    let url = `${API_BASE_URL}/discussions?page=${page}&limit=${finalLimit}`

    // 檢查 author_uid 是否有效
    if (author_uid) {
      url += `&author_uid=${encodeURIComponent(author_uid)}`
    }

    // 檢查 category 是否有效
    if (finalCategory && finalCategory !== '全部') {
      url += `&category=${encodeURIComponent(finalCategory)}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取貼文失敗')
    }

    const data = await response.json()

    return data
  } catch (error) {
    throw error
  }
}

export async function fetchPostById(id) {
  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('獲取貼文失敗')
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function createPost(postData) {
  try {
    const url = `${API_BASE_URL}/discussions`
    const response = await fetch(url, {
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
    throw error
  }
}

export async function updatePost(id, postData) {
  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    const response = await fetch(url, {
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
    throw error
  }
}

export async function deletePost(id) {
  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    const response = await fetch(url, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('刪除貼文失敗')
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}
