import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getVendorProfile,
  getVendorItineraries,
  getVendorPosts,
  updateVendorProfile as updateVendorProfileAPI,
} from '@/api/vendor'
import { createItinerary as createItineraryApi } from '@/api/itinerary'
// 若有 discussion API 請解開下方註解
// import { createDiscussion as createDiscussionApi } from '@/api/discussions'

export const useVendorStore = defineStore('vendor', () => {
  const currentVendor = ref(null)
  const vendorPosts = ref([])
  const vendorItineraries = ref([])
  const vendorReviews = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 🔴 MOCK DATA - 廠商基本資料 (Deprecated: Use API)
  /*
  const mockVendor = {
    id: 'vendor001',
    name: '環遊世界旅行社',
    slogan: '帶您探索世界的每一個角落',
    avatar: 'https://picsum.photos/200?random=vendor',
    bannerImage: 'https://picsum.photos/1200/600?random=banner',
    isBannerVisible: true,
    regionTags: ['日本', '韓國', '東南亞', '歐洲', '美洲'],
    rating: 4.8,
    reviewCount: 328,
    description:
      '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。',
    isVerified: true,
  }
  */

  // 🔴 MOCK DATA - 貼文 (Deprecated)
  /*
  const mockPosts = [
    {
      id: 1,
      title: '京都賞楓最佳時機分享',
      content:
        '每年11月中旬到12月初，是京都賞楓的黃金時期。清水寺、嵐山、東福寺都是絕佳的賞楓景點，建議避開週末人潮...',
      image: 'https://picsum.photos/600/400?random=kyoto',
      likes: 245,
      collects: 120,
      comments: 38,
      time: '2025-11-15',
      tags: ['日本', '賞楓', '京都', '東北亞'],
    },
    {
      id: 2,
      title: '峇里島私房景點大公開',
      content:
        '除了烏布和庫塔，峇里島還有許多鮮為人知的絕美景點。今天要跟大家分享我們最近發掘的幾個私房景點，包括隱藏版瀑布和秘境海灘...',
      image: 'https://picsum.photos/600/400?random=bali',
      likes: 189,
      collects: 85,
      comments: 25,
      time: '2025-11-10',
      tags: ['峇里島', '印尼', '秘境', '東南亞'],
    },
    {
      id: 3,
      title: '冰島極光攝影技巧',
      content:
        '想要拍出震撼的極光照片嗎？相機設置、拍攝地點、時機選擇都是關鍵。這篇文章分享我們多年來累積的極光攝影經驗...',
      image: 'https://picsum.photos/600/400?random=aurora',
      likes: 412,
      collects: 340,
      comments: 56,
      time: '2025-10-28',
      tags: ['冰島', '極光', '攝影', '歐洲', '北歐'],
    },
  ]
  */

  // 🔴 MOCK DATA - 行程 (Deprecated)
  /*
  const mockItineraries = [
    {
      id: 1,
      name: '日本關西經典五日遊',
      image: 'https://picsum.photos/400/300?random=osaka',
      price: 32800,
      originalPrice: 38800,
      days: 5,
      nights: 4,
      rating: 4.9,
      reviewCount: 156,
      region: '日本',
      tags: ['熱門', '限時優惠'],
      highlights: ['大阪環球影城', '京都古寺巡禮', '奈良餵鹿'],
    },
    {
      id: 2,
      name: '峇里島奢華度假七日',
      image: 'https://picsum.photos/400/300?random=bali2',
      price: 45600,
      originalPrice: null,
      days: 7,
      nights: 6,
      rating: 4.8,
      reviewCount: 89,
      region: '東南亞',
      tags: ['精選'],
      highlights: ['五星級Villa', '私人海灘', 'SPA體驗'],
    },
    {
      id: 3,
      name: '冰島極光追尋八日',
      image: 'https://picsum.photos/400/300?random=iceland',
      price: 89900,
      originalPrice: 95900,
      days: 8,
      nights: 7,
      rating: 5.0,
      reviewCount: 42,
      region: '歐洲',
      tags: ['熱門', '小團限定'],
      highlights: ['極光獵人', '藍湖溫泉', '冰川健行'],
    },
    {
      id: 4,
      name: '泰國清邁慢活五日',
      image: 'https://picsum.photos/400/300?random=chiangmai',
      price: 18900,
      originalPrice: null,
      days: 5,
      nights: 4,
      rating: 4.7,
      reviewCount: 203,
      region: '東南亞',
      tags: [],
      highlights: ['水燈節體驗', '大象保護區', '手作工藝課程'],
    },
    {
      id: 5,
      name: '紐西蘭南島自駕十日',
      image: 'https://picsum.photos/400/300?random=newzealand',
      price: 76800,
      originalPrice: 82800,
      days: 10,
      nights: 9,
      rating: 4.9,
      reviewCount: 67,
      region: '美洲',
      tags: ['限時優惠'],
      highlights: ['米佛峽灣', '皇后鎮跳傘', '魔戒拍攝地'],
    },
    {
      id: 6,
      name: '越南胡志明美食三日',
      image: 'https://picsum.photos/400/300?random=vietnam',
      price: 12800,
      originalPrice: null,
      days: 3,
      nights: 2,
      rating: 4.6,
      reviewCount: 124,
      region: '東南亞',
      tags: [],
      highlights: ['在地小吃', '咖啡文化', '法式建築'],
    },
  ]
  */

  // 🔴 MOCK DATA - 評價 (Deprecated)
  /*
  const mockReviews = [
    {
      id: 1,
      userName: 'Alice',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      rating: 5,
      date: '2023-12-15',
      content: '參加了他們的京都團，導遊非常專業，行程安排也很鬆弛有度，非常推薦！',
    },
    {
      id: 2,
      userName: 'Bob',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      rating: 4.5,
      date: '2023-11-20',
      content: '整體的體驗很棒，住宿也很舒適。唯一的小缺點是遊覽車坐得有點久。',
    },
    {
      id: 3,
      userName: 'Charlie',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      rating: 5,
      date: '2023-10-05',
      content: '這是我參加過最棒的極光團！真的看到極光大爆發，太感動了！',
    },
  ]
  */

  // ========================================
  // Actions
  // ========================================

  const fetchVendorProfile = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await getVendorProfile(id)
      if (res.success && res.data && res.data.name !== '預設廠商') {
        currentVendor.value = res.data
      } else {
        // API 失敗不再使用 Mock Data
        currentVendor.value = null
        error.value = '無法讀取廠商資料'
      }
    } catch (err) {
      console.error('Error:', err)
      currentVendor.value = null
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchVendorPosts = async (id) => {
    // 移除 Mock Data fallback
    try {
      const res = await getVendorPosts(id)
      if (res.success) {
        vendorPosts.value = res.data
      } else {
        vendorPosts.value = []
      }
    } catch {
      vendorPosts.value = []
    }
  }

  const fetchVendorItineraries = async (id, filter = {}) => {
    try {
      const res = await getVendorItineraries(id)
      if (res.success) {
        let result = res.data
        // 前端簡單過濾 (若後端未做)
        if (filter.region && filter.region !== '全部') {
          result = result.filter((item) => item.region === filter.region)
        }
        vendorItineraries.value = result
      } else {
        vendorItineraries.value = []
      }
    } catch {
      vendorItineraries.value = []
    }
  }

  const fetchVendorReviews = async () => {
    // API 尚未完成，暫時置空
    vendorReviews.value = []
  }

  const updateVendorProfile = async (vendorId, profileData) => {
    loading.value = true
    error.value = null
    try {
      // 呼叫真實 API 更新廠商資料
      const res = await updateVendorProfileAPI(vendorId, profileData)

      if (!res.success) {
        throw new Error(res.message || '更新失敗')
      }

      // 更新成功後重新載入廠商資料，確保與後端同步
      await fetchVendorProfile(vendorId)

      return { success: true, data: res.data }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createItinerary = async (vendorId, itineraryData) => {
    loading.value = true
    try {
      const res = await createItineraryApi({
        ...itineraryData,
        author_uid: vendorId,
      })

      if (!res.success) {
        throw new Error(res.message || '發布失敗')
      }

      const newItinerary = {
        id: res.id,
        name: itineraryData.title,
        title: itineraryData.title,
        image: itineraryData.coverImage || 'https://picsum.photos/400/300?random=new',
        price: itineraryData.price,
        days: itineraryData.durationDays,
        rating: 0,
        reviewCount: 0,
        region: '最新發布',
        tags: itineraryData.tags || ['新行程'],
        highlights: [],
      }

      vendorItineraries.value.unshift(newItinerary)

      return { success: true, data: newItinerary }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateItinerary = async (itineraryId, itineraryData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const index = vendorItineraries.value.findIndex((i) => i.id === itineraryId)
      if (index !== -1) {
        vendorItineraries.value[index] = {
          ...vendorItineraries.value[index],
          ...itineraryData,
        }
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteItinerary = async (itineraryId) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      vendorItineraries.value = vendorItineraries.value.filter((i) => i.id !== itineraryId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPost = async (vendorId, postData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockRes = { success: true, id: Date.now() }

      const newPost = {
        id: mockRes.id,
        title: postData.title,
        content: postData.content,
        image: postData.image || 'https://picsum.photos/600/400?random=newpost',
        likes: 0,
        collects: 0,
        comments: 0,
        time: new Date().toISOString().split('T')[0],
        tags: postData.tags || [],
      }

      vendorPosts.value.unshift(newPost)

      return { success: true, data: newPost }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePost = async (postId, postData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const index = vendorPosts.value.findIndex((p) => p.id === postId)
      if (index !== -1) {
        vendorPosts.value[index] = {
          ...vendorPosts.value[index],
          ...postData,
        }
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePost = async (postId) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      vendorPosts.value = vendorPosts.value.filter((p) => p.id !== postId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // eslint-disable-next-line no-unused-vars
  const uploadVendorImage = async (_file, _type) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const mockUrl = `https://picsum.photos/800/600?random=${Date.now()}`

      return mockUrl
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    currentVendor,
    vendorPosts,
    vendorItineraries,
    vendorReviews,
    loading,
    error,
    fetchVendorProfile,
    fetchVendorPosts,
    fetchVendorItineraries,
    fetchVendorReviews,
    updateVendorProfile,
    createItinerary,
    createPost,
    updateItinerary,
    deleteItinerary,
    updatePost,
    deletePost,
    uploadVendorImage,
  }
})
