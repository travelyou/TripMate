<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVendorStore } from '@/stores/vendor'
import { useUserStore } from '@/stores/user'
import DashboardNav from '@/components/vendor-dashboard/DashboardNav.vue'
import DashboardSidebar from '@/components/vendor-dashboard/DashboardSidebar.vue'
import DashboardHeader from '@/components/vendor-dashboard/DashboardHeader.vue'
import TabBasicInfo from '@/components/vendor-dashboard/tabs/TabBasicInfo.vue'
import TabItineraryList from '@/components/vendor-dashboard/tabs/TabItineraryList.vue'
import TabPostList from '@/components/vendor-dashboard/tabs/TabPostList.vue'
import { getVendorProfileRoute } from '@/utils/navigation'

import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'

const router = useRouter()
const vendorStore = useVendorStore()
const userStore = useUserStore()

const activeTab = ref('basic_info')

const showItineraryModal = ref(false)
const showPostModal = ref(false)

// Edit State
const editItineraryData = ref(null)
const isItineraryEdit = ref(false)

const vendorId = computed(() => {
  const id = userStore.currentUser?.vendorId || userStore.currentUser?.id || 'vendor001'
  console.log('🔄 [Dashboard] Computed vendorId:', id)
  return id
})
const currentVendor = computed(() => vendorStore.currentVendor)
const loading = computed(() => vendorStore.loading)

const handleLogout = () => {
  console.log('🚪 handleLogout triggered')
  userStore.logout()
  router.push('/login')
}

const handleSwitchToFrontend = () => {
  console.log('🚀 handleSwitchToFrontend triggered')
  const route = getVendorProfileRoute(userStore.currentUser)
  console.log('🚀 handleSwitchToFrontend -> target route:', route)
  router.push(route)
}

const openItineraryModal = () => {
  isItineraryEdit.value = false
  editItineraryData.value = null
  showItineraryModal.value = true
}

const handleEditItinerary = (item) => {
  console.log('✏️ Edit Itinerary:', item)
  isItineraryEdit.value = true
  editItineraryData.value = item
  showItineraryModal.value = true
}

const openPostModal = () => {
  showPostModal.value = true
}

// ... (success handlers)

// Template changes below

// In TabItineraryList:
// @edit="handleEditItinerary"

// In ItineraryPostModal:
// :initial-data="editItineraryData"
// :is-edit="isItineraryEdit"

const handleItinerarySuccess = async () => {
  showItineraryModal.value = false
  // 重新載入資料以更新列表
  await vendorStore.fetchVendorItineraries(vendorId.value)
  alert('行程發布成功！')
}

const handlePostSuccess = async () => {
  showPostModal.value = false
  // 重新載入資料 (雖然現在是 Mock，但這是正確的邏輯)
  await vendorStore.fetchVendorPosts(vendorId.value)
  alert('貼文發布成功！且已同步至前台討論區')
}

onMounted(async () => {
  console.log('🔍 [Dashboard] 當前用戶:', userStore.currentUser)
  console.log('🔍 [Dashboard] vendorId:', vendorId.value)

  console.log('🔍 [Dashboard] role:', userStore.currentUser?.role)

  await vendorStore.fetchVendorProfile(vendorId.value)
  await Promise.all([
    vendorStore.fetchVendorItineraries(vendorId.value),
    vendorStore.fetchVendorPosts(vendorId.value),
  ])
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <DashboardNav />
    <ToastNotification />

    <div class="flex pt-16">
      <DashboardSidebar
        :active-tab="activeTab"
        @update:active-tab="activeTab = $event"
        @logout="handleLogout"
        @switch-to-frontend="handleSwitchToFrontend"
      />

      <main class="flex-1 overflow-auto ml-64">
        <DashboardHeader
          v-if="currentVendor && !loading"
          :vendor="currentVendor"
          :itineraries="vendorStore.itineraries"
          :posts="vendorStore.posts"
        />

        <div class="p-8">
          <div v-if="loading" class="flex justify-center items-center h-96">
            <div class="text-center">
              <div
                class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"
              ></div>
              <p class="mt-4 text-gray-600">載入中...</p>
            </div>
          </div>

          <div v-else-if="currentVendor">
            <div v-if="activeTab === 'basic_info'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <TabBasicInfo />
              </div>
            </div>

            <div v-if="activeTab === 'itineraries'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <TabItineraryList
                  @create="openItineraryModal"
                  @edit="handleEditItinerary"
                />
              </div>
            </div>

            <div v-if="activeTab === 'posts'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <TabPostList
                  @create="openPostModal"
                  @edit="(item) => console.log('Edit post', item)"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <p class="text-gray-500 text-lg">無法載入廠商資料</p>
            <p class="text-gray-400 text-sm mt-2">請確認您的廠商權限</p>
          </div>
        </div>
      </main>
    </div>

    <ItineraryPostModal
      v-if="showItineraryModal"
      :initial-data="editItineraryData"
      :is-edit="isItineraryEdit"
      @close="showItineraryModal = false"
      @success="handleItinerarySuccess"
    />

    <DiscussionPostModal
      v-if="showPostModal"
      @close="showPostModal = false"
      @success="handlePostSuccess"
    />
  </div>
</template>
