// src/composables/useProfilePhysics.js
import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useProfilePhysics() {
  const scrollTop = ref(0)
  const windowWidth = ref(window.innerWidth)

  const handleScroll = () => {
    scrollTop.value = window.scrollY
  }

  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleResize)
  })

  // 封面圖視差效果
  const headerStyle = computed(() => {
    const offset = scrollTop.value * 0.5
    return {
      transform: `translateY(${offset}px)`,
      opacity: Math.max(0, 1 - scrollTop.value / 400),
    }
  })

  // 頭像縮放與位移效果
  const avatarStyle = computed(() => {
    // 當滾動超過 100px 時開始縮小，最大縮小到 0.6 倍
    const scale = Math.max(0.6, 1 - scrollTop.value / 500)

    // 簡單的位移效果 (可根據需求調整)
    const translateY = Math.min(50, scrollTop.value * 0.2)

    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      transition: 'transform 0.1s linear',
    }
  })

  return {
    scrollTop,
    headerStyle,
    avatarStyle,
  }
}
