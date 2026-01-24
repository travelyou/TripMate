<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  X as XIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Map as MapIcon,
  Coffee as CoffeeIcon,
  Camera as CameraIcon,
  CheckSquare as CheckSquareIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
  FileText as FileTextIcon,
  MoreVertical,
  Share as ShareIcon, // [新增]
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { checkoutStore } from '@/stores/checkout'
import { useRouter } from 'vue-router'
import { showAlert, showConfirm, showError } from '@/utils/alert'
import { getItineraryById } from '@/api/itinerary'
import { toggleLike, getLikesInfo, buildLikeKey, seedLikeState } from '@/api/likes'
import { updateCartItemPersons } from '@/api/cart'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import ShareModal from './ShareModal.vue' // [新增]

const userStore = useUserStore()
const router = useRouter()

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
  },
  scrollToComments: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'edit', 'deleted'])

const activeTab = ref('itinerary')
const localItineraryData = ref({ ...props.itinerary })
const activeDayIndex = ref(0)
const isLoadingDetails = ref(false)
const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(props.itinerary.likes || 0)
const isAddingToCart = ref(false)

const contentContainerRef = ref(null)
const showMenu = ref(false)
const showShareModal = ref(false) // [新增]

const isAuthor = computed(() => {
  const authorUid = localItineraryData.value?.author_uid || localItineraryData.value?.authorUid
  return currentUserUid.value && authorUid && currentUserUid.value === authorUid
})

// 收藏用的資料格式
const itemData = computed(() => ({
  id: localItineraryData.value.id,
  type: 'itinerary',
  title: localItineraryData.value.title,
  coverImage: localItineraryData.value.coverImage,
  price: localItineraryData.value.price,
}))

// [新增] 計算分享連結
const shareLink = computed(() => {
  if (!localItineraryData.value?.id) return window.location.href
  return `${window.location.origin}/featured-itinerary?itineraryId=${localItineraryData.value.id}`
})

// 整合資料結構
const itineraryDetails = computed(() => {
  if (localItineraryData.value.itinerary && localItineraryData.value.itinerary.days) {
    return {
      days: localItineraryData.value.itinerary.days,
      packingList: localItineraryData.value.packingList || [],
    }
  }
  return { days: [], packingList: [] }
})

const activeDay = computed(() => {
  if (!itineraryDetails.value.days || itineraryDetails.value.days.length === 0)
    return { activities: [] }
  return itineraryDetails.value.days[activeDayIndex.value] || { activities: [] }
})

const displayDate = computed(() => {
  const { start_date, end_date, durationDays } = localItineraryData.value
  if (start_date && end_date) {
    const d1 = new Date(start_date)
    const d2 = new Date(end_date)
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return `${durationDays || 1} 天`
    const pad = (n) => n.toString().padStart(2, '0')
    const startStr = `${d1.getFullYear()}/${pad(d1.getMonth() + 1)}/${pad(d1.getDate())}`
    const endStr = `${pad(d2.getMonth() + 1)}/${pad(d2.getDate())}`
    if (d1.getTime() === d2.getTime()) return startStr
    return `${startStr} - ${endStr}`
  }
  return `${durationDays || 1} 天`
})

const fetchFullItineraryDetails = async () => {
  if (!props.itinerary.id) return
  isLoadingDetails.value = true
  try {
    const response = await getItineraryById(props.itinerary.id)
    if (response.success) {
      localItineraryData.value = { ...localItineraryData.value, ...response.data }
    }
  } catch (error) {
    console.error('抓取詳細資料失敗:', error)
  } finally {
    isLoadingDetails.value = false
  }
}

// --- 按讚邏輯 ---
const loadLikesInfo = async () => {
  if (!props.itinerary.id || !currentUserUid.value) return
  try {
    const info = await getLikesInfo(props.itinerary.id, currentUserUid.value, 'itinerary')
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error(error)
  }
}

const handleLikesUpdated = (event) => {
  const detail = event?.detail
  if (!detail || !currentUserUid.value) return
  const key = buildLikeKey(props.itinerary.id, currentUserUid.value, 'itinerary')
  if (detail.key !== key) return
  isLiked.value = detail.liked
  likesCount.value = detail.likesCount
}

const handleLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  try {
    const result = await toggleLike(props.itinerary.id, currentUserUid.value, 'itinerary', {
      currentLiked: isLiked.value,
      currentLikesCount: likesCount.value,
    })
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error(error)
  }
}

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'camera':
      return CameraIcon
    case 'coffee':
      return CoffeeIcon
    case 'map-pin':
      return MapPinIcon
    default:
      return MapIcon
  }
}

