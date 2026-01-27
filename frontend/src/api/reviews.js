import axios from 'axios'

import { API_BASE_URL } from '@/api/config'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

export const submitReview = async ({ author_uid, target_uid, trip_id, content, sentiment }) => {
  try {
    const response = await apiClient.post('/reviews', {
      author_uid,
      target_uid,
      trip_id,
      content,
      sentiment,
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error || '評價送出失敗',
    }
  }
}
