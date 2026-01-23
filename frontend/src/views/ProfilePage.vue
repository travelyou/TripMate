<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { usePersonalityStore } from '@/stores/personality'
import { getTravelers, getTravelerById } from '@/api/travelers'
import { auth, db } from '@/firebase/config'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

// Modal Components
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import TravelerApplyModal from '@/components/modals/TravelerApplyModal.vue'
import TravelerApplicationsModal from '@/components/modals/TravelerApplicationsModal.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import PersonalityResultModal from '@/components/modals/PersonalityResultModal.vue'

import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import AvatarCropModal from '@/components/modals/AvatarCropModal.vue'
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'
import TabDrafts from '@/components/profile/tabs/TabDrafts.vue'
import { useRouter, useRoute } from 'vue-router'

const userStore = useUserStore()
const personalityStore = usePersonalityStore()
const router = useRouter()
const route = useRoute()

const targetUid = computed(() => {
  if (route.params.uid) {
    return route.params.uid
  }
  if (userStore.isLoggedIn && userStore.currentUser?.uid) {
    return userStore.currentUser.uid
  }
  return null
})
const isCurrentUser = computed(() => {
  if (!userStore.currentUser?.uid || !targetUid.value) return false
  return userStore.currentUser.uid === targetUid.value
})

const viewingUser = ref(null)
const user = computed(() => {
  if (targetUid.value && targetUid.value !== userStore.currentUser?.uid) {
    return viewingUser.value || {
      id: null,
      uid: targetUid.value,
      name: '',
      nickname: '',
      email: '',
      avatar: '',
      bio: '',
      location: '台灣',
      spiritAnimal: '',
      role: 'user',
      vendorId: null,
      tags: [],
      friends: [],
      reviews: [],
      visitedPlaces: { domestic: [], international: [] },
      wishlist: [],
    }
  }
  return viewingUser.value || userStore.currentUser
})
const personalityResult = computed(() => personalityStore.savedResult || personalityStore.result)

const tempWishlist = ref(null)
const displayWishlist = computed(() => {
  if (isEditingProfile.value && tempWishlist.value !== null) {
    return tempWishlist.value
  }
  return isCurrentUser.value ? userStore.wishlist : (user.value.wishlist || [])
})

const activeTab = ref('hosted_trips')
const tabs = computed(() => {
  const baseTabs = [
  { k: 'visited_places', l: '去過的地方', s: '足跡' },
  { k: 'hosted_trips', l: '主揪的旅行', s: '主揪' },
  { k: 'posts', l: '貼文', s: '貼文' },
  { k: 'reviews', l: '好評', s: '好評' },
  ]
  if (isCurrentUser.value) {
    baseTabs.push({ k: 'drafts', l: '草稿夾', s: '草稿' })
  }
  return baseTabs
})

const isDetailModalOpen = ref(false)
const isTravelerDetailModalOpen = ref(false)
const isTravelerApplyModalOpen = ref(false)
const isTravelerApplicationsModalOpen = ref(false)
const isTravelerPostModalOpen = ref(false)
const selectedPost = ref(null)
const selectedTraveler = ref(null)
const selectedTravelerDraft = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false)
const isFriendModalOpen = ref(false)
const isPersonalityModalOpen = ref(false)
const isAvatarCropOpen = ref(false)
const avatarFileToCrop = ref(null)
const avatarCropModalRef = ref(null)

const hostedTravelers = ref([])
const userPosts = ref([])

const activeTabsData = computed(() => {
  const targetUidValue = targetUid.value

  return {
    hostedTrips: hostedTravelers.value
      // 再次確保只顯示該用戶自己創建的貼文
      .filter(traveler => {
        const travelerUid = traveler.author_uid || traveler.authorUid
        return travelerUid === targetUidValue
      })
      .map((traveler) => ({
        id: traveler.id,
        title: traveler.title,
        content: traveler.content,
        image: traveler.image,
        author: traveler.author,
        avatar: traveler.avatar,
        spiritAnimal: traveler.spiritAnimal,
        location: traveler.location,
        date: traveler.date,
        start_date: traveler.start_date,
        end_date: traveler.end_date,
        status: traveler.status,
        people: traveler.people,
        comments: traveler.comments || 0,
        tags: traveler.tags || [],
        category: traveler.category,
        author_uid: traveler.author_uid || traveler.authorUid,
      })),
    posts: userPosts.value
      // 再次確保只顯示該用戶自己發布的貼文
      .filter(post => {
        const postUid = post.author_uid || post.authorUid
        return postUid === targetUidValue
      }),
    reviews: (user.value && user.value.reviews) || [],
  }
})

const profileStats = ref({
  hosted: 0,
  posts: 0,
  reviews: 0,
  friends: 0
})

const stats = computed(() => ({
  hosted: profileStats.value.hosted || activeTabsData.value.hostedTrips.length,
  posts: profileStats.value.posts || activeTabsData.value.posts.length,
  reviews: profileStats.value.reviews || activeTabsData.value.reviews.length,
  friends: profileStats.value.friends || (user.value && user.value.friends ? user.value.friends.length : 0),
}))

