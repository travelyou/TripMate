import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useUserStore } from '@/stores/user'
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
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfilePage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/vendor/:id',
      name: 'VendorProfile',
      component: () => import('@/views/VendorProfilePage.vue'),
    },
    {
      path: '/cart',
      name: 'ShoppingCart',
      component: () => import('@/views/ShoppingCartPage.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
      meta: {
        hideLayout: true,
        hideSidebar: true,
        hideAd: true,
      },
    },
    {
      path: '/checkout',
      component: () => import('@/views/CheckoutLayout.vue'),
      meta: {
        hideAd: true,
        hideSidebar: true,
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          redirect: '/checkout/step1',
        },
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
})

// ----------------------------------------------------------------
// 路由守衛 (Router Guard) - 增加防卡死機制
// ----------------------------------------------------------------
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 如果 Auth 還沒準備好，等待它 (但最多只等 2 秒)
  if (!userStore.authReady) {
    console.log('⏳ 等待 Supabase 驗證狀態...')

    await new Promise((resolve) => {
      // 設定一個計時器，2秒後強制結束等待
      const timer = setTimeout(() => {
        console.warn('⚠️ 驗證超時！強制放行顯示頁面。')
        userStore.authReady = true // 強制設為已準備好
        resolve()
      }, 2000)

      // 同時監聽 authReady 的變化
      const unwatch = watch(
        () => userStore.authReady,
        (ready) => {
          if (ready) {
            clearTimeout(timer) // 清除計時器
            unwatch()
            resolve()
          }
        },
        { immediate: true },
      )
    })
  }

  // 1. 如果已登入，還想去登入頁 -> 踢回首頁
  if (to.name === 'login' && userStore.isLoggedIn) {
    next('/')
    return
  }

  // 2. 如果要去需要權限的頁面 (requiresAuth)，但沒登入 -> 踢去登入頁
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
    return
  }

  // 3. 其他情況 -> 放行
  next()
})

export default router
