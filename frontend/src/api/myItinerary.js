import axios from 'axios'
import { API_BASE_URL } from './config'

export const getPersonalItineraries = (uid) =>
  axios.get(`${API_BASE_URL}/my-itinerary/personal/${uid}`).then((res) => res.data)

export const getJoinedItineraries = (uid) =>
  axios.get(`${API_BASE_URL}/my-itinerary/joined/${uid}`).then((res) => res.data)

export const createMyItinerary = (data) =>
  axios.post(`${API_BASE_URL}/my-itinerary`, data).then((res) => res.data)