const formatPrice = (price) => {
  if (!price) return '洽詢'
  return `NT$ ${Number(price).toLocaleString()}`
}

const scrollToTop = () => {
  activeTab.value = 'itinerary'
  contentContainerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    showMenu.value = false
  } catch (error) {
    console.error('複製連結失敗：', error)
  }
}

const handleEdit = () => {
  showMenu.value = false
  emit('edit', localItineraryData.value)
}

const handleDelete = async () => {
  if (!localItineraryData.value?.id) return
  if (!confirm('確定要刪除此行程嗎？')) return
  try {
    const axios = (await import('axios')).default
    const { API_BASE_URL } = await import('@/api/config')
    await axios.delete(`${API_BASE_URL}/itineraries/${localItineraryData.value.id}`)
    showMenu.value = false
    emit('deleted', localItineraryData.value)
    emit('close')
  } catch (error) {
    console.error('刪除失敗：', error)
    alert('刪除失敗，請稍後再試')
  }
}

const jumpToComments = async () => {
  activeTab.value = 'comments'
  await nextTick()
  const tabElement = document.getElementById('itinerary-tab-nav')
  if (tabElement) {
    tabElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleAddToCart = async () => {
  if (isAddingToCart.value) return
  if (!localItineraryData.value?.id) return
  if (!userStore.isLoggedIn) {
    await showAlert('請先登入再加入購物車')
    router.push('/login')
    return
  }
  isAddingToCart.value = true
  try {
    await checkoutStore.loadCartFromDb()
    if (checkoutStore.cartError) {
      await showError(checkoutStore.cartError)
      return
    }

    const itineraryId = localItineraryData.value.id

    // 優先從 tourGroups（已展示的購物車項目）查找
    const existingTourGroup = checkoutStore.tourGroups.find(
      (t) => Number(t.id) === Number(itineraryId),
    )

    if (existingTourGroup) {
      const shouldIncrease = await showConfirm('購物車已經有相同行程，是否要增加人數？', {
        confirmButtonText: '增加人數',
        cancelButtonText: '取消',
        icon: 'question',
        iconColor: '#2563eb',
      })
      if (!shouldIncrease) return

      const nextPersons = Number(existingTourGroup.persons ?? 1) + 1
      try {
        await updateCartItemPersons({ itineraryId, persons: nextPersons })
        existingTourGroup.persons = nextPersons

        // 同時更新 cartItems 中的該項
        const cartItem = checkoutStore.cartItems.find(
          (c) => Number(c.itineraryId) === Number(itineraryId),
        )
        if (cartItem) cartItem.persons = nextPersons

        const goToCart = await showConfirm('已增加人數，是否前往購物車？', {
          confirmButtonText: '前往購物車',
          cancelButtonText: '留在此頁',
          icon: 'success',
          iconColor: '#16a34a',
        })
        if (goToCart) {
          await checkoutStore.loadCartFromDb()
          if (checkoutStore.cartError) {
            await showError(checkoutStore.cartError)
            return
          }
          router.push('/cart')
        }
      } catch (error) {
        await showError(error?.message || '增加人數失敗')
      }
      return
    }

    await checkoutStore.addToCart(localItineraryData.value.id, 1, { skipReload: true })
    if (checkoutStore.cartError) {
      await showError(checkoutStore.cartError)
      return
    }
    const goToCart = await showConfirm('已成功加入購物車，是否前往查看？', {
      confirmButtonText: '前往購物車',
      cancelButtonText: '繼續挑選行程',
      icon: 'success',
      iconColor: '#16a34a',
    })
    if (goToCart) {
      await checkoutStore.loadCartFromDb()
      if (checkoutStore.cartError) {
        await showError(checkoutStore.cartError)
        return
      }
      router.push('/cart')
    }
  } finally {
    isAddingToCart.value = false
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
  if (currentUserUid.value) {
    seedLikeState(props.itinerary.id, currentUserUid.value, 'itinerary', {
      liked: !!props.itinerary.isLiked,
      likesCount: Number(props.itinerary.likes ?? 0),
    })
    await loadLikesInfo()
  } else isLiked.value = false
})

onMounted(async () => {
  const user = auth.currentUser
  if (user) {
    currentUserUid.value = user.uid
    seedLikeState(props.itinerary.id, currentUserUid.value, 'itinerary', {
      liked: !!props.itinerary.isLiked,
      likesCount: Number(props.itinerary.likes ?? 0),
    })
    await loadLikesInfo()
  }
  await fetchFullItineraryDetails()
  if (props.scrollToComments) {
    jumpToComments()
  }
  window.addEventListener('likes-updated', handleLikesUpdated)
})

onUnmounted(() => {
  window.removeEventListener('likes-updated', handleLikesUpdated)
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <ShareModal v-if="showShareModal" :postLink="shareLink" @close="showShareModal = false" />

    <div class="relative w-full max-w-5xl max-h-[90vh] flex flex-col">
      <div class="lg:hidden relative z-0 flex items-center justify-end gap-2 mr-4 -mb-2">
        <button
          :class="[
            'bg-tag-amber text-white px-3 pt-2 pb-3 rounded-t-xl rounded-b-none shadow-md inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-transform',
            activeTab === 'itinerary' ? '-translate-y-1' : '',
          ]"
          title="回到內文"
          @click="scrollToTop"
        >
          <FileTextIcon class="w-4 h-4" />
          內文
        </button>
        <button
          :class="[
            'bg-tag-blue text-white px-3 pt-2 pb-3 rounded-t-xl rounded-b-none shadow-md inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-transform',
            activeTab === 'comments' ? '-translate-y-1' : '',
          ]"
          title="跳轉至留言區"
          @click="jumpToComments"
        >
          <MessageCircleIcon class="w-4 h-4" />
          留言區
        </button>
      </div>
      <button
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-2 lg:top-24 z-20 lg:z-0 bg-tag-amber text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-amber min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        title="回到內文"
        @click="scrollToTop"
      >
        <FileTextIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
        >
          內文&emsp;
        </span>
      </button>

      <button
        title="跳轉至留言區"
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-20 lg:top-40 z-20 lg:z-0 bg-tag-blue text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-blue min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        @click="jumpToComments"
      >
        <MessageCircleIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
        >
          留言區
        </span>
      </button>

      <div
        class="bg-white w-full h-full flex flex-col rounded-xl border-2 border-primary overflow-hidden relative z-10"
      >
        <div class="absolute top-4 right-16 z-20">
          <button
            class="bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
            title="更多"
            @click.stop="showMenu = !showMenu"
          >
            <MoreVertical class="w-6 h-6" />
          </button>
          <div
            v-if="showMenu"
            class="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white shadow-xl z-30"
          >
            <button
              v-if="isAuthor"
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              @click="handleEdit"
            >
              編輯
            </button>
            <button
              v-if="isAuthor"
              class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              @click="handleDelete"
            >
              刪除
            </button>
            <div v-if="isAuthor" class="border-t border-gray-200 my-1"></div>
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              @click="handleCopyLink"
            >
              複製連結
            </button>
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              @click="emit('close')"
            >
              關閉
            </button>
          </div>
        </div>
        <button
          class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>

        <div ref="contentContainerRef" class="flex-1 overflow-y-auto custom-scrollbar">
          <div class="relative w-full h-72 overflow-hidden">
            <img
              :src="
                localItineraryData.coverImage ||
                localItineraryData.image ||
                'https://picsum.photos/800/400'
              "
              class="w-full h-full object-cover"
              :style="{ objectPosition: `center ${localItineraryData.banner_position_y || 50}%` }"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

            <div
              v-if="localItineraryData.category"
              class="absolute top-4 left-20 bg-white/90 text-primary-700 px-3 py-1 font-bold text-xs rounded-full border-2 border-white shadow-sm"
            >
              {{ localItineraryData.category }}
            </div>

            <div
              class="absolute top-4 left-4 bg-primary-600 text-white px-4 py-2 font-bold text-lg rounded-full border-2 border-white shadow-lg flex items-center"
            >
              <DollarSignIcon class="w-5 h-5 mr-1" />
              {{ formatPrice(localItineraryData.price) }}
            </div>

            <div class="absolute bottom-4 left-4 text-white">
              <div v-if="localItineraryData.agencyName" class="flex items-center space-x-2 mb-1">
                <BuildingIcon class="w-4 h-4 text-primary-300" />
                <span class="font-bold text-primary-100 text-sm tracking-wider"
                  >由 {{ localItineraryData.agencyName }} 提供</span
                >
              </div>
              <h1 class="text-3xl font-black text-white shadow-sm">
                {{ localItineraryData.title }}
              </h1>
            </div>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">地點</span>
                </div>
                <div class="font-bold text-secondary-900 truncate">
                  {{
                    Array.isArray(localItineraryData.destinations)
                      ? localItineraryData.destinations.join(',')
                      : localItineraryData.destinations || localItineraryData.location || '多個地點'
                  }}
                </div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">日期</span>
                </div>
                <div class="font-bold text-secondary-900 text-sm truncate">
                  {{ displayDate }}
                </div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">參與人數</span>
                </div>
                <div class="font-bold text-primary-600">
                  上限 {{ localItineraryData.max_people || 20 }} 人
                </div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MessageCircleIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">留言</span>
                </div>
                <div class="font-bold text-secondary-900">
                  {{ localItineraryData.comments_count || 0 }} 則
                </div>
              </div>

              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
                <div class="flex items-center text-accent-500 mb-1">
                  <BookmarkIcon class="w-4 h-4 mr-1" />
                  <span class="text-xs font-bold text-secondary-500">收藏</span>
                </div>
                <div class="font-bold text-secondary-900">
                  {{
                    (localItineraryData.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
                  }}
                </div>
              </div>
            </div>

            <div class="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
              <div
                v-if="localItineraryData.tags && localItineraryData.tags.length"
                class="flex flex-wrap gap-2"
              >
                <span
                  v-for="tag in localItineraryData.tags"
                  :key="tag"
                  class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
                >
                  #{{ tag }}
                </span>
              </div>
              <div class="w-full lg:w-auto flex gap-3 lg:ml-auto justify-start">
                <button
                  class="bg-primary-600 text-white px-6 py-3 rounded-full font-bold hover:bg-primary-700 transition shadow-md flex items-center"
                >
                  立即諮詢
                </button>
                <button
                  class="bg-primary-600 text-white px-6 py-3 rounded-full font-bold hover:bg-primary-700 transition shadow-md flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="isAddingToCart"
                  @click="handleAddToCart"
                >
                  {{ isAddingToCart ? '加入中...' : '立即預訂' }}
                </button>
              </div>
            </div>

            <div class="prose prose-lg max-w-none mb-6">
              <h3 class="font-bold text-xl mb-2 text-secondary-900">行程特色</h3>
              <div
                class="rich-content text-gray-900 leading-relaxed"
                v-html="
                  localItineraryData.description || localItineraryData.content || '暫無詳細介紹'
                "
              ></div>
            </div>

            <div
              class="flex items-center space-x-4 py-4 border-t border-b border-secondary-200 mb-6"
            >
              <button
                :class="[
                  'flex items-center space-x-1 transition group',
                  isLiked ? 'text-accent-600' : 'text-secondary-400 hover:text-accent-600',
                ]"
                @click="handleLike"
              >
                <HeartIcon
                  :class="[
                    'w-6 h-6 transition-transform group-active:scale-125',
                    { 'fill-current': isLiked },
                  ]"
                />
                <span class="font-bold ml-1">{{ likesCount }}</span>
              </button>

              <button
                :class="[
                  'flex items-center space-x-1 transition group',
                  userStore.isCollected(itemData)
                    ? 'text-primary-600'
                    : 'text-secondary-400 hover:text-primary-600',
                ]"
                @click="
                  userStore.isCollected(itemData)
                    ? userStore.removeFromCollection(itemData)
                    : userStore.openCollectionModal(itemData)
                "
              >
                <BookmarkIcon
                  :class="[
                    'w-6 h-6 transition-transform group-active:scale-125',
                    { 'fill-current': userStore.isCollected(itemData) },
                  ]"
                />
              </button>
              <button
                class="text-secondary-400 hover:text-primary-600 transition group ml-1"
                title="分享"
                @click="showShareModal = true"
              >
                <ShareIcon class="w-6 h-6 transition-transform group-active:scale-125" />
              </button>
            </div>

            <div id="itinerary-tab-nav" class="border-b-2 border-primary-200 mb-6">
              <div class="flex space-x-1">
                <button
                  :class="[
                    'px-6 py-3 font-bold transition relative',
                    activeTab === 'itinerary'
                      ? 'text-primary-600 border-b-4 border-primary-600'
                      : 'text-secondary-400 hover:text-secondary-600',
                  ]"
                  @click="activeTab = 'itinerary'"
                >
                  <MapIcon class="w-5 h-5 inline mr-2" />
                  每日行程
                </button>
                <button
                  :class="[
                    'px-6 py-3 font-bold transition relative',
                    activeTab === 'comments'
                      ? 'text-primary-600 border-b-4 border-primary-600'
                      : 'text-secondary-400 hover:text-secondary-600',
                  ]"
                  @click="activeTab = 'comments'"
                >
                  <MessageCircleIcon class="w-5 h-5 inline mr-2" />
                  留言討論
                </button>
              </div>
            </div>

            <div v-if="activeTab === 'itinerary'" class="space-y-6">
              <div v-if="isLoadingDetails" class="text-center py-10 text-primary-600">
                正在載入詳細行程...
              </div>
              <div v-else-if="itineraryDetails.days && itineraryDetails.days.length > 0">
                <div class="flex overflow-x-auto space-x-2 pb-2">
                  <button
                    v-for="(day, index) in itineraryDetails.days"
                    :key="index"
                    :class="[
                      'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                      activeDayIndex === index
                        ? 'bg-primary-600 text-white border-primary-700'
                        : 'bg-white text-secondary-500 border-secondary-200 hover:bg-secondary-50',
                    ]"
                    @click="activeDayIndex = index"
                  >
                    Day {{ index + 1 }}
                  </button>
                </div>

                <div class="space-y-4">
                  <div v-if="activeDay.activities && activeDay.activities.length > 0">
                    <div
                      v-for="(activity, actIndex) in activeDay.activities"
                      :key="actIndex"
                      class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm relative overflow-hidden"
                    >
                      <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>
                      <div class="flex gap-4">
                        <div class="w-16 shrink-0 text-right">
                          <div class="text-xl font-black text-primary-600">
                            {{ activity.time || 'All Day' }}
                          </div>
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center space-x-2 mb-2">
                            <component
                              :is="getIconComponent(activity.icon)"
                              class="w-5 h-5 text-primary-500"
                            />
                            <h4 class="text-lg font-bold text-secondary-900">
                              {{ activity.title }}
                            </h4>
                          </div>
                          <p class="text-secondary-600 text-sm">{{ activity.desc }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-else
                    class="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                  >
                    本日無特定行程安排，享受自由時間！
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-gray-400 py-10 bg-gray-50 rounded-lg">
                尚未建立詳細行程表
              </div>

              <div
                v-if="itineraryDetails.packingList && itineraryDetails.packingList.length > 0"
                class="mt-8 pt-6 border-t border-secondary-200"
              >
                <h3 class="font-black text-lg text-secondary-900 flex items-center mb-4">
                  <CheckSquareIcon class="w-5 h-5 mr-2 text-primary" />
                  建議攜帶物品 (官方建議)
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="(cat, catIndex) in itineraryDetails.packingList"
                    :key="catIndex"
                    class="bg-white border-2 border-secondary-200 rounded-lg p-4"
                  >
                    <h4 class="font-bold text-secondary-700 mb-3">{{ cat.category }}</h4>
                    <div class="space-y-2">
                      <div
                        v-for="(item, itemIndex) in cat.items"
                        :key="itemIndex"
                        class="flex items-center"
                      >
                        <div class="w-2 h-2 rounded-full bg-primary-400 mr-2"></div>
                        <span class="text-sm text-secondary-700">
                          {{ item.name || item }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'comments'" class="py-10 text-center text-secondary-500">
              這裡可以放置針對此行程的留言討論
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
:deep(.rich-content) {
  font-size: 1rem;
  line-height: 1.75;
  color: #111827;
}
:deep(.rich-content p) {
  color: #111827;
  margin-bottom: 1.25em;
}
:deep(.rich-content h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2em;
  margin-bottom: 1em;
  color: #111827;
  border-left: 4px solid #2563eb;
  padding-left: 1em;
  padding-top: 0.5em;
  padding-bottom: 0.5em;
  background-color: #eff6ff;
  border-radius: 0 0.5rem 0.5rem 0;
}
:deep(.rich-content h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  color: #374151;
  border-left: 4px solid #60a5fa;
  padding-left: 0.875em;
  padding-top: 0.375em;
  padding-bottom: 0.375em;
  background-color: #f0f9ff;
  border-radius: 0 0.375rem 0.375rem 0;
}
:deep(.rich-content img) {
  border-radius: 0.5rem;
  margin-top: 1em;
  margin-bottom: 1em;
  margin-left: 0;
  margin-right: auto;
  max-width: 100%;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: block;
}
:deep(.rich-content [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
