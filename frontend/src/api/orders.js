import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function fetchOrders(params = {}) {
  const { data } = await http.get('/orders', { params })
  if (!data?.ok) throw new Error(data?.message || 'fetchOrders failed')
  return data.orders || []
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
