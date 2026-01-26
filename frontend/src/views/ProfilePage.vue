<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePersonalityStore } from '@/stores/personality'
import { getTravelers } from '@/api/travelers'

// Modal Components
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import TravelerApplyModal from '@/components/modals/TravelerApplyModal.vue'
import TravelerApplicationsModal from '@/components/modals/TravelerApplicationsModal.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import PersonalityResultModal from '@/components/modals/PersonalityResultModal.vue'

// Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import AvatarCropModal from '@/components/modals/AvatarCropModal.vue'
import AvatarPickerModal from '@/components/modals/AvatarPickerModal.vue'

// Tabs
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'
import TabDrafts from '@/components/profile/tabs/TabDrafts.vue'

// [NEW] 引入名片設定組件
import CardSettingsModal from '@/components/profile/card/CardSettingsModal.vue'
import SettingsModal from '@/components/profile/SettingsModal.vue'

const userStore = useUserStore()
const personalityStore = usePersonalityStore()
const route = useRoute()
const router = useRouter()

// --- 核心資料計算 ---
const targetUid = computed(() => {
  if (route.params.uid) return route.params.uid
  if (userStore.isLoggedIn && userStore.currentUser?.uid) return userStore.currentUser.uid
  return null
})

const isCurrentUser = computed(() => {
  if (!userStore.currentUser?.uid || !targetUid.value) return false
  return userStore.currentUser.uid === targetUid.value
})

const viewingUser = ref(null)
const user = computed(() => {
  // 如果是查看他人檔案
  if (targetUid.value && targetUid.value !== userStore.currentUser?.uid) {
    return (
      viewingUser.value || {
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
        gallery: [],
        // Card specific
        card_bio: '',
        card_tags: [],
        card_photo: '',
      }
    )
  }
  // 如果是查看自己檔案，直接返回 currentUser，不清空 viewingUser 以保持資料一致性
  // 但確保返回的是最新的 currentUser
  return userStore.currentUser || null
})

const personalityResult = computed(() => personalityStore.savedResult || personalityStore.result)

const displayWishlist = computed(() => {
  return isCurrentUser.value ? userStore.wishlist : user.value.wishlist || []
})

// --- Tabs 設定 ---
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

// --- 狀態控制變數 ---
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
const isAvatarPickerOpen = ref(false)

// [NEW] 名片 Modal 狀態
const isCardSettingsOpen = ref(false)
const isMatchingEnabled = ref(true)
const friendRequestStatus = ref(null)

// 設定 Modal 狀態
const isSettingsOpen = ref(false)

const hostedTravelers = ref([])
const userPosts = ref([])
const loading = ref(false)

const activeTabsData = computed(() => {
  const targetUidValue = targetUid.value
  return {
    hostedTrips: hostedTravelers.value
      .filter((traveler) => (traveler.author_uid || traveler.authorUid) === targetUidValue)
      .map((traveler) => ({
        ...traveler,
        comments: traveler.comments || 0,
        tags: traveler.tags || [],
      })),
    posts: userPosts.value.filter((post) => (post.author_uid || post.authorUid) === targetUidValue),
    reviews: (user.value && user.value.reviews) || [],
  }
})

const profileStats = ref({ hosted: 0, posts: 0, reviews: 0, friends: 0 })
const stats = computed(() => ({
  hosted: profileStats.value.hosted || activeTabsData.value.hostedTrips.length,
  posts: profileStats.value.posts || activeTabsData.value.posts.length,
  reviews: profileStats.value.reviews || activeTabsData.value.reviews.length,
  friends: profileStats.value.friends || user.value?.friends?.length || 0,
}))

// --- Methods ---

const openCardSettings = () => {
  isCardSettingsOpen.value = true
}

const openSettings = () => {
  isSettingsOpen.value = true
}

