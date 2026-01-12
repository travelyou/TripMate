<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import DiscussionDetailModal from '@/components/modals/DiscussionDetailModal.vue'
import { useRoute } from 'vue-router'
import { getUserProfile } from '@/api/users'
import { addFriend, getFriends } from '@/api/friends'
import { useChatUiStore } from '@/stores/chatUi'

// Import New Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import FriendListModal from '@/components/profile/FriendListModal.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'

// Store setup
const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()
const chatUiStore = useChatUiStore()
const route = useRoute()

const currentUid = computed(() => userStore.firebaseUser?.uid || null)
const viewingUid = computed(() => (route.params.uid ? String(route.params.uid) : null))

const viewedUser = ref(null) // when viewing other user
const user = computed(() => (viewingUid.value && viewingUid.value !== currentUid.value ? viewedUser.value : userStore.currentUser))
const isCurrentUser = computed(() => !viewingUid.value || viewingUid.value === currentUid.value)

// Tab State
const activeTab = ref('hosted_trips')
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
const friends = ref([]) // [{uid,nickname,avatar}]

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
    posts: discussionsStore.discussions.filter((p) => p.author === user.value.name),
    reviews: user.value.reviews || [],
  }
})

// Stats for Header
const stats = computed(() => ({
  hosted: activeTabsData.value.hostedTrips.length,
  posts: activeTabsData.value.posts.length,
  reviews: activeTabsData.value.reviews.length,
  friends: user.value.friends ? user.value.friends.length : 0,
}))

// Methods
const handleOpenFriends = () => {
  isFriendModalOpen.value = true
  loadFriends().catch(() => {})
}

const handleChat = (friend) => {
  const otherUid = friend?.uid
  if (!otherUid) return
  chatUiStore.openWithUid(otherUid)
}

const handleAddFriend = async () => {
  if (!currentUid.value) return alert('請先登入')
  if (!viewingUid.value) return
  try {
    await addFriend(currentUid.value, viewingUid.value)
    // 加好友後直接打開聊天室
    chatUiStore.openWithUid(viewingUid.value)
    alert('已加好友，已為你打開聊天室')
  } catch (e) {
    alert('加好友失敗：' + (e?.message || e))
  }
}

const handleChatWithViewedUser = () => {
  if (!viewingUid.value) return
  chatUiStore.openWithUid(viewingUid.value)
}

async function loadFriends() {
  if (!currentUid.value) return
  const { friends: rows } = await getFriends(currentUid.value)
  friends.value = rows || []
}

async function loadViewedUser(uid) {
  viewedUser.value = null
  const data = await getUserProfile(uid)
  if (!data) {
    viewedUser.value = {
      uid,
      name: uid,
      nickname: uid,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
      bio: '',
      tags: [],
      reviews: [],
      friends: [],
    }
    return
  }
  viewedUser.value = {
    uid: data.uid,
    name: data.real_name || data.nickname || data.email?.split('@')?.[0] || data.uid,
    nickname: data.nickname || data.email?.split('@')?.[0] || data.uid,
    email: data.email,
    avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.uid}`,
    bio: data.bio || '',
    tags: [],
    reviews: [],
    friends: [],
  }
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

  // Update Wishlist
  userStore.wishlist = wishlist

  // Update Hidden Stamps
  userStore.hiddenStamps = hiddenStamps

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
  const places =
    type === 'domestic' ? userStore.visitedPlaces.domestic : userStore.visitedPlaces.international
  places.splice(index, 1)
}

const handleUpdateAvatar = (file) => {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    // Update store directly for immediate feedback
    // In a real app, you would upload to server first
    userStore.updateProfile({ avatar: e.target.result })
  }
  reader.readAsDataURL(file)
}

// Ensure store consistency
onMounted(() => {
  if (viewingUid.value && viewingUid.value !== currentUid.value) {
    loadViewedUser(viewingUid.value).catch((e) => console.warn('載入他人資料失敗：', e?.message || e))
  }
})

watch(
  () => viewingUid.value,
  (uid) => {
    if (uid && uid !== currentUid.value) {
      loadViewedUser(uid).catch((e) => console.warn('載入他人資料失敗：', e?.message || e))
    } else {
      viewedUser.value = null
    }
  },
)
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
      @add-friend="handleAddFriend"
      @chat="handleChatWithViewedUser"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Right Column: Sidebar (First on Mobile, Right on Desktop) -->
      <div class="lg:col-start-3 lg:row-start-1 space-y-4 md:space-y-6">
        <ProfileSidebar :user="user" :wishlist="userStore.wishlist" />
      </div>

      <!-- Left Column: Tabs & Content (Second on Mobile, Left on Desktop) -->
      <div class="lg:col-span-2 lg:row-start-1 space-y-4 md:space-y-6">
        <!-- Tab Navigation -->
        <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1.5 md:p-2 flex space-x-1">
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
      :friends="friends"
      @close="isFriendModalOpen = false"
      @chat="handleChat"
    />

    <DiscussionDetailModal
      v-if="isDetailModalOpen"
      :post="selectedPost"
      :scroll-to-comments="shouldScrollToComments"
      @close="isDetailModalOpen = false"
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
