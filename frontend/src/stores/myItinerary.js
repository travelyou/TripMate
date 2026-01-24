import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createMyItinerary,
  getPersonalItineraries,
  getJoinedItineraries,
  deleteMyItinerary,
} from '@/api/myItinerary'
import { auth } from '@/firebase/config'

export const useMyItineraryStore = defineStore('myItinerary', () => {
  const myItineraries = ref([])
  const partnerItineraries = ref([])
  const drafts = ref(JSON.parse(localStorage.getItem('itinerary_drafts') || '[]'))

  // [Action] 載入個人行程並轉換格式 (Snake -> Camel)
  const loadPersonalData = async (uid) => {
    if (!uid) return
    const res = await getPersonalItineraries(uid)
    if (res.success) {
      myItineraries.value = res.data.map((item) => {
        const { start_date, end_date, itinerary, packing_list, ...rest } = item
        return {
          ...rest,
          startDate: start_date,
          endDate: end_date,
          days: itinerary || [],
          packingList: packing_list || [],
        }
      })
    }
  }

  // [Action] 載入參加的行程
  const loadJoinedData = async (uid) => {
    if (!uid) return
    const res = await getJoinedItineraries(uid)
    if (res.success) {
      partnerItineraries.value = res.data.map((item) => ({
        ...item,
        startDate: item.start_date,
        endDate: item.end_date,
      }))
    }
  }

  // [Action] 儲存行程至資料庫 (Camel -> Snake)
  const saveItinerary = async (itineraryData, uid) => {
    if (!uid) return { success: false, message: '使用者未登入' }
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
      return { success: false, message: '儲存失敗' }
    }
  }

  // [Action] 刪除行程
  const deleteItinerary = async (id) => {
    try {
      const res = await deleteMyItinerary(id)
      if (res.success) {
        myItineraries.value = myItineraries.value.filter((item) => item.id !== id)
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      return { success: false, message: '刪除失敗' }
    }
  }

  // [Action] 草稿管理 (包含唯一 ID 修復)
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
