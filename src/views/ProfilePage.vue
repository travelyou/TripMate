<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import { usePersonalityStore } from '@/stores/personality'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import PersonalityResultModal from '@/components/modals/PersonalityResultModal.vue'

// Import New Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'
import TabDrafts from '@/components/profile/tabs/TabDrafts.vue'
import { useRouter, useRoute } from 'vue-router'

// Store setup
const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()
const personalityStore = usePersonalityStore()
const router = useRouter()
const route = useRoute()

const targetUid = computed(() => route.params.uid || userStore.currentUser?.uid)
const isCurrentUser = computed(() => {
  if (!userStore.currentUser?.uid || !targetUid.value) return false
  return userStore.currentUser.uid === targetUid.value
})

const viewingUser = ref(null)
const user = computed(() => viewingUser.value || userStore.currentUser)
const personalityResult = computed(() => personalityStore.savedResult || personalityStore.result)

// 用於實時連動許願球池的臨時狀態
const tempWishlist = ref(null)
const displayWishlist = computed(() => {
  // 如果編輯彈窗打開且有臨時狀態，使用臨時狀態；否則使用 store 中的數據
  if (isEditingProfile.value && tempWishlist.value !== null) {
    return tempWishlist.value
  }
  return isCurrentUser.value ? userStore.wishlist : (user.value.wishlist || [])
})

// Tab State
const activeTab = ref('hosted_trips')
const tabs = computed(() => {
  const baseTabs = [
  { k: 'visited_places', l: '去過的地方', s: '足跡' },
  { k: 'hosted_trips', l: '主揪的旅行', s: '主揪' },
  { k: 'posts', l: '貼文', s: '貼文' },
  { k: 'reviews', l: '好評', s: '好評' },
  ]
  // 只有本人才顯示草稿夾
  if (isCurrentUser.value) {
    baseTabs.push({ k: 'drafts', l: '草稿夾', s: '草稿' })
  }
  return baseTabs
})

// Modal State
const isDetailModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false)
const isFriendModalOpen = ref(false)
const isPersonalityModalOpen = ref(false)

// Data Preparation
const activeTabsData = computed(() => {
  return {
    hostedTrips: itineraryStore.myItineraries.map((trip) => ({
      id: trip.id,
      title: trip.title,
      content: trip.description,
      image: trip.image,
      author: user.value.name,
      avatar: user.value.avatar,
      spiritAnimal: user.value.spiritAnimal || '🦁 樂天派',
      location: trip.location || '台灣',
      date: trip.startDate,
      status: trip.status || '招募中',
      people: `${trip.participants}/${trip.maxParticipants}`,
      comments: 0,
      tags: ['行程', trip.status],
      isAuthor: true,
      commentsData: [],
    })),
    posts: discussionsStore.discussions.filter((p) =>
      p.author === user.value.name ||
      p.author === user.value.nickname ||
      p.author_uid === user.value.uid
    ),
    reviews: user.value.reviews || [],
  }
})

// Stats for Header
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
  friends: profileStats.value.friends || (user.value.friends ? user.value.friends.length : 0),
}))

// Methods
const handleOpenFriends = () => {
  isFriendModalOpen.value = true
}

const handleChat = (friend) => {
  console.log('Chat with:', friend.name)
  // Future: 導向聊天頁面
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
        // 標籤目前可能只是本地狀態，如果需要保存到後端，可以在這裡添加
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
    // 更新用戶基本資料
    const { updateUserProfile } = await import('@/api/users')
    // 確保 location 有值，如果為空或未定義則使用 '台灣'
    const locationValue = profileData.location && profileData.location.trim()
      ? profileData.location.trim()
      : '台灣'

    await updateUserProfile(user.value.uid, {
      nickname: profileData.nickname || profileData.name,
      location: locationValue,
      avatar: profileData.avatar,
      bio: profileData.bio,
      spirit_animal: profileData.spiritAnimal,
    })

    // 更新本地狀態（包括 tags）
    userStore.updateProfile({
      ...profileData,
      tags: tags || [],
    })

    // 更新許願球池
    const { updateWishlist } = await import('@/api/profile')
    const wishlistArray = Array.isArray(wishlist) ? wishlist : []
    await updateWishlist(user.value.uid, wishlistArray)
    userStore.wishlist = wishlistArray

    // Update Hidden Stamps (本地狀態)
    userStore.hiddenStamps = hiddenStamps

    // 重新載入個人檔案資料以確保數據同步
    await loadProfileData()

    // 關閉編輯彈窗
    handleCloseEditModal()
  } catch (error) {
    console.error('儲存個人檔案失敗：', error)
    // 即使發生錯誤也關閉彈窗
    handleCloseEditModal()
  }
}

const handleUpdateWishlist = (wishlist) => {
  // 更新臨時狀態，實現實時連動
  tempWishlist.value = wishlist
}

const handleCloseEditModal = () => {
  isEditingProfile.value = false
  // 重置臨時狀態
  tempWishlist.value = null
}

/**
 * 處理從 TabDrafts 分頁傳來的 'select-draft' 事件
 * @param {Object} draft - 使用者選中的草稿
 */
