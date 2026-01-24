<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { Heart, MessageCircle, Repeat2, Bookmark, MoreVertical, Edit, Trash2, Share2, Flag } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useUserStore } from '@/stores/user'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { deletePost } from '@/api/discussions'
import { auth } from '@/firebase/config'

const router = useRouter()

const handleAvatarClick = (e) => {
  e.stopPropagation()
  e.preventDefault()
  const authorUid = props.post.author_uid || props.post.authorUid
  if (authorUid) {
    router.push({ path: `/profile/${authorUid}`, replace: false })
  } else {
    console.warn('無法跳轉：找不到作者 UID', props.post)
  }
}

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['click', 'like', 'comment', 'share', 'edit', 'delete'])
const userStore = useUserStore()

const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(props.post.likes || 0)
const showMenu = ref(false)
const isReported = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info') // 'info' for share, 'success' for report

// 檢查 URL 是否有效（過濾掉 blob URL 和 data URL）
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  // 過濾掉 blob URL 和 data URL
  if (url.startsWith('blob:') || url.startsWith('data:')) return false
  return true
}

// 過濾掉無效的圖片 URL
const validBanner = computed(() => {
  return isValidImageUrl(props.post.banner) ? props.post.banner : null
})

const validImageUrls = computed(() => {
  if (!Array.isArray(props.post.image_urls)) return []
  return props.post.image_urls.filter(url => isValidImageUrl(url))
})

const itemData = computed(() => ({
  id: props.post.id,
  type: 'discussion',
  title: props.post.title,
  image: validBanner.value,
  banner: validBanner.value,
  author: props.post.author,
  avatar: props.post.avatar,
  content: props.post.content,
  time: props.post.time,
  tags: props.post.tags,
  likes: likesCount.value,
  comments: props.post.comments,
  category: props.post.category, // ★ 新增：確保收藏時也包含分類資訊
}))

// --- [最終版] 純文字清洗邏輯 ---
const previewContent = computed(() => {
  if (!props.post.content) return ''

  let content = props.post.content

  // 1. 預處理：把會造成換行的 HTML 標籤替換成換行符號 \n
  content = content.replace(/<br\s*\/?>/gi, '\n')
  content = content.replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, '\n')

  // 2. 強力剝除：建立一個暫存 DOM，利用 textContent 取得純文字
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  const plainText = tempDiv.textContent || tempDiv.innerText || ''

  // 3. 回傳修剪後的純文字
  return plainText.trim()
})
// -------------------------------------

const loadLikesInfo = async () => {
  if (!props.post?.id || !currentUserUid.value) return

  try {
    const info = await getLikesInfo(props.post.id, currentUserUid.value, 'discussion')
    isLiked.value = info.isLiked
    likesCount.value = info.likesCount || props.post.likes || 0
  } catch (error) {
    console.error('載入按讚狀態失敗：', error)
  }
}

const handlePostLike = async () => {
  if (!currentUserUid.value) {
    alert('請先登入後才能按讚')
    return
  }

  try {
    const result = await toggleLike(props.post.id, currentUserUid.value, 'discussion')
    isLiked.value = result.liked
    likesCount.value = result.likesCount

    emit('like', {
      ...props.post,
      isLiked: result.liked,
      likes: result.likesCount,
    })
  } catch (error) {
    console.error('按讚操作失敗：', error)
    alert('按讚操作失敗，請稍後再試')
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null
  if (currentUserUid.value && props.post?.id) {
    await loadLikesInfo()
  } else {
    isLiked.value = false
  }
})

