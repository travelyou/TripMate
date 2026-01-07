// src/stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/supabase/config'

export const useUserStore = defineStore('user', () => {
  // --------------------------------------------------
  // 1. State: 使用者狀態與預設資料
  // --------------------------------------------------
  const isLoggedIn = ref(false)
  const authReady = ref(false)
  const supabaseUser = ref(null) // 存放 Supabase Auth 原始物件

  // 預設 Mock 資料 (未登入時，或資料庫讀取失敗時的預設值)
  // 這確保了 UI 永遠有東西可以渲染，不會因為 undefined 而白屏
  const defaultUser = {
    id: 'guest',
    uid: 'guest',
    name: 'Jovi',
    nickname: '訪客',
    email: 'guest@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovi',
    bgImage: 'https://picsum.photos/1200/400?random=1',
    bio: '尚未登入，請登入以體驗完整功能。',
    joinDate: '2024年',
    location: '台灣',
    website: '',
    spiritAnimal: '🥚 未知',
    followers: 0,
    following: 0,
    tripsHosted: 0,
    tags: [],
    reviews: [],
    friends: [],
  }

  const currentUser = ref({ ...defaultUser })

  // --------------------------------------------------
  // 2. 核心功能：Supabase Auth (登入/註冊/登出)
  // --------------------------------------------------

  // 註冊
  const signup = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 將暱稱等資料寫入 Auth Metadata，這樣就算沒建 Table 也能讀取
        data: metadata,
      },
    })
    if (error) throw error
    return data
  }

  // 登入
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // 登出
  const logout = async () => {
    await supabase.auth.signOut()
    isLoggedIn.value = false
    supabaseUser.value = null
    currentUser.value = { ...defaultUser }
    // 強制重整頁面，清除所有殘留狀態 (最保險的做法)
    window.location.reload()
  }

  // 讀取使用者資料 (防崩潰版)
  const loadUserProfile = async (user) => {
    try {
      // A. 先從 Auth Metadata 讀取基本資料 (這一定會有)
      const metadata = user.user_metadata || {}

      // 先填入基本資料，確保畫面有東西
      currentUser.value = {
        ...defaultUser, // 墊底
        id: user.id,
        uid: user.id,
        email: user.email,
        nickname: metadata.nickname || user.email.split('@')[0], // 沒暱稱就用 email 前綴
        name: metadata.real_name || '用戶',
        // 如果 metadata 有 avatar 就用，沒有就用隨機圖
        avatar: metadata.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      }

      // B. 嘗試去資料庫撈詳細資料 (users table)
      // 如果你還沒建 table，這一步會失敗，但我們用 try-catch 包住，不會讓網頁掛掉
      const { data: dbData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // 如果 table 不存在或沒資料，只印警告，不中斷程式
        console.warn(
          '資料庫讀取略過 (可能是尚未建立 users 表格，將使用基本 Auth 資料):',
          error.message,
        )
      } else if (dbData) {
        // C. 如果資料庫有資料，就覆蓋上去 (資料庫優先)
        currentUser.value = {
          ...currentUser.value,
          ...dbData,
        }
      }
    } catch (err) {
      console.error('載入使用者過程發生錯誤 (已忽略，使用預設值):', err)
    }
  }

  // 監聽登入狀態變化 (App 啟動時會觸發)
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase Auth Event:', event)

    if (session?.user) {
      supabaseUser.value = session.user
      isLoggedIn.value = true
      // 登入後載入資料
      loadUserProfile(session.user)
    } else {
      supabaseUser.value = null
      isLoggedIn.value = false
      currentUser.value = { ...defaultUser }
    }

    authReady.value = true
  })

  // --------------------------------------------------
  // 3. UI 邏輯：護照、收藏、足跡 (暫存於前端，不寫入資料庫)
  // --------------------------------------------------

  // 拜訪過的地點
  const visitedPlaces = ref({
    domestic: [
      { name: '台北', date: '2024.01' },
      { name: '台中', date: '2023.12' },
    ],
    international: [{ name: '東京', date: '2023.11' }],
  })

  const wishlist = ref(['冰島極光', '紐西蘭健行'])
  const likedPosts = ref([])
  const favorites = ref([])

  // 收藏相關
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

  // 足跡與護照相關
  const participatedTrips = ref([
    {
      id: 201,
      title: '澎湖花火節',
      location: '澎湖, 台灣',
      date: '2023-06-20',
      type: 'participated',
    },
  ])
  const hiddenStamps = ref([])

  const hideStamp = (key) => {
    if (!hiddenStamps.value.includes(key)) hiddenStamps.value.push(key)
  }
  const restoreStamp = (key) => {
    const idx = hiddenStamps.value.indexOf(key)
    if (idx > -1) hiddenStamps.value.splice(idx, 1)
  }

  const passportEntries = computed(() => {
    // 這裡只是簡單範例，保留你原本的邏輯結構
    const entries = []
    if (visitedPlaces.value.domestic) {
      visitedPlaces.value.domestic.forEach((p) =>
        entries.push({ type: 'domestic', location: p.name, date: p.date }),
      )
    }
    return entries
  })

  // 其他輔助函式
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
    if (index === -1) wishlist.value.push(id)
    else wishlist.value.splice(index, 1)
  }

  const isWishlisted = (id) => wishlist.value.includes(id)

  const userProfile = computed(() => currentUser.value)

  return {
    // 狀態
    currentUser,
    userProfile,
    supabaseUser,
    isLoggedIn,
    authReady,

    // Auth 方法
    login,
    signup,
    logout,

    // UI 資料
    visitedPlaces,
    wishlist,
    likedPosts,
    favorites,
    collectionCategories,
    collections,
    isCollectionModalOpen,
    participatedTrips,
    passportEntries,
    hiddenStamps,

    // UI 方法
    openCollectionModal,
    saveToCategory,
    createCategoryAndSave,
    removeFromCollection,
    isCollected,
    updateProfile,
    addVisitedPlace,
    toggleWishlist,
    isWishlisted,
    hideStamp,
    restoreStamp,
  }
})
