import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function fetchOrders(params = {}) {
  try {
    const { data } = await http.get('/orders', { params })
    if (!data?.ok) throw new Error(data?.message || 'fetchOrders failed')
    return data.orders || []
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || '載入訂單失敗'
    console.error('fetchOrders 錯誤:', error.response?.data || error)
    throw new Error(errorMessage)
  }
}

export async function updateOrderReview(orderId, { rating, comment }) {
  try {
    const { data } = await http.put(`/orders/${orderId}/review`, { rating, comment })
    if (!data?.ok) throw new Error(data?.message || '更新評論失敗')
    return data
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || '更新評論失敗')
  }
}
