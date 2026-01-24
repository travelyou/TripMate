import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getPersonalItineraries,
  getJoinedItineraries,
  // createMyItinerary // 之後若有寫 POST API 再引入
} from '@/api/myItinerary'

export const useMyItineraryStore = defineStore('myItinerary', () => {
  const myItineraries = ref([])
  const partnerItineraries = ref([])
  const drafts = ref(JSON.parse(localStorage.getItem('trip_drafts') || '[]'))

  const loadPersonalData = async (uid) => {
    const res = await getPersonalItineraries(uid)
    if (res.success) myItineraries.value = res.data
  }

  const loadJoinedData = async (uid) => {
    const res = await getJoinedItineraries(uid)
    if (res.success) partnerItineraries.value = res.data
  }

  // 🟢 修正：補回此函式供 Page 呼叫
  const saveItinerary = (itineraryData) => {
    const existingIndex = myItineraries.value.findIndex((i) => i.id === itineraryData.id)
    if (existingIndex !== -1) {
      myItineraries.value[existingIndex] = itineraryData
    } else {
      myItineraries.value.unshift(itineraryData)
    }
    // 這裡之後可以加入呼叫 createMyItinerary(itineraryData) 存入 Neon
  }

  // 🟢 修正：補回此函式供 Page 呼叫
  const deleteItinerary = (id) => {
    myItineraries.value = myItineraries.value.filter((i) => i.id !== id)
  }

  const addDraft = (draftData) => {
    const newDraft = { id: Date.now(), saveTime: new Date().toLocaleString(), ...draftData }
    drafts.value.unshift(newDraft)
    localStorage.setItem('trip_drafts', JSON.stringify(drafts.value))
  }

  const updatePartnerItinerary = ({ id, comment, reviewLabel }) => {
    const target = partnerItineraries.value.find((item) => item.id === id)
    if (!target) return
    if (comment !== undefined) target.comment = comment
    if (reviewLabel !== undefined) target.reviewLabel = reviewLabel
  }

  // 🟢 務必檢查這裡是否有包含所有函式
  return {
    myItineraries,
    partnerItineraries,
    drafts,
    loadPersonalData,
    loadJoinedData,
    saveItinerary,
    deleteItinerary,
    addDraft,
    updatePartnerItinerary,
  }
})
