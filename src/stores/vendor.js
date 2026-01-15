import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getVendorProfile, getVendorItineraries, getVendorPosts } from '@/api/vendor'
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

  // 🔴 MOCK DATA - 廠商基本資料
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

  // 🔴 MOCK DATA - 貼文
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

  // 🔴 MOCK DATA - 行程
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

  // 🔴 MOCK DATA - 評價
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

  // ========================================
  // Actions
  // ========================================

  const fetchVendorProfile = async (id) => {
    loading.value = true
    error.value = null
    try {
      // 嘗試從 API 抓取
      const res = await getVendorProfile(id)
      if (res.success && res.data && res.data.name !== '預設廠商') {
        currentVendor.value = res.data
      } else {
        // 如果 API 回傳預設或失敗，使用 Mock Data
        console.log('Using Mock Vendor Data')
        currentVendor.value = { ...mockVendor, id }
      }
    } catch (err) {
      console.error('Error:', err)
      currentVendor.value = { ...mockVendor, id }
    } finally {
      loading.value = false
    }
  }

  const fetchVendorPosts = async (id) => {
    // 優先使用 Mock Data，確保有畫面
    vendorPosts.value = mockPosts

    // 如果後端有資料，可以嘗試抓取並合併 (目前先以 Mock 為主)
    // const res = await getVendorPosts(id)
    // if(res.success && res.data.length > 0) { ... }
  }

  const fetchVendorItineraries = async (id, filter = {}) => {
    // 優先使用 Mock Data
    let result = [...mockItineraries]

    // 簡單過濾邏輯
    if (filter.region && filter.region !== '全部') {
      result = result.filter((item) => item.region === filter.region)
    }

    vendorItineraries.value = result
  }

  const fetchVendorReviews = async (id) => {
    vendorReviews.value = mockReviews
  }

  // --- 混合模式：真實寫入 + 本地更新 ---

  const createItinerary = async (vendorId, itineraryData) => {
    loading.value = true
    try {
      // 1. 呼叫真實 API 寫入 DB
      const res = await createItineraryApi({
        ...itineraryData,
        author_uid: vendorId,
      })

      if (!res.success) {
        throw new Error(res.message || '發布失敗')
      }

      // 2. 建構符合前端 Mock 格式的物件，直接塞入陣列
      const newItinerary = {
        id: res.id, // 使用後端回傳的 ID
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

      // 3. 更新本地 State (插在最前面)
      vendorItineraries.value.unshift(newItinerary)

      return { success: true, data: newItinerary }
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
      // 1. 呼叫 API (假設你有做 discussions API，若無則只模擬成功)
      // const res = await createDiscussionApi({ ...postData, author_uid: vendorId })

      // 暫時模擬成功
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockRes = { success: true, id: Date.now() }

      // 2. 建構新貼文物件
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

      // 3. 更新本地 State
      vendorPosts.value.unshift(newPost)

      return { success: true, data: newPost }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // 佔位 function (不需要動)
  const updateVendorProfile = async () => ({ success: true })
  const updateItinerary = async () => ({ success: true })
  const deleteItinerary = async () => ({ success: true })
  const updatePost = async () => ({ success: true })
  const deletePost = async () => ({ success: true })
  const uploadVendorImage = async () => 'https://picsum.photos/800/600'

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