const handleOpenFriends = () => {
  isFriendModalOpen.value = true
}

const handleChat = (friend = null) => {
  // 觸發全局事件來開啟聊天室
  const targetUser = friend || user.value || viewingUser.value
  if (targetUser && targetUser.uid) {
    window.dispatchEvent(new CustomEvent('open-chat', {
      detail: {
        user: {
          uid: targetUser.uid,
          name: targetUser.name || targetUser.nickname,
          nickname: targetUser.nickname || targetUser.name,
          avatar: targetUser.avatar || ''
        }
      }
    }))
  }
  if (friend) {
    isFriendModalOpen.value = false
  }
}

const handleFriendChat = (friend) => {
  if (!friend) return
  isFriendModalOpen.value = false
  const chatUser = {
    uid: friend.uid || friend.id,
    name: friend.name || friend.nickname,
    nickname: friend.nickname || friend.name,
    avatar: friend.avatar || '',
  }
  if (chatUser.uid) {
    window.dispatchEvent(new CustomEvent('open-chat', { detail: { user: chatUser } }))
  }
}

const handleTravelerOpenApply = (traveler) => {
  selectedTraveler.value = traveler
  isTravelerApplyModalOpen.value = true
}

const handleTravelerOpenApplications = (traveler) => {
  selectedTraveler.value = traveler
  isTravelerApplicationsModalOpen.value = true
}

const handlePostEdit = (post) => {
  if (!post?.id) return
  router.push({ name: 'discussion', query: { editPost: post.id } })
}

const handleTravelerEdit = async (traveler) => {
  let source = traveler
  try {
    const response = await getTravelerById(traveler.id)
    if (response?.success && response.data) {
      source = response.data
    }
  } catch (error) {
    console.error('取得旅伴完整資料失敗，改用列表資料：', error)
  }

  selectedTravelerDraft.value = {
    type: 'traveler',
    data: {
      category: source.category || '',
      title: source.title || '',
      content: source.content || '',
      location: source.location || '',
      start_date: source.start_date || '',
      end_date: source.end_date || '',
      max_people: source.max_people || source.people?.split('/')[1] || 2,
      tags: source.tags || [],
      banner_image: source.image || source.banner_image || '',
      banner_position_y: source.banner_position_y,
      itinerary: source.itinerary || { days: [] },
      packingList: source.packingList || [],
      status: source.status || '招募中',
    },
  }
  isTravelerPostModalOpen.value = true
}

const handleTravelerPostModalClose = () => {
  isTravelerPostModalOpen.value = false
  selectedTravelerDraft.value = null
}

const handleTravelerPostSuccess = () => {
  isTravelerPostModalOpen.value = false
  selectedTravelerDraft.value = null
  // 重新載入旅伴資料
  if (targetUid.value) {
    loadHostedTravelers(targetUid.value)
  }
}

const handleOpenFriendProfile = (friend) => {
  if (!friend) return
  const friendUid = friend.uid || friend.id
  if (!friendUid) return

  isFriendModalOpen.value = false
  if (route.params.uid !== friendUid) {
    router.push({ path: `/profile/${friendUid}` })
  }
}

// 檢查好友請求狀態
const friendRequestStatus = ref(null) // 'none' | 'sent' | 'received' | 'accepted'

const checkFriendRequestStatus = async () => {
  if (!user.value?.uid || !userStore.currentUser?.uid) return

  const friendUid = user.value.uid
  const currentUid = userStore.currentUser.uid

  try {
    const { getFriendRequests, getProfile } = await import('@/api/profile')

    // 先檢查好友請求狀態（這是最準確的狀態）
    const requests = await getFriendRequests(currentUid)
    const sentRequest = requests.sent?.find(r => r.uid === friendUid)
    const receivedRequest = requests.received?.find(r => r.uid === friendUid)

    if (sentRequest) {
      // 如果已發送請求，狀態為 'sent'
      friendRequestStatus.value = 'sent'
      return
    }

    if (receivedRequest) {
      // 如果收到請求，狀態為 'received'
      friendRequestStatus.value = 'received'
      return
    }

    // 如果沒有請求，再檢查是否已經是好友（後端應該只返回 accepted 的好友）
    const profileData = await getProfile(currentUid)
    const isFriend = profileData?.friends?.some(f => (f.uid === friendUid || f.id === friendUid))

    if (isFriend) {
      // 只有在確認是 accepted 的好友時才設置為 'accepted'
      friendRequestStatus.value = 'accepted'
    } else {
      // 沒有任何關係
      friendRequestStatus.value = 'none'
    }
  } catch (error) {
    console.error('檢查好友請求狀態失敗：', error)
    friendRequestStatus.value = 'none'
  }
}

