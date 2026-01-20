import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getItineraries } from '@/api/itinerary'

export const useItineraryStore = defineStore('itinerary', () => {
  const itineraries = ref([])
  const loading = ref(false)
  const error = ref(null)
  const myItineraries = ref([])

  const fetchItineraries = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const result = await getItineraries(filters)
      if (result?.success === false) {
        itineraries.value = Array.isArray(result?.data) ? result.data : []
        error.value = result?.message || '載入行程失敗'
        return
      }
      if (Array.isArray(result)) {
        itineraries.value = result
        return
      }
      if (Array.isArray(result?.data)) {
        itineraries.value = result.data
        return
      }
      if (Array.isArray(result?.items)) {
        itineraries.value = result.items
        return
      }
      itineraries.value = []
    } catch (err) {
      console.error('Error fetching itineraries:', err)
      itineraries.value = []
      error.value = '載入行程失敗'
    } finally {
      loading.value = false
    }
  }

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
    itineraries,
    loading,
    error,
    myItineraries,
    fetchItineraries,
    createItinerary,
    deleteItinerary,
  }
})
