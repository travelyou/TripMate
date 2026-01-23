<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import { usePersonalityStore } from '@/stores/personality'
import { getTravelers } from '@/api/travelers'

// Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import AvatarCropModal from '@/components/modals/AvatarCropModal.vue'

// Tabs
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'
import TabDrafts from '@/components/profile/tabs/TabDrafts.vue'

// Modals for details
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'
import PersonalityResultModal from '@/components/modals/PersonalityResultModal.vue'

// [NEW] 引入位於新路徑的名片設定組件 (包含預覽與編輯)
import CardSettingsModal from '@/components/profile/card/CardSettingsModal.vue'

const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()
const personalityStore = usePersonalityStore()
const router = useRouter()
const route = useRoute()

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
      }
    )
  }
  return viewingUser.value || userStore.currentUser
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
const selectedPost = ref(null)
const selectedTraveler = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false) // 編輯個人檔案 (Email/密碼等)
const isFriendModalOpen = ref(false)
const isPersonalityModalOpen = ref(false)
const isAvatarCropOpen = ref(false)
const avatarFileToCrop = ref(null)

// [NEW] 名片 Modal 狀態
const isCardSettingsOpen = ref(false)
const isMatchingEnabled = ref(true)

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

// 1. 名片與配對相關
const openCardSettings = () => {
  isCardSettingsOpen.value = true
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

// 儲存名片 (Bio, Tags, Wishlist) - 由 CardSettingsModal 觸發
const handleSaveCard = async (formData) => {
  if (!user.value?.uid) return
  try {
    const { updateUserProfile } = await import('@/api/users')
    const { updateWishlist } = await import('@/api/profile')

    // 更新個人資料
    await updateUserProfile(user.value.uid, {
      bio: formData.bio,
      tags: formData.tags,
    })

    // 更新許願清單
    await updateWishlist(user.value.uid, formData.wishlist || [])

    // 更新 Store (讓 UI 即時反應)
    userStore.updateProfile({
      bio: formData.bio,
      tags: formData.tags,
    })
    userStore.wishlist = formData.wishlist || []

    // 重新拉取資料確保同步
    await loadProfileData()

    // 這裡不需關閉 Modal，因為 CardSettingsModal 內部邏輯會切回預覽模式
  } catch (error) {
    console.error('儲存名片失敗', error)
    alert('儲存失敗')
  }
}

// 2. 個人檔案編輯 (帳號層級)
const handleSaveProfile = async (formData) => {
  if (!isCurrentUser.value || !user.value?.uid) return
  // ... (保留原有的 handleSaveProfile 邏輯，處理 nickname, location, avatar 等)
  // 為節省篇幅，這裡使用簡化的邏輯，請保留你原本完整的代碼
  const { wishlist, hiddenStamps, tags, ...profileData } = formData
  try {
    const { updateUserProfile } = await import('@/api/users')
    await updateUserProfile(user.value.uid, {
      nickname: profileData.nickname || profileData.name,
      location: profileData.location,
      avatar: profileData.avatar,
      // 注意：這裡不更新 bio 和 tags，因為那是名片負責的
    })
    userStore.updateProfile({
      ...profileData,
      nickname: profileData.nickname || profileData.name,
    })
    isEditingProfile.value = false
    await loadProfileData()
  } catch (e) {
    console.error(e)
  }
}

// 3. 好友與聊天相關
const friendRequestStatus = ref('none')
const checkFriendRequestStatus = async () => {
  // ... (保留原本的邏輯)
}

const handleAddFriend = async () => {
  // ... (保留原本的邏輯)
}

const handleChat = () => {
  // ... (保留原本的邏輯)
}

const handleOpenFriends = () => {
  isFriendModalOpen.value = true
}

// 4. 資料載入
const loadProfileData = async () => {
  const uidToLoad = route.params.uid || userStore.currentUser?.uid
  if (!uidToLoad) return

  loading.value = true
  try {
    const { getProfile } = await import('@/api/profile')
    const profileData = await getProfile(uidToLoad)

    // 載入貼文與活動
    const { getTravelers } = await import('@/api/travelers')
    const travelersRes = await getTravelers({ author_uid: uidToLoad, limit: 100 })
    if (travelersRes.success) hostedTravelers.value = travelersRes.data

    const { fetchPosts } = await import('@/api/discussions')
    const postsRes = await fetchPosts({ author_uid: uidToLoad, limit: 100 })
    if (postsRes?.posts) userPosts.value = postsRes.posts

    // 處理 User Data
    if (profileData) {
      // 設定 isMatchingEnabled
      if (typeof profileData.user.is_matching_enabled !== 'undefined') {
        isMatchingEnabled.value = profileData.user.is_matching_enabled
      }

      if (!isCurrentUser.value) {
        viewingUser.value = {
          ...profileData.user,
          friends: profileData.friends,
          wishlist: profileData.wishlist,
        }
        await checkFriendRequestStatus()
      } else {
        userStore.setUserProfile(profileData.user)
        userStore.wishlist = profileData.wishlist
        userStore.currentUser.friends = profileData.friends
      }
      profileStats.value = profileData.stats || profileStats.value
    }
  } catch (error) {
    console.error('Load profile failed', error)
  } finally {
    loading.value = false
  }
}

// 5. 其他 UI 邏輯
const openDetail = (item, focusComment = false) => {
  // ... (保留原本邏輯)
  if (item.type === 'traveler') {
    selectedTraveler.value = item
    isTravelerDetailModalOpen.value = true
  } else {
    selectedPost.value = item
    isDetailModalOpen.value = true
  }
}

const handleUpdateAvatar = (file) => {
  avatarFileToCrop.value = file
  isAvatarCropOpen.value = true
}

const handleAvatarCrop = async (croppedFile) => {
  // ... (保留上傳邏輯)
  isAvatarCropOpen.value = false
}

watch(
  () => route.params.uid,
  () => {
    loadProfileData()
  },
  { immediate: true },
)

onMounted(() => {
  nextTick(() => loadProfileData())
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
      @update-avatar="handleUpdateAvatar"
      @open-friends="handleOpenFriends"
      @chat="handleChat"
      @add-friend="handleAddFriend"
      @open-card-settings="openCardSettings"
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
          />
        </div>

        <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
          <div
            class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1 flex space-x-1 overflow-x-auto"
          >
            <button
              v-for="tab in tabs"
              :key="tab.k"
              @click="activeTab = tab.k"
              :class="[
                'flex-1 py-2 text-sm font-semibold rounded-xl transition',
                activeTab === tab.k
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-secondary-500 hover:bg-secondary-50',
              ]"
            >
              {{ tab.l }}
            </button>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 min-h-[400px] p-6">
            <TabVisitedPlaces
              v-if="activeTab === 'visited_places'"
              :visited-places="user.visitedPlaces"
              :is-current-user="isCurrentUser"
            />
            <TabHostedTrips
              v-if="activeTab === 'hosted_trips'"
              :trips="activeTabsData.hostedTrips"
              @open-detail="openDetail"
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
      @close="isEditingProfile = false"
      @save="handleSaveProfile"
    />

    <CardSettingsModal
      v-if="isCurrentUser"
      :is-open="isCardSettingsOpen"
      :user="user"
      :is-matching-enabled="isMatchingEnabled"
      @close="isCardSettingsOpen = false"
      @toggle-matching="handleToggleMatching"
      @save="handleSaveCard"
    />

    <FriendListModal
      :is-open="isFriendModalOpen"
      :friends="user.friends"
      @close="isFriendModalOpen = false"
    />
    <DiscussionDetailModal
      v-if="isDetailModalOpen"
      :post="selectedPost"
      @close="isDetailModalOpen = false"
    />
    <TravelerDetailModal
      v-if="isTravelerDetailModalOpen"
      :traveler="selectedTraveler"
      @close="isTravelerDetailModalOpen = false"
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