const handleSelectDraft = (draft) => {
  // 如果是行程相關的草稿
  if (draft.type === 'my_itinerary' || draft.type === 'itinerary') {
    // 跳轉到「我的行程」頁面，並透過 Query Parameter (查詢參數) 傳遞草稿 ID
    router.push({ path: '/my-itinerary', query: { openDraft: draft.id } })
  } else if (draft.type === 'discussion') {
    // 討論區草稿：跳轉到討論區頁面並傳遞草稿 ID
    router.push({ path: '/discussion', query: { openDraft: draft.id } })
  } else if (draft.type === 'traveler') {
    // 找旅伴草稿：跳轉到找旅伴頁面並傳遞草稿 ID
    router.push({ path: '/traveler', query: { openDraft: draft.id } })
  } else {
    // 其他類型的草稿暫時只跳出提示
    alert(
      `這是 ${draft.typeLabel} 的草稿，請至 ${draft.typeLabel === '找旅伴' ? '找旅伴頁面' : '討論區'} 編輯。`,
    )
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
      // 如果有 id，從資料庫刪除
      const { removeVisitedPlace } = await import('@/api/profile')
      await removeVisitedPlace(user.value.uid, id)
    }

    // 從本地狀態刪除
    if (places && typeof index === 'number' && index >= 0 && index < places.length) {
  places.splice(index, 1)
    }
  } catch (error) {
    console.error('刪除去過的地方失敗：', error)
  }
}

const handleUpdateAvatar = (file) => {
  if (!isCurrentUser.value || !file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    userStore.updateProfile({ avatar: e.target.result })
  }
  reader.readAsDataURL(file)
}

const openPersonalityResult = () => {
  isPersonalityModalOpen.value = true
}

const closePersonalityResult = () => {
  isPersonalityModalOpen.value = false
}

// 載入個人檔案資料
const loading = ref(false)
const loadProfileData = async () => {
  if (!targetUid.value) {
    if (!userStore.isLoggedIn) {
      router.push('/login')
    }
    return
  }

  loading.value = true
  try {
    const { getProfile } = await import('@/api/profile')
    const profileData = await getProfile(targetUid.value)

    if (profileData) {
      // 如果是查看其他用戶，創建一個新的用戶物件
      if (!isCurrentUser.value) {
        viewingUser.value = {
          id: profileData.user.uid,
          uid: profileData.user.uid,
          name: profileData.user.nickname || '用戶',
          nickname: profileData.user.nickname,
          email: profileData.user.email,
          avatar: profileData.user.avatar,
          bio: profileData.user.bio,
          spiritAnimal: profileData.user.spirit_animal,
          role: profileData.user.role,
          vendorId: profileData.user.vendor_id,
          friends: profileData.friends,
          reviews: profileData.reviews,
          visitedPlaces: profileData.visitedPlaces,
          wishlist: profileData.wishlist,
        }
      } else {
        // 如果是本人，更新 store 中的資料
        userStore.setUserProfile({
          uid: profileData.user.uid,
          email: profileData.user.email,
          nickname: profileData.user.nickname,
          avatar: profileData.user.avatar,
          bio: profileData.user.bio,
          spiritAnimal: profileData.user.spirit_animal,
          role: profileData.user.role,
          vendorId: profileData.user.vendor_id,
        })

        userStore.visitedPlaces = profileData.visitedPlaces
        userStore.wishlist = profileData.wishlist
        userStore.currentUser.friends = profileData.friends
        userStore.currentUser.reviews = profileData.reviews
      }

      // 更新統計資料
      profileStats.value = profileData.stats || {
        hosted: 0,
        posts: 0,
        reviews: 0,
        friends: 0
      }
    } else {
      // 如果找不到用戶資料，且不是當前用戶，跳轉到首頁
      if (!isCurrentUser.value) {
        router.push('/')
      }
    }
  } catch (error) {
    console.error('載入個人檔案資料失敗：', error)
    if (!isCurrentUser.value) {
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}

// 監聽路由變化
watch(() => route.params.uid, () => {
  viewingUser.value = null
  loadProfileData()
}, { immediate: true })

onMounted(() => {
  loadProfileData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 animate-fade-in">
    <!-- Header -->
    <ProfileHeader
      :user="user"
      :is-current-user="isCurrentUser"
      :stats="stats"
      @edit-profile="isEditingProfile = true"
      @edit-bio="isEditingProfile = true"
      @update-avatar="handleUpdateAvatar"
      @open-friends="handleOpenFriends"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Right Column: Sidebar (First on Mobile, Right on Desktop) -->
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

      <!-- Left Column: Tabs & Content (Second on Mobile, Left on Desktop) -->
      <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
        <!-- Tab Navigation -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1.5 md:p-2 flex space-x-1"
        >
          <button
            v-for="tab in tabs"
            :key="tab.k"
            :class="[
              'flex-1 py-2 md:py-3 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2',
              activeTab === tab.k
                ? 'bg-primary-50 text-primary-600 shadow-sm'
                : 'text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700',
            ]"
            @click="activeTab = tab.k"
          >
            <!-- Mobile Label -->
            <span class="md:hidden">{{ tab.s }}</span>
            <!-- Desktop Label -->
            <span class="hidden md:inline">{{ tab.l }}</span>
          </button>
        </div>

        <!-- Tab Content Container -->
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

          <!-- 草稿分頁內容：監聽選中草稿事件 -->
          <TabDrafts v-if="activeTab === 'drafts'" @select-draft="handleSelectDraft" />
        </div>
      </div>
    </div>

    <!-- Modals -->
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
      @chat="handleChat"
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
