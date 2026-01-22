<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 h-16 md:h-18 bg-primary shadow-sm border-b border-primary-700"
  >
    <div
      class="max-w-[1500px] mx-auto w-full h-full grid grid-cols-[1fr,1fr] lg:grid-cols-[2fr,5fr,2fr] items-center gap-4 px-4"
    >
      <div class="cursor-pointer flex" @click="router.push('/')">
        <div class="shrink-0">
          <img :src="TripMateIcon" alt="TripMate Logo" class="h-10 md:h-12 w-auto object-contain" />
        </div>
      </div>

      <div class="hidden lg:block max-w-xl w-full">
        <div class="relative w-full max-w-[400px]">
          <input
            v-model="headerSearchQuery"
            type="text"
            placeholder="搜尋文章、行程..."
            class="w-full h-11 bg-white text-base rounded-full pl-5 pr-12 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-200 shadow-sm"
            @keyup.enter="handleDesktopSearch"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary-100 rounded-full transition cursor-pointer"
            @click="handleDesktopSearch"
          >
            <SearchIcon class="w-5 h-5 text-secondary-600" />
          </button>
        </div>
      </div>

      <div class="flex gap-1 md:gap-3 justify-end">
        <button
          class="p-2 hover:bg-primary-600 rounded-full transition lg:hidden text-secondary-50"
          @click="goToSearchPage"
        >
          <SearchIcon class="w-6 h-6" />
        </button>

        <button class="p-2 hover:bg-primary-600 rounded-full transition text-secondary-50">
          <BellIcon class="w-6 h-6" />
        </button>

        <router-link to="/cart" class="relative p-2 hover:bg-primary-600 rounded-full transition">
          <span
            v-if="hasCartItems"
            class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-primary-700"
          ></span>
          <ShoppingCartIcon class="w-5 h-5 md:w-6 md:h-6 text-secondary-50" />
        </router-link>

        <!-- 未登入時顯示登入/註冊按鈕 -->
        <button
          v-if="!userStore.isLoggedIn"
          class="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium text-secondary-50 hover:bg-primary-400 rounded-xl transition ml-1 whitespace-nowrap"
          @click="goToLogin"
        >
          <span class="hidden sm:inline">登入 / 註冊</span>
          <span class="sm:hidden">登入</span>
        </button>

        <!-- 已登入時顯示頭像選單 -->
        <div v-else ref="menuRef" class="relative ml-1 flex items-center gap-2">
          <div class="relative">
          <button
            class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-secondary-200 hover:border-secondary-300 transition overflow-hidden bg-secondary-100 shadow-sm"
            @click="toggleMenu"
          >
            <img
              v-if="userStore.userProfile.avatar"
              :src="userStore.userProfile.avatar"
              class="w-full h-full object-cover"
              alt="User Avatar"
            />
            <UserIcon v-else class="w-6 h-6 text-gray-400" />
          </button>
            
            <!-- 上傳頭貼按鈕 -->
            <button
              class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition shadow-md border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isUploading"
              @click.stop="openFilePicker"
              :title="isUploading ? `上傳中... ${uploadProgress}%` : '更換頭貼'"
            >
              <LoaderIcon v-if="isUploading" class="w-3 h-3 animate-spin" />
              <PlusIcon v-else class="w-3 h-3" />
            </button>
            
            <!-- 上傳進度條 -->
            <div
              v-if="isUploading"
              class="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-200 rounded-full overflow-hidden"
            >
              <div
                class="h-full bg-primary-600 transition-all duration-300"
                :style="{ width: `${uploadProgress}%` }"
              ></div>
            </div>
            
            <!-- 隱藏的文件選擇器 -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>

          <Transition
            enter-active-class="transition-opacity transform duration-200"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-opacity transform duration-200"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="isMenuOpen"
              class="absolute right-0 top-full mt-4 w-56 bg-white rounded-xl shadow-xl border border-secondary-100 overflow-hidden z-50"
            >
              <div class="p-3 border border-secondary-100">
                <p class="text-xs font-bold text-secondary-700">
                  {{
                    userStore.isLoggedIn ? `Hi, ${userStore.userProfile.name}` : '歡迎來到 TripMate'
                  }}
                </p>
              </div>
              <div class="p-1 space-y-1">
                <!-- 一般使用者顯示 -->
                <button
                  v-if="!userStore.isVendor"
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="handleProfileClick"
                >
                  <UserIcon class="w-4 h-4 mr-3" />我的帳號
                </button>

                <!-- 廠商顯示 -->
                <template v-else>
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                    @click="goToVendorProfile"
                  >
                    <UserIcon class="w-4 h-4 mr-3" />廠商檔案
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                    @click="goToVendorDashboard"
                  >
                    <AwardIcon class="w-4 h-4 mr-3" />廠商後台
                  </button>
                </template>

                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium lg:hidden"
                  @click="goToFavorites"
                >
                  <HeartIcon class="w-4 h-4 mr-3" />我的最愛
                </button>
                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium lg:hidden"
                  @click="goToCollections"
                >
                  <BookmarkIcon class="w-4 h-4 mr-3" />我的收藏
                </button>
                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="goToAbout"
                >
                  <InfoIcon class="w-4 h-4 mr-3" />關於我們
                </button>
                <div class="h-px bg-secondary-100 my-1"></div>
                <button
                  v-if="userStore.isLoggedIn"
                  class="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg flex items-center transition font-bold"
                  @click="handleLogout"
                >
                  <LogOutIcon class="w-4 h-4 mr-3" />登出
                </button>
                <button
                  v-else
                  class="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg flex items-center transition font-bold"
                  @click="goToLogin"
                >
                  <LogInIcon class="w-4 h-4 mr-3" />登入 / 註冊
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <div v-if="isMenuOpen" class="fixed inset-0 z-40 cursor-default" @click="closeMenu"></div>
  </header>
