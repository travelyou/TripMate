import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, db } from '@/firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

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
      {
        id: 1,
        author: '小美',
        avatar: 'https://placehold.co/100x100/FFB6C1/ffffff?text=M',
        rating: 5,
        content: '主揪超讚！行程安排得很順暢，人也很隨和～',
        date: '2024/11/20',
      },
      {
        id: 2,
        author: 'Tom',
        avatar: 'https://placehold.co/100x100/87CEEB/ffffff?text=T',
        rating: 4,
        content: '很棒的旅伴，下次有機會再一起出遊！',
        date: '2024/10/15',
      },
    ],
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

  const collectionCategories = ref([
    { id: 'default', name: '未分類項目', items: [] },
    { id: 'domestic', name: '國內旅遊', items: [] },
    { id: 'international', name: '國外旅遊', items: [] },
  ])

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

  const updateProfile = (newData) => {
    currentUser.value = { ...currentUser.value, ...newData }
  }

  const addVisitedPlace = (place, type = 'domestic') => {
    if (type === 'domestic') {
      visitedPlaces.value.domestic.push(place)
    } else {
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

  const login = () => {}

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('登出失敗：', error)
    }
  }

  const userProfile = computed(() => currentUser.value)

  return {
    currentUser,
    userProfile,
    firebaseUser,
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
    setUserProfile,
    loadUserProfile,
  }
})
