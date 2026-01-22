<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
  category: props.traveler.category,
}))

const previewContent = computed(() => {
  if (!props.traveler.content) return ''

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = props.traveler.content
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
        class="relative flex h-full flex-col cursor-pointer rounded-xl border border-secondary-200 bg-white shadow transition hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]"
      >
      <div
        v-if="traveler.category"
        class="absolute top-0 left-0 z-10 rounded-tl-xl rounded-br-xl border-b-2 border-r-2 border-white/50 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-primary-700 shadow-sm backdrop-blur-sm"
      >
        {{ traveler.category }}
      </div>

      <div
        :class="getStatusClasses(traveler.status)"
        class="absolute top-0 right-0 z-10 rounded-tr-xl rounded-bl-xl border-b-2 border-l-2 border-primary-200 px-3 py-1 text-xs font-bold shadow-primary-sm"
      >
        {{ traveler.status }}
      </div>

      <!-- 三點選單按鈕 -->
      <div
        class="absolute top-2 right-2 post-menu-container z-30"
        :style="{ top: traveler.status ? '3.5rem' : '0.5rem' }"
      >
        <button
          class="rounded-full bg-black/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/80 hover:text-gray-700"
          @click="toggleMenu"
        >
          <MoreVertical class="w-5 h-5" />
        </button>

        <!-- 選單下拉 -->
        <div
          v-if="showMenu"
          class="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
        >
          <button
            v-if="isAuthor"
            class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            @click="handleEdit"
          >
            <Edit class="w-4 h-4" />
            <span>編輯</span>
          </button>
          <button
            v-if="isAuthor"
            class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            @click="handleDelete"
          >
            <Trash2 class="w-4 h-4" />
            <span>刪除</span>
          </button>
          <div v-if="isAuthor" class="my-1 border-t border-gray-200"></div>
          <button
            class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            @click="handleShare"
          >
            <Share2 class="w-4 h-4" />
            <span>分享</span>
          </button>
          <button
            class="flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
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
              'fixed bottom-20 left-1/2 z-[9999] -translate-x-1/2 transform rounded-lg px-6 py-3 shadow-xl transition-all duration-300',
              toastType === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white',
            ]"
          >
            <p class="whitespace-nowrap text-sm font-bold">{{ toastMessage }}</p>
          </div>
        </Transition>
      </Teleport>

      <div class="flex flex-col gap-3 h-full">
        <div
          class="relative w-full shrink-0 overflow-hidden rounded-xl aspect-[3/4] lg:aspect-auto lg:h-[36rem]"
        >
          <img
            :src="traveler.image"
            :alt="traveler.title"
            class="w-full h-full object-cover"
            :style="{ objectPosition: `center ${traveler.banner_position_y || 50}%` }"
          />

          <div
            class="absolute inset-x-0 bottom-0 z-20 flex h-[75%] flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-10 pb-4 text-white"
          >
            <div>
              <div class="flex items-center space-x-3 mb-2">
                <img
                  :src="traveler.avatar"
                  class="h-8 w-8 cursor-pointer rounded-full border-2 border-white/80 object-cover transition hover:ring-2 hover:ring-primary-500"
                  @click.stop="handleAvatarClick"
                />
                <div>
                  <div class="flex items-center space-x-1 flex-wrap gap-1">
                    <span
                      class="cursor-pointer text-sm font-bold text-white transition hover:text-primary-300"
                      @click.stop="handleAvatarClick"
                    >
                      {{ traveler.author }}
                    </span>
                    <span
                      v-if="traveler.spiritAnimal && traveler.spiritAnimal.trim()"
                      class="whitespace-nowrap rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold text-white/90"
                    >
                      {{ traveler.spiritAnimal }}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="mb-1 line-clamp-1 text-xl font-bold">
                  {{ traveler.title }}
                </h3>
                <p class="mb-2 line-clamp-2 text-sm text-white/85 sm:line-clamp-1 xl:line-clamp-2">
                  {{ previewContent }}
                </p>
              </div>
            </div>

            <div class="space-y-2 text-sm text-white/85">
              <div class="flex flex-wrap gap-1 overflow-hidden line-clamp-1 min-h-[1.25rem]">
                <span
                  v-for="tag in traveler.tags || []"
                  :key="tag"
                  class="inline-flex h-5 max-w-[6.5rem] items-center truncate rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white/90 transition hover:bg-white/25"
                >
                  #{{ tag }}
                </span>
              </div>

              <div class="flex flex-col gap-2">
                <div class="mt-2 flex min-w-0 flex-wrap items-center gap-4">
                  <span class="flex max-w-[10rem] items-center truncate">
                    <MapPinIcon class="mr-1 h-4 w-4 text-white/80" />
                    {{ traveler.location }}
                  </span>
                  <span class="flex items-center">
                    <CalendarIcon class="mr-1 h-4 w-4 text-white/70" />
                    {{ traveler.date }}
                  </span>
                </div>

                <div class="mt-2 flex min-w-0 flex-wrap items-center gap-4">
                  <button
                    class="group flex items-center transition"
                    :class="
                      userStore.isFavorite(itemData)
                        ? 'text-red-300'
                        : 'text-white/70 hover:text-red-300'
                    "
                    @click.stop="userStore.toggleFavorite(itemData)"
                  >
                    <HeartIcon
                      class="mr-1 h-4 w-4 transition-transform group-active:scale-125"
                      :class="{ 'fill-current': userStore.isFavorite(itemData) }"
                    />
                  </button>

                  <button
                    class="group flex items-center space-x-1 transition"
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
                      class="h-4 w-4 transition-transform group-active:scale-125"
                      :class="{ 'fill-current': userStore.isCollected(itemData) }"
                    />
                    <span>{{
                      (traveler.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
                    }}</span>
                  </button>

                  <button
                    v-if="isAuthor"
                    class="group flex items-center space-x-1 text-white/70 transition hover:text-blue-300"
                    title="查看報名清單"
                    @click.stop="handleViewApplications"
                  >
                    <UserPlusIcon class="h-4 w-4 transition-transform group-active:scale-125" />
                  </button>
                  <button
                    v-else
                    class="group flex items-center space-x-1 text-white/70 transition hover:text-blue-300"
                    title="報名"
                    @click.stop="handleApply"
                  >
                    <UserPlusIcon class="h-4 w-4 transition-transform group-active:scale-125" />
                  </button>

                  <span class="ml-auto flex items-center text-white/90 md:ml-0">
                    <MessageCircleIcon class="mr-1 h-4 w-4" />
                    {{ traveler.comments || 0 }}
                  </span>
                </div>
              </div>

              <div
                class="relative z-20 flex items-end justify-between border-t border-white/20 pt-2"
              >
                <div class="flex items-center font-bold text-white">
                  <UsersIcon class="mr-1 h-5 w-5 text-white/85" />
                  招募人數：
                  <span class="ml-1 text-lg text-white">{{ traveler.people }}</span>
                </div>

                <button
                  v-if="!isAuthor"
                  :disabled="traveler.status === '已額滿'"
                  :class="
                    traveler.status === '已額滿'
                      ? 'cursor-not-allowed bg-white/20 text-white/60'
                      : 'bg-white text-primary-700 hover:bg-white/90'
                  "
                  class="relative z-30 rounded-full px-4 py-2 text-sm font-bold shadow-md transition"
                  @click.stop="
                    traveler.status !== '已額滿' && $emit('open-detail', traveler)
                  "
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
