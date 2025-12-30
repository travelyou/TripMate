<script setup>
//import { defineProps, defineEmits } from 'vue'// <-Vue 3.3+ 版本中，defineProps 和 defineEmits 已經是內建的編譯器巨集，不需要手動import。先暫時拉出，可能是版本衝突//
import {
  X as XIcon,
  Link as LinkIcon, // 保持 LinkIcon，因為你沒有提供複製連結的圖
} from 'lucide-vue-next'

// ✅ 引入你自己的圖片檔案
import LineIconSvg from '../../assets/icons/LINE_icon.png'
import XIconSvg from '../../assets/icons/X_icon.png'
import InstagramIconPng from '../../assets/icons/Instagram_icon.png'
import FacebookIconPng from '../../assets/icons/Facebook_icon.png'
import ThreadsIconPng from '../../assets/icons/Threads_icon.png'

const props = defineProps({
  postLink: {
    type: String,
    default: 'https://tripmate.com/share/post_id_demo',
  },
})

const emit = defineEmits(['close'])

// 模擬的社群平台列表 - 替換為圖片引用
const socialPlatforms = [
  // 注意：這裡我們將 icon 屬性設為圖片變數
  {
    name: 'Facebook',
    iconPath: FacebookIconPng,
    color: 'bg-[#1877F2]',
    link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(props.postLink)}`,
  },
  {
    name: 'Instagram',
    iconPath: InstagramIconPng,
    color: 'bg-gradient-to-tr from-yellow-400 to-pink-600',
    link: 'javascript:alert("IG 分享功能需要手機 APP 支援，此為模擬。")',
  },
  {
    name: 'Threads',
    iconPath: ThreadsIconPng,
    color: 'bg-black',
    link: 'javascript:alert("Threads 尚未開放官方 Web 分享 API，此為模擬。")',
  },
  {
    name: 'X (Twitter)',
    iconPath: XIconSvg,
    color: 'bg-black',
    link: `https://twitter.com/intent/tweet?url=${encodeURIComponent(props.postLink)}&text=我在 TripMate 看到這個超棒的旅遊分享！`,
  },
  {
    name: 'Line',
    iconPath: LineIconSvg,
    color: 'bg-[#00C300]',
    link: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(props.postLink)}`,
  },
]

// 處理複製連結
const copyLink = () => {
  navigator.clipboard
    .writeText(props.postLink)
    .then(() => {
      alert('連結已複製到剪貼簿！')
      emit('close')
    })
    .catch((err) => {
      console.error('無法複製:', err)
    })
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col pixel-modal p-6">
      <header class="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
        <h3 class="text-xl font-bold text-gray-800">分享至社群平台</h3>
        <button @click="emit('close')" class="text-gray-500 hover:text-gray-800 transition">
          <XIcon class="w-6 h-6" />
        </button>
      </header>

      <div class="grid grid-cols-3 gap-4">
        <a
          v-for="platform in socialPlatforms"
          :key="platform.name"
          :href="platform.link"
          target="_blank"
          @click="platform.name !== 'Line' && platform.name !== 'Facebook' && emit('close')"
          class="flex flex-col items-center justify-center p-4 rounded-xl transition hover:opacity-80 border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]"
          :class="platform.color"
        >
          <img :src="platform.iconPath" :alt="platform.name" class="w-8 h-8 object-contain" />

          <span class="text-white font-bold text-sm mt-2">{{ platform.name }}</span>
        </a>

        <button
          @click="copyLink"
          class="flex flex-col items-center justify-center p-4 rounded-xl transition hover:opacity-80 bg-gray-600 border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]"
        >
          <LinkIcon class="w-8 h-8 text-white" />
          <span class="text-white font-bold text-sm mt-2">複製連結</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-modal {
  border: 4px solid #8b6f47;
  box-shadow: 10px 10px 0px 0px rgba(139, 111, 71, 0.5);
}
</style>
