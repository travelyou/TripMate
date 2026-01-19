import { API_BASE_URL } from './config'

// ★ 修改：接收 params 物件，而不是個別參數
export async function fetchPosts(params = {}) {
  // 給予預設值
  const { page = 1, limit = 10, category = null } = params

  console.log('🌐 [API] fetchPosts 開始')
  console.log('📊 [API] 參數:', { page, limit, category })

  try {
    let url = `${API_BASE_URL}/discussions?page=${page}&limit=${limit}`

    // 檢查 category 是否有效
    if (category && category !== '全部') {
      url += `&category=${encodeURIComponent(category)}`
    }

    console.log('[API] 請求 URL:', url)

    const response = await fetch(url)

    console.log('[API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('[API] 錯誤回應:', errorData)
      throw new Error(errorData.error || errorData.details || '獲取貼文失敗')
    }

    const data = await response.json()
    console.log('[API] 回應成功，貼文數量:', data.posts?.length || 0)

    // 調試：檢查第一個貼文的 author_avatar
    if (data.posts && data.posts.length > 0) {
      const firstPost = data.posts[0]
      console.log('[API] 第一個貼文的 author_avatar:', firstPost.author_avatar || 'NULL/UNDEFINED')
      console.log('[API] 第一個貼文的 author_uid:', firstPost.author_uid)
      console.log('[API] 第一個貼文的所有欄位:', Object.keys(firstPost))

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
  console.log('[API] fetchPostById 開始，ID:', id)

  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    console.log('[API] 請求 URL:', url)

    const response = await fetch(url)
    console.log('[API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error('獲取貼文失敗')
    }

    const data = await response.json()
    console.log('[API] 回應成功，貼文標題:', data.title)
    return data
  } catch (error) {
    console.error('[API] fetchPostById 錯誤:', error)
    throw error
  }
}

export async function createPost(postData) {
  console.log('[API] ========== createPost 開始 ==========')
  console.log('[API Step 1] 接收的資料:', {
    board: postData.board,
    category: postData.category,
    titleLength: postData.title?.length || 0,
    contentLength: postData.content?.length || 0,
    tagsCount: postData.tags?.length || 0,
    hasBanner: !!postData.banner,
    bannerSize: postData.banner ? `${(postData.banner.length / 1024).toFixed(2)} KB` : '無',
    imageUrlsCount: postData.image_urls?.length || 0,
    author_uid: postData.author_uid,
  })

  try {
    const url = `${API_BASE_URL}/discussions`
    console.log('[API Step 2] 請求 URL:', url)
    console.log('[API Step 2] API_BASE_URL:', API_BASE_URL)

    console.log('[API Step 3] 準備發送請求')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    console.log('🌐 [API Step 4] 收到回應')
    console.log('📊 [API Response] HTTP 狀態:', response.status, response.statusText)
    // console.log('📊 [API Response] Headers:', Object.fromEntries(response.headers.entries()))

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
    console.log('✅ [API Step 5] 回應成功')
    console.log('📊 [API Success] 創建的貼文 ID:', data.id)
    // console.log('📊 [API Success] 完整回應:', data)
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
  console.log('[API] updatePost 開始，ID:', id)

  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    console.log('[API] 請求 URL:', url)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    console.log('[API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error('更新貼文失敗')
    }

    const data = await response.json()
    console.log('[API] 更新成功')
    return data
  } catch (error) {
    console.error('[API] updatePost 錯誤:', error)
    throw error
  }
}

export async function deletePost(id) {
  console.log('[API] deletePost 開始，ID:', id)

  try {
    const url = `${API_BASE_URL}/discussions/${id}`
    console.log('[API] 請求 URL:', url)

    const response = await fetch(url, {
      method: 'DELETE',
    })

    console.log('[API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error('刪除貼文失敗')
    }

    const data = await response.json()
    console.log('[API] 刪除成功')
    return data
  } catch (error) {
    console.error('[API] deletePost 錯誤:', error)
    throw error
  }
}
