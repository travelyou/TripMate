// src/api/travelers.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getTravelers = async (filters = {}) => {
  try {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.location) params.append('location', filters.location)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)

    const response = await axios.get(`${API_BASE_URL}/travelers?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('獲取旅伴列表失敗：', error)
    throw error
  }
}

export const getTravelerById = async (id, userUid = null) => {
  try {
    const params = userUid ? `?user_uid=${userUid}` : ''
    const response = await axios.get(`${API_BASE_URL}/travelers/${id}${params}`)
    return response.data
  } catch (error) {
    console.error('獲取旅伴詳情失敗：', error)
    throw error
  }
}

export const incrementView = async (id) => {
  try {
    await axios.post(`${API_BASE_URL}/travelers/${id}/view`)
  } catch (error) {
    console.error('更新瀏覽次數失敗（靜默失敗）:', error)
  }
}

export const createTraveler = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/travelers`, data)
    return response.data
  } catch (error) {
    console.error('建立旅伴貼文失敗：', error)
    throw error
  }
}

export const updateTraveler = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/travelers/${id}`, data)
    return response.data
  } catch (error) {
    console.error('更新旅伴貼文失敗：', error)
    throw error
  }
}

export const deleteTraveler = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/travelers/${id}`)
    return response.data
  } catch (error) {
    console.error('刪除旅伴貼文失敗：', error)
    throw error
  }
}
