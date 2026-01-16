import axios from 'axios'
import { API_BASE_URL } from './config'

// 共用 axios 設定：如果你有用 cookie/session 才需要 withCredentials
const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// 讀購物車 items（只含 itineraryId, persons）
export async function fetchCartItems() {
  const { data } = await http.get('/cart/items')
  if (!data?.ok) throw new Error(data?.message || 'fetchCartItems failed')
  return data.items || []
}

// 加入購物車（同 itinerary 會累加 persons，取決於你後端 upsert 寫法）
export async function addCartItem({ itineraryId, persons = 1 }) {
  const { data } = await http.post('/cart/items', { itineraryId, persons })
  if (!data?.ok) throw new Error(data?.message || 'addCartItem failed')
  return data
}

// 更新人數
export async function updateCartItemPersons({ itineraryId, persons }) {
  const { data } = await http.patch(`/cart/items/${itineraryId}`, { persons })
  if (!data?.ok) throw new Error(data?.message || 'updateCartItemPersons failed')
  return data
}

// 移除項目
export async function removeCartItem(itineraryId) {
  const { data } = await http.delete(`/cart/items/${itineraryId}`)
  if (!data?.ok) throw new Error(data?.message || 'removeCartItem failed')
  return data
}
