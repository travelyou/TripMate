import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItineraries, getItineraryById } from '@/api/itinerary'

export const useItineraryStore = defineStore('itinerary', () => {
  const itineraries = ref([])
  const currentItinerary = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 初始化載入列表
  const fetchItineraries = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await getItineraries(filters)
      if (response.success) {
        itineraries.value = response.data
      } else {
        itineraries.value = [] // 若失敗則清空，不使用假資料
        console.warn('API 回傳失敗:', response)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      error.value = '無法載入行程資料，請稍後再試'
      itineraries.value = []
    } finally {
      loading.value = false
    }
  }

  // 載入詳細資料 (包含 Days 和 PackingList)
  const fetchItineraryDetail = async (id) => {
    loading.value = true
    currentItinerary.value = null // 清空舊資料
    try {
      const response = await getItineraryById(id)
      if (response.success) {
        currentItinerary.value = response.data
      }
    } catch (err) {
      console.error(err)
      error.value = '載入詳細資料失敗'
    } finally {
      loading.value = false
    }
  }

  return {
    itineraries,
    currentItinerary,
    loading,
    error,
    fetchItineraries,
    fetchItineraryDetail,
  }
})
