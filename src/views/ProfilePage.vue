<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { useItineraryStore } from '@/stores/itinerary'
import PostDetailModal from '@/components/modals/PostDetailModal.vue'

// Import New Components
import ProfileHeader from '@/components/profile/ProfileHeader.vue'
import ProfileSidebar from '@/components/profile/ProfileSidebar.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import TabHostedTrips from '@/components/profile/tabs/TabHostedTrips.vue'
import TabVisitedPlaces from '@/components/profile/tabs/TabVisitedPlaces.vue'
import TabPosts from '@/components/profile/tabs/TabPosts.vue'
import TabReviews from '@/components/profile/tabs/TabReviews.vue'

// Store setup
const userStore = useUserStore()
const discussionsStore = useDiscussionsStore()
const itineraryStore = useItineraryStore()

const user = computed(() => userStore.currentUser)
const isCurrentUser = true // In real app, check if route param ID matches current user ID

// Tab State
const activeTab = ref('hosted_trips')
const tabs = [
  { k: 'hosted_trips', l: '主揪的旅行' },
  { k: 'visited_places', l: '去過的地方' },
  { k: 'posts', l: '貼文' },
  { k: 'reviews', l: '好評' },
]

// Modal State
const isDetailModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)
const isEditingProfile = ref(false)

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
    reviews: user.value.reviews || []
  }
})

// Stats for Header
const stats = computed(() => ({
  hosted: activeTabsData.value.hostedTrips.length,
  posts: activeTabsData.value.posts.length,
  reviews: activeTabsData.value.reviews.length
}))

// Methods
const openDetail = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const handleSaveProfile = (updatedProfile) => {
  userStore.updateProfile(updatedProfile)
  isEditingProfile.value = false
}

const handleAddPlace = ({ type, name, date }) => {
  const newPlaceObj = {
    name: name,
    date: date || new Date().toISOString().slice(0, 7).replace('-', '.'),
  }
  userStore.addVisitedPlace(newPlaceObj, type)
}

const handleRemovePlace = ({ type, index }) => {
  const places = type === 'domestic' ? userStore.visitedPlaces.domestic : userStore.visitedPlaces.international
  places.splice(index, 1)
}

// Ensure store consistency
onMounted(() => {
  // If needed, fetch data here
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <!-- Header -->
    <ProfileHeader
      :user="user"
      :is-current-user="isCurrentUser"
      :stats="stats"
      @edit-profile="isEditingProfile = true"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column: Tabs & Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Tab Navigation -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex space-x-1">
          <button
            v-for="tab in tabs"
            :key="tab.k"
            :class="[
              'flex-1 py-3 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2',
              activeTab === tab.k
                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ]"
            @click="activeTab = tab.k"
          >
            {{ tab.l }}
          </button>
        </div>

        <!-- Tab Content Container -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] p-6">
          <TabHostedTrips
            v-if="activeTab === 'hosted_trips'"
            :trips="activeTabsData.hostedTrips"
            @open-detail="openDetail($event, false)"
          />

          <TabVisitedPlaces
            v-if="activeTab === 'visited_places'"
            :visited-places="userStore.visitedPlaces"
            :is-current-user="isCurrentUser"
            @add-place="handleAddPlace"
            @remove-place="handleRemovePlace"
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
          />
        </div>
      </div>

      <!-- Right Column: Sidebar -->
      <div class="space-y-6">
        <ProfileSidebar
          :user="user"
          :wishlist="userStore.wishlist"
        />
      </div>
    </div>

    <!-- Modals -->
    <EditProfileModal
      :is-open="isEditingProfile"
      :user="user"
      @close="isEditingProfile = false"
      @save="handleSaveProfile"
    />

    <PostDetailModal
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
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
