import axios from 'axios'
import { API_BASE_URL } from './config'

// 1. 取得廠商公開資料 (Profile)
export const getVendorProfile = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/${id}`)
    return response.data
  } catch (error) {
    console.error('取得廠商資料失敗:', error)
    throw error
  }
}

// 2. 取得廠商貼文列表
export const getVendorPosts = async (vendorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}/posts`)
    return response.data
  } catch (error) {
    console.error('取得廠商貼文失敗:', error)
    throw error
  }
}

// 3. 取得廠商行程列表
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
  } catch (error) {
    console.error('取得廠商行程失敗:', error)
    throw error
  }
}

// 4. (後台) 更新廠商資料
export const updateVendorProfile = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vendors/${id}`, data)
    return response.data
  } catch (error) {
    console.error('更新廠商資料失敗:', error)
    throw error
  }
}

// 5. (後台) 新增貼文
export const createPost = async (vendorId, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/posts`, data)
    return response.data
  } catch (error) {
    console.error('新增貼文失敗:', error)
    throw error
  }
}

// 6. (後台) 新增行程
export const createItinerary = async (vendorId, data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/itineraries`, data)
    return response.data
  } catch (error) {
    console.error('新增行程失敗:', error)
    throw error
  }
}
