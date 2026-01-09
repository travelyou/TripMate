<script setup>
import {
  FileText as FileTextIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  ArrowUpDown as ArrowUpDownIcon,
  Bookmark as BookmarkIcon
} from 'lucide-vue-next';
import { computed, ref } from 'vue';

const props = defineProps({
  posts: {
    type: Array,
    required: true
  },
  activeRegion: {
    type: String,
    default: '全部'
  }
});

// Filter Posts Logic
const filteredPosts = computed(() => {
  if (props.activeRegion === '全部') {
    return props.posts;
  }
  return props.posts.filter(post =>
    post.tags && (post.tags.includes(props.activeRegion) ||
    post.tags.some(tag => tag.includes(props.activeRegion)))
  );
});

// Sorting Logic
const sortOption = ref('default');
const sortedPosts = computed(() => {
  const list = [...filteredPosts.value];
  switch (sortOption.value) {
    case 'likes': // 按讚最多
      return list.sort((a, b) => b.likes - a.likes);
    case 'collects': // 收藏最多
      return list.sort((a, b) => (b.collects || 0) - (a.collects || 0));
    case 'date-desc': // 日期近到遠
      // Assuming time is ISO string now
      return list.sort((a, b) => new Date(b.time) - new Date(a.time));
    case 'date-asc': // 日期遠到近
      return list.sort((a, b) => new Date(a.time) - new Date(b.time));
    case 'default':
    default:
       // Verify strict default order (original array order)
      return list;
  }
});
</script>

<template>
  <div class="mb-8">
    <div class="mb-6 flex justify-between items-center">
      <h2
        class="inline-flex items-center text-xl font-bold text-amber-900 bg-orange-100 px-5 py-2 rounded-xl border-4 border-orange-200 shadow-[4px_4px_0px_0px_rgba(251,146,60,0.5)]"
      >
        <FileTextIcon class="w-5 h-5 mr-2" />
        廠商貼文
        <span v-if="activeRegion !== '全部'" class="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded-lg shadow-sm">
          {{ activeRegion }}
        </span>
      </h2>

      <!-- Sorting Dropdown -->
      <div class="relative group">
        <select
          v-model="sortOption"
          class="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-bold shadow-sm cursor-pointer"
        >
          <option value="default">預設排序</option>
          <option value="likes">按讚最多</option>
          <option value="collects">收藏最多</option>
          <option value="date-desc">日期由近到遠</option>
          <option value="date-asc">日期由遠到近</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
          <ArrowUpDownIcon class="w-4 h-4" />
        </div>
      </div>
    </div>

    <div v-if="sortedPosts.length === 0" class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
      <p class="text-gray-500 font-bold">此地區暫無相關貼文</p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="post in sortedPosts"
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

          <button class="flex items-center space-x-1 hover:text-orange-600 transition mr-6">
            <BookmarkIcon class="w-4 h-4" /> <span>{{ post.collects || 0 }}</span>
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
