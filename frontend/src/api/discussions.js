import { API_BASE_URL } from './config'
import { handleApiError } from '@/utils/errorHandler'

export async function fetchPosts(params = {}) {
  const { page = 1, limit: finalLimit = 10, category: finalCategory = null, author_uid } = params

  try {
    let url = `${API_BASE_URL}/discussions?page=${page}&limit=${finalLimit}`

    if (author_uid) {
      url += `&author_uid=${encodeURIComponent(author_uid)}`
    }

    if (finalCategory && finalCategory !== '全部') {
      url += `&category=${encodeURIComponent(finalCategory)}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function fetchPostById(id) {
  try {
    if (!id) {
      throw new Error('缺少貼文 ID')
    }

    const url = `${API_BASE_URL}/discussions/${encodeURIComponent(id)}`
    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '獲取貼文失敗' }))
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function createPost(postData) {
  try {
    if (!postData || !postData.title || !postData.content) {
      throw new Error('標題和內容為必填項目')
    }

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
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function updatePost(id, postData) {
  try {
    if (!id) {
      throw new Error('缺少貼文 ID')
    }

    const url = `${API_BASE_URL}/discussions/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '更新貼文失敗' }))
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function deletePost(id) {
  try {
    if (!id) {
      throw new Error('缺少貼文 ID')
    }

    const url = `${API_BASE_URL}/discussions/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '刪除貼文失敗' }))
      throw handleApiError({
        response: {
          status: response.status,
          data: errorData,
        },
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw handleApiError(error)
  }
}
