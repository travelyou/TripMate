import axios from 'axios'
import { API_BASE_URL } from '@/api/config'

// [GET] 取得個人規劃行程
// [修正] 改名為 getPersonalItineraries 以符合 Store 的 import
export const getPersonalItineraries = async (uid) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/my-itinerary/personal/${uid}`)
    return response.data
  } catch (error) {
    console.error('獲取個人行程失敗:', error)
    throw error
  }
}

// [GET] 取得已參加並通過的找旅伴行程
export const getJoinedItineraries = async (uid) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/my-itinerary/joined/${uid}`)
    return response.data
  } catch (error) {
    console.error('獲取參加行程失敗:', error)
    throw error
  }
}

// [POST] 新增個人行程
export const createMyItinerary = async (data) => {
  try {
    // 確保數據格式正確
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
    console.error('創建行程失敗:', error)
    console.error('請求數據:', data)
    throw error
  }
}

// [PUT] 更新個人行程
export const updateMyItinerary = async (id, data) => {
  try {
    // 確保數據格式正確
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
    console.error('更新行程失敗:', error)
    console.error('行程 ID:', id)
    console.error('請求數據:', data)
    throw error
  }
}

// [DELETE] 刪除個人行程
export const deleteMyItinerary = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/my-itinerary/${id}`)
    return response.data
  } catch (error) {
    console.error('刪除行程失敗:', error)
    throw error
  }
}
