import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTravelers } from '@/api/travelers'

export const useTravelersStore = defineStore('travelers', () => {
  // --- 狀態 ---
  const recommendations = ref([])
  const loading = ref(false)
  const hasMore = ref(true) // [新增] 是否還有更多資料
  const error = ref(null)

  // --- Actions ---
  // isLoadMore: true 代表是要載入下一頁，false 代表是初始載入或重整
  const loadRecommendations = async (isLoadMore = false) => {
    // 如果正在載入中，或是要載入更多但已經沒資料了，就擋掉
    if (loading.value) return
    if (isLoadMore && !hasMore.value) return

    loading.value = true
    error.value = null

    try {
      // 如果不是載入更多 (是重整)，先重置狀態
      if (!isLoadMore) {
        hasMore.value = true
        // 這裡可以選擇是否清空，不清空體驗較好，但在 API 回來前舊資料會留著
        // recommendations.value = []
      }

      // 計算目前的 offset：如果是載入更多，就跳過目前已有的數量
      const offset = isLoadMore ? recommendations.value.length : 0
      const limit = 10

      // 呼叫 API
      const response = await getTravelers({
        limit,
        offset,
      })

      if (response && response.success) {
        const newData = response.data || []

        // 判斷是否還有下一頁 (如果回傳數量小於 limit，代表沒了)
        if (newData.length < limit) {
          hasMore.value = false
        }

        if (isLoadMore) {
          // [附加模式] 接在舊資料後面
          recommendations.value.push(...newData)
        } else {
          // [覆蓋模式]
          recommendations.value = newData
        }
      } else {
        // API 失敗或沒資料
        if (!isLoadMore) recommendations.value = []
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
    loadRecommendations,
  }
})
