<script setup>
import { ref, computed } from 'vue'
import { ThumbsUp, Heart } from 'lucide-vue-next'

const props = defineProps({
  reviews: {
    type: Array,
    default: () => []
  },
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-post'])

// Tab State: 'received' (別人對我) | 'given' (我對別人)
const activeTab = ref('received')

// Filtered Data
const receivedReviews = computed(() => {
  return props.reviews.filter(r => r.target === props.user.name || r.target === props.user.nickname)
})

const givenReviews = computed(() => {
  return props.reviews.filter(r => r.author === props.user.name || r.author === props.user.nickname)
})

const currentDisplayReviews = computed(() => {
  return activeTab.value === 'received' ? receivedReviews.value : givenReviews.value
})

const handleTripClick = (tripId) => {
  if (tripId) {
    emit('open-post', tripId)
  }
}
</script>

<template>
  <div class="space-y-4">

    <!-- Sub-tabs for Reviews -->
    <div class="flex space-x-4 border-b border-gray-100 pb-2 mb-4">
      <button
        class="text-sm font-bold pb-2 transition-colors relative"
        :class="activeTab === 'received' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'"
        @click="activeTab = 'received'"
      >
        查看{{ user.name }}的評價 ({{ receivedReviews.length }})
        <div v-if="activeTab === 'received'" class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full"></div>
      </button>
      <button
        class="text-sm font-bold pb-2 transition-colors relative"
        :class="activeTab === 'given' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'"
        @click="activeTab = 'given'"
      >
        {{ user.name }}給出的評價 ({{ givenReviews.length }})
        <div v-if="activeTab === 'given'" class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full"></div>
      </button>
    </div>

    <!-- Review List -->
    <div
      v-if="currentDisplayReviews && currentDisplayReviews.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div
        v-for="review in currentDisplayReviews"
        :key="review.id"
        class="p-4 border border-gray-100 rounded-xl bg-gray-50 flex gap-4 items-start hover:shadow-sm transition-shadow"
      >
        <img
          :src="activeTab === 'given' ? (review.targetAvatar || 'https://placehold.co/100x100/e2e8f0/ffffff?text=User') : review.avatar"
          class="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100"
          alt="User Avatar"
        />
        <div class="flex-1 min-w-0">
           <div class="flex flex-wrap justify-between items-start mb-2 gap-2">
              <div class="flex flex-col">
                 <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-bold text-gray-800">
                      {{ activeTab === 'given' ? `給 ${review.target}` : review.author }}
                    </span>
                    <span class="text-xs text-gray-400">{{ review.date }}</span>
                 </div>
                 <!-- Trip Title Context (Clickable) -->
                 <div v-if="review.tripTitle" class="text-xs text-gray-500 font-medium badge-trip">
                    <button
                      class="bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center gap-1 group"
                      @click="handleTripClick(review.tripId)"
                    >
                      <span>{{ review.tripTitle }}</span>
                      <span class="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                    </button>
                 </div>
              </div>

              <!-- Sentiment Icon -->
              <div class="flex-shrink-0">
                 <span
                   v-if="review.sentiment === 'super_like'"
                   class="bg-pink-100 text-pink-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                 >
                   <Heart class="w-3.5 h-3.5 fill-current" /> 超讚
                 </span>
                 <span
                   v-else
                   class="bg-indigo-100 text-indigo-500 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                 >
                   <ThumbsUp class="w-3.5 h-3.5 fill-current" /> 讚
                 </span>
              </div>
           </div>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ review.content ? review.content : '此用戶沒有留下評論' }}
          </p>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-20 text-gray-400 flex flex-col items-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl grayscale opacity-50">
        {{ activeTab === 'received' ? '📭' : '✍️' }}
      </div>
      <p v-if="activeTab === 'received'">目前還沒有收到任何評價。</p>
      <p v-else>目前還沒有給出任何評價。</p>
    </div>
  </div>
</template>