const refreshCurrentUserFriends = async () => {
  const currentUid = userStore.currentUser?.uid
  if (!currentUid) return

  try {
    const { getProfile } = await import('@/api/profile')
    const profileData = await getProfile(currentUid)
    if (profileData && profileData.friends) {
      userStore.currentUser.friends = profileData.friends
    }
    if (isCurrentUser.value && profileData?.stats) {
      profileStats.value = profileData.stats
    }
  } catch (error) {
    console.error('刷新好友列表失敗：', error)
  }
}

const handleAddFriend = async () => {
  if (!user.value?.uid || !userStore.currentUser?.uid) {
    alert('無法加好友，請先登入')
    return
  }

  const friendUid = user.value.uid
  const currentUid = userStore.currentUser.uid

  // 不能加自己為好友
  if (friendUid === currentUid) {
    alert('不能加自己為好友')
    return
  }

  try {
    const { addFriend, cancelFriendRequest, removeFriend } = await import('@/api/profile')

    // 如果已經是好友，顯示解除好友選項
    if (friendRequestStatus.value === 'accepted') {
      const confirmRemove = confirm('確定要解除好友關係嗎？')
      if (!confirmRemove) return
      await removeFriend(currentUid, friendUid)
      friendRequestStatus.value = 'none'
      await refreshCurrentUserFriends()
      await checkFriendRequestStatus()
      return
    }

    // 如果已經發送請求，則取消請求
    if (friendRequestStatus.value === 'sent') {
      const confirmCancel = confirm('確定要取消好友邀請嗎？')
      if (!confirmCancel) return
      await cancelFriendRequest(currentUid, friendUid)
      friendRequestStatus.value = 'none'
    } else {
      // 發送好友請求
      const result = await addFriend(currentUid, friendUid)
      if (result?.accepted) {
        friendRequestStatus.value = 'accepted'
        await refreshCurrentUserFriends()
      } else {
        friendRequestStatus.value = 'sent'
      }
    }

    await checkFriendRequestStatus()
  } catch (error) {
    console.error('加好友失敗：', error)
    if (error.message.includes('已發送')) {
      friendRequestStatus.value = 'sent'
    } else if (error.message.includes('已經是好友') || error.message.includes('已存在')) {
      friendRequestStatus.value = 'accepted'
      await refreshCurrentUserFriends()
      // 如果已經是好友，確保狀態正確顯示
    } else {
      // 顯示錯誤訊息
      alert('操作失敗：' + (error.message || '未知錯誤'))
    }
  }
}

const openDetail = (item, focusComment = false) => {
  // 判断是 traveler 还是 discussion post
  // 如果 item 来自 TabHostedTrips（有 author_uid 且在 hostedTrips 列表中），则打开 TravelerDetailModal
  const isTraveler = item.type === 'traveler' ||
    (item.author_uid && activeTabsData.value.hostedTrips.some(t => t.id === item.id))

  if (isTraveler) {
    selectedTraveler.value = item
    shouldScrollToComments.value = focusComment
    isTravelerDetailModalOpen.value = true
  } else {
    selectedPost.value = item
    shouldScrollToComments.value = focusComment
    isDetailModalOpen.value = true
  }
}

const handleSaveField = async ({ field, data }) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  try {
    const { updateUserProfile } = await import('@/api/users')
    const { updateWishlist } = await import('@/api/profile')

    switch (field) {
      case 'name':
        await updateUserProfile(user.value.uid, {
          nickname: data.nickname || data.name,
        })
        userStore.updateProfile({ nickname: data.nickname || data.name })
        break
      case 'location':
        await updateUserProfile(user.value.uid, {
          location: data.location || '台灣',
        })
        userStore.updateProfile({ location: data.location || '台灣' })
        break
      case 'bio':
        await updateUserProfile(user.value.uid, {
          bio: data.bio,
        })
        userStore.updateProfile({ bio: data.bio })
        break
      case 'tags':
        userStore.updateProfile({ tags: data.tags })
        break
      case 'wishlist':
        await updateWishlist(user.value.uid, data.wishlist || [])
        userStore.wishlist = data.wishlist || []
        break
    }
  } catch (error) {
    console.error(`保存 ${field} 失敗：`, error)
    throw error
  }
}

