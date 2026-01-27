import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'
import { getUserProfile } from '@/api/users'
import { auth, db } from '@/firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import {
  saveToCollection as apiSaveToCollection,
  removeFromCollection as apiRemoveFromCollection,
  getUserCollections,
} from '@/api/collection'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref({
    id: null,
    uid: null,
    name: '',
    nickname: '',
    email: '',
    avatar: '',
    bgImage: '',
    bio: '',
    joinDate: '',
    location: '',
    website: '',
    spiritAnimal: '',
    role: 'user',
    vendorId: null,
    followers: 0,
    following: 0,
    tripsHosted: 0,
    tags: [],
    reviews: [],
    friends: [],
    card_bio: '',
    card_tags: [],
    card_photo: '',
    gallery: [],
    is_matching_enabled: true,
  })

  const visitedPlaces = ref({
    domestic: [],
    international: [],
  })

  const wishlist = ref([])
  const likedPosts = ref([])

  const favorites = ref([])

  const fetchFavorites = async () => {
    const targetUid = currentUser.value.uid || currentUser.value.id
    if (!targetUid) return

    try {
      const [discussionResponse, travelerResponse, itineraryResponse] = await Promise.all([
        axios
          .get(`${API_BASE_URL}/likes/user/${targetUid}`, {
            params: { board: 'discussion' },
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${API_BASE_URL}/likes/user/${targetUid}`, {
            params: { board: 'traveler' },
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${API_BASE_URL}/likes/user/${targetUid}`, {
            params: { board: 'itinerary' },
          })
          .catch(() => ({ data: [] })),
      ])

      const normalizedDiscussion = (discussionResponse.data || []).map((item) => ({
        ...item,
        type: 'discussion',
      }))
      const normalizedTraveler = (travelerResponse.data || []).map((item) => ({
        ...item,
        type: 'traveler',
      }))
      const normalizedItinerary = (itineraryResponse.data || []).map((item) => ({
        ...item,
        type: 'itinerary',
      }))

      favorites.value = [...normalizedDiscussion, ...normalizedTraveler, ...normalizedItinerary]
    } catch {
      // 獲取收藏列表失敗，使用空陣列
    }
  }

  const toggleFavorite = async (item) => {
    const itemType = item.type || 'discussion'
    const index = favorites.value.findIndex((i) => i.id === item.id && i.type === itemType)

    let action = ''

    if (index > -1) {
      favorites.value.splice(index, 1)
      if (item.likes !== undefined) item.likes--
      action = 'remove'
    } else {
      favorites.value.push({ ...item, type: itemType })
      if (item.likes !== undefined) item.likes++
      action = 'add'
    }

    try {
      const targetUid = currentUser.value.uid || currentUser.value.id
      let board = 'discussion'
      if (itemType === 'traveler') {
        board = 'traveler'
      } else if (itemType === 'itinerary') {
        board = 'itinerary'
      }
      await axios.post(`${API_BASE_URL}/likes`, {
        post_id: item.id,
        author_uid: targetUid,
        board: board,
      })

      await fetchFavorites()
    } catch {
      if (action === 'remove') {
        favorites.value.push({ ...item, type: itemType })
        if (item.likes !== undefined) item.likes++
      } else {
        const rollbackIndex = favorites.value.findIndex(
          (i) => i.id === item.id && i.type === itemType,
        )
        if (rollbackIndex > -1) favorites.value.splice(rollbackIndex, 1)
        if (item.likes !== undefined) item.likes--
      }
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

  const collectionCache = ref(new Map())

  const participatedTrips = ref([])

  const hiddenStamps = ref([])

  const hideStamp = (key) => {
    if (!hiddenStamps.value.includes(key)) hiddenStamps.value.push(key)
  }

  const restoreStamp = (key) => {
    const idx = hiddenStamps.value.indexOf(key)
    if (idx > -1) hiddenStamps.value.splice(idx, 1)
  }

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

    return entries.sort((a, b) => b.date.localeCompare(a.date))
  })

  const isCollectionModalOpen = ref(false)
  const pendingCollectionItem = ref(null)

  const openCollectionModal = (item) => {
    pendingCollectionItem.value = { ...item, type: item.type || 'discussion' }
    isCollectionModalOpen.value = true
  }

  const fetchCollections = async (userUid) => {
    if (!userUid) return

    try {
      const collections = await getUserCollections(userUid)
      collectionCache.value.clear()

      collectionCategories.value.forEach((cat) => {
        cat.items = []
      })

      collections.forEach((save) => {
        const categoryId = save.category_id || 'default'
        const category = collectionCategories.value.find((c) => c.id === categoryId)
        if (category) {
          const cacheKey = `${save.post_type}:${save.post_id}`
          collectionCache.value.set(cacheKey, {
            id: save.post_id,
            type: save.post_type,
            category_id: save.category_id,
          })

          const exists = category.items.some(
            (i) => i.id === save.post_id && i.type === save.post_type,
          )
          if (!exists) {
            category.items.push({
              id: save.post_id,
              type: save.post_type,
              category_id: save.category_id,
            })
          }
        }
      })
    } catch {
      // 獲取收藏分類失敗
    }
  }

  const saveToCategory = async (categoryId, item = null) => {
    const targetItem = item || pendingCollectionItem.value
    if (!targetItem || !currentUser.value.uid) return

    try {
      await apiSaveToCollection(
        currentUser.value.uid,
        targetItem.id,
        targetItem.type || 'discussion',
        categoryId === 'default' ? null : categoryId,
      )

      const category = collectionCategories.value.find((c) => c.id === categoryId)
      if (category) {
        const exists = category.items.some(
          (i) => i.id === targetItem.id && i.type === targetItem.type,
        )
        if (!exists) {
          category.items.push({
            id: targetItem.id,
            type: targetItem.type || 'discussion',
            category_id: categoryId === 'default' ? null : categoryId,
          })
        }
      }

      const cacheKey = `${targetItem.type || 'discussion'}:${targetItem.id}`
      collectionCache.value.set(cacheKey, {
        id: targetItem.id,
        type: targetItem.type || 'discussion',
        category_id: categoryId === 'default' ? null : categoryId,
      })

      isCollectionModalOpen.value = false
      pendingCollectionItem.value = null
    } catch {
      alert('收藏失敗，請稍後再試')
    }
  }

  const createCategoryAndSave = (name) => {
    const newId = 'cat_' + Date.now()
    collectionCategories.value.push({ id: newId, name: name, items: [] })
    saveToCategory(newId)
  }

  const removeFromCollection = async (item, categoryId = null) => {
    if (!currentUser.value.uid) return

    const itemType = item.type || 'discussion'

    try {
      await apiRemoveFromCollection(currentUser.value.uid, item.id, itemType)

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

      const cacheKey = `${itemType}:${item.id}`
      collectionCache.value.delete(cacheKey)
    } catch {
      alert('取消收藏失敗，請稍後再試')
    }
  }

  const isCollected = (item) => {
    const itemType = item.type || 'discussion'
    const cacheKey = `${itemType}:${item.id}`
    if (collectionCache.value.has(cacheKey)) {
      return true
    }
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
    if (newData.nickname !== undefined) {
      currentUser.value = {
        ...currentUser.value,
        ...newData,
        name: newData.nickname,
        nickname: newData.nickname,
      }
    } else if (newData.name !== undefined) {
      currentUser.value = {
        ...currentUser.value,
        ...newData,
        nickname: newData.name,
        name: newData.name,
      }
    } else {
      currentUser.value = { ...currentUser.value, ...newData }
    }

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

  const isLoggedIn = ref(false)
  const authReady = ref(false)
  const firebaseUser = ref(null)

  const setUserProfile = (profileData) => {
    if (profileData) {
      // 統一使用 public.users.avatar（來自資料庫）
      // 如果傳入了 avatar，總是使用傳入的值（來自資料庫）
      let avatarValue = profileData.avatar

      // 如果資料庫沒有 avatar，使用預設頭像
      if (!avatarValue || typeof avatarValue !== 'string' || avatarValue.trim() === '') {
        if (profileData.uid) {
          avatarValue = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.uid}`
        } else {
          // 只有在沒有 uid 時才保留舊的頭像
          avatarValue = currentUser.value.avatar || ''
        }
      } else {
        // 有傳入 avatar 值，使用傳入的值（來自資料庫）
        avatarValue = avatarValue.trim()
      }

      currentUser.value = {
        ...currentUser.value,
        id: profileData.uid,
        uid: profileData.uid,
        role: profileData.role || 'user',
        name: profileData.realName || profileData.nickname || '用戶',
        nickname: profileData.nickname || profileData.email?.split('@')[0] || '用戶',
        email: profileData.email,
        avatar: avatarValue,
        bio: profileData.bio !== undefined ? profileData.bio : currentUser.value.bio,
        location: profileData.location || '台灣',
        spiritAnimal:
          profileData.spiritAnimal !== undefined
            ? profileData.spiritAnimal
            : currentUser.value.spiritAnimal,
        vendorId: profileData.vendorId || null,
        tags:
          profileData.tags !== undefined
            ? Array.isArray(profileData.tags)
              ? profileData.tags
              : []
            : currentUser.value.tags || [],
        card_bio:
          profileData.card_bio !== undefined ? profileData.card_bio : currentUser.value.card_bio,
        card_tags:
          profileData.card_tags !== undefined
            ? Array.isArray(profileData.card_tags)
              ? profileData.card_tags
              : []
            : currentUser.value.card_tags || [],
        card_photo:
          profileData.card_photo !== undefined
            ? profileData.card_photo
            : currentUser.value.card_photo,
        gallery:
          profileData.gallery !== undefined
            ? Array.isArray(profileData.gallery)
              ? profileData.gallery
              : []
            : currentUser.value.gallery || [],
        is_matching_enabled:
          profileData.is_matching_enabled !== undefined
            ? profileData.is_matching_enabled
            : currentUser.value.is_matching_enabled,
      }
    }
  }

  const loadUserProfile = async (uid) => {
    if (!uid) {
      return
    }

    try {
      try {
        const neonUserData = await getUserProfile(uid)

        if (neonUserData) {
          // 統一使用 public.users.avatar（來自資料庫）
          // 總是使用資料庫返回的 avatar，即使為空也要使用（會由 setUserProfile 處理預設值）
          let avatar = neonUserData.avatar && typeof neonUserData.avatar === 'string'
            ? neonUserData.avatar.trim()
            : ''

          setUserProfile({
            uid: uid,
            email: firebaseUser.value?.email || neonUserData.email || '',
            nickname: neonUserData.nickname || '',
            avatar: avatar, // 明確傳入 avatar，即使是空字串也要傳入
            bio: neonUserData.bio || '',
            spiritAnimal: neonUserData.spirit_animal || '',
            role: neonUserData.role || 'user',
            vendorId: neonUserData.vendor_id || null,
            tags: neonUserData.tags,
            card_bio: neonUserData.card_bio,
            card_tags: neonUserData.card_tags,
            card_photo: neonUserData.card_photo,
            gallery: neonUserData.gallery,
            is_matching_enabled: neonUserData.is_matching_enabled,
          })
          return
        }
      } catch (neonError) {
        const is404Error =
          neonError.message?.includes('404') ||
          neonError.message?.includes('Not Found') ||
          neonError.response?.status === 404
        if (!is404Error) {
          // 非 404 錯誤已在外部 catch 處理
        }
      }

      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserProfile({
          uid: uid,
          email: firebaseUser.value?.email || '',
          ...userData,
          avatar:
            userData.avatar && typeof userData.avatar === 'string' && userData.avatar.trim() !== ''
              ? userData.avatar
              : undefined,
          role: userData.role || 'user',
          vendorId: userData.vendorId || null,
        })
      }
    } catch (error) {
      console.error('載入用戶資料失敗：', error)
    }
  }

  const userRole = computed(() => currentUser.value?.role || 'user')
  const isRegularUser = computed(() => userRole.value === 'user')

  const recentlyRegisteredUsers = new Set()

  const markAsRecentlyRegistered = (uid) => {
    recentlyRegisteredUsers.add(uid)
    setTimeout(() => {
      recentlyRegisteredUsers.delete(uid)
    }, 2000)
  }

  onAuthStateChanged(auth, async (user) => {
    firebaseUser.value = user
    isLoggedIn.value = user ? true : false

    if (user && user.uid) {
      try {
        if (recentlyRegisteredUsers.has(user.uid)) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        await loadUserProfile(user.uid)
        await fetchFavorites()
        await fetchCollections(user.uid)
      } catch (error) {
        const is404Error = error.message?.includes('404') || error.message?.includes('Not Found')
        if (!is404Error) {
          console.error('載入用戶資料失敗：', error)
        }
      }
    } else {
      currentUser.value = {
        id: null,
        uid: null,
        name: '',
        nickname: '',
        email: '',
        avatar: '',
        bgImage: '',
        bio: '',
        joinDate: '',
        location: '',
        website: '',
        spiritAnimal: '',
        role: 'user',
        vendorId: null,
        followers: 0,
        following: 0,
        tripsHosted: 0,
        tags: [],
        reviews: [],
        friends: [],
      }
      favorites.value = []
    }

    if (!authReady.value) {
      authReady.value = true
    }
  })

  const login = () => {
    isLoggedIn.value = true
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Firebase signOut 失敗：', error)
    } finally {
      isLoggedIn.value = false
    }
  }

  const userProfile = computed(() => currentUser.value)

  // ----------------------------------------------------------------
  // Computed Properties for Permissions
  // ----------------------------------------------------------------
  const isVendor = computed(() => currentUser.value.role === 'vendor')
  const isAdmin = computed(() => currentUser.value.role === 'admin')

  return {
    currentUser,
    userProfile,
    firebaseUser,
    setUserProfile,
    loadUserProfile,
    markAsRecentlyRegistered,
    userRole,
    isVendor,
    isAdmin,
    isRegularUser,
    visitedPlaces,
    wishlist,
    likedPosts,
    favorites,
    fetchFavorites,
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
    fetchCollections,
    updateProfile,
    addVisitedPlace,
    toggleWishlist,
    isWishlisted,
    authReady,
    isLoggedIn,
    login,
    logout,
    participatedTrips,
    passportEntries,
    hiddenStamps,
    hideStamp,
    restoreStamp,
  }
})
