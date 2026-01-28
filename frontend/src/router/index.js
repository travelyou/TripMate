import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { flushPendingLikesNow } from '@/api/likes'
import { updateSEOMeta, addStructuredData, getDefaultStructuredData, getOrganizationStructuredData } from '@/utils/seo'
import { showError } from '@/utils/alert'
import HomePage from '@/views/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: {
        title: 'TripMate - 找旅伴、行程規劃與旅遊社群平台',
        description: 'TripMate 致力於打造一個結合旅遊論壇、行程規劃、旅伴配對與旅遊交友的一站式平台。透過智慧性格測驗與獨特的護照系統，讓旅行不再孤單，下一站，我們一起出發。',
        keywords: 'TripMate, 馬遊友, 旅遊社群, 找旅伴, 旅伴配對, 行程規劃, 旅遊論壇, 旅遊交友, 自助旅行, 旅遊性格測驗, 行程市集',
      },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutUsPage.vue'),
      meta: {
        hideAd: true,
        title: '關於我們 - TripMate',
        description: '了解 TripMate 團隊與我們的使命，打造最優質的旅遊社群平台，讓每個人都能找到理想的旅行夥伴。',
      },
    },
    {
      path: '/tutorial',
      name: 'tutorial',
      component: () => import('@/views/TutorialPage.vue'),
      meta: {
        hideAd: true,
        title: '使用教學 - TripMate',
        description: 'TripMate 完整使用教學，快速了解如何找旅伴、規劃行程、參與旅遊論壇討論，開始你的精彩旅程。',
      },
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyPolicyPage.vue'),
      meta: {
        hideAd: true,
        title: '隱私權政策 - TripMate',
        description: 'TripMate 隱私權政策與使用者條款，了解我們如何保護您的個人資料與隱私安全。',
      },
    },
    {
      path: '/discussion/:id?',
      name: 'discussion',
      component: () => import('@/views/DiscussionPage.vue'),
      props: true,
      meta: {
        title: '旅遊論壇 - TripMate',
        description: 'TripMate 旅遊論壇，分享你的旅行經驗、尋找旅遊資訊、與其他旅人交流互動，一起探索世界的美好。',
      },
    },
    {
      path: '/travelers/:id?',
      name: 'travelers',
      component: () => import('@/views/TravelerPage.vue'),
      props: true,
      meta: {
        title: '找旅伴 - TripMate',
        description: 'TripMate 找旅伴平台，透過智慧配對系統找到最適合的旅行夥伴，一起規劃精彩旅程，讓旅行不再孤單。',
      },
    },
    {
      path: '/featured-itinerary/:id?',
      name: 'featured_itinerary',
      component: () => import('@/views/ItineraryPage.vue'),
      props: true,
      meta: {
        title: '精選行程 - TripMate',
        description: 'TripMate 精選行程市集，發現優質旅遊行程規劃，購買專業行程或分享你的旅行計畫，讓每次旅行都更精彩。',
      },
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
        hideLayout: true,
        requiresAuth: true,
        requiresVendorAuth: true,
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
        title: '搜尋 - TripMate',
        description: '在 TripMate 搜尋旅遊貼文、找旅伴、行程規劃等豐富內容，快速找到你需要的旅遊資訊。',
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
    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  flushPendingLikesNow({ keepalive: true })

  if (to.meta.title || to.meta.description) {
    updateSEOMeta({
      title: to.meta.title,
      description: to.meta.description,
      keywords: to.meta.keywords,
      type: to.meta.type || 'website',
    })
  }

  addStructuredData(getDefaultStructuredData())
  addStructuredData(getOrganizationStructuredData())

  const userStore = useUserStore()

  if (to.meta.hideLayout) {
    if (to.meta.requiresVendorAuth || to.meta.requiresAuth) {
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

      if (to.meta.requiresVendorAuth) {
        if (!userStore.isLoggedIn) {
          next('/login')
          showError('請先登入後才可使用')
          return
        }
        if (!userStore.isVendor) {
          next('/')
          showError('此頁面僅限廠商使用')
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
          showError('請先登入後才可使用')
        }
        return
      }
    }
    next()
    return
  }

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

  if (userStore.isLoggedIn && userStore.isVendor) {
    if (to.name === 'home') {
      next({ name: 'VendorDashboard' })
      return
    }
  }

  if (to.name === 'login' && userStore.isLoggedIn) {
    next('/')
    return
  }

  if (to.meta.requiresAuth) {
    if (userStore.isLoggedIn) {
      next()
    } else {
      next('/login')
      showError('請先登入後才可使用')
    }
  } else {
    next()
  }
})

export default router
