<script setup>
import { computed, ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { Heart, MessageCircle, Repeat2, Bookmark } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useUserStore } from '@/stores/user'
import { toggleLike, getLikesInfo } from '@/api/likes'
import { auth } from '@/firebase/config'

const router = useRouter()

const handleAvatarClick = (e) => {
  e.stopPropagation()
  const authorUid = props.post.author_uid
  if (authorUid) {
    router.push(`/profile/${authorUid}`)
  }
}

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['click', 'like', 'comment', 'share'])
const userStore = useUserStore()

const currentUserUid = ref(null)
const isLiked = ref(false)
const likesCount = ref(props.post.likes || 0)

const itemData = computed(() => ({
  id: props.post.id,
  type: 'discussion',
  title: props.post.title,
  image: props.post.banner, // 使用 banner 作為主圖
  banner: props.post.banner,
  author: props.post.author,
  avatar: props.post.avatar,
  content: props.post.content,
  time: props.post.time,
  tags: props.post.tags,
  likes: likesCount.value,
  comments: props.post.comments,
}))

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

// 處理按讚
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

// 監聽 Firebase 認證狀態
onAuthStateChanged(auth, async (user) => {
  currentUserUid.value = user ? user.uid : null

  if (currentUserUid.value && props.post?.id) {
    await loadLikesInfo()
  } else {
    isLiked.value = false
  }
})

// 組件掛載時載入按讚狀態
onMounted(async () => {
  const firebaseUser = auth.currentUser
  if (firebaseUser && !currentUserUid.value) {
    currentUserUid.value = firebaseUser.uid
    await loadLikesInfo()
  }
})
</script>

<template>
  <div
    class="p-5 bg-white transition relative cursor-pointer shadow-md hover:shadow-lg rounded-xl border-2 border-secondary-200"
    @click="$emit('click', post)"
  >
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

    <p class="text-gray-600 text-sm mb-4 line-clamp-4 leading-relaxed">
      {{ post.content }}
    </p>

    <div
      v-if="post.banner"
      class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100"
    >
      <img
        :src="post.banner"
        class="w-full h-full object-cover hover:scale-105 transition duration-500"
        alt="討論封面"
      />
    </div>

    <div
      v-if="post.image_urls && post.image_urls.length > 0"
      class="grid gap-2 mb-4"
      :class="{
        'grid-cols-1': post.image_urls.length === 1,
        'grid-cols-2': post.image_urls.length >= 2,
      }"
    >
      <img
        v-for="(url, idx) in post.image_urls.slice(0, 4)"
        :key="idx"
        :src="url"
        class="w-full h-32 object-cover rounded-lg hover:opacity-90 transition border border-amber-100"
        :alt="`圖片 ${idx + 1}`"
      />
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
  </div>
</template>

<style scoped>
/* pixel-card replaced by Tailwind classes in template */
</style>
