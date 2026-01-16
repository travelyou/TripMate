<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  wishlist: {
    type: Array,
    required: true,
  },
})

// Physics Engine for Wish Ball Pool
const ballContainer = ref(null)
const balls = ref([])
const animationFrameId = ref(null)
const isDragging = ref(false)
const draggedBall = ref(null)
const mousePos = ref({ x: 0, y: 0 })
const isMobile = ref(window.innerWidth < 768)
const ballRadius = ref(32) // Responsive ball radius
const windowWidth = ref(window.innerWidth) // Track window width for reactive classes

// Lottery ball colors - background matches border color
const BALL_COLORS = [
  { bg: '#FF6B6B', light: '#FF8E8E', accent: '#FF6B6B', number: '#FFFFFF' }, // Red
  { bg: '#4ECDC4', light: '#6EDDD6', accent: '#4ECDC4', number: '#FFFFFF' }, // Teal
  { bg: '#45B7D1', light: '#6BC5D9', accent: '#45B7D1', number: '#FFFFFF' }, // Blue
  { bg: '#FFA07A', light: '#FFB894', accent: '#FFA07A', number: '#FFFFFF' }, // Light Salmon
  { bg: '#98D8C8', light: '#B0E4D6', accent: '#98D8C8', number: '#FFFFFF' }, // Mint
  { bg: '#F7DC6F', light: '#F9E48F', accent: '#F7DC6F', number: '#333333' }, // Yellow (dark text)
  { bg: '#BB8FCE', light: '#CBA7DD', accent: '#BB8FCE', number: '#FFFFFF' }, // Purple
  { bg: '#85C1E2', light: '#9DD1E8', accent: '#85C1E2', number: '#FFFFFF' }, // Sky Blue
  { bg: '#F1948A', light: '#F5A99F', accent: '#F1948A', number: '#FFFFFF' }, // Pink
  { bg: '#82E0AA', light: '#9CE8BA', accent: '#82E0AA', number: '#FFFFFF' }, // Green
  { bg: '#F8B739', light: '#FAC459', accent: '#F8B739', number: '#FFFFFF' }, // Orange
  { bg: '#A569BD', light: '#B884CC', accent: '#A569BD', number: '#FFFFFF' }, // Dark Purple
]

// Ball class for physics simulation
class Ball {
  constructor(x, y, radius, text, index) {
    this.x = x
    this.y = y
    // Give balls strong initial velocity for continuous movement
    this.vx = (Math.random() - 0.5) * 4
    this.vy = (Math.random() - 0.5) * 4
    this.radius = radius
    this.text = text
    this.index = index
    this.mass = radius * radius * 0.01 // Mass based on size
    this.friction = 0.9995 // Very low friction to maintain movement for a long time
    this.bounce = 0.95 // High bounce to keep energy and direction changes
    this.element = null
    this.isDragged = false // Track if ball is being dragged
    // Assign a color based on index (cycle through colors)
    this.color = BALL_COLORS[index % BALL_COLORS.length]
  }

