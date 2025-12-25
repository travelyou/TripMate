// src/stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth } from '@/firebase/config'
import { onAuthStateChanged, signOut } from 'firebase/auth'

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
        date: '2024/11/20'
      },
      {
        id: 2,
        author: 'Tom',
        avatar: 'https://placehold.co/100x100/87CEEB/ffffff?text=T',
        rating: 4,
        content: '很棒的旅伴，下次有機會再一起出遊！',
        date: '2024/10/15'
      }
    ]
  })

  // 拜訪過的地點 (含日期) - Modified to match source structure
  const visitedPlaces = ref({
    domestic: [
      { name: '台北', date: '2024.01' },
      { name: '台中', date: '2023.12' },
      { name: '台南', date: '2023.10' },
      { name: '花蓮', date: '2023.08' },
      { name: '蘭嶼', date: '2023.07' }
    ],
    international: [
      { name: '東京', date: '2023.11' },
      { name: '大阪', date: '2023.09' },
      { name: '首爾', date: '2023.05' },
      { name: '曼谷', date: '2023.02' },
      { name: '巴黎', date: '2022.12' }
    ]
  })

  // 願望清單 (收藏的文章或行程 ID)
  const wishlist = ref(['冰島極光', '紐西蘭健行', '瑞士滑雪', '土耳其熱氣球'])

  // Liked Posts
  const likedPosts = ref([])

  // Actions
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

  // 登入狀態
  const isLoggedIn = ref(false)

  // 監聽 Firebase 認證狀態
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = user ? true : false
  })

  // 登入函數
  const login = () => {
    // 登入狀態由 Firebase onAuthStateChanged 自動管理
    // 此函數保留以維持向後兼容性
  }
  const logout = async () => {
    try {
      await signOut(auth)
      // onAuthStateChanged 會自動更新 isLoggedIn 狀態
    } catch (error) {
      console.error('登出失敗：', error)
    }
  }

  const userProfile = computed(() => currentUser.value)

  return {
    currentUser,
    userProfile,
    visitedPlaces,
    wishlist,
    updateProfile,
    addVisitedPlace,
    toggleWishlist,
    isWishlisted,
    likedPosts,
    // 登入(出)狀態
    isLoggedIn,
    login,
    logout,
  }
})
