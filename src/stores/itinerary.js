// src/stores/itinerary.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useItineraryStore = defineStore('itinerary', () => {
  // 用戶發起的行程
  const myItineraries = ref([
    {
      id: 101,
      title: '2024 東京櫻花季攝影團',
      startDate: '2024-03-25',
      endDate: '2024-03-30',
      status: '招募中',
      participants: 2,
      maxParticipants: 4,
      image: 'https://picsum.photos/400/300?random=201',
      description: '徵求兩位喜歡攝影的旅伴，一起在東京賞櫻、街拍。',
    },
    {
      id: 102,
      title: '週末宜蘭溫泉放鬆之旅',
      startDate: '2023-12-15',
      endDate: '2023-12-16',
      status: '已結束',
      participants: 4,
      maxParticipants: 4,
      image: 'https://picsum.photos/400/300?random=202',
      description: '已滿團。享受礁溪溫泉與無菜單料理。',
    },
  ])

  const createItinerary = (itinerary) => {
    myItineraries.value.unshift({
      id: Date.now(),
      status: '招募中',
      participants: 1,
      ...itinerary,
    })
  }

  const deleteItinerary = (id) => {
    const index = myItineraries.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      myItineraries.value.splice(index, 1)
    }
  }

  return {
    myItineraries,
    createItinerary,
    deleteItinerary,
  }
})
