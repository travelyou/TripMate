import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createMyItinerary, getPersonalItineraries, getJoinedItineraries } from '@/api/myItinerary'

export const useMyItineraryStore = defineStore('myItinerary', () => {
  const myItineraries = ref([])
  const partnerItineraries = ref([])
  const drafts = ref(JSON.parse(localStorage.getItem('itinerary_drafts') || '[]'))

  const loadPersonalData = async (uid) => {
    if (!uid) return
    const res = await getPersonalItineraries(uid)
    if (res.success) myItineraries.value = res.data
  }

  const saveItinerary = async (itineraryData, uid) => {
    if (!uid) return { success: false, message: '使用者未登入' }

    // 格式轉換：前端駝峰 -> 後端底線
    const payload = {
      user_uid: uid,
      title: itineraryData.title,
      location: itineraryData.location || '',
      start_date: itineraryData.startDate,
      end_date: itineraryData.endDate,
      itinerary: itineraryData.days,
      packing_list: itineraryData.packingList,
    }

    try {
      const res = await createMyItinerary(payload)
      if (res.success) {
        await loadPersonalData(uid)
        return { success: true }
      }
      return { success: false, message: res.message }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '網路連線失敗' }
    }
  }

  return { myItineraries, partnerItineraries, drafts, loadPersonalData, saveItinerary }
})
