<script setup>
import { computed, ref, onMounted, onUnmounted, Teleport, Transition } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  MessageCircle as MessageCircleIcon,
  Users as UsersIcon,
  Heart as HeartIcon,
  Bookmark as BookmarkIcon,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Flag,
  UserPlus as UserPlusIcon,
} from 'lucide-vue-next'
import { deleteTraveler } from '@/api/travelers'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

const router = useRouter()

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open-detail', 'edit', 'delete', 'open-apply', 'open-applications'])

const userStore = useUserStore()
const currentUserUid = ref(null)
const showMenu = ref(false)
const isReported = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

const handleAvatarClick = (e) => {
  e.stopPropagation()
  e.preventDefault()

  const authorUid = props.traveler.author_uid || props.traveler.authorUid
  const vendorId = props.traveler.vendor_id || props.traveler.vendorId

  if (vendorId) {
    router.push({ path: `/vendor/${vendorId}`, replace: false })
    return
  }

  if (authorUid) {
    router.push({ path: `/profile/${authorUid}`, replace: false })
    return
  }
}

const itemData = computed(() => ({
  id: props.traveler.id,
  type: 'traveler',
  title: props.traveler.title,
  content: props.traveler.content,
  image: props.traveler.image,
  author: props.traveler.author,
  avatar: props.traveler.avatar,
  location: props.traveler.location,
  date: props.traveler.date,
  status: props.traveler.status,
  people: props.traveler.people,
  tags: props.traveler.tags,
  comments: props.traveler.comments,
  category: props.traveler.category, // 確保有這個欄位
}))

const previewContent = computed(() => {
  if (!props.traveler.content) return ''
  let content = props.traveler.content

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  return tempDiv.textContent || tempDiv.innerText || ''
})

const getStatusClasses = (status) => {
  switch (status) {
    case '招募中':
      return 'bg-primary-600 text-white'
    case '已額滿':
      return 'bg-primary-700 text-white'
    case '已出發':
      return 'bg-secondary-500 text-white'
    default:
      return 'bg-primary-100 text-primary-800'
  }
}

const isAuthor = computed(() => {
  const authorUid = props.traveler.author_uid || props.traveler.authorUid
  return currentUserUid.value && authorUid && currentUserUid.value === authorUid
})

const handleApply = (e) => {
  e.stopPropagation()
  if (!currentUserUid.value) {
    alert('請先登入後才能報名')
    return
  }
  emit('open-apply', props.traveler)
}

const handleViewApplications = (e) => {
  e.stopPropagation()
  emit('open-applications', props.traveler)
}

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
  emit('edit', props.traveler)
}

