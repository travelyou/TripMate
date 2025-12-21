// src/stores/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref({
    id: 1,
    name: 'Jovi',
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
  })

  // 拜訪過的地點 (含日期)
  const visitedPlaces = ref([
    {
      id: 1,
      location: '大阪, 日本',
      date: '2023-11-15',
      image: 'https://picsum.photos/400/300?random=101',
    },
    {
      id: 2,
      location: '首爾, 韓國',
      date: '2023-09-20',
      image: 'https://picsum.photos/400/300?random=102',
    },
    {
      id: 3,
      location: '曼谷, 泰國',
      date: '2023-08-05',
      image: 'https://picsum.photos/400/300?random=103',
    },
    {
      id: 4,
      location: '巴黎, 法國',
      date: '2022-12-25',
      image: 'https://picsum.photos/400/300?random=104',
    },
  ])

  // 願望清單 (收藏的文章或行程 ID)
  const wishlist = ref([1, 3, 5])

  // Actions
  const updateProfile = (newData) => {
    currentUser.value = { ...currentUser.value, ...newData }
  }

  const addVisitedPlace = (place) => {
    visitedPlaces.value.push({
      id: Date.now(),
      ...place,
    })
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

  return {
    currentUser,
    visitedPlaces,
    wishlist,
    updateProfile,
    addVisitedPlace,
    toggleWishlist,
    isWishlisted,
  }
})
