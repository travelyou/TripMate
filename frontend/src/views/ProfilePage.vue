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

// [NEW] 引入名片設定組件
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
        // Card specific
        card_bio: '',
        card_tags: [],
        card_photo: '',
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
const isEditingProfile = ref(false)
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
  const { wishlist, hiddenStamps, tags, ...profileData } = formData

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
  // ... (保留原本邏輯)
}
const handleChat = () => {
  // ... (保留原本邏輯)
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

      if (!isCurrentUser.value) {
        viewingUser.value = {
          ...profileData.user,
          friends: profileData.friends,
          wishlist: profileData.wishlist,
        }
        // checkFriendRequestStatus() ...
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

const openDetail = (item) => {
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
      @edit-bio="isEditingProfile = true"
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
