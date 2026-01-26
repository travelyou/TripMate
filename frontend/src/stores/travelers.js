import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTravelers } from '@/api/travelers'

export const useTravelersStore = defineStore('travelers', () => {
  const recommendations = ref([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref(null)

  const loadRecommendations = async (isLoadMore = false) => {
    if (loading.value) return
    if (isLoadMore && !hasMore.value) return

    loading.value = true
    error.value = null

    try {
      if (!isLoadMore) {
        hasMore.value = true
      }

      const offset = isLoadMore ? recommendations.value.length : 0
      const limit = 10

      const response = await getTravelers({
        limit,
        offset,
      })

      let newData = []
      if (response) {
        if (response.success && Array.isArray(response.data)) {
          newData = response.data
        } else if (Array.isArray(response)) {
          newData = response
        } else if (Array.isArray(response.data)) {
          newData = response.data
        }
      }

      if (newData.length < limit) {
        hasMore.value = false
      }

      if (isLoadMore) {
        if (newData.length > 0) {
          recommendations.value.push(...newData)
        }
      } else {
        if (newData.length > 0 || recommendations.value.length === 0) {
          recommendations.value = newData
        }
      }
    } catch (err) {
      console.error('載入旅伴推薦失敗：', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    recommendations,
    loading,
    hasMore,
    error,
    loadRecommendations,
  }
})
