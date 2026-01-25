<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import {
  X as XIcon,
  Send as SendIcon,
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
  FileText as FileTextIcon,
  UserPlus as UserPlusIcon,
  Check as CheckIcon,
  X as XCloseIcon,
  MoreVertical,
  Share as ShareIcon, // [新增]
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { createComment, toggleCommentLike as toggleCommentLikeApi } from '@/api/comments'
import { toggleLike, getLikesInfo, buildLikeKey, seedLikeState } from '@/api/likes'
import {
  getTravelerById,
  incrementView,
  getApplications,
  acceptApplication,
  rejectApplication,
  submitApplication,
} from '@/api/travelers'
import { deleteTraveler } from '@/api/travelers'
import { formatTime } from '@/utils/time'
import ShareModal from './ShareModal.vue'

const userStore = useUserStore()
const router = useRouter()

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
  scrollToComments: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'traveler-updated', 'open-apply', 'open-applications', 'edit'])

const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(0)
const activeTab = ref('itinerary')
const newComment = ref('')
const commentInputRef = ref(null)
const commentsSectionRef = ref(null)
const contentContainerRef = ref(null)
const localComments = ref([])
const applications = ref([])
const isLoadingApplications = ref(false)
const processingIds = ref(new Set())
const applicationMessage = ref('')
const isSubmittingApplication = ref(false)
const applicationError = ref('')
const myApplication = ref(null)
const showMenu = ref(false)
const showShareModal = ref(false)

// 建立一個本地變數來存「完整資料」
const localTravelerData = ref({ ...props.traveler })

const handleAuthorClick = () => {
  const authorUid = props.traveler.author_uid || localTravelerData.value?.author_uid
  if (authorUid) {
    router.push(`/profile/${authorUid}`)
  }
}

// [新增] 計算分享連結
const shareLink = computed(() => {
  if (!localTravelerData.value?.id) return window.location.href
  return `${window.location.origin}/travelers?travelerId=${localTravelerData.value.id}`
})

const handleCopyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    showMenu.value = false
    alert('連結已複製！')
  } catch (error) {
    console.error('複製連結失敗：', error)
  }
}

const handleEdit = () => {
  showMenu.value = false
  emit('edit', localTravelerData.value)
}

const handleDelete = async () => {
  if (!localTravelerData.value?.id) return
  if (!confirm('確定要刪除此招募嗎？')) return
  try {
    await deleteTraveler(localTravelerData.value.id)
    showMenu.value = false
    emit('traveler-updated')
    emit('close')
  } catch (error) {
    console.error('刪除失敗：', error)
    alert('刪除失敗，請稍後再試')
  }
}

const itineraryData = computed(() => {
  if (localTravelerData.value.itinerary && localTravelerData.value.itinerary.days) {
    return {
      days: localTravelerData.value.itinerary.days,
      packingList: localTravelerData.value.packingList || [],
    }
  }
  return { days: [], packingList: [] }
})

const activeDayIndex = ref(0)
const activeDay = computed(() => {
  if (!itineraryData.value.days || itineraryData.value.days.length === 0) return { activities: [] }
  return itineraryData.value.days[activeDayIndex.value] || { activities: [] }
})

const normalizedComments = computed(() => {
  if (localComments.value.length > 0) return localComments.value
  return localTravelerData.value.commentsData || []
})

const totalCommentCount = computed(() => {
  const comments = normalizedComments.value
  if (!comments.length) return 0
  let total = comments.length
  comments.forEach((comment) => {
    if (comment.replies) total += comment.replies.length
  })
  return total
})

const processedContent = computed(() => {
  const content = localTravelerData.value.content || ''
  try {
    const txt = document.createElement('textarea')
    txt.innerHTML = content
    return txt.value
  } catch {
    return content
  }
})

