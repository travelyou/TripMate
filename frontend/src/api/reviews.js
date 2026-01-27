import axios from 'axios'

// 1. 建立一個設定好 Base URL 的 axios 實例
// 這樣可以確保它跟其他 API 一樣能找到正確的後端
const apiClient = axios.create({
  // 優先讀取環境變數，如果沒有則預設為 '/api' (依賴 Vite Proxy)
  // 注意：這裡的 baseURL 設定為 '/api'，後面的請求路徑就只要寫 '/reviews'
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
})

export const submitReview = async ({ author_uid, target_uid, trip_id, content, sentiment }) => {
  try {
    // 2. 使用 apiClient 發送請求
    // 最終路徑會拼成：(Base URL) + /reviews
    const response = await apiClient.post('/reviews', {
      author_uid,
      target_uid,
      trip_id,
      content,
      sentiment,
    })
    return { success: true, data: response.data }
  } catch (error) {
    console.error('送出評價失敗:', error)
    return {
      success: false,
      message: error.response?.data?.error || '評價送出失敗',
    }
  }
}
