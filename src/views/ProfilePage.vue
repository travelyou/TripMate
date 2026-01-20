<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import { usePersonalityStore } from '@/stores/personality'

// Modal Components
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
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
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()
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
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false)
const isFriendModalOpen = ref(false)
const isPersonalityModalOpen = ref(false)
const isAvatarCropOpen = ref(false)
const avatarFileToCrop = ref(null)
const avatarCropModalRef = ref(null)

const activeTabsData = computed(() => {
  return {
    hostedTrips: (itineraryStore.myItineraries || []).map((trip) => ({
      id: trip.id,
      title: trip.title,
      content: trip.description,
      image: trip.image,
      author: user.value?.name || '',
      avatar: user.value?.avatar || '',
      spiritAnimal: user.value?.spiritAnimal || '🦁 樂天派',
      location: trip.location || '台灣',
      date: trip.startDate,
      status: trip.status || '招募中',
      people: `${trip.participants}/${trip.maxParticipants}`,
      comments: 0,
      tags: ['行程', trip.status],
      isAuthor: true,
      commentsData: [],
    })),
    posts: (discussionsStore.discussions || []).filter((p) =>
      user.value && (
        p.author === user.value.name ||
        p.author === user.value.nickname ||
        p.author_uid === user.value.uid
      )
    ),
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

const clearPendingFriendRequests = async (currentUid, friendUid) => {
  try {
    const { cancelFriendRequest, rejectFriendRequest } = await import('@/api/profile')
    await Promise.allSettled([
      cancelFriendRequest(currentUid, friendUid),
      rejectFriendRequest(currentUid, friendUid),
    ])
  } catch (error) {
    console.error('清除好友邀請失敗：', error)
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
    const { addFriend, cancelFriendRequest } = await import('@/api/profile')

    // 如果已經發送請求，則取消請求
    if (friendRequestStatus.value === 'sent') {
      const confirmCancel = confirm('確定要取消好友邀請嗎？')
      if (!confirmCancel) return
      await cancelFriendRequest(currentUid, friendUid)
      friendRequestStatus.value = 'none'
    } else if (friendRequestStatus.value === 'accepted') {
      await clearPendingFriendRequests(currentUid, friendUid)
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

const openDetail = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
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
  if (!isCurrentUser.value || !croppedFile) return

  try {
    const { uploadImage } = await import('@/api/storage')
    const { compressImage } = await import('@/utils/imageCompress')

    const compressedFile = await compressImage(croppedFile, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.9,
      maxSizeMB: 1
    })

    const avatarUrl = await uploadImage(compressedFile, 'avatars')

    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, {
      avatar: avatarUrl
    })

    userStore.updateProfile({ avatar: avatarUrl })

    // 清除討論區的用戶資訊緩存，確保頭貼更新
    const { useDiscussionsStore } = await import('@/stores/discussions')
    const discussionsStore = useDiscussionsStore()
    if (discussionsStore && discussionsStore.clearUserCache) {
      discussionsStore.clearUserCache(user.value.uid)
    }

    isAvatarCropOpen.value = false
    avatarFileToCrop.value = null
    if (avatarCropModalRef.value) {
      avatarCropModalRef.value.resetUploadState()
    }
  } catch (error) {
    console.error('上傳頭貼失敗：', error)
    alert('上傳頭貼失敗，請重試')
    if (avatarCropModalRef.value) {
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
    loadProfileData()
  }
}, { immediate: false })

watch(() => targetUid.value, (newUid, oldUid) => {
  if (newUid !== oldUid && newUid) {
    viewingUser.value = null
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
      @edit-profile="isEditingProfile = true"
      @edit-bio="isEditingProfile = true"
      @update-avatar="handleUpdateAvatar"
      @open-friends="handleOpenFriends"
      @chat="handleChat"
      @add-friend="handleAddFriend"
    />

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
          />

          <TabPosts
            v-if="activeTab === 'posts'"
            :posts="activeTabsData.posts"
            @open-detail="openDetail($event, false)"
            @open-comment="openDetail($event, true)"
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
