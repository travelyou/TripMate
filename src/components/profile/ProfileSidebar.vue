<script setup>
import { ref } from 'vue'

defineProps({
  user: {
    type: Object,
    required: true
  },
  wishlist: {
    type: Array,
    required: true
  }
})

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
  <div class="space-y-6">
    <!-- Spirit Animal -->
    <div
      class="bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl p-1 shadow-lg transform transition hover:-translate-y-1 duration-300"
    >
      <div class="bg-white rounded-[14px] p-6 h-full text-center">
        <h3 class="text-lg font-bold text-gray-800 mb-2">🧩 性格測驗結果</h3>
        <div class="text-5xl mb-2 animate-bounce-slow">
          {{ user.spiritAnimal ? user.spiritAnimal.split(' ')[0] : '🦁' }}
        </div>
        <div
          class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600"
        >
          {{ user.spiritAnimal ? user.spiritAnimal.split(' ')[1] : '樂天派' }}
        </div>
      </div>
    </div>

    <!-- Wishlist Ball Pool (Physics Effect) -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
      <h3 class="text-lg font-bold text-gray-800 mb-4">🔮 許願球池</h3>
      <!-- Ball Container -->
      <div
        ref="ballContainer"
        class="relative h-[300px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-4 flex flex-wrap content-end items-end justify-center gap-2 transition-all"
        @mousemove="handleMouseMove"
        @mouseleave="resetBalls"
      >
        <div
          v-if="wishlist.length === 0"
          class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm"
        >
          快去許願吧！
        </div>

        <div
          v-for="(item, index) in wishlist"
          :key="index"
          class="wish-ball w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-md border-2 border-white select-none transition-transform duration-300 ease-out z-10 text-center leading-tight p-1 break-words"
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