</template>

<script setup>
import TripMateIcon from '@/assets/icons/TripMate_icon_white.png'
import { useUserStore } from '@/stores/user'
import { checkoutStore } from '@/stores/checkout'
import {
  Bell as BellIcon,
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  User as UserIcon,
  Info as InfoIcon,
  Heart as HeartIcon,
  Bookmark as BookmarkIcon,
  Award as AwardIcon,
  Plus as PlusIcon,
  Loader2 as LoaderIcon,
} from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { uploadImage } from '@/api/storage'
import { updateUserProfile, createOrUpdateUser } from '@/api/users'

const router = useRouter()
const userStore = useUserStore()

const headerSearchQuery = ref('')

const goToVendorDashboard = () => {
  closeMenu()
  router.push('/vendor/dashboard')
}

const goToVendorProfile = () => {
  closeMenu()
  // 導向到自己的廠商檔案
  // 需確保 userStore.currentUser.uid 存在，且後端有該 ID 的廠商資料
  // 這裡假設廠商 ID = User UID (單一帳號制)
  const vendorId = userStore.currentUser?.uid
  if (vendorId) {
    router.push({ name: 'VendorProfile', params: { id: vendorId } })
  } else {
    router.push('/vendor/dashboard') // Fallback
  }
}

const hasCartItems = computed(
  () => (checkoutStore.cartItems?.length ?? 0) > 0 || checkoutStore.tourGroups.length > 0,
)

const handleDesktopSearch = () => {
  if (!headerSearchQuery.value.trim()) return
  router.push({
    name: 'search',
    query: { q: headerSearchQuery.value },
  })
  headerSearchQuery.value = ''
}

const isMenuOpen = ref(false)
const menuRef = ref(null)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const goToLogin = () => {
  closeMenu()
  router.push('/login')
}

const handleProfileClick = () => {
  closeMenu()
  if (userStore.isLoggedIn) {
    router.push('/profile')
  } else {
    router.push('/login')
  }
}

const goToFavorites = () => {
  closeMenu()
  router.push({ name: 'favorites' })
}

const goToCollections = () => {
  closeMenu()
  router.push({ name: 'collections' })
}

const goToAbout = () => {
  closeMenu()
  router.push({ name: 'about' })
}

const goToSearchPage = () => {
  router.push('/search')
}

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    userStore.logout()
    closeMenu()
    router.push('/')
  }
}

// 頭貼上傳相關
const fileInputRef = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)

// 文件類型限制
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const maxFileSize = 5 * 1024 * 1024 // 5MB

// 打開文件選擇器
const openFilePicker = () => {
  if (!userStore.isLoggedIn) {
    alert('請先登入')
    return
  }
  fileInputRef.value?.click()
}

// 處理文件選擇
const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 驗證文件類型
  if (!allowedTypes.includes(file.type)) {
    alert('不支援的檔案格式！請選擇 JPG、PNG、GIF 或 WebP 格式的圖片。')
    event.target.value = '' // 清空選擇
    return
  }

  // 驗證文件大小
  if (file.size > maxFileSize) {
    alert(`檔案大小超過限制！請選擇小於 ${maxFileSize / 1024 / 1024}MB 的圖片。`)
    event.target.value = '' // 清空選擇
    return
  }

  // 開始上傳
  try {
    isUploading.value = true
    uploadProgress.value = 0

    // 上傳到 Firebase Storage
    const avatarUrl = await uploadImage(file, 'avatars', (progress) => {
      uploadProgress.value = progress
    })

    // 更新用戶資料
    const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
    if (!currentUid) {
      throw new Error('無法取得用戶 ID')
    }

    // 更新到 Neon 資料庫
    await createOrUpdateUser({
      uid: currentUid,
      avatar: avatarUrl,
    })

    // 更新本地 store
    userStore.updateProfile({
      avatar: avatarUrl,
    })

    alert('頭貼更新成功！')
  } catch (error) {
    console.error('上傳頭貼失敗：', error)
    alert('上傳失敗：' + (error.message || '未知錯誤，請稍後再試'))
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
    // 清空文件選擇器
    if (event.target) {
      event.target.value = ''
    }
  }
}
</script>
