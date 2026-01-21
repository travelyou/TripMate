<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Bookmark as BookmarkIcon,
  Heart as HeartIcon,
  DollarSign as DollarSignIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
  Building as BuildingIcon,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Flag,
} from 'lucide-vue-next'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
  },
})

const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['open-detail', 'open-share', 'edit', 'delete'])

const handleAgencyClick = (e) => {
  e.stopPropagation()
  e.preventDefault()
  const vendorId = props.itinerary.vendor_id || props.itinerary.vendorId
  const authorUid = props.itinerary.author_uid || props.itinerary.authorUid

  if (vendorId) {
    router.push({ path: `/vendor/${vendorId}`, replace: false })
  } else if (authorUid) {
    router.push({ path: `/profile/${authorUid}`, replace: false })
  }
}
const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(props.itinerary.likes || 0)
const showMenu = ref(false)
const isReported = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info')
const itemData = computed(() => ({
  id: props.itinerary.id,
  type: 'itinerary',
  title: props.itinerary.title,
  coverImage: props.itinerary.coverImage,
  price: props.itinerary.price,
}))

// --- HTML 轉純文字 (摘要用) ---
const previewContent = computed(() => {
  if (!props.itinerary.description) return ''
  let content = props.itinerary.description
  content = content.replace(/<br\s*\/?>/gi, '\n')
  content = content.replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n')
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const plainText = tempDiv.textContent || tempDiv.innerText || ''
  return plainText.trim()
})

const formatPrice = (price) => {
  if (price === undefined || price === null) return '洽詢'
  return `NT$ ${Number(price).toLocaleString()}`
}

const displayLocation = computed(() => {
  const dest = props.itinerary.destinations || props.itinerary.location
  if (Array.isArray(dest)) {
    return dest.join('、')
  }
  return dest || '未定地點'
})

const displayDate = computed(() => {
  const { start_date, end_date, durationDays } = props.itinerary
  if (start_date && end_date) {
    const d1 = new Date(start_date)
    const d2 = new Date(end_date)
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return `${durationDays || 1} 天`
    // 簡化日期顯示邏輯
    const pad = (n) => n.toString().padStart(2, '0')
    const startStr = `${d1.getFullYear()}/${pad(d1.getMonth() + 1)}/${pad(d1.getDate())}`
    const endStr = `${pad(d2.getMonth() + 1)}/${pad(d2.getDate())}`
    if (d1.getTime() === d2.getTime()) return startStr
    return `${startStr} - ${endStr}`
  }
  return `${durationDays || 1} 天`
})

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

const handleLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  try {
    const result = await toggleLike(props.itinerary.id, currentUserUid.value, 'itinerary')
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error(error)
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
  if (currentUserUid.value) await loadLikesInfo()
  else isLiked.value = false
})

const isAuthor = computed(() => {
  const authorUid = props.itinerary.author_uid || props.itinerary.authorUid
  return currentUserUid.value && authorUid && currentUserUid.value === authorUid
})

const toggleMenu = (e) => {
  e.stopPropagation()
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const showToastNotification = (message, type = 'info') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 5000)
}

const handleEdit = (e) => {
  e.stopPropagation()
  closeMenu()
  emit('edit', props.itinerary)
}

const handleDelete = async (e) => {
  e.stopPropagation()
  closeMenu()
  
  if (!confirm('確定要刪除此行程嗎？')) {
    return
  }
  
  try {
    // 使用axios直接呼叫刪除API
    const axios = (await import('axios')).default
    const { API_BASE_URL } = await import('@/api/config')
    await axios.delete(`${API_BASE_URL}/itineraries/${props.itinerary.id}`)
    emit('delete', props.itinerary)
    window.location.reload()
  } catch (error) {
    console.error('刪除失敗:', error)
    alert('刪除失敗，請稍後再試')
  }
}

const handleShare = async (e) => {
  e.stopPropagation()
  closeMenu()
  try {
    const url = `${window.location.origin}/featured-itinerary#itinerary-${props.itinerary.id}`
    await navigator.clipboard.writeText(url)
    showToastNotification('已複製貼文網址', 'info')
  } catch (error) {
    console.error('複製失敗:', error)
    alert('複製失敗，請稍後再試')
  }
}

const handleReport = (e) => {
  e.stopPropagation()
  closeMenu()
  isReported.value = true
  showToastNotification('已經向管理員提出檢舉 謝謝', 'success')
}

const handleClickOutside = (event) => {
  if (showMenu.value && !event.target.closest('.post-menu-container')) {
    closeMenu()
  }
}

