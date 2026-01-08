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
} from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'

const emit = defineEmits(['open-mobile-actions'])
const router = useRouter()
const route = useRoute()

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
    name: 'find_traveler',
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

const bottomMenuItems = [
  {
    name: 'my_itinerary',
    label: '我的行程',
    icon: CalendarIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
  {
    name: 'profile',
    label: '個人檔案',
    icon: UserIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },

  {
    name: 'VendorProfile',
    params: { id: 'test' },
    label: '廠商檔案',
    icon: UserIcon,
    iconColor: 'text-primary-600',
    textColor: 'text-secondary',
  },
]

const mobileNavItems = [
  { name: 'home', label: '首頁', icon: HomeIcon },
  { name: 'discussion', label: '討論', icon: ForumIcon },
  { name: 'find_traveler', label: '找伴', icon: UsersIcon },
  { name: 'featured_itinerary', label: '精選', icon: MapIcon },
  { name: 'my_itinerary', label: '行程', icon: CalendarIcon },
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

const handleMobileNavClick = (item) => {
  if (item.name === 'menu') {
    emit('open-mobile-actions')
  } else {
    router.push({ name: item.name })
  }
}
</script>

<template>
  <aside
    class="w-full min-h-full bg-white border-x border-secondary-100 hidden lg:flex lg:min-w-40 flex-col p-2 overflow-hidden"
  >
    <div class="flex justify-between my-4 p-2 gap-4">
      <div
        class="cursor-pointer w-[48%] aspect-square flex flex-col gap-2 items-center justify-center bg-white rounded-xl shadow-md ring-1 ring-slate-200 transition-transform active:translate-y-1 hover:shadow-md"
        @click="goToFavorites"
      >
        <HeartIcon class="w-8 h-8 text-accent-500 transition fill-white" />
        <span class="font-bold text-primary">愛心</span>
      </div>

      <div
        class="cursor-pointer w-[48%] aspect-square flex flex-col gap-2 items-center justify-center bg-white rounded-xl shadow-md ring-1 ring-slate-200 transition-transform active:translate-y-1 hover:shadow-md"
        @click="goToCollections"
      >
        <BookmarkIcon class="w-8 h-8 text-gold-500 transition fill-white" />
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
            route.name === item.name ? 'bg-primary-50 shadow-md' : 'hover:shadow-md',
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
    <button
      v-for="item in mobileNavItems"
      :key="item.name"
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
  </nav>
</template>
