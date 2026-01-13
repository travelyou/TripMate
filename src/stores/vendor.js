import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVendorStore = defineStore('vendor', () => {
  const currentVendor = ref(null)
  const vendorPosts = ref([])
  const vendorItineraries = ref([])
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

  // ========================================
  // 前台 Actions
  // ========================================

  /**
   * 📡 API ENDPOINT: GET /api/vendors/:vendorId
   * Supabase: SELECT * FROM vendors WHERE id = :vendorId
   */
  const fetchVendorProfile = async (id) => {
    loading.value = true
    error.value = null
    try {
      // 🔴 MOCK DATA
      await new Promise((resolve) => setTimeout(resolve, 100))
      console.log(`Fetching vendor profile for ID: ${id}`)
      currentVendor.value = { ...mockVendor, id }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching vendor profile:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 📡 API ENDPOINT: GET /api/vendors/:vendorId/posts
   */
  const fetchVendorPosts = async (id) => {
    // 🔴 MOCK DATA
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`Fetching posts for vendor: ${id}`)
    vendorPosts.value = mockPosts
  }

  /**
   * 📡 API ENDPOINT: GET /api/vendors/:vendorId/itineraries
   */
  const fetchVendorItineraries = async (id, filter = {}) => {
    // 🔴 MOCK DATA
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`Fetching itineraries for vendor: ${id}`)

    let result = [...mockItineraries]

    if (filter.region && filter.region !== '全部') {
      result = result.filter((item) => item.region === filter.region)
    }

    vendorItineraries.value = result
  }

  /**
   * 📡 API ENDPOINT: GET /api/vendors/:vendorId/reviews
   */
  const fetchVendorReviews = async (id) => {
    // 🔴 MOCK DATA
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log(`Fetching reviews for vendor: ${id}`)
    vendorReviews.value = mockReviews
  }

  // ========================================
  // 廠商後台 CRUD Actions
  // ========================================

  /**
   * 📡 API ENDPOINT: PUT /api/vendors/:vendorId
   * Supabase: UPDATE vendors SET ... WHERE id = :vendorId
   * 用途: 更新廠商基本資料
   */
  const updateVendorProfile = async (vendorId, profileData) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      currentVendor.value = { ...currentVendor.value, ...profileData }

      // 📡 未來實作:
      // const { data, error } = await supabase
      //   .from('vendors')
      //   .update(profileData)
      //   .eq('id', vendorId)
      // if (error) throw error

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 📡 API ENDPOINT: POST /api/vendors/:vendorId/itineraries
   * Supabase: INSERT INTO itineraries (...)
   */
  const createItinerary = async (vendorId, itineraryData) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      const newItinerary = {
        id: Date.now(),
        ...itineraryData,
        vendorId,
        rating: 0,
        reviewCount: 0
      }
      vendorItineraries.value.push(newItinerary)

      return { success: true, data: newItinerary }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 📡 API ENDPOINT: PUT /api/itineraries/:itineraryId
   * Supabase: UPDATE itineraries SET ... WHERE id = :itineraryId
   */
  const updateItinerary = async (itineraryId, itineraryData) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      const index = vendorItineraries.value.findIndex(i => i.id === itineraryId)
      if (index !== -1) {
        vendorItineraries.value[index] = {
          ...vendorItineraries.value[index],
          ...itineraryData
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

  /**
   * 📡 API ENDPOINT: DELETE /api/itineraries/:itineraryId
   * Supabase: DELETE FROM itineraries WHERE id = :itineraryId
   */
  const deleteItinerary = async (itineraryId) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      vendorItineraries.value = vendorItineraries.value.filter(i => i.id !== itineraryId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 📡 API ENDPOINT: POST /api/vendors/:vendorId/posts
   * Supabase: INSERT INTO vendor_posts (...)
   */
  const createPost = async (vendorId, postData) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      const newPost = {
        id: Date.now(),
        ...postData,
        vendorId,
        likes: 0,
        collects: 0,
        comments: 0,
        time: new Date().toISOString().split('T')[0]
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

  /**
   * 📡 API ENDPOINT: PUT /api/posts/:postId
   * Supabase: UPDATE vendor_posts SET ... WHERE id = :postId
   */
  const updatePost = async (postId, postData) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      const index = vendorPosts.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        vendorPosts.value[index] = {
          ...vendorPosts.value[index],
          ...postData
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

  /**
   * 📡 API ENDPOINT: DELETE /api/posts/:postId
   * Supabase: DELETE FROM vendor_posts WHERE id = :postId
   */
  const deletePost = async (postId) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      await new Promise(resolve => setTimeout(resolve, 500))
      vendorPosts.value = vendorPosts.value.filter(p => p.id !== postId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 📡 API ENDPOINT: POST /api/upload
   * Firebase Storage: uploadBytes(ref(storage, path), file)
   * 用途: 上傳圖片並回傳 URL
   */
  const uploadVendorImage = async (file, type) => {
    loading.value = true
    try {
      // 🔴 MOCK DATA
      // 暫時忽略未使用的參數
      console.log('Uploading file:', file?.name, 'type:', type)

      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模擬回傳 URL (使用假圖)
      const mockUrl = `https://picsum.photos/800/600?random=${Date.now()}`

      // 📡 未來實作:
      // const storageRef = ref(storage, `vendors/${currentVendor.value.id}/${type}/${file.name}`)
      // await uploadBytes(storageRef, file)
      // const downloadURL = await getDownloadURL(storageRef)
      // return downloadURL

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
    // 前台 Actions
    fetchVendorProfile,
    fetchVendorPosts,
    fetchVendorItineraries,
    fetchVendorReviews,
    // 廠商後台 CRUD Actions
    updateVendorProfile,
    createItinerary,
    updateItinerary,
    deleteItinerary,
    createPost,
    updatePost,
    deletePost,
    uploadVendorImage
  }
})
