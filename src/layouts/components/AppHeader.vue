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

        <router-link to="/cart" class="p-2 hover:bg-primary-600 rounded-full transition">
          <ShoppingCartIcon class="w-5 h-5 md:w-6 md:h-6 text-secondary-50" />
        </router-link>

        <div ref="menuRef" class="relative ml-1">
          <button
            class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-secondary-200 hover:border-secondary-300 transition overflow-hidden bg-secondary-100 shadow-sm"
            @click="toggleMenu"
          >
            <img
              v-if="userStore.isLoggedIn && userStore.userProfile.avatar"
              :src="userStore.userProfile.avatar"
              class="w-full h-full object-cover"
              alt="User Avatar"
            />
            <UserIcon v-else class="w-6 h-6 text-gray-400" />
          </button>

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
                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="handleProfileClick"
                >
                  <UserIcon class="w-4 h-4 mr-3" />我的帳號
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
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

const headerSearchQuery = ref('')

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
  alert('關於我們頁面開發中')
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
</script>
