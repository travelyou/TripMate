// src/api/itineraries.js
import axios from 'axios'
import { API_BASE_URL } from './config'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// 後端：GET /api/itineraries?ids=1,2,3
export async function fetchItinerariesByIds(ids = []) {
  const cleanIds = (ids || []).map((x) => Number(x)).filter(Number.isInteger)
  const qs = cleanIds.length ? `?ids=${cleanIds.join(',')}` : ''
  const { data } = await http.get(`/itineraries${qs}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itineraries failed')
  return data.items || []
}

// 後端：GET /api/itineraries/:id
export async function fetchItineraryById(id) {
  const iid = Number(id)
  if (!Number.isInteger(iid)) throw new Error('id is invalid')
  const { data } = await http.get(`/itineraries/${iid}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itinerary failed')
  return data.item
}
