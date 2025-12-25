<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { Heart, MessageCircle, Repeat2 } from 'lucide-vue-next';

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click', 'like', 'comment', 'share']);

const userStore = useUserStore();

// Logic to check like status (mock or from store)
const isLiked = computed(() => {
     // Check local prop first (if updated by parent or strict check)
     // Or check store if we track liked posts globally
     if (userStore.likedPosts) {
        return userStore.likedPosts.includes(props.post.id);
    }
    return props.post.isLiked;
});

function handleLike() {
    // Emit event for parent to handle store update or handle local mock
    emit('like', props.post);
}

</script>

<template>
  <div class="pixel-card p-5 bg-[#fffef7]" @click="$emit('click', post)">
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

    <h3
      class="text-lg font-bold text-gray-900 mb-2 cursor-pointer hover:text-indigo-600"
    >
      {{ post.title }}
    </h3>

    <p class="text-gray-600 text-sm mb-4 line-clamp-4 leading-relaxed">
      {{ post.content }}
    </p>

    <div v-if="post.image" class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100">
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
        class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-200 transition"
      >
        #{{ tag }}
      </span>
    </div>

    <div class="flex items-center text-gray-400 text-sm pt-1">
      <button
        @click.stop="handleLike"
        :class="['flex items-center space-x-1 hover:text-red-500 transition mr-6', isLiked ? 'text-red-500' : '']"
      >
        <Heart :class="['w-4 h-4', isLiked ? 'fill-red-500' : '']" /> <span>{{ post.likes }}</span>
      </button>

      <button
        class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6"
        @click.stop="$emit('comment', post)"
      >
        <MessageCircle class="w-4 h-4" /> <span>{{ post.comments }}</span>
      </button>

      <button class="flex items-center space-x-1 hover:text-yellow-600 transition mr-6">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
        </svg>
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
/* Ensure global styles for pixel-card are applied or copy them here if they usually come from a global file.
   DiscussionPage used 'pixel-card' class. I'll add the style here just in case it's not global. */
.pixel-card {
  border: 4px solid #8b6f47;
  box-shadow: 4px 4px 0px 0px rgba(139, 111, 71, 0.2);
}
</style>
