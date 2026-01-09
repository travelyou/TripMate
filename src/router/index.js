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
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/profile/:uid',
      name: 'profile_user',
      component: () => import('@/views/ProfilePage.vue'),
      meta: {
        hideAd: true,
        requiresAuth: true,
      },
    },
    {
      path: '/vendor/:id',
      name: 'VendorProfile',
      component: () => import('@/views/VendorProfilePage.vue'),
      meta: {
        hideAd: true,
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
})

router.beforeEach(async (to, from, next) => {
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

  if (to.name === 'login' && userStore.isLoggedIn) {
    next('/')
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