onMounted(async () => {
  const user = auth.currentUser
  if (user) {
    currentUserUid.value = user.uid
    await loadLikesInfo()
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    class="overflow-hidden cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] duration-150 rounded-2xl border border-secondary-200 shadow-md bg-white group flex flex-col h-full"
    @click="emit('open-detail', props.itinerary, false)"
  >
    <!-- 三点菜单按钮 -->
    <div class="absolute top-2 right-2 post-menu-container z-30">
      <button
        class="p-2 rounded-full hover:bg-white/80 transition text-white hover:text-gray-700 bg-black/20 backdrop-blur-sm"
        @click="toggleMenu"
      >
        <MoreVertical class="w-5 h-5" />
      </button>
      
      <!-- 菜单下拉 -->
      <div
        v-if="showMenu"
        class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
      >
        <button
          v-if="isAuthor"
          class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition"
          @click="handleEdit"
        >
          <Edit class="w-4 h-4" />
          <span>編輯</span>
        </button>
        <button
          v-if="isAuthor"
          class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition"
          @click="handleDelete"
        >
          <Trash2 class="w-4 h-4" />
          <span>刪除</span>
        </button>
        <div v-if="isAuthor" class="border-t border-gray-200 my-1"></div>
        <button
          class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition"
          @click="handleShare"
        >
          <Share2 class="w-4 h-4" />
          <span>分享</span>
        </button>
        <button
          class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition"
          @click="handleReport"
        >
          <Flag class="w-4 h-4" />
          <span>檢舉</span>
        </button>
      </div>
    </div>

    <!-- Toast 通知 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="showToast"
          :class="[
            'fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg shadow-xl transition-all duration-300',
            toastType === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          ]"
        >
          <p class="text-sm font-bold whitespace-nowrap">{{ toastMessage }}</p>
        </div>
      </Transition>
    </Teleport>

    <div class="relative w-full aspect-[4/3] overflow-hidden bg-secondary-100">
      <div
        v-if="props.itinerary.category"
        class="absolute top-0 left-0 px-3 py-1 font-bold text-xs bg-white/90 text-primary-700 rounded-br-xl border-b-2 border-r-2 border-white/50 backdrop-blur-sm z-10 shadow-sm"
      >
        {{ props.itinerary.category }}
      </div>

      <img
        v-if="props.itinerary.coverImage"
        :src="props.itinerary.coverImage"
        :alt="props.itinerary.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        :style="{ objectPosition: `center ${props.itinerary.banner_position_y || 50}%` }"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-secondary-400 bg-secondary-200"
      >
        <MapPinIcon class="w-12 h-12 opacity-50" />
      </div>

      <div
        class="absolute bottom-2 left-2 bg-primary-600/95 backdrop-blur-sm text-white font-black text-sm px-3 py-1.5 rounded-full flex items-center shadow-lg border border-white/20"
      >
        <DollarSignIcon class="w-3.5 h-3.5 mr-0.5" />
        <span>{{ formatPrice(props.itinerary.price) }}</span>
      </div>
    </div>

    <div class="p-4 flex flex-col flex-1">
      <div
        v-if="props.itinerary.agencyName"
        class="text-xs font-bold text-primary-600 tracking-wider cursor-pointer hover:text-primary-700 transition"
        @click.stop="handleAgencyClick"
      >
        <BuildingIcon class="w-3 h-3 mr-1" />
        {{ props.itinerary.agencyName }}
      </div>

      <h3
        class="text-lg font-black text-secondary-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition"
      >
        {{ props.itinerary.title || '無標題' }}
      </h3>

      <p class="text-gray-900 text-sm line-clamp-2 mb-3 h-10">
        {{ previewContent }}
      </p>

      <div class="flex items-center space-x-4 text-sm text-secondary-600 mb-auto pb-4">
        <div class="flex items-center space-x-1 shrink-0">
          <CalendarIcon class="w-4 h-4 text-primary-500" />
          <span class="font-bold text-xs">{{ displayDate }}</span>
        </div>
        <div class="flex items-center space-x-1 truncate">
          <MapPinIcon class="w-4 h-4 text-primary-600 shrink-0" />
          <span class="truncate">{{ displayLocation }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-secondary-100 pt-3 mt-auto">
        <div class="flex items-center space-x-3 text-xs text-secondary-500">
          <button
            class="flex items-center space-x-1 transition p-1 rounded-md hover:bg-secondary-50"
            :class="isLiked ? 'text-accent-600' : 'hover:text-accent-600'"
            @click.stop="handleLike"
          >
            <HeartIcon
              class="w-4 h-4 transition-transform active:scale-125"
              :class="{ 'fill-current': isLiked }"
            />
            <span class="font-bold">{{ likesCount }}</span>
          </button>

          <button
            class="flex items-center space-x-1 transition p-1 rounded-md hover:bg-secondary-50"
            :class="userStore.isCollected(itemData) ? 'text-primary-600' : 'hover:text-primary-600'"
            @click.stop="
              userStore.isCollected(itemData)
                ? userStore.removeFromCollection(itemData)
                : userStore.openCollectionModal(itemData)
            "
          >
            <BookmarkIcon
              class="w-4 h-4 transition-transform active:scale-125"
              :class="{ 'fill-current': userStore.isCollected(itemData) }"
            />
            <span class="font-bold">{{
              (props.itinerary.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
            }}</span>
          </button>
        </div>

        <div class="flex items-center space-x-2 text-secondary-400">
          <button
            class="p-1.5 hover:bg-secondary-50 rounded-full hover:text-secondary-600 transition"
            @click.stop="emit('open-detail', props.itinerary, true)"
          >
            <MessageCircleIcon class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 hover:bg-secondary-50 rounded-full hover:text-secondary-600 transition"
            @click.stop="emit('open-share', props.itinerary.id)"
          >
            <Repeat2Icon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
