import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { flushPendingLikesNow } from '@/api/likes'
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
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutUsPage.vue'),
      meta: {
        hideAd: true,
      },
    },
    {
      path: '/tutorial',
      name: 'tutorial',
      component: () => import('@/views/TutorialPage.vue'),
      meta: {
        hideAd: true,
      },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyPolicyPage.vue'),
      meta: {
        hideAd: true,
      },
    },
    {
      path: '/discussion/:id?',
      name: 'discussion',
      component: () => import('@/views/DiscussionPage.vue'),
      props: true,
    },
    {
      path: '/travelers/:id?',
      name: 'travelers',
      component: () => import('@/views/TravelerPage.vue'),
      props: true,
    },
    {
      path: '/featured-itinerary/:id?',
      name: 'featured_itinerary',
      component: () => import('@/views/ItineraryPage.vue'),
      props: true,
    },
    {
      path: '/my-itinerary',
      name: 'my_itinerary',
      component: () => import('@/views/MyItineraryPage.vue'),
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/my-order',
      name: 'my_order',
      component: () => import('@/views/MyOrderPage.vue'),
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/views/FavoritesPage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/profile/:uid?',
      name: 'profile',
      component: () => import('@/views/ProfilePage.vue'),
      meta: {
        hideAd: true,
      },
    },
    {
      path: '/vendor/:id?',
      name: 'VendorProfile',
      component: () => import('@/views/VendorProfilePage.vue'),
      meta: {
        hideAd: true,
      },
    },
    {
      path: '/vendor/register',
      name: 'VendorRegister',
      component: () => import('@/views/VendorRegisterPage.vue'),
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/vendor/dashboard',
      name: 'VendorDashboard',
      component: () => import('@/views/VendorDashboardPage.vue'),
      meta: {
        hideAd: true,
        hideLayout: true, // 隱藏前台 Layout (AppHeader, AppSidebar, FABs)
        requiresAuth: true,
        requiresVendorAuth: true, // 未來需實作廠商權限驗證
      },
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('@/views/CollectionsPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: {
        hideAd: true,
        hideLayout: true,
      },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchPage.vue'),
      meta: {
        hideSidebar: true,
      },
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/ShoppingCartPage.vue'),
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/checkout',
      name: 'checkout',
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
      component: () => import('@/views/CheckoutLayout.vue'),
      children: [
        {
          path: 'step1',
          name: 'CheckoutStep1',
          component: () => import('@/components/checkout/Step1Confirm.vue'),
        },
        {
          path: 'step2',
          name: 'CheckoutStep2',
          component: () => import('@/components/checkout/Step2Form.vue'),
        },
        {
          path: 'step3',
          name: 'CheckoutStep3',
          component: () => import('@/components/checkout/Step3Review.vue'),
        },
        {
          path: 'step4',
          name: 'CheckoutStep4',
          component: () => import('@/components/checkout/Step4Payment.vue'),
        },
        {
          path: 'step5',
          name: 'CheckoutStep5',
          component: () => import('@/components/checkout/Step5Done.vue'),
        },
      ],
    },
    {
      path: '/test',
      name: 'PersonalityTest',
      component: () => import('@/views/PersonalityTest.vue'),
      meta: {
        hideAd: true,
        hideSidebar: true,
      },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    //  瀏覽器返回鍵（上一頁 / 下一頁）
    if (savedPosition) {
      return savedPosition
    }

    //  一般路由切換，回到頂端
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  // 在路由切換時刷新按讚狀態
  flushPendingLikesNow({ keepalive: true })

  const userStore = useUserStore()

  if (!userStore.authReady) {
    await new Promise((resolve) => {
      if (userStore.authReady) {
        resolve()
        return
      }

      const unwatch = watch(
        () => userStore.authReady,
        (ready) => {
          if (ready) {
            unwatch()
            resolve()
          }
        },
        { immediate: true },
      )
    })
  }

  // ========================================
  // 🎯 Vendor 登入後自動導向 Dashboard
  // ========================================
  if (userStore.isLoggedIn && userStore.isVendor) {
    // 情況 1: Vendor 訪問首頁 → 導向 Dashboard
    if (to.name === 'home') {
      const vendorId = userStore.currentUser.vendorId || userStore.currentUser.id
      console.log('🔄 [Router] Vendor 訪問首頁，導向 Dashboard:', vendorId)
      next({ name: 'VendorDashboard' })
      return
    }

    // 情況 2: Vendor 訪問自己的 VendorProfile → 導向 Dashboard
    if (to.name === 'VendorProfile') {
      const vendorId = userStore.currentUser.vendorId || userStore.currentUser.id
      const targetId = to.params.id

      // 如果訪問自己的廠商頁面，導向 Dashboard
      if (targetId === vendorId) {
        console.log('🔄 [Router] Vendor 訪問自己的頁面，導向 Dashboard')
        next({ name: 'VendorDashboard' })
        return
      }
    }
  }

  if (to.name === 'login' && userStore.isLoggedIn) {
    next('/')
    return
  }

  // 廠商權限檢查
  if (to.meta.requiresVendorAuth) {
    if (!userStore.isLoggedIn) {
      next('/login')
      alert('請先登入後才可使用')
      return
    }
    // 檢查是否為廠商
    if (!userStore.isVendor) {
      next('/')
      alert('此頁面僅限廠商使用')
      return
    }
    next()
    return
  }

  if (to.meta.requiresAuth) {
    if (userStore.isLoggedIn) {
      next()
    } else {
      next('/login')
      alert('請先登入後才可使用')
    }
  } else {
    next()
  }
})

export default router
