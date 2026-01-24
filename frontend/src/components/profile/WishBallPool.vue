<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  wishlist: {
    type: Array,
    required: true,
  },
})

const ballContainer = ref(null)
const balls = ref([])
const animationFrameId = ref(null)
const isDragging = ref(false)
const draggedBall = ref(null)
const mousePos = ref({ x: 0, y: 0 })
const isMobile = ref(window.innerWidth < 768)
const ballRadius = ref(32)
const windowWidth = ref(window.innerWidth)

const BALL_COLORS = [
  { bg: '#FF6B6B', light: '#FF8E8E', accent: '#FF6B6B', number: '#FFFFFF' },
  { bg: '#4ECDC4', light: '#6EDDD6', accent: '#4ECDC4', number: '#FFFFFF' },
  { bg: '#45B7D1', light: '#6BC5D9', accent: '#45B7D1', number: '#FFFFFF' },
  { bg: '#FFA07A', light: '#FFB894', accent: '#FFA07A', number: '#FFFFFF' },
  { bg: '#98D8C8', light: '#B0E4D6', accent: '#98D8C8', number: '#FFFFFF' },
  { bg: '#F7DC6F', light: '#F9E48F', accent: '#F7DC6F', number: '#333333' },
  { bg: '#BB8FCE', light: '#CBA7DD', accent: '#BB8FCE', number: '#FFFFFF' },
  { bg: '#85C1E2', light: '#9DD1E8', accent: '#85C1E2', number: '#FFFFFF' },
  { bg: '#F1948A', light: '#F5A99F', accent: '#F1948A', number: '#FFFFFF' },
  { bg: '#82E0AA', light: '#9CE8BA', accent: '#82E0AA', number: '#FFFFFF' },
  { bg: '#F8B739', light: '#FAC459', accent: '#F8B739', number: '#FFFFFF' },
  { bg: '#A569BD', light: '#B884CC', accent: '#A569BD', number: '#FFFFFF' },
]

class Ball {
  constructor(x, y, radius, text, index) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 4
    this.vy = (Math.random() - 0.5) * 4
    this.radius = radius
    this.text = text
    this.index = index
    this.mass = radius * radius * 0.01
    this.friction = 0.9995
    this.bounce = 0.95
    this.element = null
    this.isDragged = false
    this.color = BALL_COLORS[index % BALL_COLORS.length]
  }

  update(containerWidth, containerHeight, otherBalls, isDragged = false) {
    this.isDragged = isDragged

    if (isDragged) {
      return
    }

    this.vx *= this.friction
    this.vy *= this.friction

    this.x += this.vx
    this.y += this.vy
    if (this.x - this.radius < 0) {
      this.x = this.radius
      this.vx = Math.abs(this.vx) * this.bounce
    }
    if (this.x + this.radius > containerWidth) {
      this.x = containerWidth - this.radius
      this.vx = -Math.abs(this.vx) * this.bounce
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius
      this.vy = Math.abs(this.vy) * this.bounce
    }
    if (this.y + this.radius > containerHeight) {
      this.y = containerHeight - this.radius
      this.vy = -Math.abs(this.vy) * this.bounce
    }

    const checkRadius = (this.radius + 32) * 2
    for (let i = 0; i < otherBalls.length; i++) {
      const other = otherBalls[i]
      if (other === this) continue

      if (other.isDragged) {
        const dx = other.x - this.x
        const dy = other.y - this.y
        const distSq = dx * dx + dy * dy
        const minDist = this.radius + other.radius
        const minDistSq = minDist * minDist

        if (distSq < minDistSq && distSq > 0) {
          const distance = Math.sqrt(distSq)
          const overlap = minDist - distance
          const pushForce = 0.5
          this.vx -= (dx / distance) * pushForce
          this.vy -= (dy / distance) * pushForce
          this.x -= (dx / distance) * overlap * 0.5
          this.y -= (dy / distance) * overlap * 0.5
        }
        continue
      }

      const dx = other.x - this.x
      const dy = other.y - this.y
      const distSq = dx * dx + dy * dy
      const minDist = this.radius + other.radius
      const minDistSq = minDist * minDist

      if (distSq > checkRadius * checkRadius) continue

      if (distSq < minDistSq && distSq > 0) {
        const distance = Math.sqrt(distSq)
        const overlap = minDist - distance

        const separationX = (dx / distance) * overlap * 0.5
        const separationY = (dy / distance) * overlap * 0.5

        const angle = Math.atan2(dy, dx)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        const vx1 = this.vx * cos + this.vy * sin
        const vy1 = this.vy * cos - this.vx * sin
        const vx2 = other.vx * cos + other.vy * sin
        const vy2 = other.vy * cos - other.vx * sin

        const totalMass = this.mass + other.mass
        const finalVx1 = ((this.mass - other.mass) * vx1 + 2 * other.mass * vx2) / totalMass
        const finalVx2 = ((other.mass - this.mass) * vx2 + 2 * this.mass * vx1) / totalMass

        this.vx = finalVx1 * cos - vy1 * sin
        this.vy = vy1 * cos + finalVx1 * sin
        other.vx = finalVx2 * cos - vy2 * sin
        other.vy = vy2 * cos + finalVx2 * sin

        this.vx *= this.bounce
        this.vy *= this.bounce
        other.vx *= other.bounce
        other.vy *= other.bounce
        this.x -= separationX
        this.y -= separationY
        other.x += separationX
        other.y += separationY
      }
    }
  }

  render() {
    if (this.element) {
      this.element.style.transform = `translate(${this.x - this.radius}px, ${this.y - this.radius}px)`
      if (!this.element.dataset.styled) {
        this.element.style.background = `radial-gradient(circle at 30% 30%, ${this.color.light}, ${this.color.bg} 60%, ${this.color.bg})`
        this.element.style.border = `2px solid ${this.color.accent}`
        this.element.style.color = this.color.number
        this.element.style.boxShadow = `
          inset -2px -2px 6px rgba(0, 0, 0, 0.2),
          inset 2px 2px 6px rgba(255, 255, 255, 0.4),
          0 3px 10px rgba(0, 0, 0, 0.2)
        `
        this.element.dataset.styled = 'true'
      }
    }
  }
}