const handleToggleMatching = async () => {
  if (!isCurrentUser.value || !user.value?.uid) return
  const newValue = !isMatchingEnabled.value
  isMatchingEnabled.value = newValue
  try {
    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, { is_matching_enabled: newValue })
    if (userStore.updateProfile) {
      userStore.updateProfile({ isMatchingEnabled: newValue })
    }
  } catch (error) {
    console.error('更新配對狀態失敗', error)
    isMatchingEnabled.value = !newValue // Rollback
    alert('設定失敗，請稍後再試')
  }
}

// 儲存名片：只存 card_bio, card_tags, card_photo
const handleSaveCard = async (formData) => {
  if (!user.value?.uid) return
  try {
    const { updateUserProfile } = await import('@/api/users')

    // 只更新名片專用欄位
    const updateData = {
      card_bio: formData.card_bio,
      card_tags: formData.card_tags,
      card_photo: formData.card_photo,
      gallery: formData.gallery,
    }

    await updateUserProfile(user.value.uid, updateData)

    // 更新 Store (讓 UI 即時反應)
    userStore.updateProfile(updateData)

    // 重新拉取資料確保同步
    await loadProfileData()
  } catch (error) {
    console.error('儲存名片失敗', error)
    alert('儲存失敗')
  }
}

// [修正] 個人檔案編輯 (帳號層級 + 許願球池 + 標籤)
const handleSaveProfile = async (formData) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  // 1. 解構資料
  const { wishlist, tags, ...profileData } = formData

  try {
    const { updateUserProfile } = await import('@/api/users')
    const { updateWishlist } = await import('@/api/profile')

    // 2. 更新使用者基本資料 (包含 tags)
    await updateUserProfile(user.value.uid, {
      nickname: profileData.nickname || profileData.name,
      location: profileData.location,
      avatar: profileData.avatar,
      bio: profileData.bio, // 這是個人檔案的 bio
      tags: tags || [], // [修正] 這裡要存個人檔案的 tags
    })

    // 3. [修正] 更新許願球池 (這段之前漏掉了！)
    const newWishlist = Array.isArray(wishlist) ? wishlist : []
    await updateWishlist(user.value.uid, newWishlist)

    // 4. 更新 Store
    userStore.updateProfile({
      ...profileData,
      nickname: profileData.nickname || profileData.name,
      tags: tags || [],
    })
    userStore.wishlist = newWishlist // 更新 Store 中的球池

    isEditingProfile.value = false
    await loadProfileData()
  } catch (e) {
    console.error('儲存個人檔案失敗', e)
    alert('儲存失敗，請稍後再試')
  }
}

const handleAddFriend = async () => {
  if (!user.value?.uid || !userStore.currentUser?.uid) {
    alert('無法加好友，請先登入')
    return
  }
  const friendUid = user.value.uid
  const currentUid = userStore.currentUser.uid
  if (friendUid === currentUid) {
    alert('不能加自己為好友')
    return
  }

  try {
    const { addFriend, removeFriend } = await import('@/api/profile')

    // 如果已經是好友，執行解除好友
    if (friendRequestStatus.value === 'accepted') {
      const confirmed = confirm('確定要解除好友關係嗎？')
      if (!confirmed) return

      await removeFriend(currentUid, friendUid)
      alert('已解除好友')
      friendRequestStatus.value = null
      await loadProfileData()
      return
    }

    // 如果已發送請求，提示用戶
    if (friendRequestStatus.value === 'sent') {
      alert('已發送好友請求，請等待對方回應')
      return
    }

    // 發送好友請求
    await addFriend(currentUid, friendUid)
    alert('已發送好友請求')
    friendRequestStatus.value = 'sent'
    await loadProfileData()
  } catch (error) {
    console.error('加好友失敗：', error)
    alert(error.message || '操作失敗，請稍後再試')
  }
}

const handleChat = () => {
  const targetUser = user.value || viewingUser.value
  if (targetUser && targetUser.uid) {
    window.dispatchEvent(
      new CustomEvent('open-chat', {
        detail: {
          user: {
            uid: targetUser.uid,
            name: targetUser.name || targetUser.nickname,
            nickname: targetUser.nickname || targetUser.name,
            avatar: targetUser.avatar || '',
          },
        },
      }),
    )
  }
}

