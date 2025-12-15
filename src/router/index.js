// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// 🟢 只有 "首頁" 維持靜態引入 (因為一進來就要看，不用懶載)
import HomePage from '@/views/HomePage.vue'

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
      name: 'discussion',
      // 🟢 改成箭頭函式 import()，這就是懶人載入！
      // 只有切換到此頁面時，瀏覽器才會下載這部分的程式碼
      component: () => import('@/views/DiscussionPage.vue'),
    },
    {
      path: '/find-traveler',
      name: 'find_traveler',
      component: () => import('@/views/FindTravelerPage.vue'),
    },
    {
      path: '/featured-itinerary',
      name: 'featured_itinerary',
      component: () => import('@/views/FeaturedItineraryPage.vue'),
    },
    {
      path: '/my-itinerary',
      name: 'my_itinerary',
      component: () => import('@/views/MyItineraryPage.vue'),
      meta: { hideAd: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/views/FavoritesPage.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfilePage.vue'),
      meta: { hideAd: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: { hideAd: true },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchPage.vue'),
    },
    {
      path: '/cart',
      name: 'cart',
      component: ShoppingCart,
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: CheckoutLayout,
      children: [
        {
          path: 'step1',
          name: 'CheckoutStep1',
          component: Step1Confirm,
        },
        {
          path: 'step2',
          name: 'CheckoutStep2',
          component: Step2Form,
        },
        {
          path: 'step3',
          name: 'CheckoutStep3',
          component: Step3Review,
        },
        {
          path: 'step4',
          name: 'CheckoutStep4',
          component: Step4Payment,
        },
        {
          path: 'step5',
          name: 'CheckoutStep5',
          component: Step5Done,
        },
      ],
    },
  ],
})

export default router