const calculateBallRadius = () => {
  const width = window.innerWidth
  if (width < 640) {
    return 20
  } else if (width < 768) {
    return 24
  } else if (width < 1024) {
    return 28
  } else {
    return 32
  }
}
const initBalls = () => {
  if (!ballContainer.value || props.wishlist.length === 0) {
    balls.value = []
    return
  }

  const container = ballContainer.value
  const rect = container.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  ballRadius.value = calculateBallRadius()
  const radius = ballRadius.value

  const hasSameCount = balls.value.length === props.wishlist.length
  if (balls.value.length > 0 && hasSameCount) {
    balls.value.forEach((ball, index) => {
      ball.radius = radius
      ball.mass = radius * radius * 0.01
      ball.text = props.wishlist[index]
      ball.index = index
      ball.color = BALL_COLORS[index % BALL_COLORS.length]

      ball.x = Math.max(radius, Math.min(containerWidth - radius, ball.x))
      ball.y = Math.max(radius, Math.min(containerHeight - radius, ball.y))
    })

    nextTick(() => {
      const ballElements = container.querySelectorAll('.wish-ball')
      ballElements.forEach((el, index) => {
        if (balls.value[index]) {
          balls.value[index].element = el
        }
      })
    })
    return
  }

  balls.value = props.wishlist.map((item, index) => {
    const x = Math.random() * (containerWidth - radius * 2) + radius
    const y = Math.random() * (containerHeight - radius * 2) + radius
    return new Ball(x, y, radius, item, index)
  })

  nextTick(() => {
    const ballElements = container.querySelectorAll('.wish-ball')
    ballElements.forEach((el, index) => {
      if (balls.value[index]) {
        balls.value[index].element = el
      }
    })
  })
}

let lastTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS

const animate = (currentTime) => {
  // [修正] 如果容器不存在 (組件已銷毀)，直接 return，不要再 schedule 下一幀！
  if (!ballContainer.value) return

  // 如果只是沒有球，但容器還在，可以繼續跑動畫迴圈等待球出現，或者暫停
  if (balls.value.length === 0) {
    animationFrameId.value = requestAnimationFrame(animate)
    return
  }

  const deltaTime = currentTime - lastTime
  if (deltaTime < frameInterval) {
    animationFrameId.value = requestAnimationFrame(animate)
    return
  }
  lastTime = currentTime - (deltaTime % frameInterval)

  const container = ballContainer.value
  // 二次檢查確保容器還在
  if (!container) return

  const rect = container.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  const ballsArray = balls.value
  const isDraggingBall = isDragging.value && draggedBall.value

  for (let i = 0; i < ballsArray.length; i++) {
    const ball = ballsArray[i]
    const isThisBallDragged = isDraggingBall === ball
    ball.update(containerWidth, containerHeight, ballsArray, isThisBallDragged)
  }

  for (let i = 0; i < ballsArray.length; i++) {
    ballsArray[i].render()
  }

  animationFrameId.value = requestAnimationFrame(animate)
}

const handleMouseDown = (e) => {
  if (!ballContainer.value) return
  e.preventDefault()

  const rect = ballContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  for (let i = balls.value.length - 1; i >= 0; i--) {
    const ball = balls.value[i]
    const dx = mouseX - ball.x
    const dy = mouseY - ball.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < ball.radius) {
      isDragging.value = true
      draggedBall.value = ball
      ball.vx = 0
      ball.vy = 0
      mousePos.value = { x: mouseX, y: mouseY }
      break
    }
  }
}

const handleMouseMove = (e) => {
  if (!ballContainer.value || !isDragging.value || !draggedBall.value) return

  const rect = ballContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const radius = draggedBall.value.radius
  draggedBall.value.x = Math.max(radius, Math.min(rect.width - radius, mouseX))
  draggedBall.value.y = Math.max(radius, Math.min(rect.height - radius, mouseY))

  mousePos.value = { x: mouseX, y: mouseY }
}

const handleMouseUp = () => {
  if (isDragging.value && draggedBall.value) {
    const dx = mousePos.value.x - draggedBall.value.x
    const dy = mousePos.value.y - draggedBall.value.y
    draggedBall.value.vx = dx * 0.1
    draggedBall.value.vy = dy * 0.1
  }
  isDragging.value = false
  draggedBall.value = null
}
watch(
  () => props.wishlist,
  () => {
    initBalls()
  },
  { deep: true },
)

onMounted(() => {
  let resizeTimeout
  const handleResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const newWidth = window.innerWidth
      isMobile.value = newWidth < 768
      windowWidth.value = newWidth

      const newRadius = calculateBallRadius()
      if (newRadius !== ballRadius.value) {
        initBalls()
      } else {
        if (ballContainer.value && balls.value.length > 0) {
          const rect = ballContainer.value.getBoundingClientRect()
          balls.value.forEach((ball) => {
            ball.x = Math.max(ball.radius, Math.min(rect.width - ball.radius, ball.x))
            ball.y = Math.max(ball.radius, Math.min(rect.height - ball.radius, ball.y))
          })
        }
      }
    }, 150)
  }

  window.addEventListener('resize', handleResize)

  initBalls()
  animationFrameId.value = requestAnimationFrame(animate)

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
  })
})

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div
    ref="ballContainer"
    class="relative flex-1 min-h-[160px] lg:min-h-[300px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden cursor-grab active:cursor-grabbing"
    @mousedown="handleMouseDown"
  >
    <div
      v-if="wishlist.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs md:text-sm z-0"
    >
      快去許願吧！
    </div>

    <div
      v-for="(item, index) in wishlist"
      :key="index"
      class="wish-ball absolute rounded-full flex items-center justify-center font-bold select-none z-10 text-center leading-tight break-words will-change-transform"
      :class="{
        'text-[8px] p-0.5': windowWidth < 640,
        'text-[9px] p-0.5': windowWidth >= 640 && windowWidth < 768,
        'text-[10px] p-0.5 md:p-1': windowWidth >= 768 && windowWidth < 1024,
        'text-xs p-1': windowWidth >= 1024,
      }"
      :style="{
        width: `${ballRadius * 2}px`,
        height: `${ballRadius * 2}px`,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        fontWeight: '700',
        left: '0',
        top: '0',
      }"
    >
      {{ item }}
    </div>
  </div>
</template>
