import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

// [GET] 取得個人規劃行程
// [修正] 改名為 getPersonalItineraries 以符合 Store 的 import
export const getPersonalItineraries = async (uid) => {
  const response = await axios.get(`${API_BASE_URL}/my-itinerary/personal/${uid}`)
  return response.data
}

// [GET] 取得已參加並通過的找旅伴行程
export const getJoinedItineraries = async (uid) => {
  const response = await axios.get(`${API_BASE_URL}/my-itinerary/joined/${uid}`)
  return response.data
}

// [POST] 新增個人行程
export const createMyItinerary = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/my-itinerary`, data)
  return response.data
}

// [PUT] 更新個人行程
export const updateMyItinerary = async (id, data) => {
  const response = await axios.put(`${API_BASE_URL}/my-itinerary/${id}`, data)
  return response.data
}

// [DELETE] 刪除個人行程
export const deleteMyItinerary = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/my-itinerary/${id}`)
  return response.data
}
