<script setup>
import { computed } from 'vue'
import { X as XIcon, Link as LinkIcon } from 'lucide-vue-next'

// 引入圖片檔案
import LineIconSvg from '../../assets/icons/LINE_icon.png'
import XIconSvg from '../../assets/icons/X_icon.png'
import InstagramIconPng from '../../assets/icons/Instagram_icon.png'
import FacebookIconPng from '../../assets/icons/Facebook_icon.png'
import ThreadsIconPng from '../../assets/icons/Threads_icon.png'

const props = defineProps({
  postLink: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

// 統一的分享文案 (包含網址)
const shareText = computed(() => `我在 TripMate 看到這個超棒的旅遊分享！ ${props.postLink}`)

// 定義各平台的連結與行為
const socialPlatforms = computed(() => [
  {
    name: 'Facebook',
    iconPath: FacebookIconPng,
    color: 'bg-[#1877F2]',
    // FB 只能帶網址 (u)，不支援帶文字 (text)
    link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(props.postLink)}`,
    action: 'direct_open',
  },
  {
    name: 'Instagram',
    iconPath: InstagramIconPng,
    color: 'bg-gradient-to-tr from-yellow-400 to-pink-600',
    // IG 策略：複製文案 -> 打開 IG 首頁
    link: 'https://instagram.com/',
    action: 'copy_and_open',
  },
  {
    name: 'Threads',
    iconPath: ThreadsIconPng,
    color: 'bg-gradient-to-tr from-gray-900 to-gray-700',
    // Threads 支援網頁喚起並帶入文字
    link: `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText.value)}`,
    action: 'direct_open',
  },
  {
    name: 'X (Twitter)',
    iconPath: XIconSvg,
    color: 'bg-gradient-to-tr from-gray-900 to-gray-800',
    // X 支援帶入文字
    link: `https://twitter.com/intent/tweet?text=${encodeURIComponent('我在 TripMate 看到這個超棒的旅遊分享！')}&url=${encodeURIComponent(props.postLink)}`,
    action: 'direct_open',
  },
  {
    name: 'Line',
    iconPath: LineIconSvg,
    color: 'bg-gradient-to-tr from-green-500 to-green-400',
    // Line 支援帶入文字
    link: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(props.postLink)}&text=${encodeURIComponent('我在 TripMate 看到這個超棒的旅遊分享！')}`,
    action: 'direct_open',
  },
])

// 統一處理點擊邏輯
const handlePlatformClick = (platform) => {
  if (platform.action === 'copy_and_open') {
    // === IG 專用邏輯 ===
    // 1. 先複製文字
    navigator.clipboard
      .writeText(shareText.value)
      .then(() => {
        alert(`已複製文案！正在為您打開 ${platform.name}，請直接貼上發布。`)
        // 2. 強制打開連結
        window.open(platform.link, '_blank')
        // 3. 關閉彈窗
        emit('close')
      })
      .catch(() => {
        // 就算複製失敗，也要打開連結
        window.open(platform.link, '_blank')
        emit('close')
      })
  } else {
    // === 其他平台 (FB, Threads, Line, X) ===
    // 直接強制打開，不透過 <a> 標籤，確保一定執行
    window.open(platform.link, '_blank')
    emit('close')
  }
}

// 單純複製連結按鈕
const copyLinkOnly = () => {
  if (!props.postLink) return
  navigator.clipboard
    .writeText(props.postLink)
    .then(() => {
      alert('連結已複製到剪貼簿！')
      emit('close')
    })
    .catch((err) => {
      console.error('無法複製:', err)
      alert('複製失敗，請手動複製')
    })
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4">
    <div class="bg-white rounded-xl w-full max-w-md flex flex-col p-6">
      <header class="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <h3 class="text-xl font-bold text-gray-800">分享至社群平台</h3>
        <button class="text-gray-500 hover:text-gray-800 transition" @click="emit('close')">
          <XIcon class="w-6 h-6" />
        </button>
      </header>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <a
          v-for="platform in socialPlatforms"
          :key="platform.name"
          href="javascript:void(0)"
          class="flex flex-col items-center justify-center p-4 rounded-xl transition hover:opacity-80 cursor-pointer"
          :class="platform.color"
          @click.prevent="handlePlatformClick(platform)"
        >
          <img :src="platform.iconPath" :alt="platform.name" class="w-8 h-8 object-contain" />
          <span class="text-white font-bold text-sm mt-2">{{ platform.name }}</span>
        </a>

        <button
          class="flex flex-col items-center justify-center p-4 rounded-xl transition hover:opacity-80 bg-gray-600"
          @click="copyLinkOnly"
        >
          <LinkIcon class="w-8 h-8 text-white" />
          <span class="text-white font-bold text-sm mt-2">複製連結</span>
        </button>
      </div>
    </div>
  </div>
</template>
