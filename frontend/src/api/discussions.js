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
      console.error('[API] 錯誤回應:', errorData)
      throw new Error(errorData.error || errorData.details || '獲取貼文失敗')
    }

    const data = await response.json()
    // 調試：檢查第一個貼文的 author_avatar
    if (data.posts && data.posts.length > 0) {
      const firstPost = data.posts[0]

      // 檢查所有貼文的 author_avatar
      data.posts.forEach((post, index) => {
        if (!post.author_avatar) {
          console.warn(`[API] 貼文 ${index + 1} (UID: ${post.author_uid}) 沒有 author_avatar`)
        }
      })
    }

    return data
  } catch (error) {
    console.error('[API] fetchPosts 錯誤:', error)
    throw error
  }
}

// ... (其他函式 fetchPostById, createPost, updatePost, deletePost 保持不變)
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
    console.error('[API] fetchPostById 錯誤:', error)
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
      console.error('[API Step 4] 錯誤回應:', errorData)
      console.error('[API Step 4] 完整錯誤:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      throw new Error(errorData.error || errorData.details || '創建貼文失敗')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[API] ========== createPost 失敗 ==========')
    console.error('[API Error] 錯誤類型:', error.name)
    console.error('[API Error] 錯誤訊息:', error.message)
    console.error('[API Error] 完整錯誤:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[API Error] 網路錯誤：可能是 CORS 或後端未啟動')
    }

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
    console.error('[API] updatePost 錯誤:', error)
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
    console.error('[API] deletePost 錯誤:', error)
    throw error
  }
}
