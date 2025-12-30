<script setup>
import {
  FileText as FileTextIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon
} from 'lucide-vue-next';

defineProps({
  posts: {
    type: Array,
    required: true
  }
});
</script>

<template>
  <div class="mb-8">
    <div class="mb-6">
      <h2
        class="inline-flex items-center text-xl font-bold text-amber-900 bg-orange-100 px-5 py-2 rounded-xl border-4 border-orange-200 shadow-[4px_4px_0px_0px_rgba(251,146,60,0.5)]"
      >
        <FileTextIcon class="w-5 h-5 mr-2" />
        廠商貼文
      </h2>
    </div>

    <div class="space-y-6">
      <div
        v-for="post in posts"
        :key="post.id"
        class="pixel-card p-5 bg-[#fffef7] hover:shadow-lg transition-shadow cursor-pointer"
      >
        <h3 class="text-lg font-bold text-gray-900 mb-2">
          {{ post.title }}
        </h3>

        <p class="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {{ post.content }}
        </p>

        <div class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100">
          <img
            :src="post.image"
            class="w-full h-full object-cover hover:scale-105 transition duration-500"
          />
        </div>

        <div v-if="post.tags && post.tags.length" class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
          <span
            v-for="tag in post.tags"
            :key="tag"
            class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-200 transition"
          >
            #{{ tag }}
          </span>
        </div>

        <div class="flex items-center text-gray-400 text-sm">
          <button class="flex items-center space-x-1 hover:text-red-500 transition mr-6">
            <HeartIcon class="w-4 h-4" /> <span>{{ post.likes }}</span>
          </button>

          <button class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6">
            <MessageCircleIcon class="w-4 h-4" /> <span>{{ post.comments }}</span>
          </button>

          <span class="ml-auto text-xs text-gray-400">{{ post.time }}</span>
        </div>
      </div>
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
