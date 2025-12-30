import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVendorStore = defineStore('vendor', () => {
  const currentVendor = ref(null)
  const vendorPosts = ref([])
  const vendorItineraries = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 模擬數據 - 廠商基本資料
  const mockVendor = {
    id: 'vendor001',
    name: '環遊世界旅行社',
    slogan: '帶您探索世界的每一個角落',
    avatar: 'https://picsum.photos/200?random=vendor',
    coverImage: 'https://picsum.photos/1200/400?random=travel',
    bannerImage: 'https://picsum.photos/1200/600?random=banner',
    regionTags: ['日本', '韓國', '東南亞', '歐洲', '美洲'],
    rating: 4.8,
    reviewCount: 328,
    postsCount: 45,
    itineraryCount: 28,
    followersCount: 1520,
    description:
      '我們是一家專注於深度旅遊體驗的旅行社，致力於為每位旅客打造獨特而難忘的旅程。無論是探索異國文化、品嚐在地美食，還是體驗刺激冒險，我們都能為您量身定制完美的行程。',
    isVerified: true,
  }

  // 模擬數據 - 貼文
  const mockPosts = [
    {
      id: 1,
      title: '京都賞楓最佳時機分享',
      content:
        '每年11月中旬到12月初，是京都賞楓的黃金時期。清水寺、嵐山、東福寺都是絕佳的賞楓景點，建議避開週末人潮...',
      image: 'https://picsum.photos/600/400?random=kyoto',
      likes: 245,
      comments: 38,
      time: '3 天前',
      tags: ['日本', '賞楓', '京都'],
    },
    {
      id: 2,
      title: '峇里島私房景點大公開',
      content:
        '除了烏布和庫塔，峇里島還有許多鮮為人知的絕美景點。今天要跟大家分享我們最近發掘的幾個私房景點，包括隱藏版瀑布和秘境海灘...',
      image: 'https://picsum.photos/600/400?random=bali',
      likes: 189,
      comments: 25,
      time: '5 天前',
      tags: ['峇里島', '印尼', '秘境'],
    },
    {
      id: 3,
      title: '冰島極光攝影技巧',
      content:
        '想要拍出震撼的極光照片嗎？相機設置、拍攝地點、時機選擇都是關鍵。這篇文章分享我們多年來累積的極光攝影經驗...',
      image: 'https://picsum.photos/600/400?random=aurora',
      likes: 412,
      comments: 56,
      time: '1 週前',
      tags: ['冰島', '極光', '攝影'],
    },
  ]

  // 模擬數據 - 行程
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

  // 模擬數據 - 評價
  const mockReviews = [
    {
      id: 1,
      userName: 'Alice',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      rating: 5,
      date: '2023-12-15',
      content: '參加了他們的京都團，導遊非常專業，行程安排也很鬆弛有度，非常推薦！'
    },
    {
      id: 2,
      userName: 'Bob',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      rating: 4.5,
      date: '2023-11-20',
      content: '整體的體驗很棒，住宿也很舒適。唯一的小缺點是遊覽車坐得有點久。'
    },
    {
      id: 3,
      userName: 'Charlie',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      rating: 5,
      date: '2023-10-05',
      content: '這是我參加過最棒的極光團！真的看到極光大爆發，太感動了！'
    }
  ]

  const vendorReviews = ref([])

  // Actions
  const fetchVendorProfile = async (id) => {
    loading.value = true
    error.value = null
    try {
      // 模擬 API 延遲
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 在真實情境中，這裡會根據 id 發送 API 請求
      // 現在我們回傳模擬數據，並根據 id 稍微改變內容 (如果需要)
      console.log(`Fetching vendor profile for ID: ${id}`)

      currentVendor.value = { ...mockVendor, id }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching vendor profile:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchVendorPosts = async (id) => {
    // 模擬 API 請求
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log(`Fetching posts for vendor: ${id}`)
    vendorPosts.value = mockPosts
  }

  const fetchVendorItineraries = async (id, filter = {}) => {
    // 模擬 API 請求
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log(`Fetching itineraries for vendor: ${id}`)

    let result = [...mockItineraries]

    // 簡單的模擬過濾
    if (filter.region && filter.region !== '全部') {
      result = result.filter((item) => item.region === filter.region)
    }

    vendorItineraries.value = result
  }

  const fetchVendorReviews = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log(`Fetching reviews for vendor: ${id}`)
    vendorReviews.value = mockReviews
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
  }
})
