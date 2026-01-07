import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase/config'

export const useUserStore = defineStore('user', () => {
  // --------------------------------------------------
  // State: 使用者狀態
  // --------------------------------------------------
  const isLoggedIn = ref(false)
  const authReady = ref(false)
  const supabaseUser = ref(null)

  // 預設 Mock 資料 (當未登入時顯示)
  const defaultUser = {
    id: 1,
    name: 'Jovi',
    nickname: 'Jovi',
    email: 'jovi@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovi',
    bgImage: 'https://picsum.photos/1200/400?random=1',
    bio: '熱愛攝影與獨自旅行的背包客。喜歡在巷弄間尋找驚喜。目前正在計畫環遊世界中！',
    joinDate: '2023年5月',
    location: '台北, 台灣',
    website: 'https://jovitravels.com',
    spiritAnimal: '🦉 觀察家',
    followers: 1250,
    following: 340,
    tripsHosted: 5,
    tags: ['攝影', '背包客', '美食', '自由行'],
    reviews: [
      {
        id: 1,
        author: '小美',
        target: 'Jovi',
        avatar: 'https://placehold.co/100x100/FFB6C1/ffffff?text=M',
        sentiment: 'super_like',
        tripTitle: '週末宜蘭溫泉放鬆之旅',
        tripId: 101,
        content: '主揪超讚！行程安排得很順暢，人也很隨和～',
        date: '2024/11/20',
      },
      {
        id: 2,
        author: 'Tom',
        target: 'Jovi',
        avatar: 'https://placehold.co/100x100/87CEEB/ffffff?text=T',
        sentiment: 'like',
        tripTitle: '京都賞楓攝影團',
        tripId: 102,
        content: '很棒的旅伴，下次有機會再一起出遊！',
        date: '2024/10/15',
      },
      {
        id: 11,
        author: 'Jovi',
        target: '小美',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovi',
        targetAvatar: 'https://placehold.co/100x100/FFB6C1/ffffff?text=M',
        sentiment: 'super_like',
        tripTitle: '週末宜蘭溫泉放鬆之旅',
        tripId: 101,
        content: '小美是很棒的旅伴，很準時也很會照顧人！',
        date: '2024/11/21',
      },
      {
        id: 12,
        author: 'Jovi',
        target: 'David',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovi',
        targetAvatar: 'https://placehold.co/100x100/98FB98/ffffff?text=D',
        sentiment: 'like',
        tripTitle: '台東衝浪新手營',
        tripId: 103,
        content: '雖然是新手但學習態度很好，一起衝浪很開心。',
        date: '2023/05/12',
      },
    ],
    friends: [
      {
        id: 101,
        name: 'Alice',
        nickname: 'Ali',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      },
      {
        id: 102,
        name: 'Bob',
        nickname: 'Bobby',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      },
      {
        id: 103,
        name: 'Charlie',
        nickname: 'Char',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      },
      {
        id: 104,
        name: 'David',
        nickname: 'Dave',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
      },
      {
        id: 105,
        name: 'Eve',
        nickname: 'Evie',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve',
      },
    ],
  }

  const currentUser = ref({ ...defaultUser })

  // --------------------------------------------------
  // 核心功能：Supabase Auth & Database
  // --------------------------------------------------

  // 1. 註冊 (Sign Up)
  const signup = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    if (error) throw error
    return data
  }

  // 2. 登入 (Login)
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 3. 登出 (Logout)
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('登出失敗:', error)

    // 登出後重置為 Mock 資料
    isLoggedIn.value = false
    currentUser.value = { ...defaultUser }
  }

  // 4. 從 Supabase 資料庫 (Table: users) 載入用戶詳細資料
  const loadUserProfile = async (uid) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('載入用戶資料失敗：', error)
        return
      }

      if (userData) {
        const createdAt = new Date(userData.created_at || Date.now())

        currentUser.value = {
          ...currentUser.value,
          id: userData.id,
          uid: userData.id,
          name: userData.real_name || userData.nickname || '用戶',
          nickname: userData.nickname || supabaseUser.value?.email?.split('@')[0] || '用戶',
          email: supabaseUser.value?.email,
          avatar:
            userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}`,
          bio: userData.bio || currentUser.value.bio,
          bgImage: userData.bg_image || currentUser.value.bgImage,
          location: userData.location || currentUser.value.location,
          website: userData.website || currentUser.value.website,
          joinDate: createdAt.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' }),

          tags: userData.tags || currentUser.value.tags,
        }
      }
    } catch (error) {
      console.error('載入過程發生錯誤：', error)
    }
  }

  // 5. 監聽登入狀態變化 (取代 onAuthStateChanged)
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Supabase Auth Event:', event)

    if (session?.user) {
      supabaseUser.value = session.user
      isLoggedIn.value = true
      // 登入成功，去撈資料庫
      await loadUserProfile(session.user.id)
    } else {
      supabaseUser.value = null
      isLoggedIn.value = false
      // 登出狀態，維持 Mock 資料
      currentUser.value = { ...defaultUser }
    }

    authReady.value = true
  })

  // --------------------------------------------------
  // Passport, Collections, Mock Logic
  // --------------------------------------------------

  // 拜訪過的地點
  const visitedPlaces = ref({
    domestic: [
      { name: '台北', date: '2024.01' },
      { name: '台中', date: '2023.12' },
      { name: '台南', date: '2023.10' },
      { name: '花蓮', date: '2023.08' },
      { name: '蘭嶼', date: '2023.07' },
    ],
    international: [
      { name: '東京', date: '2023.11' },
      { name: '大阪', date: '2023.09' },
      { name: '首爾', date: '2023.05' },
      { name: '曼谷', date: '2023.02' },
      { name: '巴黎', date: '2022.12' },
    ],
  })

  const wishlist = ref(['冰島極光', '紐西蘭健行', '瑞士滑雪', '土耳其熱氣球'])
  const likedPosts = ref([])
  const favorites = ref([])

  const toggleFavorite = (item) => {
    const itemType = item.type || 'discussion'
    const index = favorites.value.findIndex((i) => i.id === item.id && i.type === itemType)
    if (index > -1) {
      favorites.value.splice(index, 1)
    } else {
      favorites.value.push({ ...item, type: itemType })
    }
  }
  const isFavorite = (item) => {
    const itemType = item.type || 'discussion'
    return favorites.value.some((i) => i.id === item.id && i.type === itemType)
  }

  // 收藏的分類列表
  const collectionCategories = ref([
    { id: 'default', name: '未分類項目', items: [] },
    { id: 'domestic', name: '國內旅遊', items: [] },
    { id: 'international', name: '國外旅遊', items: [] },
  ])

  // 參加過的行程
  const participatedTrips = ref([
    {
      id: 201,
      title: '澎湖花火節三天兩夜',
      location: '澎湖, 台灣',
      date: '2023-06-20',
      type: 'participated',
    },
    {
      id: 202,
      title: '京都賞楓攝影團',
      location: '京都, 日本',
      date: '2023-11-15',
      type: 'participated',
    },
  ])

  // 隱藏的足跡
  const hiddenStamps = ref([])
  const hideStamp = (key) => {
    if (!hiddenStamps.value.includes(key)) hiddenStamps.value.push(key)
  }
  const restoreStamp = (key) => {
    const idx = hiddenStamps.value.indexOf(key)
    if (idx > -1) hiddenStamps.value.splice(idx, 1)
  }

  // 護照資料聚合邏輯
  const passportEntries = computed(() => {
    const entries = []
    const getKey = (type, location, date) => `${type}-${location}-${date}`

    if (visitedPlaces.value.domestic) {
      visitedPlaces.value.domestic.forEach((place, index) => {
        const key = getKey('domestic', place.name, place.date)
        if (!hiddenStamps.value.includes(key)) {
          entries.push({
            type: 'domestic',
            location: place.name,
            date: place.date,
            source: 'manual',
            originalIndex: index,
            icon: place.icon,
          })
        }
      })
    }

    if (visitedPlaces.value.international) {
      visitedPlaces.value.international.forEach((place, index) => {
        const key = getKey('international', place.name, place.date)
        if (!hiddenStamps.value.includes(key)) {
          entries.push({
            type: 'international',
            location: place.name,
            date: place.date,
            source: 'manual',
            originalIndex: index,
            icon: place.icon,
          })
        }
      })
    }

    participatedTrips.value.forEach((trip, index) => {
      const key = getKey(
        'participated',
        trip.location.split(',')[0],
        trip.date.slice(0, 7).replace('-', '.'),
      )
      if (!hiddenStamps.value.includes(key)) {
        entries.push({
          type: 'participated',
          location: trip.location.split(',')[0],
          date: trip.date.slice(0, 7).replace('-', '.'),
          title: trip.title,
          source: 'system',
          originalIndex: index,
        })
      }
    })

    const mockHosted = [{ title: '東京櫻花團', location: '東京', date: '2024-03' }]
    mockHosted.forEach((trip, index) => {
      const key = getKey('hosted', trip.location, trip.date.replace('-', '.'))
      if (!hiddenStamps.value.includes(key)) {
        entries.push({
          type: 'hosted',
          location: trip.location,
          date: trip.date.replace('-', '.'),
          title: trip.title,
          source: 'system',
          originalIndex: index,
        })
      }
    })

    return entries.sort((a, b) => b.date.localeCompare(a.date))
  })

  const isCollectionModalOpen = ref(false)
  const pendingCollectionItem = ref(null)

  const openCollectionModal = (item) => {
    pendingCollectionItem.value = { ...item, type: item.type || 'discussion' }
    isCollectionModalOpen.value = true
  }

  const saveToCategory = (categoryId, item = null) => {
    const targetItem = item || pendingCollectionItem.value
    if (!targetItem) return
    const category = collectionCategories.value.find((c) => c.id === categoryId)
    if (category) {
      const exists = category.items.some(
        (i) => i.id === targetItem.id && i.type === targetItem.type,
      )
      if (!exists) category.items.push(targetItem)
    }
    isCollectionModalOpen.value = false
    pendingCollectionItem.value = null
  }

  const createCategoryAndSave = (name) => {
    const newId = 'cat_' + Date.now()
    collectionCategories.value.push({ id: newId, name: name, items: [] })
    saveToCategory(newId)
  }

  const removeFromCollection = (item, categoryId = null) => {
    const itemType = item.type || 'discussion'
    if (categoryId) {
      const category = collectionCategories.value.find((c) => c.id === categoryId)
      if (category) {
        const index = category.items.findIndex((i) => i.id === item.id && i.type === itemType)
        if (index > -1) category.items.splice(index, 1)
      }
    } else {
      collectionCategories.value.forEach((cat) => {
        const index = cat.items.findIndex((i) => i.id === item.id && i.type === itemType)
        if (index > -1) cat.items.splice(index, 1)
      })
    }
  }

  const isCollected = (item) => {
    const itemType = item.type || 'discussion'
    return collectionCategories.value.some((cat) =>
      cat.items.some((i) => i.id === item.id && i.type === itemType),
    )
  }

  const collections = computed(() => {
    const all = []
    collectionCategories.value.forEach((cat) => all.push(...cat.items))
    return all
  })

  const updateProfile = (newData) => {
    currentUser.value = { ...currentUser.value, ...newData }
    // TODO: 這裡未來要加上 Supabase update 語法
    // supabase.from('users').update(newData).eq('id', currentUser.value.id)
  }

  const addVisitedPlace = (place, type = 'domestic') => {
    if (type === 'domestic') {
      if (!visitedPlaces.value.domestic) visitedPlaces.value.domestic = []
      visitedPlaces.value.domestic.push(place)
    } else {
      if (!visitedPlaces.value.international) visitedPlaces.value.international = []
      visitedPlaces.value.international.push(place)
    }
  }

  const toggleWishlist = (id) => {
    const index = wishlist.value.indexOf(id)
    if (index === -1) wishlist.value.push(id)
    else wishlist.value.splice(index, 1)
  }

  const isWishlisted = (id) => wishlist.value.includes(id)

  const userProfile = computed(() => currentUser.value)

  return {
    currentUser,
    userProfile,
    supabaseUser,
    visitedPlaces,
    wishlist,
    likedPosts,
    favorites,
    toggleFavorite,
    isFavorite,
    collectionCategories,
    collections,
    isCollectionModalOpen,
    openCollectionModal,
    saveToCategory,
    createCategoryAndSave,
    removeFromCollection,
    isCollected,
    updateProfile,
    addVisitedPlace,
    toggleWishlist,
    isWishlisted,
    authReady,
    isLoggedIn,
    login,
    signup,
    logout,
    participatedTrips,
    passportEntries,
    hiddenStamps,
    hideStamp,
    restoreStamp,
  }
})
