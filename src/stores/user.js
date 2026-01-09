import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, db } from '@/firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { createOrUpdateUser } from '@/api/users'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref({
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
      // 他人對我的評價 (Received)
      {
        id: 1,
        author: '小美',
        target: 'Jovi',
        avatar: 'https://placehold.co/100x100/FFB6C1/ffffff?text=M', // Author's avatar
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
      // 我對他人的評價 (Given)
      {
        id: 11,
        author: 'Jovi',
        target: '小美',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovi', // My avatar
        targetAvatar: 'https://placehold.co/100x100/FFB6C1/ffffff?text=M', // Target's avatar
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
      }
    ],
    //假好友資料，後續可刪
    friends: [
      { id: 101, name: 'Alice', nickname: 'Ali', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
      { id: 102, name: 'Bob', nickname: 'Bobby', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
      { id: 103, name: 'Charlie', nickname: 'Char', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' },
      { id: 104, name: 'David', nickname: 'Dave', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
      { id: 105, name: 'Eve', nickname: 'Evie', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve' },
    ]
  })

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
  // Future: 允許使用者自定義分類的顏色或圖示
  const collectionCategories = ref([
    { id: 'default', name: '未分類項目', items: [] },
    { id: 'domestic', name: '國內旅遊', items: [] },
    { id: 'international', name: '國外旅遊', items: [] },
  ])

  // 模擬參加過的行程資料 (Participated Trips)
  // 這些資料未來應該從後端的 Orders 或 Tickets 表中撈取
  // Future: 新增參加狀態 (例如: 已付款、已完成、已取消)
  const participatedTrips = ref([
    {
      id: 201,
      title: '澎湖花火節三天兩夜',
      location: '澎湖, 台灣',
      date: '2023-06-20',
      type: 'participated', // 標記為參與
    },
    {
      id: 202,
      title: '京都賞楓攝影團',
      location: '京都, 日本',
      date: '2023-11-15',
      type: 'participated',
    }
  ])

  // 隱藏的足跡 (Hidden Stamps)
  // format: "type-location-date"
  const hiddenStamps = ref([])

  const hideStamp = (key) => {
    if (!hiddenStamps.value.includes(key)) {
       hiddenStamps.value.push(key)
    }
  }

  const restoreStamp = (key) => {
    const idx = hiddenStamps.value.indexOf(key)
    if (idx > -1) {
      hiddenStamps.value.splice(idx, 1)
    }
  }



  // ----------------------------------------------------------------
  // 護照資料聚合邏輯 (Passport Aggregation)
  // 將所有零散的足跡資料 (手動輸入、主揪、參加) 整合為單一列表
  // ----------------------------------------------------------------
  const passportEntries = computed(() => {
    const entries = []

    // Helper to generate key
    const getKey = (type, location, date) => `${type}-${location}-${date}`

    // 1. 處理手動輸入的國內足跡
    // Future: 增加經緯度資料以在地圖上顯示
    if (visitedPlaces.value.domestic) {
      visitedPlaces.value.domestic.forEach((place, index) => {
        const key = getKey('domestic', place.name, place.date)
        if (!hiddenStamps.value.includes(key)) {
            entries.push({
              type: 'domestic', // 類型：國內
              location: place.name,
              date: place.date, // 格式: YYYY.MM
              source: 'manual', // 來源：手動
              originalIndex: index, // 保存原始索引以便刪除
              icon: place.icon // Support custom icon
            })
        }
      })
    }

    // 2. 處理手動輸入的國外足跡
    if (visitedPlaces.value.international) {
      visitedPlaces.value.international.forEach((place, index) => {
        const key = getKey('international', place.name, place.date)
         if (!hiddenStamps.value.includes(key)) {
            entries.push({
              type: 'international', // 類型：國外
              location: place.name,
              date: place.date,
              source: 'manual',
              originalIndex: index,
              icon: place.icon
            })
         }
      })
    }

    // 3. 整合參加過的行程 (Participated)
    // Future: 只有狀態為 'completed' 的行程才加入護照
    participatedTrips.value.forEach((trip, index) => {
      const key = getKey('participated', trip.location.split(',')[0], trip.date.slice(0, 7).replace('-', '.'))
      if (!hiddenStamps.value.includes(key)) {
          entries.push({
            type: 'participated', // 類型：參加
            location: trip.location.split(',')[0], // 簡化地點顯示
            date: trip.date.slice(0, 7).replace('-', '.'), // 統一日期格式 YYYY.MM
            title: trip.title, // 額外保存標題供 tooltip 使用
            source: 'system', // 來源：系統
            originalIndex: index
          })
      }
    })

    // 4. 整合主揪過的行程 (Hosted)
    // 從 itineraryStore 獲取資料 (這裡假設我們已經有 myItineraries)
    // 由於 store 之間互相引用可能導致循環依賴，這裡先使用 userStore 內的簡單計數或假設資料
    // 若要嚴謹實作，應在組件層級合併，或確保 itineraryStore 已初始化
    // 這裡我們先用一個模擬的主揪資料做演示
    // Future: 接上真實的 ItineraryStore
    const mockHosted = [
      { title: '東京櫻花團', location: '東京', date: '2024-03' },
    ]
    mockHosted.forEach((trip, index) => {
      const key = getKey('hosted', trip.location, trip.date.replace('-', '.'))
       if (!hiddenStamps.value.includes(key)) {
          entries.push({
            type: 'hosted', // 類型：主揪
            location: trip.location,
            date: trip.date.replace('-', '.'),
            title: trip.title,
            source: 'system',
            originalIndex: index
          })
      }
    })

    // 依日期排序 (新的在後，或在前，護照通常是按時間蓋)
    // 這裡我們讓新的在前面 (Desc) 方便查看
    return entries.sort((a, b) => {
      return b.date.localeCompare(a.date)
    })
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
      if (!exists) {
        category.items.push(targetItem)
      }
    }
    isCollectionModalOpen.value = false
    pendingCollectionItem.value = null
  }

  const createCategoryAndSave = (name) => {
    const newId = 'cat_' + Date.now()
    collectionCategories.value.push({
      id: newId,
      name: name,
      items: [],
    })
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

  // Profile Management
  const updateProfile = (newData) => {
    currentUser.value = { ...currentUser.value, ...newData }
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
    if (index === -1) {
      wishlist.value.push(id)
    } else {
      wishlist.value.splice(index, 1)
    }
  }

  const isWishlisted = (id) => wishlist.value.includes(id)

  // Auth (Mock)
  const isLoggedIn = ref(false)
  const authReady = ref(false)
  const firebaseUser = ref(null) // Firebase Auth 用戶物件

  // 從 Firestore 設置用戶資料
  const setUserProfile = (profileData) => {
    if (profileData) {
      const createdAt = profileData.createdAt?.toDate ? profileData.createdAt.toDate() : (profileData.createdAt ? new Date(profileData.createdAt) : new Date())
      currentUser.value = {
        id: profileData.uid,
        uid: profileData.uid,
        name: profileData.realName || profileData.nickname || '用戶',
        nickname: profileData.nickname || profileData.email?.split('@')[0] || '用戶',
        email: profileData.email,
        avatar: profileData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.uid}`,
        bgImage: currentUser.value.bgImage || 'https://picsum.photos/1200/400?random=1',
        bio: profileData.bio || currentUser.value.bio,
        joinDate: createdAt.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' }),
        location: currentUser.value.location,
        website: currentUser.value.website,
        spiritAnimal: profileData.spiritAnimal || currentUser.value.spiritAnimal,
        followers: currentUser.value.followers,
        following: currentUser.value.following,
        tripsHosted: currentUser.value.tripsHosted,
        tags: currentUser.value.tags,
        reviews: currentUser.value.reviews,
      }
    }
  }

  // 從 Firestore 載入用戶資料
  const loadUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserProfile({
          uid: uid,
          email: firebaseUser.value?.email || '',
          ...userData,
        })
      }
    } catch (error) {
      console.error('載入用戶資料失敗：', error)
    }
  }

  onAuthStateChanged(auth, async (user) => {
    firebaseUser.value = user
    isLoggedIn.value = user ? true : false

    if (user) {
      // 登入時載入用戶資料
      await loadUserProfile(user.uid)

      // 同步到 Neon users 表（確保聊天室/好友能用 nickname 顯示）
      try {
        const u = currentUser.value
        await createOrUpdateUser({
          uid: user.uid,
          email: user.email || u.email || '',
          nickname: u.nickname || null,
          real_name: u.name || null,
          avatar: u.avatar || null,
          bio: u.bio || null,
          spirit_animal: u.spiritAnimal || null,
        })
      } catch (e) {
        // 不阻塞登入流程，失敗只記錄
        console.warn('同步使用者到 Neon 失敗：', e?.message || e)
      }
    } else {
      // 登出時重置用戶資料
      currentUser.value = {
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
        reviews: currentUser.value.reviews || [],
      }
    }

    if (!authReady.value) {
      authReady.value = true
    }
  })

  const login = () => { isLoggedIn.value = true }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Firebase signOut 失敗：', error)
    } finally {
      isLoggedIn.value = false
      console.log('Logged out')
    }
  }

  const userProfile = computed(() => currentUser.value)

  return {
    currentUser,
    userProfile,
    firebaseUser,
    setUserProfile,
    loadUserProfile,
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
    logout,
    participatedTrips, // Export for debug/usage
    passportEntries, // Export aggregated passport data
    hiddenStamps,
    hideStamp,
    restoreStamp
  }
})