const isAuthor = computed(() => {
  const authorUid = props.post.author_uid || props.post.authorUid
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
  emit('edit', props.post)
}

const handleDelete = async (e) => {
  e.stopPropagation()
  closeMenu()

  if (!confirm('確定要刪除此貼文嗎？')) {
    return
  }

  try {
    await deletePost(props.post.id)
    emit('delete', props.post)
    // 重新整理頁面或更新列表
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
    const url = `${window.location.origin}/discussion?postId=${props.post.id}`
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
  // 这里可以添加实际的检举API调用
}

// 點擊外部關閉選單
const handleClickOutside = (event) => {
  if (showMenu.value && !event.target.closest('.post-menu-container')) {
    closeMenu()
  }
}

onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
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
    class="p-5 bg-white transition relative cursor-pointer shadow-md hover:shadow-lg rounded-xl border-2 border-secondary-200"
    @click="$emit('click', post)"
  >
    <!-- 三点菜单按钮 -->
    <div class="absolute top-4 right-4 post-menu-container z-30">
      <button
        class="p-2 rounded-full hover:bg-primary-100 transition text-primary-600 hover:text-primary-700"
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

    <div class="flex items-center space-x-3 mb-4">
      <img
        :src="post.avatar"
        class="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:ring-2 hover:ring-primary-500 transition"
        alt="作者頭像"
        @click="handleAvatarClick"
      />
      <div>
        <div class="flex items-center space-x-2">
          <span
            class="font-bold text-gray-800 cursor-pointer hover:text-primary-600 transition"
            @click="handleAvatarClick"
          >{{ post.author }}</span>
          <span
            v-if="post.spiritAnimal"
            class="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full"
          >
            {{ post.spiritAnimal }}
          </span>
        </div>
        <div class="text-xs text-gray-400">{{ post.time }} • 討論區</div>
      </div>
    </div>

    <h3 class="text-lg font-bold text-gray-900 mb-2 hover:text-indigo-600 transition">
      {{ post.title }}
    </h3>

    <p class="text-gray-900 text-sm mb-4 line-clamp-5 whitespace-pre-wrap leading-relaxed">
      {{ previewContent }}
    </p>

    <div
      v-if="validBanner"
      class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100 relative"
    >
      <div
        v-if="post.category"
        class="absolute top-0 left-0 px-3 py-1 font-bold text-xs bg-white/90 text-primary-700 rounded-br-xl border-b-2 border-r-2 border-white/50 backdrop-blur-sm z-10 shadow-sm"
      >
        {{ post.category }}
      </div>

      <img
        :src="validBanner"
        class="w-full h-full object-cover hover:scale-105 transition duration-500"
        alt="討論封面"
      />
    </div>

    <div
      v-if="validImageUrls.length > 0"
      class="grid gap-2 mb-4"
      :class="{
        'grid-cols-1': validImageUrls.length === 1,
        'grid-cols-2': validImageUrls.length >= 2,
      }"
    >
      <div v-for="(url, idx) in validImageUrls.slice(0, 4)" :key="idx" class="relative">
        <div
          v-if="!validBanner && idx === 0 && post.category"
          class="absolute top-0 left-0 px-3 py-1 font-bold text-xs bg-white/90 text-primary-700 rounded-br-xl border-b-2 border-r-2 border-white/50 backdrop-blur-sm z-10 shadow-sm"
        >
          {{ post.category }}
        </div>

        <img
          :src="url"
          class="w-full h-32 object-cover rounded-lg hover:opacity-90 transition border border-amber-100"
          :alt="`圖片 ${idx + 1}`"
        />
      </div>
    </div>

    <div
      v-if="post.tags && post.tags.length"
      class="flex flex-wrap gap-2 mb-4 border-b border-gray-100 pb-3"
    >
      <span
        v-for="tag in post.tags"
        :key="tag"
        class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full hover:bg-amber-200 transition"
      >
        #{{ tag }}
      </span>
    </div>

    <div class="flex items-center text-gray-400 text-sm pt-1">
      <button
        class="flex items-center space-x-1 transition mr-6 group"
        :class="isLiked ? 'text-red-500' : 'hover:text-red-500'"
        @click.stop="handlePostLike"
      >
        <Heart
          class="w-4 h-4 transition-transform group-active:scale-125"
          :class="{ 'fill-current': isLiked }"
        />
        <span>{{ likesCount }}</span>
      </button>

      <button
        class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6"
        @click.stop="$emit('comment', post)"
      >
        <MessageCircle class="w-4 h-4" />
        <span>{{ post.comments }}</span>
      </button>

      <button
        class="flex items-center space-x-1 transition mr-6 group"
        :class="userStore.isCollected(itemData) ? 'text-yellow-500' : 'hover:text-yellow-600'"
        @click.stop="
          userStore.isCollected(itemData)
            ? userStore.removeFromCollection(itemData)
            : userStore.openCollectionModal(itemData)
        "
      >
        <Bookmark
          class="w-4 h-4 transition-transform group-active:scale-125"
          :class="{ 'fill-current': userStore.isCollected(itemData) }"
        />
        <span>{{ (post.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0) }}</span>
      </button>

      <button
        class="ml-auto flex items-center space-x-1 hover:text-gray-600 transition"
        @click.stop="$emit('share', post.id)"
      >
        <Repeat2 class="w-4 h-4" />
      </button>
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
  </div>
</template>
