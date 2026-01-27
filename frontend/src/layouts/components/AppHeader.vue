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

        <NotificationBell v-if="userStore.isLoggedIn" />
        <button
          v-else
          class="p-2 hover:bg-primary-600 rounded-full transition text-secondary-50"
          @click="goToLogin"
        >
          <BellIcon class="w-6 h-6" />
        </button>

        <router-link to="/cart" class="relative p-2 hover:bg-primary-600 rounded-full transition">
          <span
            v-if="hasCartItems"
            class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-primary-700"
          ></span>
          <ShoppingCartIcon class="w-5 h-5 md:w-6 md:h-6 text-secondary-50" />
        </router-link>

        <div
          v-if="!userStore.isLoggedIn"
          ref="loginMenuRef"
          class="relative ml-1 group"
        >
          <button
            class="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium text-secondary-50 hover:bg-primary-400 rounded-xl transition whitespace-nowrap flex items-center gap-1"
            @click="goToLogin"
          >
            <span class="hidden sm:inline">登入 / 註冊</span>
            <span class="sm:hidden">登入</span>
            <svg
              class="w-4 h-4 transition-transform group-hover:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Hover 下拉菜单 -->
          <div
            class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-secondary-100 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
            <div class="p-1 space-y-1">
              <button
                class="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-bold"
                @click="goToLogin"
              >
                <LogInIcon class="w-4 h-4 mr-3" />登入 / 註冊
              </button>
              <div class="h-px bg-secondary-100 my-1"></div>
              <button
                class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                @click="goToTutorial"
              >
                <BookIcon class="w-4 h-4 mr-3" />新手教學
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                @click="goToAbout"
              >
                <InfoIcon class="w-4 h-4 mr-3" />關於我們
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                @click="goToPrivacy"
              >
                <ShieldIcon class="w-4 h-4 mr-3" />隱私政策
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                @click="goToVendorRegister"
              >
                <StoreIcon class="w-4 h-4 mr-3" />註冊廠商
              </button>
            </div>
          </div>
        </div>

        <div v-else ref="menuRef" class="relative ml-1 flex items-center gap-2 group">
          <div class="relative">
            <button
              class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-secondary-200 hover:border-secondary-300 transition overflow-hidden bg-secondary-100 shadow-sm"
            >
              <img
                v-if="userStore.userProfile.avatar"
                :src="userStore.userProfile.avatar"
                class="w-full h-full object-cover"
                alt="User Avatar"
              />
              <UserIcon v-else class="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <!-- Hover 下拉菜单 -->
          <div
            class="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-secondary-100 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
          >
              <div class="p-3 border border-secondary-100">
                <p class="text-xs font-bold text-secondary-700">
                  {{
                    userStore.isLoggedIn ? `Hi, ${userStore.userProfile.nickname || userStore.userProfile.name || '用戶'}` : '歡迎來到 TripMate'
                  }}
                </p>
              </div>
              <div class="p-1 space-y-1">
                <button
                  v-if="!userStore.isVendor"
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="handleProfileClick"
                >
                  <UserIcon class="w-4 h-4 mr-3" />我的帳號
                </button>

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
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="goToTutorial"
                >
                  <BookIcon class="w-4 h-4 mr-3" />新手教學
                </button>

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

                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="goToPrivacy"
                >
                  <ShieldIcon class="w-4 h-4 mr-3" />隱私政策
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
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import TripMateIcon from '@/assets/icons/TripMate_icon_white.png'
import { useUserStore } from '@/stores/user'
import { checkoutStore } from '@/stores/checkout'
import NotificationBell from '@/components/notifications/NotificationBell.vue'
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
  BookOpen as BookIcon,
  Shield as ShieldIcon,
  Store as StoreIcon,
} from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirm } from '@/utils/alert'
const router = useRouter()
const userStore = useUserStore()

const headerSearchQuery = ref('')

const goToVendorDashboard = () => {
  router.push('/vendor/dashboard')
}

const goToVendorProfile = () => {
  // 導向到自己的廠商檔案
  const vendorId = userStore.currentUser?.uid
  if (vendorId) {
    router.push({ name: 'VendorProfile', params: { id: vendorId } })
  } else {
    router.push('/vendor/dashboard') // Fallback
  }
}

const hasCartItems = computed(() => {
  const hasItems = (checkoutStore.cartItems?.length ?? 0) > 0 || checkoutStore.tourGroups.length > 0
  // 只有在有商品且未查看過購物車時才顯示紅點
  return hasItems && !checkoutStore.hasViewedCart
})

const handleDesktopSearch = () => {
  if (!headerSearchQuery.value.trim()) return
  router.push({
    name: 'search',
    query: { q: headerSearchQuery.value },
  })
  headerSearchQuery.value = ''
}

const menuRef = ref(null)
const loginMenuRef = ref(null)

const goToLogin = () => {
  router.push('/login')
}

const handleProfileClick = () => {
  if (userStore.isLoggedIn) {
    router.push('/profile')
  } else {
    router.push('/login')
  }
}

const goToTutorial = () => {
  router.push('/tutorial')
}

const goToFavorites = () => {
  router.push({ name: 'favorites' })
}

const goToCollections = () => {
  router.push({ name: 'collections' })
}

const goToAbout = () => {
  router.push({ name: 'about' })
}

const goToPrivacy = () => {
  router.push({ name: 'privacy' })
}

const goToVendorRegister = () => {
  router.push({ name: 'VendorRegister' })
}

const goToSearchPage = () => {
  router.push('/search')
}

const handleLogout = async () => {
  const confirmed = await showConfirm('確認要登出嗎？')
  if (confirmed) {
    userStore.logout()
    router.push('/')
  }
}
</script>
