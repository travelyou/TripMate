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
    try {
      const response = await getItineraries(filters)
      if (response.success) {
        itineraries.value = response.data
      } else {
        // 如果後端還沒好，這裡可以塞入一些假資料避免頁面空白
        itineraries.value = [
          {
            id: 1,
            title: '北海道雪祭五日遊',
            price: 32000,
            agencyName: '北國旅遊',
            durationDays: 5,
            coverImage: 'https://picsum.photos/id/11/800/600',
            destinations: ['札幌', '小樽'],
            tags: ['雪景', '滑雪'],
            likes: 10,
            totalSaves: 5,
          },
          {
            id: 2,
            title: '曼谷自由行',
            price: 15000,
            agencyName: '自由行專家',
            durationDays: 4,
            coverImage: 'https://picsum.photos/id/22/800/600',
            destinations: ['曼谷'],
            tags: ['購物', '按摩'],
            likes: 25,
            totalSaves: 12,
          },
        ]
      }
    } catch (err) {
      error.value = err.message
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
