import { API_BASE_URL } from './config'

/**
 * 根據關鍵字搜尋功能位置
 * @param {string} query - 搜尋關鍵字
 * @param {string} category - 可選的分類篩選
 * @returns {Promise<Array>} 功能位置列表
 */
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

/**
 * 獲取所有功能位置（用於 AI 系統提示詞）
 * @returns {Promise<Array>} 所有功能位置列表
 */
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

/**
 * 搜尋討論區文章
 * @param {string} query - 搜尋關鍵字
 * @param {number} limit - 返回結果數量限制（預設 5）
 * @returns {Promise<Array>} 文章列表
 */
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

