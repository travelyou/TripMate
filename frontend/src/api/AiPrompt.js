import { API_BASE_URL } from './config'

export async function searchFeatureLocations(query, category = null) {
  try {
    const params = new URLSearchParams({ query })
    if (category) {
      params.append('category', category)
    }

    const response = await fetch(`${API_BASE_URL}/ai/features/search?${params.toString()}`)

    if (!response.ok) {
      throw new Error('搜尋功能位置失敗')
    }

    const data = await response.json()
    return data.success ? data.data : []
  } catch (error) {
    return []
  }
}

export async function getAllFeatureLocations() {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/features/all`)

    if (!response.ok) {
      throw new Error('獲取功能位置失敗')
    }

    const data = await response.json()
    return data.success ? data.data : []
  } catch (error) {
    return []
  }
}

export async function searchDiscussionPosts(query, limit = 5) {
  try {
    const params = new URLSearchParams({
      search: query,
      page: 1,
      limit: limit,
    })

    const response = await fetch(`${API_BASE_URL}/discussions?${params.toString()}`)

    if (!response.ok) {
      throw new Error('搜尋文章失敗')
    }

    const data = await response.json()
    return data.posts || []
  } catch (error) {
    return []
  }
}

