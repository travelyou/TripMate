import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function fetchCartItems() {
  const { data } = await http.get('/cart/items')
  if (!data?.ok) throw new Error(data?.message || 'fetchCartItems failed')
  return data.items || []
}

export async function addCartItem({ itineraryId, persons = 1 }) {
  const { data } = await http.post('/cart/items', { itineraryId, persons })
  if (!data?.ok) throw new Error(data?.message || 'addCartItem failed')
  return data
}

export async function updateCartItemPersons({ itineraryId, persons }) {
  const { data } = await http.patch(`/cart/items/${itineraryId}`, { persons })
  if (!data?.ok) throw new Error(data?.message || 'updateCartItemPersons failed')
  return data
}

export async function removeCartItem(itineraryId) {
  const { data } = await http.delete(`/cart/items/${itineraryId}`)
  if (!data?.ok) throw new Error(data?.message || 'removeCartItem failed')
  return data
}