const handleSaveProfile = async (formData) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  const { wishlist, hiddenStamps, tags, ...profileData } = formData

  try {
    const { updateUserProfile } = await import('@/api/users')
    const locationValue = (profileData.location && typeof profileData.location === 'string' && profileData.location.trim())
      ? profileData.location.trim()
      : '台灣'

    const tagsToSave = Array.isArray(tags) ? tags : (tags || [])

    await updateUserProfile(user.value.uid, {
      nickname: profileData.nickname || profileData.name,
      location: locationValue,
      avatar: profileData.avatar,
      bio: profileData.bio,
      spirit_animal: profileData.spiritAnimal,
      tags: tagsToSave,
    })

    const nicknameValue = profileData.name || profileData.nickname || ''
    userStore.updateProfile({
      ...profileData,
      name: nicknameValue,
      nickname: nicknameValue,
      location: locationValue,
      tags: tags || [],
    })

    if (isCurrentUser.value && viewingUser.value) {
      viewingUser.value = {
        ...viewingUser.value,
        name: nicknameValue,
        nickname: nicknameValue,
        location: locationValue,
        tags: tags || [],
      }
    }

    const { updateWishlist } = await import('@/api/profile')
    const wishlistArray = Array.isArray(wishlist) ? wishlist : []
    await updateWishlist(user.value.uid, wishlistArray)
    userStore.wishlist = wishlistArray

    userStore.hiddenStamps = hiddenStamps

    await loadProfileData()

    handleCloseEditModal()
  } catch (error) {
    console.error('儲存個人檔案失敗：', error)
    handleCloseEditModal()
  }
}

const handleUpdateWishlist = (wishlist) => {
  tempWishlist.value = wishlist
}

const handleCloseEditModal = () => {
  isEditingProfile.value = false
  tempWishlist.value = null
}

/**
 * 處理從 TabDrafts 分頁傳來的 'select-draft' 事件
 * @param {Object} draft - 使用者選中的草稿
 */
const handleSelectDraft = (draft) => {
  if (draft.type === 'my_itinerary' || draft.type === 'itinerary') {
    router.push({ path: '/my-itinerary', query: { openDraft: draft.id } })
  } else if (draft.type === 'discussion') {
    router.push({ path: '/discussion', query: { openDraft: draft.id } })
  } else if (draft.type === 'traveler') {
    router.push({ path: '/traveler', query: { openDraft: draft.id } })
  } else {
    alert(`這是 ${draft.typeLabel} 的草稿，請至 ${draft.typeLabel === '找旅伴' ? '找旅伴頁面' : '討論區'} 編輯。`)
  }
}

const handleAddPlace = async ({ type, name, date, icon }) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  try {
    const { addVisitedPlace } = await import('@/api/profile')
  const newPlaceObj = {
    name: name,
    date: date || new Date().toISOString().slice(0, 7).replace('-', '.'),
      type: type,
      icon: icon,
    }
    await addVisitedPlace(user.value.uid, newPlaceObj)
    userStore.addVisitedPlace(newPlaceObj, type)
  } catch (error) {
    console.error('新增去過的地方失敗：', error)
  }
}

const handleRemovePlace = async ({ type, id, index }) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  try {
    const places = isCurrentUser.value
      ? (type === 'domestic' ? userStore.visitedPlaces.domestic : userStore.visitedPlaces.international)
      : (type === 'domestic' ? user.value.visitedPlaces?.domestic : user.value.visitedPlaces?.international)

    if (id) {
      const { removeVisitedPlace } = await import('@/api/profile')
      await removeVisitedPlace(user.value.uid, id)
    }

    if (places && typeof index === 'number' && index >= 0 && index < places.length) {
  places.splice(index, 1)
    }
  } catch (error) {
    console.error('刪除去過的地方失敗：', error)
  }
}

const handleUpdateAvatar = (file) => {
  if (!isCurrentUser.value || !file) return
  avatarFileToCrop.value = file
  isAvatarCropOpen.value = true
}

