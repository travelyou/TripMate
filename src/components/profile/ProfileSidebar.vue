<script setup>
import { ref } from 'vue'

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
})

const emit = defineEmits(['open-personality-result'])

const handleOpenPersonalityResult = () => {
  emit('open-personality-result')
}

// Wishlist Physics Logic
const ballContainer = ref(null)

function handleMouseMove(e) {
  if (!ballContainer.value) return
  const balls = ballContainer.value.querySelectorAll('.wish-ball')
  const rect = ballContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  balls.forEach((ball) => {
    const ballRect = ball.getBoundingClientRect()
    const ballX = ballRect.left - rect.left + ballRect.width / 2
    const ballY = ballRect.top - rect.top + ballRect.height / 2

    const dx = ballX - mouseX
    const dy = ballY - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = 100 // Interaction radius

    if (dist < minDist) {
      const force = (minDist - dist) / minDist
      const moveX = (dx / dist) * force * 50 // Push strength
      const moveY = (dy / dist) * force * 50

      ball.style.transform = `translate(${moveX}px, ${moveY}px)`
    } else {
      ball.style.transform = 'translate(0, 0)'
    }
  })
}

function resetBalls() {
  if (!ballContainer.value) return
  ballContainer.value
    .querySelectorAll('.wish-ball')
    .forEach((b) => (b.style.transform = 'translate(0,0)'))
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
          <button
            class="mt-2 md:mt-4 px-3 py-1 md:px-4 md:py-2 bg-primary-50 text-primary-600 text-xs md:text-sm font-bold rounded-full hover:bg-primary-100 transition"
            @click="handleOpenPersonalityResult"
          >
            查看詳情
          </button>
        </template>
        <template v-else>
          <div class="text-3xl md:text-5xl mb-1 md:mb-2 animate-bounce-slow">😓</div>
          <div
            class="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800 truncate max-w-full"
          >
            尚未測驗
          </div>
          <router-link
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
      <h3 class="text-sm md:text-lg font-bold text-gray-800 mb-2 md:mb-4 text-center w-full">🔮 許願球池</h3>
      <!-- Ball Container -->
      <div
        ref="ballContainer"
        class="relative flex-1 min-h-[160px] lg:min-h-[300px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-2 md:p-4 flex flex-wrap content-end items-end justify-center gap-1 md:gap-2 transition-all w-full"
        @mousemove="handleMouseMove"
        @mouseleave="resetBalls"
      >
        <div
          v-if="wishlist.length === 0"
          class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs md:text-sm"
        >
          快去許願吧！
        </div>

        <div
          v-for="(item, index) in wishlist"
          :key="index"
          class="wish-ball w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center text-[10px] md:text-xs font-bold text-primary-700 shadow-md border-2 border-white select-none transition-transform duration-300 ease-out z-10 text-center leading-tight p-0.5 md:p-1 break-words"
        >
          {{ item }}
        </div>
      </div>
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