const scrollToTop = () => {
  activeTab.value = 'itinerary'
  contentContainerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const jumpToComments = async () => {
  activeTab.value = 'comments'
  await nextTick()

  const tabElement = document.getElementById('traveler-tab-nav')
  if (tabElement) {
    tabElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onAuthStateChanged(auth, async (user) => {
  const previousUid = currentUserUid.value
  currentUserUid.value = user ? user.uid : null
  if (props.traveler?.id && previousUid !== currentUserUid.value) {
    if (currentUserUid.value) {
      seedLikeState(props.traveler.id, currentUserUid.value, 'traveler', {
        liked: !!props.traveler?.isLiked,
        likesCount: Number(likesCount.value ?? 0),
      })
      await loadLikesInfo()
    } else isLiked.value = false
  }
})

const loadLikesInfo = async () => {
  if (!props.traveler?.id || !currentUserUid.value) return
  try {
    const info = await getLikesInfo(props.traveler.id, currentUserUid.value, 'traveler')
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount
  } catch (error) {
    console.error(error)
  }
}

const handleLikesUpdated = (event) => {
  const detail = event?.detail
  if (!detail || !currentUserUid.value) return
  const key = buildLikeKey(props.traveler.id, currentUserUid.value, 'traveler')
  if (detail.key !== key) return
  isLiked.value = detail.liked
  likesCount.value = detail.likesCount
}

const fetchFullTravelerDetails = async () => {
  try {
    const response = await getTravelerById(props.traveler.id, currentUserUid.value)
    if (response.success) {
      localTravelerData.value = { ...localTravelerData.value, ...response.data }
      incrementView(props.traveler.id)
      const commentsData = response.data?.commentsData || response.data?.comments || []
      if (Array.isArray(commentsData)) {
        localComments.value = commentsData.map((comment) => ({
          id: comment.id,
          author:
            comment.author_nickname ||
            comment.author_name ||
            comment.author ||
            comment.author_uid ||
            '匿名用戶',
          author_uid: comment.author_uid,
          avatar:
            comment.author_avatar ||
            comment.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_uid}`,
          content: comment.content,
          time: comment.created_at || comment.timestamp || comment.time,
          likes: comment.likes || 0,
          replies: comment.replies || [],
        }))
      } else {
        localComments.value = []
      }
    }
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
    const result = await toggleLike(props.traveler.id, currentUserUid.value, 'traveler', {
      currentLiked: isLiked.value,
      currentLikesCount: likesCount.value,
    })
    isLiked.value = result.liked
    likesCount.value = result.likesCount
  } catch (error) {
    console.error(error)
  }
}

const toggleCommentLike = async (item) => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }
  const originalLikes = typeof item.likes === 'number' ? item.likes : 0
  const wasLiked = !!item.isLiked
  const nextLiked = !wasLiked
  const delta = nextLiked ? 1 : -1

  item.isLiked = nextLiked
  item.likes = Math.max(originalLikes + delta, 0)

  try {
    const result = await toggleCommentLikeApi(item.id, nextLiked ? 'like' : 'unlike')
    if (typeof result?.likesCount === 'number') {
      item.likes = result.likesCount
    }
  } catch (error) {
    item.isLiked = wasLiked
    item.likes = originalLikes
    alert('留言按讚失敗，請稍後再試')
  }
}

// 檢查文章是否已過期
const isExpired = computed(() => {
  const traveler = localTravelerData.value
  if (!traveler.end_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(traveler.end_date)
  endDate.setHours(0, 0, 0, 0)
  return endDate < today
})

const isAuthor = computed(() => {
  const authorUid = localTravelerData.value?.author_uid || props.traveler?.author_uid
  return currentUserUid.value && authorUid && currentUserUid.value === authorUid
})

const hasApplied = computed(() => {
  if (!myApplication.value) return false
  return myApplication.value.status === 'pending' || myApplication.value.status === 'accepted'
})

const handleApply = () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能報名')
    return
  }
  if (hasApplied.value) {
    return
  }
  emit('open-apply', localTravelerData.value)
}

const handleViewApplications = () => {
  activeTab.value = 'applications'
  loadApplications()
}

const jumpToApplications = () => {
  activeTab.value = 'applications'
  loadApplications()
  const tabElement = document.getElementById('traveler-tab-nav')
  if (tabElement) {
    tabElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const loadApplications = async () => {
  isLoadingApplications.value = true
  try {
    if (isAuthor.value) {
      const response = await getApplications(localTravelerData.value.id)
      if (response.success) {
        applications.value = response.data || []
      }
    } else {
      const response = await getApplications(localTravelerData.value.id)
      if (response.success) {
        const allApplications = response.data || []
        myApplication.value =
          allApplications.find((app) => app.author_uid === currentUserUid.value) || null
      }
    }
  } catch (error) {
    console.error('載入報名列表失敗:', error)
  } finally {
    isLoadingApplications.value = false
  }
}

const handleAcceptApplication = async (application) => {
  if (processingIds.value.has(application.id)) return
  processingIds.value.add(application.id)
  try {
    await acceptApplication(localTravelerData.value.id, application.id)
    await loadApplications()
    emit('application-updated')
  } catch (error) {
    console.error('接受報名失敗:', error)
    alert('接受報名失敗，請稍後再試')
  } finally {
    processingIds.value.delete(application.id)
  }
}

const handleRejectApplication = async (application) => {
  if (processingIds.value.has(application.id)) return
  if (!confirm('確定要拒絕此報名嗎？')) return
  processingIds.value.add(application.id)
  try {
    await rejectApplication(localTravelerData.value.id, application.id)
    await loadApplications()
  } catch (error) {
    console.error('拒絕報名失敗:', error)
    alert('拒絕報名失敗，請稍後再試')
  } finally {
    processingIds.value.delete(application.id)
  }
}

const handleSubmitApplication = async () => {
  if (
    !applicationMessage.value.trim() ||
    applicationMessage.value.length > 200 ||
    isSubmittingApplication.value
  )
    return
  isSubmittingApplication.value = true
  applicationError.value = ''
  try {
    await submitApplication(localTravelerData.value.id, applicationMessage.value.trim())
    await loadApplications()
    applicationMessage.value = ''
    alert('報名成功！')
  } catch (err) {
    applicationError.value = err.response?.data?.message || '提交失敗，請稍後再試'
  } finally {
    isSubmittingApplication.value = false
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  if (isExpired.value) return
  if (!userStore.isLoggedIn || !currentUserUid.value) {
    alert('請先登入後才能留言')
    return
  }
  const content = newComment.value.trim()
  try {
    await createComment(props.traveler.id, {
      author_uid: currentUserUid.value,
      content: content,
      board: 'traveler',
      author_name: userStore.currentUser?.name || userStore.currentUser?.nickname || '匿名用戶',
      author_avatar: userStore.currentUser?.avatar || null,
    })
    localComments.value = [
      {
        id: Date.now(),
        author: userStore.currentUser?.name || userStore.currentUser?.nickname || '我',
        avatar:
          userStore.currentUser?.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserUid.value}`,
        content: content,
        time: '剛剛',
        likes: 0,
        isLiked: false,
        replies: [],
      },
      ...localComments.value,
    ]
    newComment.value = ''
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

const getStatusClasses = (status) => {
  switch (status) {
    case '招募中':
      return 'bg-primary-600 text-white'
    case '已額滿':
      return 'bg-secondary-600 text-white'
    case '已出發':
      return 'bg-secondary-500 text-white'
    default:
      return 'bg-primary-100 text-primary-800'
  }
}

const getDayLabel = (index) => {
  const startDateStr = localTravelerData.value.date || '2026/01/15'
  const parts = startDateStr.split(/[/-]/)
  if (parts.length >= 3) {
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + index)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}/${d}`
  }
  return `Day ${index + 1}`
}

const itemData = computed(() => ({
  id: localTravelerData.value.id,
  type: 'traveler',
  title: localTravelerData.value.title,
  content: localTravelerData.value.content,
  image: localTravelerData.value.image,
  author: localTravelerData.value.author,
  avatar: localTravelerData.value.avatar,
  location: localTravelerData.value.location,
  date: localTravelerData.value.date,
  status: localTravelerData.value.status,
  people: localTravelerData.value.people,
  tags: localTravelerData.value.tags,
  comments: localTravelerData.value.comments,
}))

onMounted(async () => {
  if (props.traveler) {
    likesCount.value = props.traveler.likes || 0
    localComments.value = props.traveler.commentsData || []
    if (currentUserUid.value && props.traveler?.id) {
      seedLikeState(props.traveler.id, currentUserUid.value, 'traveler', {
        liked: !!props.traveler.isLiked,
        likesCount: Number(likesCount.value ?? 0),
      })
    }
    await fetchFullTravelerDetails()
    if (currentUserUid.value) {
      await loadLikesInfo()
      if (!isAuthor.value) {
        await loadApplications()
      }
    }
  }
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

    <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
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
        <button
          v-if="localTravelerData.status === '招募中' && !isExpired"
          :class="[
            'bg-tag-wine text-white px-3 pt-2 pb-3 rounded-t-xl rounded-b-none shadow-md inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-transform',
            activeTab === 'applications' ? '-translate-y-1' : '',
          ]"
          title="跳轉至報名區"
          @click="jumpToApplications"
        >
          <UserPlusIcon class="w-4 h-4" />
          報名
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
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-20 lg:top-40 z-20 lg:z-0 bg-tag-blue text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-blue min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        title="跳轉至留言區"
        @click="jumpToComments"
      >
        <MessageCircleIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
          >留言區</span
        >
      </button>

      <button
        v-if="localTravelerData.status === '招募中' && !isExpired"
        class="hidden lg:inline-flex absolute -right-3 lg:right-full top-36 lg:top-56 z-20 lg:z-0 bg-tag-wine text-white py-3 pl-4 pr-5 rounded-l-xl rounded-r-none shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:brightness-95 transition-all duration-300 items-center justify-center gap-2 group border-y-2 border-l-2 border-tag-wine min-w-24 lg:translate-x-1 lg:hover:translate-x-0"
        title="跳轉至報名區"
        @click="jumpToApplications"
      >
        <UserPlusIcon class="w-5 h-5 fill-current" />
        <span
          class="text-sm font-bold whitespace-nowrap writing-vertical-lr sm:writing-horizontal-tb"
          >報名&emsp;</span
        >
      </button>

      <div
        class="bg-white w-full h-full flex flex-col rounded-xl border-2 border-primary overflow-hidden relative z-10"
      >
        <div class="absolute top-4 right-16 z-20">
          <button
            class="bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
            @click.stop="showMenu = !showMenu"
            title="更多"
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
              :src="localTravelerData.image"
              :alt="localTravelerData.title"
              class="w-full h-full object-cover"
              :style="{ objectPosition: `center ${localTravelerData.banner_position_y || 50}%` }"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div
              :class="getStatusClasses(localTravelerData.status)"
              class="absolute top-4 left-4 px-4 py-2 font-bold text-sm rounded-lg border-2 border-primary"
            >
              {{ localTravelerData.status }}
            </div>
          </div>

          <div class="p-6">
            <div class="mb-6">
              <h1 class="text-3xl font-black text-secondary-900 mb-4">
                {{ localTravelerData.title }}
              </h1>
              <div class="flex items-center space-x-3 mb-4">
                <img
                  :src="localTravelerData.avatar"
                  class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200 cursor-pointer hover:ring-2 hover:ring-primary-500 transition"
                  @click="handleAuthorClick"
                />
                <div>
                  <div class="flex items-center space-x-2 flex-wrap gap-2">
                    <span
                      class="font-bold text-secondary-900 cursor-pointer hover:text-primary-600 transition"
                      @click="handleAuthorClick"
                      >{{ localTravelerData.author }}</span
                    >
                    <span
                      v-if="localTravelerData.spiritAnimal && localTravelerData.spiritAnimal.trim()"
                      class="text-xs sm:text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full whitespace-nowrap"
                    >
                      {{ localTravelerData.spiritAnimal }}
                    </span>
                  </div>
                  <div class="text-sm text-secondary-500">
                    發布於 {{ localTravelerData.created_at || '最近' }}
                    <span v-if="localTravelerData.category" class="ml-2 text-primary-600 font-bold">
                      @ {{ localTravelerData.category }}</span
                    >
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-600 mb-1">
                    <MapPinIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >地點</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">{{ localTravelerData.location }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-secondary-500 mb-1">
                    <CalendarIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >日期</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">{{ localTravelerData.date }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-500 mb-1">
                    <UsersIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >人數</span
                    >
                  </div>
                  <div class="font-bold text-primary-600">{{ localTravelerData.people }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-primary-600 mb-1">
                    <MessageCircleIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >留言</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">{{ totalCommentCount }}</div>
                </div>
                <div
                  class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm"
                >
                  <div class="flex items-center text-accent-500 mb-1">
                    <BookmarkIcon class="w-4 h-4 mr-1" /><span
                      class="text-xs font-bold text-secondary-500"
                      >收藏</span
                    >
                  </div>
                  <div class="font-bold text-secondary-900">
                    {{ localTravelerData.totalSaves || 0 }}
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="localTravelerData.tags && localTravelerData.tags.length"
              class="flex flex-wrap gap-2 mb-6"
            >
              <span
                v-for="tag in localTravelerData.tags"
                :key="tag"
                class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
                >#{{ tag }}</span
              >
            </div>

            <div
              class="prose prose-lg max-w-none mb-6 rich-content"
              v-html="processedContent"
            ></div>

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
                    'w-5 h-5 transition-transform group-active:scale-125',
                    { 'fill-current': isLiked },
                  ]"
                /><span class="font-bold">{{ likesCount || 0 }}</span>
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
                    'w-5 h-5 transition-transform group-active:scale-125',
                    { 'fill-current': userStore.isCollected(itemData) },
                  ]"
                />
              </button>

              <button
                class="text-secondary-400 hover:text-primary-600 transition group ml-1"
                title="分享"
                @click="showShareModal = true"
              >
                <ShareIcon class="w-5 h-5 transition-transform group-active:scale-125" />
              </button>

              <button
                v-if="isAuthor"
                class="flex items-center space-x-1 transition group text-secondary-400 hover:text-blue-600"
                @click="handleViewApplications"
                title="查看報名清單"
              >
                <UserPlusIcon class="w-5 h-5 transition-transform group-active:scale-125" />
              </button>
              <button
                v-else-if="localTravelerData.status === '招募中' && !isExpired"
                :disabled="hasApplied"
                :class="[
                  'flex items-center space-x-1 transition group',
                  hasApplied
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-secondary-400 hover:text-blue-600',
                ]"
                @click="handleApply"
                :title="hasApplied ? '已報名' : '報名'"
              >
                <UserPlusIcon
                  :class="[
                    'w-5 h-5 transition-transform',
                    hasApplied ? '' : 'group-active:scale-125',
                  ]"
                />
              </button>
              <button
                v-if="localTravelerData.status === '招募中' && !isExpired && !isAuthor"
                :disabled="hasApplied"
                :class="[
                  'ml-auto px-6 py-2 rounded-full font-bold transition shadow-md relative z-30',
                  hasApplied
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700',
                ]"
                @click="handleApply"
              >
                {{
                  hasApplied
                    ? myApplication?.status === 'pending'
                      ? '已報名（待審核）'
                      : '已接受報名'
                    : '私訊報名'
                }}
              </button>
              <div v-else class="ml-auto text-secondary-400 font-bold">
                {{ localTravelerData.status }}
              </div>
            </div>

            <div id="traveler-tab-nav" class="border-b-2 border-primary-200 mb-6">
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
                  <MapIcon class="w-5 h-5 inline mr-2" /> 行程規劃
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
                  <MessageCircleIcon class="w-5 h-5 inline mr-2" /> 留言討論 ({{
                    totalCommentCount
                  }})
                </button>
                <button
                  v-if="localTravelerData.status === '招募中' && !isExpired && isAuthor"
                  :class="[
                    'px-6 py-3 font-bold transition relative',
                    activeTab === 'applications'
                      ? 'text-primary-600 border-b-4 border-primary-600'
                      : 'text-secondary-400 hover:text-secondary-600',
                  ]"
                  @click="jumpToApplications"
                >
                  <UserPlusIcon class="w-5 h-5 inline mr-2" /> 目前報名的人
                </button>
              </div>
            </div>

            <div v-if="activeTab === 'itinerary'" class="space-y-6">
              <div v-if="itineraryData.days && itineraryData.days.length > 0">
                <div class="flex overflow-x-auto space-x-2 pb-2">
                  <button
                    v-for="(day, index) in itineraryData.days"
                    :key="index"
                    :class="[
                      'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                      activeDayIndex === index
                        ? 'bg-primary-600 text-white border-primary-700'
                        : 'bg-white text-secondary-500 border-secondary-200 hover:bg-secondary-50',
                    ]"
                    @click="activeDayIndex = index"
                  >
                    Day {{ index + 1 }} - {{ getDayLabel(index) }}
                  </button>
                </div>
                <div class="space-y-4">
                  <div v-if="activeDay.activities && activeDay.activities.length > 0">
                    <div
                      v-for="activity in activeDay.activities"
                      :key="activity.id"
                      class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm"
                    >
                      <div class="flex gap-4">
                        <div class="w-20 shrink-0">
                          <div class="text-2xl font-black text-primary-600">
                            {{ activity.time }}
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
                  <div v-else class="text-center text-gray-500 py-4">當天無活動安排</div>
                </div>
              </div>
              <div v-else class="text-center text-gray-400 py-10 bg-gray-50 rounded-lg">
                作者尚未新增詳細行程
              </div>
              <div
                v-if="itineraryData.packingList && itineraryData.packingList.length > 0"
                class="mt-8"
              >
                <h3 class="font-black text-lg text-secondary-900 flex items-center mb-4">
                  <CheckSquareIcon class="w-5 h-5 mr-2 text-primary" /> 建議攜帶物品
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="(cat, catIndex) in itineraryData.packingList"
                    :key="catIndex"
                    class="bg-white border-2 border-secondary-200 rounded-lg p-4"
                  >
                    <h4 class="font-bold text-secondary-700 mb-3">{{ cat.category }}</h4>
                    <div class="space-y-2">
                      <div v-for="item in cat.items" :key="item.id" class="flex items-center">
                        <input
                          v-model="item.checked"
                          type="checkbox"
                          class="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 mr-2"
                          disabled
                        /><span
                          :class="[
                            'text-sm',
                            item.checked ? 'text-secondary-400 line-through' : 'text-secondary-700',
                          ]"
                          >{{ item.name }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'applications' && isAuthor">
              <div>
                <div v-if="isLoadingApplications" class="text-center py-10 text-gray-500">
                  載入中...
                </div>
                <div v-else-if="applications.length === 0" class="text-center py-10 text-gray-500">
                  目前還沒有報名
                </div>
                <div v-else class="space-y-4">
                  <div
                    v-for="app in applications"
                    :key="app.id"
                    class="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 transition"
                  >
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex items-center space-x-3">
                        <img
                          :src="
                            app.author_avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.author_uid}`
                          "
                          class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                        <div>
                          <p class="font-bold text-gray-800">{{ app.author_name || '匿名用戶' }}</p>
                          <p class="text-xs text-gray-400">{{ formatTime(app.created_at) }}</p>
                        </div>
                      </div>
                      <div v-if="app.status === 'pending'" class="flex items-center space-x-2">
                        <button
                          :disabled="processingIds.has(app.id)"
                          class="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                          @click="handleAcceptApplication(app)"
                          title="接受"
                        >
                          <CheckIcon class="w-4 h-4" />
                        </button>
                        <button
                          :disabled="processingIds.has(app.id)"
                          class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                          @click="handleRejectApplication(app)"
                          title="拒絕"
                        >
                          <XCloseIcon class="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        v-else-if="app.status === 'accepted'"
                        class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold"
                      >
                        已接受
                      </div>
                      <div
                        v-else-if="app.status === 'rejected'"
                        class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold"
                      >
                        已拒絕
                      </div>
                    </div>
                    <p class="text-gray-700 whitespace-pre-wrap">{{ app.message }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'comments'" ref="commentsSectionRef">
              <div v-if="normalizedComments.length" class="space-y-4">
                <div
                  v-for="comment in normalizedComments"
                  :key="comment.id"
                  class="bg-white p-4 rounded-lg border-2 border-secondary-200"
                >
                  <div class="flex items-start space-x-3">
                    <img
                      :src="comment.avatar"
                      class="w-10 h-10 rounded-full object-cover border-2 border-secondary-100"
                    />
                    <div class="flex-1">
                      <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-secondary-900">{{ comment.author }}</span
                        ><span class="text-xs text-secondary-400">{{
                          formatTime(comment.time)
                        }}</span>
                      </div>
                      <p class="text-secondary-700 text-sm mb-2">{{ comment.content }}</p>
                      <div class="flex items-center space-x-4 text-xs text-secondary-500">
                        <button
                          class="flex items-center space-x-1 hover:text-accent-600 transition"
                          @click="toggleCommentLike(comment)"
                        >
                          <HeartIcon
                            :class="[
                              'w-3 h-3',
                              comment.isLiked ? 'fill-current text-accent-600' : '',
                            ]"
                          /><span>{{ comment.likes || 0 }}</span>
                        </button>
                      </div>
                      <div
                        v-if="comment.replies && comment.replies.length"
                        class="mt-3 pl-4 border-l-2 border-primary-200 space-y-2"
                      >
                        <div v-for="reply in comment.replies" :key="reply.id">
                          <div class="flex items-start space-x-2">
                            <img :src="reply.avatar" class="w-7 h-7 rounded-full object-cover" />
                            <div class="flex-1">
                              <span class="font-bold text-secondary-900 text-xs">{{
                                reply.author
                              }}</span
                              ><span class="text-xs text-secondary-400 ml-2">{{
                                formatTime(reply.time)
                              }}</span>
                              <p class="text-secondary-700 text-xs mt-0.5">{{ reply.content }}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-secondary-400 py-10">
                目前沒有留言，來當第一個吧！
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeTab === 'comments'"
        class="p-4 border-t-2 border-secondary-200 bg-white rounded-xl"
      >
        <div
          v-if="isExpired"
          class="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
        >
          <p class="text-gray-600 font-bold mb-1">此招募已結束</p>
          <p class="text-gray-500 text-sm">日期已過期，無法再留言</p>
        </div>
        <div v-else-if="userStore.isLoggedIn && currentUserUid" class="flex space-x-3">
          <input
            ref="commentInputRef"
            v-model="newComment"
            type="text"
            placeholder="發表你的看法..."
            class="flex-1 p-3 border-2 border-secondary-300 rounded-lg focus:border-primary-500 transition shadow-inner bg-secondary-50 focus:bg-white outline-none"
            @keyup.enter="submitComment"
          />
          <button
            :disabled="!newComment.trim()"
            class="bg-primary-600 text-white px-5 py-3 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center shadow-md"
            @click="submitComment"
          >
            <SendIcon class="w-5 h-5" />
          </button>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center p-3 bg-secondary-50 rounded-lg border-2 border-secondary-200"
        >
          <p class="text-secondary-600 mb-2">登入後才能回覆</p>
          <button
            class="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
            @click="router.push('/login')"
          >
            登入
          </button>
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
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
:deep(.rich-content) {
  font-size: 1rem;
  line-height: 1.75;
}
:deep(.rich-content h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin-top: 2em;
  margin-bottom: 1em;
  color: #111827;
}
:deep(.rich-content h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  color: #374151;
}
:deep(.rich-content p) {
  margin-bottom: 1.25em;
  font-size: 1.1rem;
  color: #111827;
}
:deep(.rich-content ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 1.25em;
}
:deep(.rich-content ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 1.25em;
}
:deep(.rich-content blockquote) {
  border-left: 4px solid #e5e7eb;
  padding-left: 1em;
  color: #4b5563;
  font-style: italic;
  margin: 1.5em 0;
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
