import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

export const getPersonalItineraries = async (uid) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/my-itinerary/personal/${uid}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getJoinedItineraries = async (uid) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/my-itinerary/joined/${uid}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const createMyItinerary = async (data) => {
  try {
    const payload = {
      user_uid: data.user_uid,
      title: data.title || '',
      location: data.location || '',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
      packing_list: Array.isArray(data.packing_list) ? data.packing_list : [],
    }
    const response = await axios.post(`${API_BASE_URL}/my-itinerary`, payload)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateMyItinerary = async (id, data) => {
  try {
    const payload = {
      title: data.title || '',
      location: data.location || '',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
      packing_list: Array.isArray(data.packing_list) ? data.packing_list : [],
    }
    const response = await axios.put(`${API_BASE_URL}/my-itinerary/${id}`, payload)
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteMyItinerary = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/my-itinerary/${id}`)
    return response.data
  } catch (error) {
    throw error
  }
}
