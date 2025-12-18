// src/router/index.js
import DiscussionPage from '@/views/DiscussionPage.vue'
import HomePage from '@/views/HomePage.vue'
import { createRouter, createWebHistory } from 'vue-router'
// 引入新的找旅伴頁面
import FindTravelerPage from '@/views/FindTravelerPage.vue'
// 引入其他頁面，避免路由報錯
import FavoritesPage from '@/views/FavoritesPage.vue'
import FeaturedItineraryPage from '@/views/FeaturedItineraryPage.vue'
import LoginPage from '@/views/LoginPage.vue'
import MyItineraryPage from '@/views/MyItineraryPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import SearchPage from '@/views/SearchPage.vue'

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
      meta: { hideAd: true },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: FavoritesPage,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { hideAd: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { hideAd: true },
    },
    {
      path: '/search',
      name: 'search',
      component: SearchPage,
    },
  ],
})

export default router