const handleAvatarCrop = async (croppedFile) => {
  console.log('🔄 開始上傳頭貼流程...')

  if (!isCurrentUser.value || !croppedFile) {
    console.error('❌ 無法上傳頭貼：缺少必要資訊', { isCurrentUser: isCurrentUser.value, croppedFile: !!croppedFile })
    alert('❌ 無法上傳頭貼：缺少必要資訊')
    return
  }

  if (!user.value || !user.value.uid) {
    console.error('❌ 無法上傳頭貼：無法取得用戶 ID', { user: user.value })
    alert('❌ 無法上傳頭貼：無法取得用戶 ID')
    return
  }

  console.log('✅ 驗證通過，用戶 ID:', user.value.uid)

  try {
    const { uploadImage } = await import('@/api/storage')
    const { compressImage } = await import('@/utils/imageCompress')

    // 壓縮圖片
    let compressedFile
    try {
      console.log('📦 開始壓縮圖片...')
      compressedFile = await compressImage(croppedFile, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        maxSizeMB: 1
      })
      console.log('✅ 圖片壓縮成功，檔案大小:', compressedFile.size, 'bytes')
    } catch (compressError) {
      console.error('❌ 圖片壓縮失敗：', compressError)
      throw new Error('圖片壓縮失敗：' + (compressError.message || '未知錯誤'))
    }

    // 上傳到 Firebase Storage
    let avatarUrl
    try {
      console.log('☁️ 開始上傳圖片到 Firebase Storage...')
      avatarUrl = await uploadImage(compressedFile, 'avatars')
      if (!avatarUrl || avatarUrl.trim() === '') {
        throw new Error('上傳成功但未取得圖片網址')
      }
      console.log('✅ 圖片上傳成功，URL:', avatarUrl)
    } catch (uploadError) {
      console.error('❌ 上傳圖片失敗：', uploadError)
      throw new Error('上傳圖片失敗：' + (uploadError.message || '請檢查網路連線'))
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 開始更新 Firebase 服務...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 更新 Firebase Auth 個人資料
    try {
      console.log('🔥 開始更新 Firebase Auth 個人資料...')
      const currentUser = auth.currentUser
      console.log('👤 當前用戶狀態:', {
        exists: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email
      })
      if (currentUser) {
        console.log('📝 準備更新 Firebase Auth photoURL:', avatarUrl)
        await updateProfile(currentUser, {
          photoURL: avatarUrl
        })
        console.log('✅ Firebase Auth 個人資料更新成功')
        // 驗證更新
        const updatedUser = auth.currentUser
        console.log('✅ 驗證 Firebase Auth 更新結果 - photoURL:', updatedUser?.photoURL)
      } else {
        console.warn('⚠️ 沒有當前登入用戶，跳過 Firebase Auth 更新')
      }
    } catch (firebaseError) {
      console.error('❌ 更新 Firebase Auth 個人資料失敗：', firebaseError)
      console.error('❌ Firebase Auth 錯誤詳情:', {
        code: firebaseError.code,
        message: firebaseError.message,
        stack: firebaseError.stack
      })
      // Firebase 更新失敗不影響整體流程，繼續執行
      console.warn('⚠️ 將繼續更新 Firestore 和 Neon 資料庫')
    }

    // 更新 Firebase Firestore 個人資料
    try {
      console.log('🔥 開始更新 Firebase Firestore 個人資料...')
      const currentUser = auth.currentUser
      console.log('👤 Firestore 更新 - 當前用戶狀態:', {
        exists: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email
      })
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid)
        console.log('📄 Firestore 文檔引用:', userDocRef.path)
        console.log('📄 Firestore 文檔 ID:', userDocRef.id)

        const userDoc = await getDoc(userDocRef)
        console.log('📄 文檔存在狀態:', userDoc.exists())

        if (userDoc.exists()) {
          // 如果文檔存在，更新 avatar 字段
          console.log('📝 準備更新現有文檔，avatar URL:', avatarUrl)
          await updateDoc(userDocRef, {
            avatar: avatarUrl,
            updatedAt: serverTimestamp()
          })
          console.log('✅ Firebase Firestore 個人資料更新成功')

          // 驗證更新是否成功
          const updatedDoc = await getDoc(userDocRef)
          if (updatedDoc.exists()) {
            const updatedData = updatedDoc.data()
            console.log('✅ 驗證更新結果 - avatar:', updatedData.avatar)
            if (updatedData.avatar !== avatarUrl) {
              console.warn('⚠️ 警告：更新後的 avatar 與預期不符')
            }
          }
        } else {
          // 如果文檔不存在，創建新文檔
          console.log('📝 準備創建新文檔，avatar URL:', avatarUrl)
          await setDoc(userDocRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            nickname: currentUser.displayName || currentUser.email?.split('@')[0] || '用戶',
            avatar: avatarUrl,
            bio: '',
            spiritAnimal: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          console.log('✅ Firebase Firestore 個人資料創建成功')

          // 驗證創建是否成功
          const createdDoc = await getDoc(userDocRef)
          if (createdDoc.exists()) {
            const createdData = createdDoc.data()
            console.log('✅ 驗證創建結果 - avatar:', createdData.avatar)
          }
        }
      } else {
        console.warn('⚠️ 沒有當前登入用戶，跳過 Firebase Firestore 更新')
        throw new Error('沒有當前登入用戶，無法更新 Firestore')
      }
    } catch (firestoreError) {
      console.error('❌ 更新 Firebase Firestore 個人資料失敗：', firestoreError)
      console.error('❌ 錯誤詳情:', {
        code: firestoreError.code,
        message: firestoreError.message,
        stack: firestoreError.stack,
        uid: auth.currentUser?.uid,
        avatarUrl: avatarUrl
      })
      // Firestore 更新失敗不影響整體流程，繼續執行
      console.warn('⚠️ 將繼續更新 Neon 資料庫')
      // 但仍然要讓用戶知道 Firestore 更新失敗
      alert(`⚠️ 警告：Firebase Firestore 更新失敗，但會繼續更新其他資料庫。\n錯誤：${firestoreError.message || '未知錯誤'}`)
    }

    // 更新資料庫
    try {
      console.log('💾 開始更新資料庫...', { uid: user.value.uid, avatarUrl })
      const { updateUserProfile } = await import('@/api/users')
      const result = await updateUserProfile(user.value.uid, {
        avatar: avatarUrl
      })

      console.log('📥 資料庫回應:', result)

      if (!result) {
        throw new Error('更新資料庫失敗：未收到回應')
      }
      console.log('✅ 資料庫更新成功')
    } catch (updateError) {
      console.error('❌ 更新資料庫失敗：', updateError)
      console.error('錯誤詳情:', {
        message: updateError.message,
        stack: updateError.stack,
        uid: user.value.uid,
        avatarUrl: avatarUrl
      })
      throw new Error('更新資料庫失敗：' + (updateError.message || '請稍後再試'))
    }

    // 更新本地狀態
    try {
      console.log('🔄 更新本地狀態...')
      userStore.updateProfile({ avatar: avatarUrl })
      console.log('✅ 本地狀態更新成功')

      // 保存到 localStorage
      if (user.value.uid) {
        try {
          localStorage.setItem(`user_avatar_${user.value.uid}`, avatarUrl)
          console.log('✅ 已保存到 localStorage')
        } catch (e) {
          console.warn('⚠️ 保存頭貼到 localStorage 失敗:', e)
        }
      }
    } catch (storeError) {
      console.error('❌ 更新本地狀態失敗：', storeError)
      // 即使本地更新失敗，也繼續執行
    }

    // 清除討論區的用戶資訊緩存，確保頭貼更新
    try {
      const { useDiscussionsStore } = await import('@/stores/discussions')
      const discussionsStore = useDiscussionsStore()
      if (discussionsStore && discussionsStore.clearUserCache) {
        discussionsStore.clearUserCache(user.value.uid)
        console.log('✅ 已清除討論區緩存')
      }
    } catch (cacheError) {
      console.warn('⚠️ 清除緩存失敗：', cacheError)
      // 緩存清除失敗不影響上傳成功
    }

    // 成功提示
    console.log('🎉 頭貼上傳流程完成！')

    // 重新載入個人檔案資料以確保界面更新
    try {
      console.log('🔄 重新載入個人檔案資料...')
      await loadProfileData()
      console.log('✅ 個人檔案資料已重新載入')
    } catch (reloadError) {
      console.warn('⚠️ 重新載入個人檔案資料失敗:', reloadError)
      // 即使重新載入失敗，也顯示成功訊息
    }

    alert('✅ 頭貼更新成功！')

    // 重置状态
    if (avatarCropModalRef.value && avatarCropModalRef.value.resetUploadState) {
      avatarCropModalRef.value.resetUploadState()
    }
    isAvatarCropOpen.value = false
    avatarFileToCrop.value = null
  } catch (error) {
    console.error('上傳頭貼失敗：', error)
    const errorMessage = error.message || '未知錯誤'
    alert(`❌ 上傳頭貼失敗：${errorMessage}\n\n請檢查：\n• 網路連線是否正常\n• 圖片格式是否正確\n• 檔案大小是否過大\n\n如問題持續，請稍後再試。`)

    // 重置状态
    if (avatarCropModalRef.value && avatarCropModalRef.value.resetUploadState) {
      avatarCropModalRef.value.resetUploadState()
    }
  }
}

