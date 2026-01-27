import axios from 'axios'
import { API_BASE_URL } from './config'

// 取得廠商資料
export const getVendorProfile = async (vendorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}`)
    return response.data
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// 取得廠商行程列表
export const getVendorItineraries = async (vendorId, filter = {}) => {
  try {
    const params = new URLSearchParams()
    if (filter.region && filter.region !== '全部') {
      params.append('region', filter.region)
    }

    // 支援直接傳入 query string (例如 region=日本)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}/itineraries${queryString}`)
    return response.data
  } catch {
    return { success: false, data: [] }
  }
}

// 取得廠商貼文列表
export const getVendorPosts = async (vendorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}/posts`)
    return response.data
  } catch {
    return { success: false, data: [] }
  }
}

// 更新廠商資料
export const updateVendorProfile = async (vendorId, profileData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vendors/${vendorId}`, profileData)
    return response.data
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// (後台) 新增貼文
export const createPost = async (vendorId, data) => {
  const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/posts`, data)
  return response.data
}

// (後台) 新增行程
export const createItinerary = async (vendorId, data) => {
  const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/itineraries`, data)
  return response.data
}
