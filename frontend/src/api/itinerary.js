import axios from 'axios'
import { auth } from '@/firebase/config'
import { API_BASE_URL } from './config'

export const getItineraries = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/itineraries`, { params: filters })
    return response.data
  } catch (error) {
    return { success: false, data: [] }
  }
}

export const fetchItinerariesByIds = async (ids = []) => {
  const cleanIds = (ids || []).map((x) => Number(x)).filter(Number.isInteger)
  const qs = cleanIds.length ? `?ids=${cleanIds.join(',')}` : ''
  const { data } = await axios.get(`${API_BASE_URL}/itineraries${qs}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itineraries failed')
  return data.items || []
}

export const fetchItineraryById = async (id) => {
  const iid = Number(id)
  if (!Number.isInteger(iid)) throw new Error('id is invalid')
  const { data } = await axios.get(`${API_BASE_URL}/itineraries/${iid}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itinerary failed')
  return data.item
}

export const getItineraryById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/itineraries/${id}`)
    return response.data
  } catch (error) {
    return { success: false, message: '無法讀取行程資料' }
  }
}

export const createItinerary = async (payload) => {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

    const response = await axios.post(`${API_BASE_URL}/itineraries`, payload, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    const result = response.data
    if (result.success || result.id) {
      return { success: true, id: result.id, data: result.data || result }
    }

    return result
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || error.message || '建立失敗' 
    }
  }
}

export const updateItinerary = async (id, payload) => {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
    const response = await axios.put(`${API_BASE_URL}/itineraries/${id}`, payload, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
    return response.data
  } catch (error) {
    return { success: false, message: error.response?.data?.message || '更新失敗' }
  }
}
