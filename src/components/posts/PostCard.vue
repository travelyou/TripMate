<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { Heart, MessageCircle, Repeat2, Bookmark } from 'lucide-vue-next'

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['click', 'like', 'comment', 'share'])
const userStore = useUserStore()

// 準備資料格式 (確保 type 正確)
const itemData = computed(() => ({
  id: props.post.id,
  type: 'discussion', // 強制標記為 discussion
  title: props.post.title,
  image: props.post.image,
  author: props.post.author,
  avatar: props.post.avatar,
  content: props.post.content,
  time: props.post.time,
  tags: props.post.tags,
  likes: props.post.likes,
  comments: props.post.comments,
}))
</script>

<template>
  <div class="pixel-card p-5 bg-[#fffef7] cursor-pointer" @click="$emit('click', post)">
    <div class="flex items-center space-x-3 mb-4">
      <img
        :src="post.avatar"
        class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
      />
      <div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-gray-800">{{ post.author }}</span>
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
      v-if="post.image"
      class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100"
    >
      <img
        :src="post.image"
        class="w-full h-full object-cover hover:scale-105 transition duration-500"
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
        :class="userStore.isFavorite(itemData) ? 'text-red-500' : 'hover:text-red-500'"
        @click.stop="userStore.toggleFavorite(itemData)"
      >
        <Heart
          class="w-4 h-4 transition-transform group-active:scale-125"
          :class="{ 'fill-current': userStore.isFavorite(itemData) }"
        />
        <span>{{ (post.likes || 0) + (userStore.isFavorite(itemData) ? 1 : 0) }}</span>
      </button>

      <button
        class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6"
        @click.stop="$emit('comment', post)"
      >
        <MessageCircle class="w-4 h-4" /> <span>{{ post.comments }}</span>
      </button>

      <button
        class="flex items-center space-x-1 transition mr-6 group"
        :class="userStore.isCollected(itemData) ? 'text-yellow-500' : 'hover:text-yellow-600'"
        @click.stop="userStore.toggleCollection(itemData)"
      >
        <Bookmark
          class="w-4 h-4 transition-transform group-active:scale-125"
          :class="{ 'fill-current': userStore.isCollected(itemData) }"
        />
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
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}
</style>
