<script setup>
import { Pencil } from 'lucide-vue-next'
import WishBallPool from './WishBallPool.vue'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  wishlist: {
    type: Array,
    required: true,
  },
  personalityResult: {
    type: Object,
    default: null,
  },
  isCurrentUser: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-personality-result', 'edit-wishlist'])

const handleEditWishlist = () => {
  emit('edit-wishlist')
}

const handleOpenPersonalityResult = () => {
  emit('open-personality-result')
}
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
    <!-- Spirit Animal -->
    <div
      class="border-secondary-200 bg-white rounded-2xl p-1 shadow-lg hover:-translate-y-1 duration-300 h-full"
    >
      <div class=" rounded-2xl p-3 md:p-6 h-full flex flex-col items-center justify-center text-center">
        <h3 class="text-sm md:text-lg font-bold text-secondary-700 mb-1 md:mb-2">🧩 性格測驗</h3>
        <template v-if="props.personalityResult">
          <div class="text-3xl md:text-5xl mb-1 md:mb-2 animate-bounce-slow">
            {{ props.personalityResult.animalEmoji }}
          </div>
          <div
            class="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800 truncate max-w-full"
          >
            {{ props.personalityResult.animalName }}
          </div>
          <div class="mt-2 md:mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              class="px-3 py-1 md:px-4 md:py-2 bg-primary-50 text-primary-600 text-xs md:text-sm font-bold rounded-full hover:bg-primary-100 transition"
              @click="handleOpenPersonalityResult"
            >
              查看詳情
            </button>
            <router-link
              to="/test"
              class="px-3 py-1 md:px-4 md:py-2 bg-primary-50 text-primary-600 text-xs md:text-sm font-bold rounded-full hover:bg-primary-100 transition"
            >
              重新測驗
            </router-link>
          </div>
        </template>
        <template v-else>
          <div class="text-3xl md:text-5xl mb-1 md:mb-2 animate-bounce-slow">😓</div>
          <div
            class="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800 truncate max-w-full"
          >
            尚未測驗
          </div>
          <router-link
            v-if="isCurrentUser"
            to="/test"
            class="mt-2 md:mt-4 px-3 py-1 md:px-4 md:py-2 bg-primary-50 text-primary-600 text-xs md:text-sm font-bold rounded-full hover:bg-primary-100 transition"
          >
            開始測驗
          </router-link>
        </template>
      </div>
    </div>

    <!-- Wishlist Ball Pool (Physics Effect) -->
    <div class="bg-white rounded-2xl shadow-sm border border-secondary-100 p-3 md:p-6 overflow-hidden h-full flex flex-col justify-between">
      <div class="relative mb-2 md:mb-4">
        <h3 class="text-sm md:text-lg font-bold text-gray-800 text-center w-full">🔮 許願球池</h3>
        <button
          v-if="isCurrentUser"
          class="absolute top-0 right-0 p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition"
          title="編輯許願球池"
          @click="handleEditWishlist"
        >
          <Pencil class="w-4 h-4" />
        </button>
      </div>
      <!-- Ball Container -->
      <WishBallPool :wishlist="wishlist" />
    </div>
  </div>
</template>

<style scoped>
.animate-bounce-slow {
  animation: bounce 3s infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(-5%);
  }
  50% {
    transform: translateY(0);
  }
}
</style>
