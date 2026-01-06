<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppFABs from '@/components/shared/AppFABs.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import PrivateChatWindow from '@/components/chat/PrivateChatWindow.vue'
import AIChatWindow from '@/components/chat/AIChatWindow.vue'
import RightSidebarAd from '@/components/common/RightSidebarAd.vue'
import AddToCollectionModal from '@/components/modals/AddToCollectionModal.vue'
import SwipeMatchModal from '@/components/modals/SwipeMatchModal.vue'

import {
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  MessageCircle as MessageCircleIcon,
  Bot as BotIcon,
  X as XIcon,
} from 'lucide-vue-next'

const userStore = useUserStore()
const route = useRoute()
const isSearchPage = computed(() => route.name === 'search')
const hideLayout = computed(() => route.meta.hideLayout === true)
const hideSidebar = computed(() => route.meta.hideSidebar === true)

const isMobileMenuOpen = ref(false)
const isPostingModalOpen = ref(false)
const isPrivateChatOpen = ref(false)
const isAiChatOpen = ref(false)
const isMobileActionMenuOpen = ref(false)
const isSwipeModalOpen = ref(false)

// 背景圖片陣列
const backgroundImages = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=60&w=1280&auto=format&fit=crop', // 山脈
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=60&w=1280&auto=format&fit=crop', // 海灘
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=60&w=1280&auto=format&fit=crop', // 森林
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=60&w=1280&auto=format&fit=crop', // 城市
  'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?q=60&w=1280&auto=format&fit=crop', // 星空
  'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=60&w=1280&auto=format&fit=crop', // 雪山
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=60&w=1280&auto=format&fit=crop', // 公路
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=60&w=1280&auto=format&fit=crop', // 湖泊
  'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=60&w=1280&auto=format&fit=crop', // 粉色天空
  'https://images.unsplash.com/photo-1474487548417-781a5a858726?q=60&w=1280&auto=format&fit=crop', // 火車
  'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=60&w=1280&auto=format&fit=crop', // 露營
  'https://images.unsplash.com/photo-1483347752454-e668de6d9e1d?q=60&w=1280&auto=format&fit=crop', // 極光
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=60&w=1280&auto=format&fit=crop', // 小屋
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=60&w=1280&auto=format&fit=crop', // 熱氣球
]

// 隨機選圖
const currentBgImage = ref(backgroundImages[Math.floor(Math.random() * backgroundImages.length)])

const handleOpenPosting = () => {
  isPostingModalOpen.value = true
  isMobileActionMenuOpen.value = false
}
const handleSelectDiscussion = () => {
  isPostingModalOpen.value = false
}
const handleSelectFindTraveler = () => {
  isPostingModalOpen.value = false
}
const handleQuickAction = () => {
  isSwipeModalOpen.value = true
  isMobileActionMenuOpen.value = false
}
const handleTogglePrivateChat = () => {
  isPrivateChatOpen.value = !isPrivateChatOpen.value
  isAiChatOpen.value = false
  isMobileActionMenuOpen.value = false
}
const handleToggleAiChat = () => {
  isAiChatOpen.value = !isAiChatOpen.value
  isPrivateChatOpen.value = false
  isMobileActionMenuOpen.value = false
}
</script>

<template>
  <div
    class="min-h-screen relative transition-all duration-1000"
    :class="
      hideLayout
        ? 'bg-[#fffef7]'
        : 'bg-[#f5e6d3] pixel-bg bg-cover bg-center md:bg-fixed bg-no-repeat'
    "
    :style="{ backgroundImage: `url('${currentBgImage}')` }"
  >
    <AppHeader v-if="!hideLayout" @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

    <div
      v-if="!hideLayout"
      class="max-w-[1500px] mx-auto flex pt-16 md:pt-18 min-h-screen items-start gap-5"
    >
      <div
        v-if="!isSearchPage && !hideSidebar"
        class="contents lg:block w-[280px] shrink-0 sticky top-16 md:top-18 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar lg:border-x-4 border-[#8b6f47]"
      >
        <AppSidebar @open-mobile-actions="isMobileActionMenuOpen = true" />
      </div>

      <main
        class="flex-1 min-w-0 transition-all duration-300"
        :class="[isSearchPage ? 'pb-0' : 'pb-24 md:pb-20 p-4 md:p-0']"
      >
        <RouterView />
      </main>

      <div
        v-if="!hideLayout && !route.meta.hideAd"
        class="hidden lg:block w-[300px] shrink-0 mr-2"
        :class="{ 'mt-6': !isSearchPage }"
      >
        <RightSidebarAd />
      </div>
    </div>

    <div v-else class="w-screen h-screen overflow-y-auto scrollable-container">
      <RouterView />
    </div>

    <div v-if="!hideLayout" class="hidden lg:block">
      <AppFABs
        @open-posting="handleOpenPosting"
        @quick-action="handleQuickAction"
        @toggle-private-chat="handleTogglePrivateChat"
        @toggle-ai-chat="handleToggleAiChat"
      />
    </div>

    <Transition name="slide-up">
      <div
        v-if="isMobileActionMenuOpen"
        class="fixed inset-0 z-[60] flex items-end justify-center lg:hidden"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="isMobileActionMenuOpen = false"
        ></div>
        <div
          class="relative w-full bg-[#fffef7] rounded-t-3xl p-6 pb-24 shadow-2xl animate-slide-up"
        >
          <div class="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-2">
            <h3 class="text-xl font-bold text-amber-900">快速功能</h3>
            <button
              class="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              @click="isMobileActionMenuOpen = false"
            >
              <XIcon class="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-4">
            <button class="flex flex-col items-center gap-2 group" @click="handleOpenPosting">
              <div
                class="w-14 h-14 bg-red-500 rounded-2xl border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <PlusIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-xs font-bold text-gray-700">發布</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleQuickAction">
              <div
                class="w-14 h-14 bg-yellow-400 rounded-2xl border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <SparklesIcon class="w-8 h-8 text-amber-900" />
              </div>
              <span class="text-xs font-bold text-gray-700">抽卡</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleTogglePrivateChat">
              <div
                class="w-14 h-14 bg-green-500 rounded-2xl border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <MessageCircleIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-xs font-bold text-gray-700">聊天</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleToggleAiChat">
              <div
                class="w-14 h-14 bg-indigo-500 rounded-2xl border-4 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <BotIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-xs font-bold text-gray-700">AI</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PostingChoiceModal
      v-if="isPostingModalOpen"
      @close="isPostingModalOpen = false"
      @select-discussion="handleSelectDiscussion"
      @select-find-traveler="handleSelectFindTraveler"
    />
    <PrivateChatWindow v-if="isPrivateChatOpen" @close="isPrivateChatOpen = false" />
 <AIChatWindow v-if="isAiChatOpen" @close="isAiChatOpen = false" />
    <SwipeMatchModal v-if="isSwipeModalOpen" @close="isSwipeModalOpen = false" />
  </div>

  <Transition name="fade">
    <AddToCollectionModal v-if="userStore.isCollectionModalOpen" />
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.scrollable-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
</style>
