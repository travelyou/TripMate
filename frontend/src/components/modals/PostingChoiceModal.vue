<script setup>
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  Briefcase as BriefcaseIcon,
  X as XIcon,
} from 'lucide-vue-next'

// 定義 Emit，讓父層知道要開哪個視窗
const emit = defineEmits(['close', 'open-discussion', 'open-traveler'])

// 1. 發起討論：通知父層開啟「討論區發文彈窗」
const handleOpenDiscussion = () => {
  emit('close')
  emit('open-discussion')
}

// 2. 尋找旅伴：通知父層開啟「找旅伴發文彈窗」
const handleOpenTraveler = () => {
  emit('close')
  emit('open-traveler')
}

// (移除 handleOpenItinerary 函式，因為我們改用 template 直接跳轉)
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-sm bg-white relative animate-pop-in flex flex-col rounded-2xl shadow-xl overflow-hidden mx-4"
    >
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 class="text-lg font-bold text-gray-800">你想發布什麼？</h3>
        <button class="p-1 hover:bg-gray-200 rounded-full transition" @click="$emit('close')">
          <XIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div class="p-4 space-y-3">
        <button
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
          @click="handleOpenDiscussion"
        >
          <div
            class="p-3 bg-blue-100 text-blue-600 rounded-full mr-4 group-hover:bg-blue-500 group-hover:text-white transition-colors"
          >
            <MessageSquareIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
              發起討論
            </p>
            <p class="text-xs text-gray-500">分享經驗或尋求建議</p>
          </div>
        </button>

        <button
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm hover:shadow-md"
          @click="handleOpenTraveler"
        >
          <div
            class="p-3 bg-green-100 text-green-600 rounded-full mr-4 group-hover:bg-green-500 group-hover:text-white transition-colors"
          >
            <UsersIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-green-700 transition-colors">
              尋找旅伴
            </p>
            <p class="text-xs text-gray-500">找到志同道合的夥伴</p>
          </div>
        </button>

        <RouterLink
          :to="{ name: 'my_itinerary' }"
          class="w-full flex items-center p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group shadow-sm hover:shadow-md"
          @click="$emit('close')"
        >
          <div
            class="p-3 bg-purple-100 text-purple-600 rounded-full mr-4 group-hover:bg-purple-500 group-hover:text-white transition-colors"
          >
            <BriefcaseIcon class="w-6 h-6" />
          </div>
          <div class="text-left">
            <p class="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
              規劃行程
            </p>
            <p class="text-xs text-gray-500">這周末想做什麼?</p>
          </div>
        </RouterLink>
      </div>

      <div class="p-3 bg-gray-50 border-t border-gray-100">
        <button
          class="w-full py-2 text-sm text-gray-500 font-bold hover:text-gray-700 transition"
          @click="$emit('close')"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-pop-in {
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
