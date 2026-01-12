<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVendorStore } from '@/stores/vendor'
import { useUserStore } from '@/stores/user'
import DashboardNav from '@/components/vendor-dashboard/DashboardNav.vue'
import DashboardSidebar from '@/components/vendor-dashboard/DashboardSidebar.vue'

const router = useRouter()
const vendorStore = useVendorStore()
const userStore = useUserStore()

// Tab 狀態
const activeTab = ref('basic_info')

// 🔴 MOCK DATA - 假設當前使用者是廠商
// 📡 未來需從 userStore.currentUser.vendorId 取得
const vendorId = computed(() => userStore.currentUser?.vendorId || 'vendor001')

const currentVendor = computed(() => vendorStore.currentVendor)
const loading = computed(() => vendorStore.loading)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const handleSwitchToFrontend = () => {
  // 切換到廠商前台頁面
  router.push('/vendor')
}

onMounted(async () => {
  // 📡 API ENDPOINT: GET /api/vendors/:vendorId
  await vendorStore.fetchVendorProfile(vendorId.value)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 頂部 Nav -->
    <DashboardNav />

    <div class="flex pt-16">
      <!-- Sidebar -->
      <DashboardSidebar
        :active-tab="activeTab"
        @update:active-tab="activeTab = $event"
        @logout="handleLogout"
        @switch-to-frontend="handleSwitchToFrontend"
      />

      <!-- 主要內容區 -->
      <main class="flex-1 overflow-auto">
        <!-- 內容區域 -->
        <div class="p-8">
          <!-- Loading 狀態 -->
          <div v-if="loading" class="flex justify-center items-center h-96">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
              <p class="mt-4 text-gray-600">載入中...</p>
            </div>
          </div>

          <!-- 主要內容 -->
          <div v-else-if="currentVendor">
            <!-- 基本資料 Tab -->
            <div v-if="activeTab === 'basic_info'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 class="text-xl font-bold text-gray-900 mb-6">基本資料編輯</h2>
                <div class="space-y-6">
                  <!-- 內容區域 -->
                  <div class="text-center py-12 text-gray-400">
                    <p>基本資料編輯功能</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 行程管理 Tab -->
            <div v-if="activeTab === 'itineraries'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-bold text-gray-900">行程管理</h2>
                  <button class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow">
                    + 新增行程
                  </button>
                </div>
                <div class="space-y-4">
                  <!-- 內容區域 -->
                  <div class="text-center py-12 text-gray-400">
                    <p>行程列表</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 貼文管理 Tab -->
            <div v-if="activeTab === 'posts'">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-bold text-gray-900">貼文管理</h2>
                  <button class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow">
                    + 新增貼文
                  </button>
                </div>
                <div class="space-y-4">
                  <!-- 內容區域 -->
                  <div class="text-center py-12 text-gray-400">
                    <p>貼文列表</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 錯誤狀態 -->
          <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <p class="text-gray-500 text-lg">無法載入廠商資料</p>
            <p class="text-gray-400 text-sm mt-2">請確認您的廠商權限</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
