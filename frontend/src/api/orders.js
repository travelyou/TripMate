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
