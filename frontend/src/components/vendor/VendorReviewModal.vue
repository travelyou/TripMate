<script setup>
import { Star as StarIcon, X as XIcon } from 'lucide-vue-next';
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  reviews: {
    type: Array,
    default: () => []
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};

// ESC 鍵關閉功能
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && props.isOpen) {
    close();
  }
};

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', handleEscapeKey);
  } else {
    window.removeEventListener('keydown', handleEscapeKey);
  }
});

onMounted(() => {
  if (props.isOpen) {
    window.addEventListener('keydown', handleEscapeKey);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscapeKey);
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="close"
    ></div>

    <!-- Modal Content -->
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative animate-scale-up overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b border-secondary-100 flex items-center justify-between bg-primary-50">
        <div>
          <h2 class="text-2xl font-black text-gray-800">廠商評價</h2>
          <div class="flex items-center gap-2 mt-1">
            <div class="flex items-center bg-primary-600 text-white px-2 py-0.5 rounded-lg text-sm font-bold shadow-sm">
              <StarIcon class="w-4 h-4 fill-white mr-1" />
              {{ averageRating }}
            </div>
            <span class="text-secondary-500 text-sm">共 {{ totalReviews }} 則真實評價</span>
          </div>
        </div>
        <button
          class="p-2 hover:bg-black/5 rounded-full transition-colors"
          @click="close"
        >
          <XIcon class="w-6 h-6 text-secondary-500" />
        </button>
      </div>

      <!-- Scrollable List -->
      <div class="p-6 overflow-y-auto custom-scrollbar bg-secondary-50">
        <div v-if="reviews.length === 0" class="text-center py-12 text-gray-400">
          暫無評價
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="review in reviews"
            :key="review.id"
            class="bg-white p-5 rounded-2xl border border-secondary-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <img :src="review.avatar" class="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" />
                <div>
                  <div class="font-bold text-gray-900">{{ review.userName }}</div>
                  <div class="text-xs text-gray-400">{{ review.date }}</div>
                </div>
              </div>
              <div class="flex gap-1">
                <StarIcon
                  v-for="i in 5"
                  :key="i"
                  class="w-4 h-4"
                  :class="i <= review.rating ? 'text-primary-500 fill-primary-500' : 'text-secondary-200 fill-secondary-200'"
                />
              </div>
            </div>

            <p class="text-secondary-600 leading-relaxed mb-4">
              {{ review.content }}
            </p>

            <div v-if="review.tripTitle" class="bg-secondary-50 px-3 py-2 rounded-lg text-xs text-secondary-500 inline-block">
              參加行程：{{ review.tripTitle }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-secondary-100 bg-white flex justify-end">
        <button
          class="px-6 py-2.5 bg-gray-100 text-secondary-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          @click="close"
        >
          關閉
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
