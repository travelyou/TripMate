import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { API_BASE_URL } from '@/api/config'
import { getUserProfile } from '@/api/users'
import { auth, db } from '@/firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

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
      const [discussionResponse, travelerResponse] = await Promise.all([
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
      ])

      const normalizedDiscussion = (discussionResponse.data || []).map((item) => ({
        ...item,
        type: 'discussion',
      }))
      const normalizedTraveler = (travelerResponse.data || []).map((item) => ({
        ...item,
        type: 'traveler',
      }))

      favorites.value = [...normalizedDiscussion, ...normalizedTraveler]
    } catch (error) {
      console.error('獲取收藏失敗:', error)
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
      await axios.post(`${API_BASE_URL}/likes`, {
        post_id: item.id,
        author_uid: targetUid,
        board: itemType === 'traveler' ? 'traveler' : 'discussion',
      })

      await fetchFavorites()
    } catch (error) {
      console.error('按讚 API 失敗，正在回滾...', error)
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
    // 確保 name 和 nickname 同步更新
    if (newData.nickname !== undefined) {
      currentUser.value = {
        ...currentUser.value,
        ...newData,
        name: newData.nickname, // 同步更新 name
        nickname: newData.nickname
      }
    } else if (newData.name !== undefined) {
      currentUser.value = {
        ...currentUser.value,
        ...newData,
        nickname: newData.name, // 同步更新 nickname
        name: newData.name
      }
    } else {
      currentUser.value = { ...currentUser.value, ...newData }
    }

    // 如果更新了頭貼，保存到 localStorage
    if (newData.avatar !== undefined && currentUser.value.uid) {
      try {
        if (newData.avatar && typeof newData.avatar === 'string' && newData.avatar.trim() !== '') {
          localStorage.setItem(`user_avatar_${currentUser.value.uid}`, newData.avatar)
        }
      } catch (e) {
        console.warn('保存頭貼到 localStorage 失敗:', e)
      }
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
      // 正確處理頭貼：只有在 avatar 為 null、undefined 或空字串時才使用默認值
      let avatarValue = profileData.avatar

      // 如果傳入的 avatar 有效，使用它並保存到 localStorage
      if (avatarValue && typeof avatarValue === 'string' && avatarValue.trim() !== '') {
        // 保存到 localStorage 作為備份
        if (profileData.uid) {
          try {
            localStorage.setItem(`user_avatar_${profileData.uid}`, avatarValue)
          } catch (e) {
            console.warn('保存頭貼到 localStorage 失敗:', e)
          }
        }
      } else {
        // 如果沒有傳入有效的 avatar，嘗試從 localStorage 恢復
        if (profileData.uid) {
          try {
            const savedAvatar = localStorage.getItem(`user_avatar_${profileData.uid}`)
            // 檢查用戶是否曾經換過頭貼（localStorage 中是否有非 dicebear 的頭貼）
            const hasCustomAvatar = savedAvatar && savedAvatar.trim() !== '' && !savedAvatar.includes('dicebear.com')

            if (savedAvatar && savedAvatar.trim() !== '') {
              // 如果有保存的頭貼，使用它（無論是否為 dicebear）
              avatarValue = savedAvatar
            } else if (currentUser.value.avatar && currentUser.value.avatar.trim() !== '' && !currentUser.value.avatar.includes('dicebear.com')) {
              // 如果當前用戶已有自定義頭貼，保留它並保存到 localStorage
              avatarValue = currentUser.value.avatar
              try {
                localStorage.setItem(`user_avatar_${profileData.uid}`, avatarValue)
              } catch (e) {
                console.warn('保存頭貼到 localStorage 失敗:', e)
              }
            } else if (hasCustomAvatar) {
              // 如果曾經有自定義頭貼但現在沒有，保持空值（不顯示默認頭貼）
              avatarValue = savedAvatar || ''
            } else {
              // 只有從未換過頭貼時，才使用默認頭貼
              avatarValue = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.uid}`
            }
          } catch (e) {
            console.warn('從 localStorage 載入頭貼失敗:', e)
            // 如果載入失敗，嘗試使用當前用戶的頭貼，如果沒有則使用默認值
            avatarValue = currentUser.value.avatar || (profileData.uid ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.uid}` : '')
          }
        } else {
          avatarValue = currentUser.value.avatar || ''
        }
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
        spiritAnimal: profileData.spiritAnimal !== undefined ? profileData.spiritAnimal : currentUser.value.spiritAnimal,
        vendorId: profileData.vendorId || null,
        tags: profileData.tags !== undefined ? (Array.isArray(profileData.tags) ? profileData.tags : []) : (currentUser.value.tags || []),
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
          // 檢查是否需要從 localStorage 恢復頭貼
          let avatar = neonUserData.avatar && typeof neonUserData.avatar === 'string' && neonUserData.avatar.trim() !== ''
            ? neonUserData.avatar
            : undefined

          let avatarFromLocalStorage = false
          if (!avatar) {
            try {
              const savedAvatar = localStorage.getItem(`user_avatar_${uid}`)
              if (savedAvatar && savedAvatar.trim() !== '') {
                // 如果 localStorage 中有頭貼（無論是否為 dicebear），都使用它
                // 這表示用戶曾經設置過頭貼，不應該再使用默認頭貼
                avatar = savedAvatar
                // 只有非 dicebear 的頭貼才需要同步到資料庫
                if (!savedAvatar.includes('dicebear.com')) {
                  avatarFromLocalStorage = true
                }
              }
              // 如果 localStorage 中沒有頭貼，avatar 保持 undefined，讓 setUserProfile 決定是否使用默認頭貼
            } catch (e) {
              console.warn('從 localStorage 恢復頭貼失敗:', e)
            }
          }

          setUserProfile({
            uid: uid,
            email: firebaseUser.value?.email || neonUserData.email || '',
            nickname: neonUserData.nickname || '',
            avatar: avatar,
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

          // 如果頭貼是從 localStorage 恢復的，同步到資料庫
          if (avatarFromLocalStorage && avatar && avatar.trim() !== '') {
            try {
              const { createOrUpdateUser } = await import('@/api/users')
              await createOrUpdateUser({
                uid: uid,
                avatar: avatar
              })
              console.log('已將 localStorage 中的頭貼同步到資料庫')
            } catch (e) {
              console.warn('同步頭貼到資料庫失敗:', e)
            }
          }
          return
        }
      } catch (neonError) {
        const is404Error = neonError.message?.includes('404') ||
                          neonError.message?.includes('Not Found') ||
                          neonError.response?.status === 404
        if (!is404Error) {
          console.error('[User Store] 從 Neon 載入失敗，嘗試從 Firestore 載入：', neonError)
        }
      }

      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        // 檢查是否需要從 localStorage 恢復頭貼
        let avatar = userData.avatar && typeof userData.avatar === 'string' && userData.avatar.trim() !== ''
          ? userData.avatar
          : undefined

        let avatarFromLocalStorage = false
        if (!avatar) {
          try {
            const savedAvatar = localStorage.getItem(`user_avatar_${uid}`)
            if (savedAvatar && savedAvatar.trim() !== '') {
              // 如果 localStorage 中有頭貼（無論是否為 dicebear），都使用它
              avatar = savedAvatar
              // 只有非 dicebear 的頭貼才需要同步到資料庫
              if (!savedAvatar.includes('dicebear.com')) {
                avatarFromLocalStorage = true
              }
            }
            // 如果 localStorage 中沒有頭貼，avatar 保持 undefined
          } catch (e) {
            console.warn('從 localStorage 恢復頭貼失敗:', e)
          }
        }

        setUserProfile({
          uid: uid,
          email: firebaseUser.value?.email || '',
          ...userData,
          // 確保 avatar 處理一致：如果是空字串則傳遞 undefined，讓 setUserProfile 處理
          avatar: userData.avatar && typeof userData.avatar === 'string' && userData.avatar.trim() !== ''
            ? userData.avatar
            : undefined,
          role: userData.role || 'user',
          vendorId: userData.vendorId || null,
        })

        // 如果頭貼是從 localStorage 恢復的，同步到資料庫
        if (avatarFromLocalStorage && avatar && avatar.trim() !== '') {
          try {
            const { createOrUpdateUser } = await import('@/api/users')
            await createOrUpdateUser({
              uid: uid,
              avatar: avatar
            })
            console.log('已將 localStorage 中的頭貼同步到資料庫')
          } catch (e) {
            console.warn('同步頭貼到資料庫失敗:', e)
          }
        }
      } else {
        // 如果 Firestore 中沒有用戶資料，嘗試從 localStorage 恢復頭貼
        try {
          const savedAvatar = localStorage.getItem(`user_avatar_${uid}`)
          if (savedAvatar && savedAvatar.trim() !== '' && !savedAvatar.includes('dicebear.com')) {
            setUserProfile({
              uid: uid,
              email: firebaseUser.value?.email || '',
              nickname: firebaseUser.value?.email?.split('@')[0] || '用戶',
              avatar: savedAvatar,
              role: 'user',
            })

            // 同步到資料庫
            try {
              const { createOrUpdateUser } = await import('@/api/users')
              await createOrUpdateUser({
                uid: uid,
                avatar: savedAvatar
              })
              console.log('已將 localStorage 中的頭貼同步到資料庫')
            } catch (e) {
              console.warn('同步頭貼到資料庫失敗:', e)
            }
          }
        } catch (e) {
          console.warn('從 localStorage 恢復頭貼失敗:', e)
        }
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
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await loadUserProfile(user.uid)

        // 確保頭貼已保存到 localStorage（如果有的話）
        if (currentUser.value.avatar && currentUser.value.avatar.trim() !== '') {
          try {
            localStorage.setItem(`user_avatar_${user.uid}`, currentUser.value.avatar)
          } catch (e) {
            console.warn('保存頭貼到 localStorage 失敗:', e)
          }
        }

        await fetchFavorites()
      } catch (error) {
        const is404Error = error.message?.includes('404') ||
                          error.message?.includes('Not Found')
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
