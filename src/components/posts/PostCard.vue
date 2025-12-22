<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from 'lucide-vue-next';

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
});

const userStore = useUserStore();

const isLiked = computed(() => {
    if (userStore.likedPosts) {
        return userStore.likedPosts.includes(props.post.id);
    }
    return props.post.isLiked;
});

const isFavorited = computed(() => {
     if (userStore.wishlist) {
         return userStore.isWishlisted(props.post.id);
     }
     return false;
});

// Actions
function toggleLike(postId) {
    if (userStore.likedPosts) {
        const idx = userStore.likedPosts.indexOf(postId);
        if (idx > -1) userStore.likedPosts.splice(idx, 1);
        else userStore.likedPosts.push(postId);
    }
}

function toggleFavorite(postId) {
    userStore.toggleWishlist(postId);
}

function navigateToPost(postId) {
    console.log('Navigate to post:', postId);
}

function openPostModalWithComments(postId) {
    console.log('Open modal for:', postId);
}
</script>

<template>
  <div class="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
    <!-- Author Info -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div class="relative">
          <img
            class="w-10 h-10 rounded-full object-cover border border-gray-100"
            :src="post.avatar"
            alt="Author Avatar"
            @error="$event.target.src='https://placehold.co/100x100/A0BFFF/ffffff?text=User'"
          />
          <div v-if="post.isAuthor" class="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white">
            Me
          </div>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-bold text-gray-800 text-sm">{{ post.author }}</span>
            <span v-if="post.spiritAnimal" class="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
              {{ post.spiritAnimal }}
            </span>
          </div>
          <div class="text-xs text-gray-400">{{ post.time }}</div>
        </div>
      </div>
      <button class="text-gray-400 hover:text-gray-600">
        <MoreHorizontal class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="cursor-pointer group" @click="navigateToPost(post.id)">
      <h3 class="font-bold text-lg text-gray-900 mb-2 group-hover:text-indigo-600 transition">
        {{ post.title }}
      </h3>
      <p class="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
        {{ post.content }}
      </p>

      <!-- Image -->
      <div v-if="post.image" class="w-full h-48 rounded-xl overflow-hidden mb-4 relative">
        <img
          class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
          :src="post.image"
          alt="Post Image"
          @error="$event.target.src='https://placehold.co/800x400/94A3B8/ffffff?text=Post+Image'"
        />
        <div class="absolute inset-0 bg-black/5 group-hover:bg-transparent transition"></div>
      </div>
    </div>

    <!-- Tags -->
    <div class="flex flex-wrap gap-2 mb-4">
      <span
        v-for="tag in post.tags"
        :key="tag"
        class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition cursor-pointer"
      >
        #{{ tag }}
      </span>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between pt-4 border-t border-gray-50">
      <div class="flex items-center space-x-6">
        <button
          :class="['flex items-center space-x-2 transition group', isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500']"
          @click.stop="toggleLike(post.id)"
        >
          <Heart :class="['w-5 h-5 transition', isLiked ? 'fill-red-500 scale-110' : 'group-hover:scale-110']" />
          <span class="text-sm font-semibold">{{ post.hearts || post.likes || 0 }}</span>
        </button>
        <button
          class="flex items-center space-x-2 text-gray-400 hover:text-indigo-600 transition group"
          @click.stop="openPostModalWithComments(post.id)"
        >
          <MessageCircle class="w-5 h-5 group-hover:scale-110 transition" />
          <span class="text-sm font-semibold">{{ post.comments || 0 }}</span>
        </button>
        <button class="flex items-center space-x-2 text-gray-400 hover:text-indigo-600 transition group">
          <Share2 class="w-5 h-5 group-hover:scale-110 transition" />
        </button>
      </div>
      <button
        :class="['p-2 rounded-full transition', isFavorited ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:bg-gray-100']"
        @click.stop="toggleFavorite(post.id)"
      >
        <Bookmark :class="['w-5 h-5', isFavorited ? 'fill-yellow-500' : '']" />
      </button>
    </div>
  </div>
</template>