const handleOpenFriends = () => {
  isFriendModalOpen.value = true
}

// 資料載入
const loadProfileData = async () => {
  const uidToLoad = route.params.uid || userStore.currentUser?.uid
  if (!uidToLoad) return

  loading.value = true
  try {
    const { getProfile } = await import('@/api/profile')
    const profileData = await getProfile(uidToLoad)

    const { getTravelers } = await import('@/api/travelers')
    const travelersRes = await getTravelers({ author_uid: uidToLoad, limit: 100 })
    if (travelersRes.success) hostedTravelers.value = travelersRes.data

    const { fetchPosts } = await import('@/api/discussions')
    const postsRes = await fetchPosts({ author_uid: uidToLoad, limit: 100 })
    if (postsRes?.posts) userPosts.value = postsRes.posts

    if (profileData) {
      if (typeof profileData.user.is_matching_enabled !== 'undefined') {
        isMatchingEnabled.value = profileData.user.is_matching_enabled
      }

      // 檢查是否為當前用戶
      const isCurrentUserProfile = uidToLoad === userStore.currentUser?.uid

      if (!isCurrentUserProfile) {
        // 查看他人檔案：更新 viewingUser
        viewingUser.value = {
          ...profileData.user,
          friends: profileData.friends,
          wishlist: profileData.wishlist,
          visitedPlaces: profileData.visitedPlaces || { domestic: [], international: [] },
        }
        // 這裡不需要還原性格測驗，看別人不用看那麼細
      } else {
        // 查看自己檔案：更新 userStore，並清空 viewingUser
        viewingUser.value = null
        userStore.setUserProfile(profileData.user)
        userStore.wishlist = profileData.wishlist
        userStore.currentUser.friends = profileData.friends

        // 更新 visitedPlaces
        if (profileData.visitedPlaces) {
          userStore.visitedPlaces = {
            domestic: profileData.visitedPlaces.domestic || [],
            international: profileData.visitedPlaces.international || [],
          }
        }

        // [修正] 還原性格測驗結果，讓側邊欄顯示
        const hasPersonality = personalityStore.savedResult || personalityStore.result
        if (!hasPersonality && userStore.currentUser?.spiritAnimal) {
          personalityStore.hydrateResultFromSpiritAnimal(userStore.currentUser.spiritAnimal)
        }
      }
      profileStats.value = profileData.stats || profileStats.value
    }
  } catch (error) {
    console.error('Load profile failed', error)
  } finally {
    loading.value = false
  }
}

const openDetail = (item, scrollToComments = false) => {
  shouldScrollToComments.value = !!scrollToComments
  if (item.type === 'traveler') {
    selectedTraveler.value = item
    isTravelerDetailModalOpen.value = true
  } else {
    selectedPost.value = item
    isDetailModalOpen.value = true
  }
}

const loadHostedTravelers = async (uid = targetUid.value) => {
  if (!uid) return
  try {
    const travelersRes = await getTravelers({ author_uid: uid, limit: 100 })
    if (travelersRes.success) hostedTravelers.value = travelersRes.data
  } catch (error) {
    console.error('載入主揪旅程失敗', error)
  }
}

const handleSaveField = async ({ field, data }) => {
  if (!isCurrentUser.value || !user.value?.uid) return
  try {
    if (field === 'wishlist') {
      const { updateWishlist } = await import('@/api/profile')
      const nextWishlist = Array.isArray(data?.wishlist) ? data.wishlist : []
      await updateWishlist(user.value.uid, nextWishlist)
      userStore.wishlist = nextWishlist
      return
    }

    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, data || {})
    userStore.updateProfile(data || {})
  } catch (error) {
    console.error('欄位儲存失敗', error)
    alert('儲存失敗，請稍後再試')
  }
}

const handleUpdateWishlist = (nextWishlist) => {
  userStore.wishlist = Array.isArray(nextWishlist) ? nextWishlist : []
}

