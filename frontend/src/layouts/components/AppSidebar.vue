<script setup>
import {
  Home as HomeIcon,
  MessagesSquare as ForumIcon,
  Users as UsersIcon,
  Map as MapIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Bookmark as BookmarkIcon,
  Heart as HeartIcon,
  Menu as MenuIcon,
  Award as AwardIcon,
} from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { getVendorProfileRoute } from '@/utils/navigation'
import TripMateIcon from '@/assets/icons/TripMate_icon_white.png'

const emit = defineEmits(['open-mobile-actions'])
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const isMobileItineraryMenuOpen = ref(false)

const menuItems = [
  {
    name: 'home',
    label: '為你推薦',
    icon: HomeIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
  {
    name: 'discussion',
    label: '討論區',
    icon: ForumIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
  {
    name: 'travelers',
    label: '找旅伴',
    icon: UsersIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
  {
    name: 'featured_itinerary',
    label: '精選行程',
    icon: MapIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
]

const { isVendor } = storeToRefs(userStore)

const bottomMenuItems = computed(() => {
  const items = [
    {
      name: 'my_itinerary',
      label: '我的行程',
      icon: CalendarIcon,
      iconColor: 'text-primary-600',
      textColor: 'text-secondary',
    },
    {
      name: 'my_order',
      label: '訂單管理',
      icon: MapIcon,
      iconColor: 'text-primary-600',
      textColor: 'text-secondary',
    },
  ]

  if (isVendor.value) {
    const routeObj = getVendorProfileRoute(userStore.currentUser)
    items.push({
      name: routeObj.name,
      params: routeObj.params,
      label: '廠商檔案',
      icon: UserIcon,
      iconColor: 'text-primary-600',
      textColor: 'text-secondary',
    })
    items.push({
      name: 'VendorDashboard',
      label: '廠商後台',
      icon: AwardIcon,
      iconColor: 'text-primary-600',
      textColor: 'text-secondary',
    })
  } else {
    items.push({
      name: 'profile',
      label: '個人檔案',
      icon: UserIcon,
      iconColor: 'text-primary-600',
      textColor: 'text-secondary',
    })
  }

  return items
})

const mobileNavItems = [
  { name: 'home', label: '首頁', icon: HomeIcon },
  { name: 'discussion', label: '討論', icon: ForumIcon },
  { name: 'travelers', label: '找伴', icon: UsersIcon },
  { name: 'featured_itinerary', label: '精選', icon: MapIcon },
  { name: 'itinerary_menu', label: '行程', icon: CalendarIcon },
  { name: 'menu', label: '更多', icon: MenuIcon },
]

function goToFavorites() {
  router.push({ name: 'favorites' })
}
function goToCollections() {
  // 修改這裡，不再彈出 alert
  // alert('收藏功能開發中')
  router.push({ name: 'collections' }) // 假設你有設定 collections 路由
}

// 判斷是否為當前活躍路由
function isActiveRoute(item) {
  // 對於有 params 的項目（如廠商檔案），需要比較 name 和 params
  if (item.params) {
    return route.name === item.name && JSON.stringify(route.params) === JSON.stringify(item.params)
  }

  // 如果不是 profile 路由，直接比較 route.name
  if (item.name !== 'profile') {
    return route.name === item.name
  }

  // 對於 profile 路由，只有在查看自己的頁面時才高亮
  if (route.name === 'profile') {
    // 如果有 uid 參數，表示在查看別人的頁面
    if (route.params.uid) {
      // 只有當 uid 等於當前使用者的 uid 時才高亮
      return route.params.uid === userStore.currentUser?.uid
    }
    // 沒有 uid 參數，表示在查看自己的頁面
    return true
  }

  return false
}

const handleMobileNavClick = (item) => {
  if (item.name === 'menu') {
    isMobileItineraryMenuOpen.value = false
    emit('open-mobile-actions')
  } else if (item.name === 'itinerary_menu') {
    isMobileItineraryMenuOpen.value = !isMobileItineraryMenuOpen.value
  } else {
    isMobileItineraryMenuOpen.value = false
    router.push({ name: item.name })
  }
}

const handleMobileItinerarySelect = (name) => {
  isMobileItineraryMenuOpen.value = false
  router.push({ name })
}
</script>

<template>
  <aside
    class="w-full min-h-full bg-white border-x border-secondary-100 hidden lg:flex lg:min-w-40 flex-col p-2 overflow-hidden"
  >
    <!-- TripMate Logo -->
    <div class="px-4 py-4 mb-2">
      <RouterLink
        :to="{ name: 'home' }"
        class="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img :src="TripMateIcon" alt="TripMate Logo" class="h-8 w-auto object-contain" />
      </RouterLink>
    </div>

    <div class="flex justify-between my-4 p-2 gap-4">
      <div
        class="cursor-pointer w-[48%] aspect-square flex flex-col gap-2 items-center justify-center bg-white rounded-xl shadow-md ring-1 ring-slate-200 transition-transform active:translate-y-1 hover:shadow-md"
        @click="goToFavorites"
      >
        <HeartIcon class="w-8 h-8 text-primary transition fill-primary" />
        <span class="font-bold text-primary">愛心</span>
      </div>

      <div
        class="cursor-pointer w-[48%] aspect-square flex flex-col gap-2 items-center justify-center bg-white rounded-xl shadow-md ring-1 ring-slate-200 transition-transform active:translate-y-1 hover:shadow-md"
        @click="goToCollections"
      >
        <BookmarkIcon class="w-8 h-8 text-primary transition fill-primary" />
        <span class="font-bold text-primary">收藏</span>
      </div>
    </div>

    <nav>
      <div class="overflow-hidden">
        <RouterLink
          v-for="item in menuItems"
          :key="item.name"
          :to="{ name: item.name }"
          :class="[
            'flex items-center p-4 my-2 rounded-xl cursor-pointer transition-colors duration-150 w-full',
            route.name === item.name ? 'bg-primary-50 shadow-md' : 'hover:shadow-md',
          ]"
        >
          <component :is="item.icon" :class="['w-5 h-5 mr-3', item.iconColor]" />
          <span :class="['font-bold', item.textColor]">
            {{ item.label }}
          </span>
        </RouterLink>

        <div class="border-t border-gray-100"></div>

        <RouterLink
          v-for="item in bottomMenuItems"
          :key="item.name"
          :to="{ name: item.name, params: item.params }"
          :class="[
            'flex items-center p-4 my-2 rounded-xl cursor-pointer transition-colors duration-150 w-full',
            isActiveRoute(item) ? 'bg-primary-50 shadow-md' : 'hover:shadow-md',
          ]"
        >
          <component :is="item.icon" :class="['w-5 h-5 mr-3', item.iconColor]" />
          <span :class="['font-bold', item.textColor]">
            {{ item.label }}
          </span>
        </RouterLink>
      </div>
    </nav>
  </aside>

  <nav
    class="fixed bottom-0 left-0 right-0 h-16 bg-secondary-50 z-50 flex justify-between items-center px-1 lg:hidden shadow-md"
  >
    <div v-for="item in mobileNavItems" :key="item.name" class="relative w-full h-full">
      <button
        class="flex flex-col items-center justify-center w-full h-full text-secondary-400 hover:bg-secondary-100 transition active:scale-95 px-0.5"
        :class="
          route.name === item.name && item.name !== 'menu'
            ? 'bg-primary-50 border-t-4 border-t-primary-500 -mt-1'
            : ''
        "
        @click="handleMobileNavClick(item)"
      >
        <component
          :is="item.icon"
          class="w-5 h-5 mb-1 transition-colors"
          :class="
            route.name === item.name && item.name !== 'menu'
              ? 'text-primary-600 fill-primary-100'
              : 'text-secondary-500'
          "
        />
        <span
          class="text-xs font-bold transition-colors whitespace-nowrap scale-95 origin-center"
          :class="
            route.name === item.name && item.name !== 'menu'
              ? 'text-primary-600'
              : 'text-secondary-500'
          "
        >
          {{ item.label }}
        </span>
      </button>
      <Transition
        v-if="item.name === 'itinerary_menu'"
        enter-active-class="transition-all duration-200 ease"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="isMobileItineraryMenuOpen"
          class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg p-2 w-32 border border-secondary-100`"
        >
          <button
            class="w-full px-2 py-3 rounded-lg font-bold text-secondary-600 text-center hover:bg-secondary-50"
            @click="handleMobileItinerarySelect('my_itinerary')"
          >
            我的行程
          </button>
          <button
            class="w-full px-2 py-3 rounded-lg font-bold text-secondary-600 text-center hover:bg-secondary-50"
            @click="handleMobileItinerarySelect('my_order')"
          >
            訂單管理
          </button>
        </div>
      </Transition>
    </div>
  </nav>
</template>
