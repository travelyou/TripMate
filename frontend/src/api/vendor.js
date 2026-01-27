import axios from 'axios'

const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/api'

// 取得廠商資料
export const getVendorProfile = async (vendorId) => {
  try {
    const response = await axios.get(`${API_URL}/vendors/${vendorId}`)
    return response.data
  } catch (error) {
    console.error('Get Vendor Profile Error:', error)
    return { success: false, message: error.message }
  }
}

// 取得廠商行程列表
export const getVendorItineraries = async (vendorId) => {
  try {
    const response = await axios.get(`${API_URL}/vendors/${vendorId}/itineraries`)
    return response.data
  } catch (error) {
    console.error('Get Vendor Itineraries Error:', error)
    return { success: false, data: [] }
  }
}

// 取得廠商貼文列表
export const getVendorPosts = async (vendorId) => {
  try {
    const response = await axios.get(`${API_URL}/vendors/${vendorId}/posts`)
    return response.data
  } catch (error) {
    console.error('Get Vendor Posts Error:', error)
    return { success: false, data: [] }
  }
}

// 更新廠商資料
export const updateVendorProfile = async (vendorId, profileData) => {
  try {
    const response = await axios.put(`${API_URL}/vendors/${vendorId}`, profileData)
    return response.data
  } catch (error) {
    console.error('Update Vendor Profile Error:', error)
    return { success: false, message: error.message }
  }
}