const handleDelete = async (e) => {
  e.stopPropagation()
  closeMenu()

  if (!confirm('確定要刪除此招募嗎？')) {
    return
  }

  try {
    await deleteTraveler(props.traveler.id)
    emit('delete', props.traveler)
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
    const url = `${window.location.origin}/travelers#traveler-${props.traveler.id}`
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

onAuthStateChanged(auth, (user) => {
  currentUserUid.value = user ? user.uid : null
})

onMounted(() => {
  const user = auth.currentUser
  if (user) {
    currentUserUid.value = user.uid
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="h-full" @click="$emit('open-detail', traveler)">
    <div
      class="bg-white transition relative cursor-pointer rounded-xl border border-secondary-200 shadow hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] h-full flex flex-col"
    >
      <div
        v-if="traveler.category"
        class="absolute top-0 left-0 px-3.5 py-1.5 font-bold text-xs bg-white/90 text-primary-700 rounded-br-xl rounded-tl-xl border-b-2 border-r-2 border-white/50 backdrop-blur-sm z-10 shadow-sm"
      >
        {{ traveler.category }}
      </div>

      <div
        :class="getStatusClasses(traveler.status)"
        class="absolute top-0 right-0 px-3 py-1 font-bold text-xs rounded-bl-xl rounded-tr-xl border-b-2 border-l-2 border-primary-200 shadow-primary-sm z-10"
      >
        {{ traveler.status }}
      </div>

      <!-- 三点菜单按钮 -->
      <div class="absolute top-2 right-2 post-menu-container z-30" :style="{ top: traveler.status ? '3.5rem' : '0.5rem' }">
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

      <div class="flex flex-col gap-3 h-full">
        <div
          class="relative shrink-0 w-full overflow-hidden rounded-xl aspect-[3/4] lg:aspect-auto lg:h-[36rem]"
        >
          <img
            :src="traveler.image"
            :alt="traveler.title"
            class="w-full h-full object-cover"
            :style="{ objectPosition: `center ${traveler.banner_position_y || 50}%` }"
          />

          <div
            class="absolute inset-x-0 bottom-0 h-[75%] px-4 pb-4 pt-10 text-white bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end z-20"
          >
            <div>
              <div class="flex items-center space-x-3 mb-2">
                <img
                  :src="traveler.avatar"
                  class="w-8 h-8 rounded-full object-cover border-2 border-white/80 cursor-pointer hover:ring-2 hover:ring-primary-500 transition"
                  @click.stop="handleAvatarClick"
                />
                <div>
                  <div class="flex items-center space-x-1 flex-wrap gap-1">
                    <span
                      class="font-bold text-sm text-white cursor-pointer hover:text-primary-300 transition"
                      @click.stop="handleAvatarClick"
                      >{{ traveler.author }}</span
                    >
                    <span
                      v-if="traveler.spiritAnimal && traveler.spiritAnimal.trim()"
                      class="text-xs font-semibold text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    >
                      {{ traveler.spiritAnimal }}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="text-xl font-bold mb-1 line-clamp-1">
                  {{ traveler.title }}
                </h3>
                <p class="text-sm text-white/85 mb-2 line-clamp-2 sm:line-clamp-1 xl:line-clamp-2">
                  {{ previewContent }}
                </p>
              </div>
            </div>

            <div class="space-y-2 text-sm text-white/85">
              <div class="flex flex-wrap gap-1 overflow-hidden line-clamp-1 min-h-[1.25rem]">
                <span
                  v-for="tag in traveler.tags || []"
                  :key="tag"
                  class="text-xs font-medium text-white/90 bg-white/15 px-2 py-0.5 rounded-full hover:bg-white/25 transition inline-flex items-center h-5 max-w-[6.5rem] truncate"
                >
                  #{{ tag }}
                </span>
              </div>

              <div class="flex items-center flex-wrap gap-4 mt-2 min-w-0">
                <span class="flex items-center max-w-[10rem] truncate">
                  <MapPinIcon class="w-4 h-4 mr-1 text-white/80" />
                  {{ traveler.location }}
                </span>
                <span class="flex items-center">
                  <CalendarIcon class="w-4 h-4 mr-1 text-white/70" />
                  {{ traveler.date }}
                </span>

                <button
                  class="flex items-center group transition"
                  :class="
                    userStore.isFavorite(itemData)
                      ? 'text-red-300'
                      : 'text-white/70 hover:text-red-300'
                  "
                  @click.stop="userStore.toggleFavorite(itemData)"
                >
                  <HeartIcon
                    class="w-4 h-4 mr-1 transition-transform group-active:scale-125"
                    :class="{ 'fill-current': userStore.isFavorite(itemData) }"
                  />
                </button>

                <button
                  class="flex items-center space-x-1 transition group"
                  :class="
                    userStore.isCollected(itemData)
                      ? 'text-emerald-300'
                      : 'text-white/70 hover:text-emerald-300'
                  "
                  @click.stop="
                    userStore.isCollected(itemData)
                      ? userStore.removeFromCollection(itemData)
                      : userStore.openCollectionModal(itemData)
                  "
                >
                  <BookmarkIcon
                    class="w-4 h-4 transition-transform group-active:scale-125"
                    :class="{ 'fill-current': userStore.isCollected(itemData) }"
                  />
                  <span>{{
                    (traveler.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
                  }}</span>
                </button>

                <button
                  v-if="isAuthor"
                  class="flex items-center space-x-1 transition group text-white/70 hover:text-blue-300"
                  @click.stop="handleViewApplications"
                  title="查看報名清單"
                >
                  <UserPlusIcon
                    class="w-4 h-4 transition-transform group-active:scale-125"
                  />
                </button>
                <button
                  v-else
                  class="flex items-center space-x-1 transition group text-white/70 hover:text-blue-300"
                  @click.stop="handleApply"
                  title="報名"
                >
                  <UserPlusIcon
                    class="w-4 h-4 transition-transform group-active:scale-125"
                  />
                </button>

                <span class="flex items-center text-white/90 ml-auto md:ml-0">
                  <MessageCircleIcon class="w-4 h-4 mr-1" />
                  {{ traveler.comments || 0 }}
                </span>
              </div>

              <div class="flex justify-between items-end pt-2 border-t border-white/20 relative z-20">
                <div class="flex items-center font-bold text-white">
                  <UsersIcon class="w-5 h-5 mr-1 text-white/85" />
                  招募人數：
                  <span class="text-lg text-white ml-1">{{ traveler.people }}</span>
                </div>

                <button
                  v-if="!isAuthor"
                  :disabled="traveler.status === '已額滿'"
                  :class="
                    traveler.status === '已額滿'
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-primary-700 hover:bg-white/90'
                  "
                  class="px-4 py-2 rounded-full font-bold transition text-sm shadow-md relative z-30"
                  @click.stop="traveler.status !== '已額滿' && handleApply()"
                >
                  私訊報名
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
