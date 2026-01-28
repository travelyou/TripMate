import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import {
  createMyItinerary,
  updateMyItinerary,
  getPersonalItineraries,
  getJoinedItineraries,
  deleteMyItinerary,
} from '@/api/myItinerary'
import { auth } from '@/firebase/config'

export const useMyItineraryStore = defineStore('myItinerary', () => {
  const myItineraries = ref([])
  const partnerItineraries = ref([])
  const drafts = ref(JSON.parse(localStorage.getItem('itinerary_drafts') || '[]'))

  const loadPersonalData = async (uid) => {
    if (!uid) return
    try {
      const res = await getPersonalItineraries(uid)
      if (res.success) {
        myItineraries.value = res.data.map((item) => {
          const { start_date, end_date, itinerary, packing_list, ...rest } = item
          return {
            ...rest,
            startDate: start_date ? dayjs(start_date).format('YYYY-MM-DD') : '',
            endDate: end_date ? dayjs(end_date).format('YYYY-MM-DD') : '',
            days: itinerary || [],
            packingList: packing_list || [],
          }
        })
      }
    } catch (error) {
    }
  }

  const loadJoinedData = async (uid) => {
    if (!uid) return
    try {
      const res = await getJoinedItineraries(uid)
      if (res.success) {
        partnerItineraries.value = res.data.map((item) => ({
          ...item,
          startDate: item.start_date ? dayjs(item.start_date).format('YYYY-MM-DD') : '',
          endDate: item.end_date ? dayjs(item.end_date).format('YYYY-MM-DD') : '',
        }))
      }
    } catch (error) {
    }
  }

  const saveItinerary = async (itineraryData, uid) => {
    if (!uid) return { success: false, message: '使用者未登入' }
    const payload = {
      title: itineraryData.title,
      location: itineraryData.location || '',
      start_date: itineraryData.startDate,
      end_date: itineraryData.endDate,
      itinerary: itineraryData.days,
      packing_list: itineraryData.packingList,
    }
    try {
      if (itineraryData.id) {
        const res = await updateMyItinerary(itineraryData.id, payload)
        if (res.success) {
          await loadPersonalData(uid)
          return { success: true }
        }
        return { success: false, message: res.message || '更新失敗' }
      } else {
        const res = await createMyItinerary({
          ...payload,
          user_uid: uid,
        })
        if (res.success) {
          await loadPersonalData(uid)
          return { success: true }
        }
        return { success: false, message: res.message || '創建失敗' }
      }
    } catch (error) {
      let errorMessage = '儲存失敗'
      if (error.response?.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage
      } else if (error.message) {
        errorMessage = error.message
      }
      
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = '無法連接到伺服器，請檢查網路連線'
      }
      
      return { success: false, message: errorMessage }
    }
  }

  const deleteItinerary = async (id) => {
    try {
      const res = await deleteMyItinerary(id)
      if (res.success) {
        const uid = auth.currentUser?.uid
        if (uid) await loadPersonalData(uid)
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      return { success: false, message: '刪除失敗' }
    }
  }

  const addDraft = (draftData) => {
    const newDraft = {
      id: Date.now() + Math.random(),
      saveTime: new Date().toISOString(),
      ...draftData,
    }
    drafts.value.unshift(newDraft)
    localStorage.setItem('itinerary_drafts', JSON.stringify(drafts.value))
  }

  return {
    myItineraries,
    partnerItineraries,
    drafts,
    loadPersonalData,
    loadJoinedData,
    saveItinerary,
    deleteItinerary,
    addDraft,
  }
})
