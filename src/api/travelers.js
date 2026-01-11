// src/api/travelers.js
import axios from 'axios'
import { API_BASE_URL } from './config'

// ============================================
// 獲取旅伴列表
// ============================================
export const getTravelers = async (filters = {}) => {
  try {
    const params = new URLSearchParams()

    if (filters.status) params.append('status', filters.status)
    if (filters.location) params.append('location', filters.location)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)

    console.log('🔍 發送請求到:', `${API_BASE_URL}/travelers?${params.toString()}`)

    const response = await axios.get(`${API_BASE_URL}/travelers?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('❌ 獲取旅伴列表失敗：', error)
    throw error
  }
}

// ============================================
// 獲取單個旅伴詳情
// ============================================
export const getTravelerById = async (id, userUid = null) => {
  try {
    const params = userUid ? `?user_uid=${userUid}` : ''
    console.log('🔍 發送請求到:', `${API_BASE_URL}/travelers/${id}${params}`)

    const response = await axios.get(`${API_BASE_URL}/travelers/${id}${params}`)
    return response.data
  } catch (error) {
    console.error('❌ 獲取旅伴詳情失敗：', error)
    throw error
  }
}

// ============================================
// 建立旅伴貼文
// ============================================
export const createTraveler = async (data) => {
  try {
    console.log('🔍 發送請求到:', `${API_BASE_URL}/travelers`)
    console.log('📦 請求數據:', data)

    const response = await axios.post(`${API_BASE_URL}/travelers`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超時
    })

    console.log('✅ 回應數據:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ 建立旅伴貼文失敗：', error)

    // 詳細的錯誤信息
    if (error.response) {
      console.error('後端錯誤狀態碼:', error.response.status)
      console.error('後端錯誤數據:', error.response.data)
    } else if (error.request) {
      console.error('無法連接到後端，請求對象:', error.request)
    } else {
      console.error('請求設置錯誤:', error.message)
    }

    throw error
  }
}

// ============================================
// 更新旅伴貼文
// ============================================
export const updateTraveler = async (id, data) => {
  try {
    console.log('🔍 發送請求到:', `${API_BASE_URL}/travelers/${id}`)

    const response = await axios.put(`${API_BASE_URL}/travelers/${id}`, data)
    return response.data
  } catch (error) {
    console.error('❌ 更新旅伴貼文失敗：', error)
    throw error
  }
}

// ============================================
// 刪除旅伴貼文
// ============================================
export const deleteTraveler = async (id) => {
  try {
    console.log('🔍 發送請求到:', `${API_BASE_URL}/travelers/${id}`)

    const response = await axios.delete(`${API_BASE_URL}/travelers/${id}`)
    return response.data
  } catch (error) {
    console.error('❌ 刪除旅伴貼文失敗：', error)
    throw error
  }
}