  update(containerWidth, containerHeight, otherBalls, isDragged = false) {
    // Mark if this ball is being dragged
    this.isDragged = isDragged

    // If being dragged, don't apply physics
    if (isDragged) {
      return
    }

    // No gravity - balls move freely in 2D space
    // Apply minimal friction to maintain movement
    this.vx *= this.friction
    this.vy *= this.friction

    // Update position
    this.x += this.vx
    this.y += this.vy

    // Boundary collision - bounce and change direction
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

    // Optimized collision detection - check all balls for proper collisions
    const checkRadius = (this.radius + 32) * 2 // Check slightly wider area
    for (let i = 0; i < otherBalls.length; i++) {
      const other = otherBalls[i]
      if (other === this) continue

      // Skip collision if other ball is being dragged (it handles its own position)
      if (other.isDragged) {
        // Still check for overlap and push this ball away
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

      // Early exit if too far
      if (distSq > checkRadius * checkRadius) continue

      if (distSq < minDistSq && distSq > 0) {
        const distance = Math.sqrt(distSq)
        const overlap = minDist - distance

        // Separate balls to prevent overlap
        const separationX = (dx / distance) * overlap * 0.5
        const separationY = (dy / distance) * overlap * 0.5

        // Proper elastic collision response
        const angle = Math.atan2(dy, dx)
        const sin = Math.sin(angle)
        const cos = Math.cos(angle)

        // Rotate velocities to collision frame
        const vx1 = this.vx * cos + this.vy * sin
        const vy1 = this.vy * cos - this.vx * sin
        const vx2 = other.vx * cos + other.vy * sin
        const vy2 = other.vy * cos - other.vx * sin

        // Elastic collision (conserving momentum and energy)
        const totalMass = this.mass + other.mass
        const finalVx1 = ((this.mass - other.mass) * vx1 + 2 * other.mass * vx2) / totalMass
        const finalVx2 = ((other.mass - this.mass) * vx2 + 2 * this.mass * vx1) / totalMass

        // Rotate back to world frame
        this.vx = finalVx1 * cos - vy1 * sin
        this.vy = vy1 * cos + finalVx1 * sin
        other.vx = finalVx2 * cos - vy2 * sin
        other.vy = vy2 * cos + finalVx2 * sin

        // Apply bounce coefficient for energy conservation
        // Balls will bounce and change direction, maintaining their speed
        this.vx *= this.bounce
        this.vy *= this.bounce
        other.vx *= other.bounce
        other.vy *= other.bounce

        // Separate balls
        this.x -= separationX
        this.y -= separationY
        other.x += separationX
        other.y += separationY
      }
    }
  }

  render() {
    if (this.element) {
      // Use transform for better performance (GPU accelerated)
      this.element.style.transform = `translate(${this.x - this.radius}px, ${this.y - this.radius}px)`
      // Apply lottery ball style - only set once for performance
      if (!this.element.dataset.styled) {
        // Use solid colors matching border, with gradient for 3D effect
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

// Calculate responsive ball radius
const calculateBallRadius = () => {
  const width = window.innerWidth
  if (width < 640) {
    // Small mobile
    return 20
  } else if (width < 768) {
    // Large mobile
    return 24
  } else if (width < 1024) {
    // Tablet
    return 28
  } else {
    // Desktop
    return 32
  }
}

// Initialize balls
const initBalls = () => {
  if (!ballContainer.value || props.wishlist.length === 0) {
    balls.value = []
    return
  }

  const container = ballContainer.value
  const rect = container.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  // Update ball radius based on screen size
  ballRadius.value = calculateBallRadius()
  const radius = ballRadius.value

      // If balls already exist, update their radius and reposition if needed
      if (balls.value.length > 0) {
        balls.value.forEach((ball) => {
          // Update radius
          ball.radius = radius
          ball.mass = radius * radius * 0.01

          // Ensure ball is within bounds
          ball.x = Math.max(radius, Math.min(containerWidth - radius, ball.x))
          ball.y = Math.max(radius, Math.min(containerHeight - radius, ball.y))
        })

    // Update DOM elements
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

  // Create new balls
  balls.value = props.wishlist.map((item, index) => {
    const x = Math.random() * (containerWidth - radius * 2) + radius
    const y = Math.random() * (containerHeight - radius * 2) + radius
    return new Ball(x, y, radius, item, index)
  })

  // Wait for DOM to update, then attach elements
  nextTick(() => {
    const ballElements = container.querySelectorAll('.wish-ball')
    ballElements.forEach((el, index) => {
      if (balls.value[index]) {
        balls.value[index].element = el
      }
    })
  })
}

// Animation loop - optimized for performance
let lastTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS

const animate = (currentTime) => {
  if (!ballContainer.value || balls.value.length === 0) {
    animationFrameId.value = requestAnimationFrame(animate)
    return
  }

  // Throttle to target FPS
  const deltaTime = currentTime - lastTime
  if (deltaTime < frameInterval) {
    animationFrameId.value = requestAnimationFrame(animate)
    return
  }
  lastTime = currentTime - (deltaTime % frameInterval)

  const container = ballContainer.value
  const rect = container.getBoundingClientRect()
  const containerWidth = rect.width
  const containerHeight = rect.height

  // Batch updates and renders for better performance
  const ballsArray = balls.value
  const isDraggingBall = isDragging.value && draggedBall.value

  for (let i = 0; i < ballsArray.length; i++) {
    const ball = ballsArray[i]
    const isThisBallDragged = isDraggingBall === ball
    ball.update(containerWidth, containerHeight, ballsArray, isThisBallDragged)
  }

  // Batch render after all updates
  for (let i = 0; i < ballsArray.length; i++) {
    ballsArray[i].render()
  }

  animationFrameId.value = requestAnimationFrame(animate)
}

// Mouse interaction
const handleMouseDown = (e) => {
  if (!ballContainer.value) return
  e.preventDefault() // Prevent text selection

  const rect = ballContainer.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  // Find clicked ball (check from last to first for better UX)
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

  // Constrain to container bounds
  const radius = draggedBall.value.radius
  draggedBall.value.x = Math.max(radius, Math.min(rect.width - radius, mouseX))
  draggedBall.value.y = Math.max(radius, Math.min(rect.height - radius, mouseY))

  mousePos.value = { x: mouseX, y: mouseY }
}

const handleMouseUp = () => {
  if (isDragging.value && draggedBall.value) {
    // Give the ball some velocity when released
    const dx = mousePos.value.x - draggedBall.value.x
    const dy = mousePos.value.y - draggedBall.value.y
    draggedBall.value.vx = dx * 0.1
    draggedBall.value.vy = dy * 0.1
  }
  isDragging.value = false
  draggedBall.value = null
}

// Watch for wishlist changes
watch(
  () => props.wishlist,
  () => {
    initBalls()
  },
  { deep: true }
)

onMounted(() => {
  // Update mobile detection and reinitialize balls on resize
  let resizeTimeout
  const handleResize = () => {
    // Debounce resize to avoid too many recalculations
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const newWidth = window.innerWidth
      isMobile.value = newWidth < 768
      windowWidth.value = newWidth // Update reactive window width

      // If screen size category changed, reinitialize balls
      const newRadius = calculateBallRadius()
      if (newRadius !== ballRadius.value) {
        initBalls()
      } else {
        // Even if radius didn't change, ensure balls are within bounds
        if (ballContainer.value && balls.value.length > 0) {
          const rect = ballContainer.value.getBoundingClientRect()
          balls.value.forEach(ball => {
            ball.x = Math.max(ball.radius, Math.min(rect.width - ball.radius, ball.x))
            ball.y = Math.max(ball.radius, Math.min(rect.height - ball.radius, ball.y))
          })
        }
      }
    }, 150)
  }

  window.addEventListener('resize', handleResize)

  initBalls()
  // Start animation loop
  animationFrameId.value = requestAnimationFrame(animate)

  // Add global mouse event listeners for dragging
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Cleanup on unmount
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