// 處理新增去過的地方
const handleAddVisitedPlace = async (placeData) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  try {
    const { addVisitedPlace } = await import('@/api/profile')
    const result = await addVisitedPlace(user.value.uid, placeData)

    // 更新 Store（使用 API 返回的完整資料，包含 id）
    userStore.addVisitedPlace(
      {
        id: result.id,
        name: result.name || placeData.name,
        date: result.date || placeData.date,
        icon: result.icon || placeData.icon,
      },
      placeData.type
    )

    // 重新載入資料以確保同步
    await loadProfileData()
  } catch (error) {
    console.error('新增去過的地方失敗：', error)
    alert(error.message || '新增失敗，請稍後再試')
  }
}

// 處理刪除去過的地方
const handleRemoveVisitedPlace = async ({ type, index }) => {
  if (!isCurrentUser.value || !user.value?.uid) return

  try {
    const { removeVisitedPlace } = await import('@/api/profile')

    // 獲取要刪除的項目 ID
    const places = type === 'domestic'
      ? user.value.visitedPlaces?.domestic || []
      : user.value.visitedPlaces?.international || []

    if (index >= 0 && index < places.length) {
      const place = places[index]
      // 使用 id 刪除
      if (place.id) {
        await removeVisitedPlace(user.value.uid, place.id)
      } else {
        console.warn('無法刪除：缺少項目 ID')
        alert('無法刪除：缺少項目 ID，請重新載入頁面後再試')
        return
      }
    }

    // 重新載入資料以確保同步
    await loadProfileData()
  } catch (error) {
    console.error('刪除去過的地方失敗：', error)
    alert(error.message || '刪除失敗，請稍後再試')
  }
}

const handlePostEdit = () => {
  isDetailModalOpen.value = false
}

const handleTravelerEdit = (traveler) => {
  selectedTravelerDraft.value = traveler || selectedTraveler.value
  isTravelerPostModalOpen.value = true
}

const handleTravelerOpenApply = () => {
  isTravelerApplyModalOpen.value = true
}

const handleTravelerOpenApplications = () => {
  isTravelerApplicationsModalOpen.value = true
}

const handleTravelerPostModalClose = () => {
  isTravelerPostModalOpen.value = false
  selectedTravelerDraft.value = null
}

const handleTravelerPostSuccess = async () => {
  handleTravelerPostModalClose()
  await loadHostedTravelers(targetUid.value)
}

const handleUpdateAvatar = (file) => {
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
      maxSizeMB: 1,
    })
    const avatarUrl = await uploadImage(compressedFile, 'avatars')
    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, { avatar: avatarUrl })
    userStore.updateProfile({ avatar: avatarUrl })
    isAvatarCropOpen.value = false
    avatarFileToCrop.value = null
  } catch (error) {
    console.error(error)
    alert('上傳頭貼失敗')
  }
}

const handleOpenAvatarPicker = () => {
  isAvatarPickerOpen.value = true
}

const handleSelectPresetAvatar = async (avatarUrl) => {
  if (!isCurrentUser.value || !avatarUrl) return
  try {
    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, { avatar: avatarUrl })
    userStore.updateProfile({ avatar: avatarUrl })
    isAvatarPickerOpen.value = false
  } catch (error) {
    console.error(error)
    alert('更新頭貼失敗')
  }
}

watch(
  () => route.params.uid,
  (newUid, oldUid) => {
    // 當從他人檔案切換回自己檔案時，清空 viewingUser
    const currentUid = userStore.currentUser?.uid
    if (oldUid && oldUid !== currentUid && (!newUid || newUid === currentUid)) {
      viewingUser.value = null
    }
    loadProfileData()
  },
  { immediate: true },
)

// 監聽路由查詢參數變化（用於處理通知跳轉）
watch(() => route.query.openFriends, (shouldOpen) => {
  if (shouldOpen === 'true') {
    nextTick(() => {
      isFriendModalOpen.value = true
      router.replace({ path: '/profile', query: {} })
    })
  }
})

