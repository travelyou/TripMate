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

import ItineraryPostModal from '@/components/modals/ItineraryPostModal.vue'
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'

const router = useRouter()
const vendorStore = useVendorStore()
const userStore = useUserStore()

const activeTab = ref('basic_info')

const showItineraryModal = ref(false)
const showPostModal = ref(false)

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
  // 優先使用 vendorId，否則使用 uid，與 AppHeader 邏輯保持一致
  const targetId = userStore.currentUser?.vendorId || userStore.currentUser?.uid

  console.log('📝 userStore.currentUser:', userStore.currentUser)
  console.log('👉 Target ID:', targetId)

  if (targetId) {
    router.push({ name: 'VendorProfile', params: { id: targetId } })
  } else {
    // 只有在真的沒有 ID 時才回退到 vendor001 (僅供開發測試)
    console.warn('⚠️ No vendor ID found, falling back to mock ID')
    router.push({ name: 'VendorProfile', params: { id: 'vendor001' } })
  }
}

const openItineraryModal = () => {
  showItineraryModal.value = true
}

const openPostModal = () => {
  showPostModal.value = true
}

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

    <div class="flex pt-16">
      <DashboardSidebar
        :active-tab="activeTab"
        @update:active-tab="activeTab = $event"
        @logout="handleLogout"
        @switch-to-frontend="handleSwitchToFrontend"
      />

      <main class="flex-1 overflow-auto">
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
                  @edit="(item) => console.log('Edit itinerary', item)"
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
