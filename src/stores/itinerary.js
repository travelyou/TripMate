// src/stores/itinerary.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useItineraryStore = defineStore('itinerary', () => {
  const myItineraries = ref([])

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
