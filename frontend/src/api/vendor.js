import axios from 'axios'
import { API_BASE_URL } from './config'

export const getAllVendorRegions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/regions`)
    return response.data
  } catch (error) {
    return { success: false, data: [] }
  }
}

export const getVendorProfile = async (vendorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}`)
    return response.data
  } catch (error) {
    return { success: false, message: error.message }
  }
}

export const getVendorItineraries = async (vendorId, filter = {}) => {
  try {
    const params = new URLSearchParams()
    if (filter.region && filter.region !== '全部') {
      params.append('region', filter.region)
    }
    params.append('limit', '1000')
    params.append('page', '1')

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}/itineraries${queryString}`)
    return response.data
  } catch {
    return { success: false, data: [] }
  }
}

export const getVendorPosts = async (vendorId) => {
  try {
    const params = new URLSearchParams()
    params.append('limit', '1000')
    params.append('page', '1')

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}/posts${queryString}`)
    return response.data
  } catch {
    return { success: false, data: [] }
  }
}

export const updateVendorProfile = async (vendorId, profileData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/vendors/${vendorId}`, profileData)
    return response.data
  } catch (error) {
    return { success: false, message: error.message }
  }
}

export const createPost = async (vendorId, data) => {
  const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/posts`, data)
  return response.data
}

export const createItinerary = async (vendorId, data) => {
  const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/itineraries`, data)
  return response.data
}