const handleCloseAvatarCrop = () => {
  isAvatarCropOpen.value = false
  avatarFileToCrop.value = null
}

const openPersonalityResult = () => {
  isPersonalityModalOpen.value = true
}

const closePersonalityResult = () => {
  isPersonalityModalOpen.value = false
}

const loading = ref(false)
const loadHostedTravelers = async (uid) => {
  if (!uid) return

  try {
    const response = await getTravelers({
      author_uid: uid,
      limit: 100,
      offset: 0
    })

    if (response.success && response.data) {
      // 確保只顯示該用戶自己創建的貼文（雙重驗證）
      hostedTravelers.value = response.data.filter(traveler =>
        traveler.author_uid === uid || traveler.authorUid === uid
      )
    } else {
      hostedTravelers.value = []
    }
  } catch (error) {
    console.error('載入主揪的旅行失敗：', error)
    hostedTravelers.value = []
  }
}

const loadUserPosts = async (uid) => {
  if (!uid) return

  try {
    const { fetchPosts } = await import('@/api/discussions')
    const data = await fetchPosts({
      author_uid: uid,
      page: 1,
      limit: 100
    })

    if (data && data.posts) {
      // 確保只顯示該用戶自己發布的貼文（雙重驗證）
      const filteredPosts = data.posts.filter(post =>
        post.author_uid === uid
      )

      // 使用 discussionsStore 的 transformPost 方法轉換資料
      const transformedPosts = filteredPosts.map(post => {
        const formatTime = (timestamp) => {
          if (!timestamp) return '剛剛'
          const now = new Date()
          const postTime = new Date(timestamp)
          const diffMs = now - postTime
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffDays = Math.floor(diffHours / 24)
          if (diffDays > 0) return `${diffDays}天前`
          if (diffHours > 0) return `${diffHours}小時前`
          const diffMins = Math.floor(diffMs / (1000 * 60))
          if (diffMins > 0) return `${diffMins}分鐘前`
          return '剛剛'
        }

        return {
          id: post.id,
          author: post.author_name || post.author_uid || '匿名用戶',
          author_uid: post.author_uid,
          spiritAnimal: post.author_spirit_animal || '',
          avatar: post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_uid}`,
          time: formatTime(post.created_at),
          title: post.title,
          content: post.content,
          image: post.banner || null,
          banner: post.banner || null,
          image_urls: post.image_urls || [],
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          tags: post.tags || [],
          commentsData: [],
          board: 'discussion',
          category: post.category,
          created_at: post.created_at,
          updated_at: post.updated_at,
        }
      })
      userPosts.value = transformedPosts
    } else {
      userPosts.value = []
    }
  } catch (error) {
    console.error('載入用戶貼文失敗：', error)
    userPosts.value = []
  }
}

const loadProfileData = async () => {
  viewingUser.value = null

  const uidToLoad = route.params.uid || (userStore.isLoggedIn && userStore.currentUser?.uid ? userStore.currentUser.uid : null)

  if (!uidToLoad) {
    if (!userStore.isLoggedIn) {
      router.push('/login')
    }
    return
  }

  if (targetUid.value !== uidToLoad) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  loading.value = true
  try {
    const { getProfile } = await import('@/api/profile')
    const profileData = await getProfile(uidToLoad)

    // 載入主揪的旅行（找旅伴貼文）
    await loadHostedTravelers(uidToLoad)

    // 載入用戶的貼文
    await loadUserPosts(uidToLoad)

    // 如果不是當前用戶，檢查好友請求狀態
    if (!isCurrentUser.value) {
      await checkFriendRequestStatus()
    }

    if (profileData) {
      if (!isCurrentUser.value) {
        viewingUser.value = {
          id: profileData.user.uid,
          uid: profileData.user.uid,
          name: profileData.user.nickname || '用戶',
          nickname: profileData.user.nickname,
          email: profileData.user.email,
          avatar: profileData.user.avatar,
          bio: profileData.user.bio,
          location: profileData.user.location || '台灣',
          spiritAnimal: profileData.user.spirit_animal,
          role: profileData.user.role,
          vendorId: profileData.user.vendor_id,
          tags: profileData.user.tags || [],
          friends: profileData.friends,
          reviews: profileData.reviews,
          visitedPlaces: profileData.visitedPlaces,
          wishlist: profileData.wishlist,
        }
      } else {
        userStore.setUserProfile({
          uid: profileData.user.uid,
          email: profileData.user.email,
          nickname: profileData.user.nickname,
          avatar: profileData.user.avatar,
          bio: profileData.user.bio,
          location: profileData.user.location || '台灣',
          spiritAnimal: profileData.user.spirit_animal,
          role: profileData.user.role,
          vendorId: profileData.user.vendor_id,
          tags: profileData.user.tags || [],
        })

        userStore.visitedPlaces = profileData.visitedPlaces
        userStore.wishlist = profileData.wishlist
        userStore.currentUser.friends = profileData.friends
        userStore.currentUser.reviews = profileData.reviews
        userStore.currentUser.tags = profileData.user.tags || []

        const hasPersonality =
          personalityStore.savedResult || personalityStore.result
        if (!hasPersonality && userStore.currentUser?.spiritAnimal) {
          personalityStore.hydrateResultFromSpiritAnimal(
            userStore.currentUser.spiritAnimal,
          )
        }
      }

      profileStats.value = profileData.stats || {
        hosted: 0,
        posts: 0,
        reviews: 0,
        friends: 0
      }
    }
  } catch (error) {
    console.error('載入個人檔案資料失敗：', error)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.uid, (newUid, oldUid) => {
  if (newUid !== oldUid) {
    viewingUser.value = null
    hostedTravelers.value = []
    userPosts.value = []
    loadProfileData()
  }
}, { immediate: false })

watch(() => targetUid.value, (newUid, oldUid) => {
  if (newUid !== oldUid && newUid) {
    viewingUser.value = null
    hostedTravelers.value = []
    userPosts.value = []
    loadProfileData()
  }
}, { immediate: false })

onMounted(() => {
  nextTick(() => {
    loadProfileData()
  })
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 animate-fade-in">
    <ProfileHeader
      :user="user"
      :is-current-user="isCurrentUser"
      :stats="stats"
      :friend-request-status="friendRequestStatus"
      :loading="loading"
      @edit-profile="isEditingProfile = true"
      @edit-bio="isEditingProfile = true"
      @update-avatar="handleUpdateAvatar"
      @open-friends="handleOpenFriends"
      @chat="handleChat"
      @add-friend="handleAddFriend"
    />

    <div v-if="loading" class="space-y-8 animate-pulse">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-start-3 lg:row-start-1 space-y-4 md:space-y-6">
          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6 space-y-4">
            <div class="h-5 w-28 bg-secondary-100 rounded"></div>
            <div class="h-4 w-40 bg-secondary-100 rounded"></div>
            <div class="h-32 w-full bg-secondary-100 rounded-xl"></div>
          </div>
        </div>

        <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-2 flex gap-2">
            <div class="h-10 w-20 bg-secondary-100 rounded-xl"></div>
            <div class="h-10 w-20 bg-secondary-100 rounded-xl"></div>
            <div class="h-10 w-20 bg-secondary-100 rounded-xl"></div>
            <div class="h-10 w-20 bg-secondary-100 rounded-xl"></div>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 min-h-[400px] p-6 space-y-4">
            <div class="h-5 w-36 bg-secondary-100 rounded"></div>
            <div class="h-24 w-full bg-secondary-100 rounded-xl"></div>
            <div class="h-24 w-full bg-secondary-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-start-3 lg:row-start-1 space-y-4 md:space-y-6">
          <ProfileSidebar
            :user="user"
            :wishlist="displayWishlist"
            :personality-result="personalityResult"
            :is-current-user="isCurrentUser"
            @open-personality-result="openPersonalityResult"
            @edit-wishlist="isEditingProfile = true"
          />
        </div>

        <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
          <div
            class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1 md:p-1.5 lg:p-2 flex space-x-1 overflow-x-auto"
          >
            <button
              v-for="tab in tabs"
              :key="tab.k"
              :class="[
                'flex-1 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1 sm:gap-2 shrink-0',
                activeTab === tab.k
                  ? 'bg-primary-50 text-primary-600 shadow-sm'
                  : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700',
              ]"
              @click="activeTab = tab.k"
            >
              <span class="md:hidden whitespace-nowrap">{{ tab.s }}</span>
              <span class="hidden md:inline whitespace-nowrap">{{ tab.l }}</span>
            </button>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 min-h-[400px] p-6">
            <TabVisitedPlaces
              v-if="activeTab === 'visited_places'"
              :visited-places="isCurrentUser ? userStore.visitedPlaces : (user.visitedPlaces || { domestic: [], international: [] })"
              :is-current-user="isCurrentUser"
              @add-place="handleAddPlace"
              @remove-place="handleRemovePlace"
            />

            <TabHostedTrips
              v-if="activeTab === 'hosted_trips'"
              :trips="activeTabsData.hostedTrips"
              @open-detail="openDetail($event, false)"
              @edit="handleTravelerEdit"
            />

            <TabPosts
              v-if="activeTab === 'posts'"
              :posts="activeTabsData.posts"
              @open-detail="openDetail($event, false)"
              @open-comment="openDetail($event, true)"
              @edit="handlePostEdit"
            />

            <TabReviews
              v-if="activeTab === 'reviews'"
              :reviews="activeTabsData.reviews"
              :user="user"
              @open-post="openDetail({ id: $event, title: 'Mock Post', content: 'Loading...' })"
            />

            <TabDrafts
              v-if="activeTab === 'drafts'"
              @select-draft="handleSelectDraft"
            />
          </div>
        </div>
      </div>
    </template>

    <EditProfileModal
      v-if="isCurrentUser"
      :is-open="isEditingProfile"
      :user="user"
      :wishlist="userStore.wishlist"
      :hidden-stamps="userStore.hiddenStamps"
      @close="handleCloseEditModal"
      @save="handleSaveProfile"
      @save-field="handleSaveField"
      @update-wishlist="handleUpdateWishlist"
    />

    <FriendListModal
      :is-open="isFriendModalOpen"
      :friends="userStore.currentUser.friends"
      @close="isFriendModalOpen = false"
      @chat="handleFriendChat"
      @open-profile="handleOpenFriendProfile"
    />

    <DiscussionDetailModal
      v-if="isDetailModalOpen"
      :post="selectedPost"
      :scroll-to-comments="shouldScrollToComments"
      @close="isDetailModalOpen = false"
    />

    <TravelerDetailModal
      v-if="isTravelerDetailModalOpen"
      :traveler="selectedTraveler"
      :scroll-to-comments="shouldScrollToComments"
      @close="isTravelerDetailModalOpen = false"
      @open-apply="handleTravelerOpenApply"
      @open-applications="handleTravelerOpenApplications"
    />

    <TravelerApplyModal
      v-if="isTravelerApplyModalOpen"
      :traveler="selectedTraveler"
      @close="isTravelerApplyModalOpen = false"
    />

    <TravelerApplicationsModal
      v-if="isTravelerApplicationsModalOpen"
      :traveler="selectedTraveler"
      @close="isTravelerApplicationsModalOpen = false"
      @application-updated="loadHostedTravelers(targetUid)"
    />

    <TravelerPostModal
      v-if="isTravelerPostModalOpen"
      :draft-data="selectedTravelerDraft"
      @close="handleTravelerPostModalClose"
      @success="handleTravelerPostSuccess"
    />

    <PersonalityResultModal
      v-if="isPersonalityModalOpen"
      :result="personalityResult"
      @close="closePersonalityResult"
    />

    <AvatarCropModal
      :is-open="isAvatarCropOpen"
      :image-file="avatarFileToCrop"
      @close="handleCloseAvatarCrop"
      @crop="handleAvatarCrop"
    />
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