onMounted(() => {
  nextTick(() => {
    loadProfileData()

    // 檢查是否需要打開好友列表（來自通知）
    if (route.query.openFriends === 'true') {
      isFriendModalOpen.value = true
      router.replace({ path: '/profile', query: {} })
    }
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
      @open-card-settings="openCardSettings"
      @open-settings="openSettings"
      @open-avatar-picker="handleOpenAvatarPicker"
    />

    <template v-if="!loading">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-start-3 lg:row-start-1 space-y-4 md:space-y-6">
          <ProfileSidebar
            :user="user"
            :wishlist="displayWishlist"
            :personality-result="personalityResult"
            :is-current-user="isCurrentUser"
            @open-personality-result="isPersonalityModalOpen = true"
            @edit-wishlist="isEditingProfile = true"
          />
        </div>

        <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
          <div
            class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1 flex space-x-1 overflow-x-auto"
          >
            <button
              v-for="tab in tabs"
              :key="tab.k"
              :class="[
                'flex-1 py-2 text-sm font-semibold rounded-xl transition',
                activeTab === tab.k
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-secondary-500 hover:bg-secondary-50',
              ]"
              @click="activeTab = tab.k"
            >
              {{ tab.l }}
            </button>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 min-h-[400px] p-6">
            <TabVisitedPlaces
              v-if="activeTab === 'visited_places'"
              :visited-places="user.visitedPlaces"
              :is-current-user="isCurrentUser"
              @add-place="handleAddVisitedPlace"
              @remove-place="handleRemoveVisitedPlace"
            />
            <TabHostedTrips
              v-if="activeTab === 'hosted_trips'"
              :trips="activeTabsData.hostedTrips"
              @open-detail="openDetail"
              @edit="handleTravelerEdit"
            />
            <TabPosts
              v-if="activeTab === 'posts'"
              :posts="activeTabsData.posts"
              @open-detail="openDetail"
            />
            <TabReviews v-if="activeTab === 'reviews'" :reviews="activeTabsData.reviews" />
            <TabDrafts v-if="activeTab === 'drafts'" />
          </div>
        </div>
      </div>
    </template>

    <EditProfileModal
      v-if="isCurrentUser"
      :is-open="isEditingProfile"
      :user="user"
      :wishlist="displayWishlist"
      @close="isEditingProfile = false"
      @save="handleSaveProfile"
      @save-field="handleSaveField"
      @update-wishlist="handleUpdateWishlist"
    />

    <CardSettingsModal
      v-if="isCurrentUser"
      :is-open="isCardSettingsOpen"
      :user="user"
      :wishlist="displayWishlist"
      :is-matching-enabled="isMatchingEnabled"
      @close="isCardSettingsOpen = false"
      @toggle-matching="handleToggleMatching"
      @save="handleSaveCard"
    />

    <SettingsModal
      v-if="isCurrentUser"
      :is-open="isSettingsOpen"
      :user="user"
      @close="isSettingsOpen = false"
    />

    <FriendListModal
      :is-open="isFriendModalOpen"
      :friends="user.friends"
      @close="isFriendModalOpen = false"
    />
    <DiscussionDetailModal
      v-if="isDetailModalOpen"
      :post="selectedPost"
      :scroll-to-comments="shouldScrollToComments"
      @close="isDetailModalOpen = false"
      @edit="handlePostEdit"
    />
    <TravelerDetailModal
      v-if="isTravelerDetailModalOpen"
      :traveler="selectedTraveler"
      @close="isTravelerDetailModalOpen = false"
      @open-apply="handleTravelerOpenApply"
      @open-applications="handleTravelerOpenApplications"
      @edit="handleTravelerEdit"
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
      @traveler-updated="loadHostedTravelers(targetUid)"
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
      @close="isPersonalityModalOpen = false"
    />
    <AvatarCropModal
      :is-open="isAvatarCropOpen"
      :image-file="avatarFileToCrop"
      @close="isAvatarCropOpen = false"
      @crop="handleAvatarCrop"
    />
    <AvatarPickerModal
      :is-open="isAvatarPickerOpen"
      @close="isAvatarPickerOpen = false"
      @select="handleSelectPresetAvatar"
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
