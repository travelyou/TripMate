<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 h-16 md:h-18 bg-primary shadow-sm border-b border-primary-700"
  >
    <div
      class="max-w-[1500px] mx-auto w-full h-full grid grid-cols-[1fr,1fr] items-center gap-4 px-4"
    >
      <!-- Logo 區域 (不可點擊) -->
      <div class="flex">
        <div class="shrink-0">
          <img :src="TripMateIcon" alt="TripMate Logo" class="h-10 md:h-12 w-auto object-contain" />
        </div>
      </div>

      <!-- 右側：頭像選單 -->
      <div class="flex gap-1 md:gap-3 justify-end">
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
                <!-- 廠商後台專屬選單項目 -->
                <button
                  class="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-primary hover:text-white rounded-lg flex items-center transition font-medium"
                  @click="handleProfileClick"
                >
                  <UserIcon class="w-4 h-4 mr-3" />我的帳號
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
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  User as UserIcon,
  Info as InfoIcon,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

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

const goToAbout = () => {
  closeMenu()
  alert('關於我們頁面開發中')
}

const handleLogout = () => {
  if (confirm('確定要登出嗎？')) {
    userStore.logout()
    closeMenu()
    router.push('/login')
  }
}
</script>
