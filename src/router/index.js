// src/router/index.js
import DiscussionPage from '@/views/DiscussionPage.vue'
import HomePage from '@/views/HomePage.vue'
import { createRouter, createWebHistory } from 'vue-router'
// 引入新的找旅伴頁面
import FindTravelerPage from '@/views/FindTravelerPage.vue'
// 引入其他頁面，避免路由報錯
import { useUserStore } from '@/stores/user'
import FavoritesPage from '@/views/FavoritesPage.vue'
import FeaturedItineraryPage from '@/views/FeaturedItineraryPage.vue'
import LoginPage from '@/views/LoginPage.vue'
import MyItineraryPage from '@/views/MyItineraryPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/discussion',
      name: 'discussion', // 🎯 必須是 'discussion'
      component: DiscussionPage,
    },
    {
      path: '/find-traveler',
      name: 'find_traveler', // 🎯 必須是 'find_traveler'
      component: FindTravelerPage,
    },
    {
      path: '/featured-itinerary',
      name: 'featured_itinerary',
      component: FeaturedItineraryPage,
    },
    {
      path: '/my-itinerary',
      name: 'my_itinerary',
      component: MyItineraryPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: FavoritesPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    // 雖然你可能還沒創建所有頁面，但先註冊路由可以避免 Sidebar 報錯。
  ],
})
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 如果已登入使用者訪問登入頁，導回首頁
  if (to.name === 'login' && userStore.isLoggedIn) {
    next('/')
    return
  }

  // 檢查路由是否需要登入
  if (to.meta.requiresAuth) {
    if (userStore.isLoggedIn) {
      // 已登入，允許訪問
      next()
    } else {
      // 未登入，導向登入頁
      next('/login')
    }
  } else {
    // 不需要登入，直接允許訪問
    next()
  }
})

export default router
