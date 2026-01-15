<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router' // 新增：引入路由以防萬一
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import { usePersonalityStore } from '@/stores/personality'

// Modal Components
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import PersonalityResultModal from '@/components/modals/PersonalityResultModal.vue'

// Profile Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'

// Store setup
const route = useRoute()
const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()
const personalityStore = usePersonalityStore()

// Computeds
const user = computed(() => userStore.currentUser)
const personalityResult = computed(() => personalityStore.savedResult || personalityStore.result)

// 判斷是否為當前用戶 (目前寫死為 true，保留你的邏輯)
const isCurrentUser = true

// Tab State
const activeTab = ref('hosted_trips') // 注意：這裡的值要跟 tabs 陣列裡的 k 對應
const tabs = [
  { k: 'visited_places', l: '去過的地方', s: '足跡' },
  { k: 'hosted_trips', l: '主揪的旅行', s: '主揪' },
  { k: 'posts', l: '貼文', s: '貼文' },
  { k: 'reviews', l: '好評', s: '好評' },
]

// Modal State
const isDetailModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false)
const isFriendModalOpen = ref(false)
const isPersonalityModalOpen = ref(false)

// Data Preparation (★ 修正核心：加入空值檢查)
const activeTabsData = computed(() => {
  // 如果使用者資料還沒載入，回傳空結構以防崩潰
  if (!user.value) {
    return { hostedTrips: [], posts: [], reviews: [] }
  }

  // 1. 處理主揪行程 (加上 || [] 防止 map 錯誤)
  const rawItineraries = itineraryStore.myItineraries || []
  const hostedTrips = rawItineraries.map((trip) => ({
    id: trip.id,
    title: trip.title,
    content: trip.description,
    image: trip.image,
    author: user.value?.name || '未知用戶', // 安全存取
    avatar: user.value?.avatar,
    spiritAnimal: user.value?.spiritAnimal || '🦁 樂天派',
    location: trip.location || '台灣',
    date: trip.startDate,
    status: trip.status || '招募中',
    people: `${trip.participants || 0}/${trip.maxParticipants || 0}`,
    comments: 0,
    tags: ['行程', trip.status || '未分類'],
    isAuthor: true,
    commentsData: [],
  }))

  // 2. 處理貼文 (加上 || [] 防止 filter 錯誤)
  const rawDiscussions = discussionsStore.discussions || []
  const posts = rawDiscussions.filter((p) => p.author === user.value?.name)

  // 3. 處理評價 (安全存取)
  const reviews = user.value?.reviews || []

  return {
    hostedTrips,
    posts,
    reviews,
  }
})

// Stats for Header (★ 修正核心：依賴安全的 activeTabsData)
const stats = computed(() => ({
  hosted: activeTabsData.value.hostedTrips.length,
  posts: activeTabsData.value.posts.length,
  reviews: activeTabsData.value.reviews.length,
  friends: user.value?.friends?.length || 0, // 安全存取
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

const handleSaveProfile = (formData) => {
  const { wishlist, hiddenStamps, ...profileData } = formData

  // Update Profile
  userStore.updateProfile(profileData)

  // Update Wishlist (直接更新 Store state)
  if (wishlist) userStore.wishlist = wishlist

  // Update Hidden Stamps
  if (hiddenStamps) userStore.hiddenStamps = hiddenStamps

  isEditingProfile.value = false
}

const handleAddPlace = ({ type, name, date, icon }) => {
  const newPlaceObj = {
    name: name,
    date: date || new Date().toISOString().slice(0, 7).replace('-', '.'),
    icon: icon, // Add icon support
  }
  userStore.addVisitedPlace(newPlaceObj, type)
}

const handleRemovePlace = ({ type, index }) => {
  // 確保 visitedPlaces 存在
  if (!userStore.visitedPlaces) return

  const places =
    type === 'domestic' ? userStore.visitedPlaces.domestic : userStore.visitedPlaces.international

  if (places) places.splice(index, 1)
}

const handleUpdateAvatar = (file) => {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    // Update store directly for immediate feedback
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

// Ensure store consistency
onMounted(async () => {
  // 可以在這裡呼叫 API 確保資料載入
  // await userStore.fetchUserProfile()
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
      @update-avatar="handleUpdateAvatar"
      @open-friends="handleOpenFriends"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Right Column: Sidebar (First on Mobile, Right on Desktop) -->
      <div class="lg:col-start-3 lg:row-start-1 space-y-4 md:space-y-6">
        <ProfileSidebar
          :user="user"
          :wishlist="userStore.wishlist"
          :personality-result="personalityResult"
          @open-personality-result="openPersonalityResult"
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
            :visited-places="userStore.visitedPlaces"
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
        </div>
      </div>
    </div>

    <!-- Modals -->
    <EditProfileModal
      :is-open="isEditingProfile"
      :user="user"
      :wishlist="userStore.wishlist"
      :hidden-stamps="userStore.hiddenStamps"
      @close="isEditingProfile = false"
      @save="handleSaveProfile"
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
