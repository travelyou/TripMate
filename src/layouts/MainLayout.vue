<script setup>
import { ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import RightSidebarAd from '@/components/common/RightSidebarAd.vue'
import AppFABs from '@/components/shared/AppFABs.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import PrivateChatWindow from '@/components/chat/PrivateChatWindow.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'

// 引入圖示給手機版選單用
import {
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  MessageCircle as MessageCircleIcon,
  Bot as BotIcon,
  X as XIcon,
} from 'lucide-vue-next'

const route = useRoute()
const isMobileMenuOpen = ref(false)
const isPostingModalOpen = ref(false)
const isPrivateChatOpen = ref(false)
const isAiChatOpen = ref(false)

// 🟢 新增：控制手機版功能選單
const isMobileActionMenuOpen = ref(false)

// 共用的功能處理函數
const handleOpenPosting = () => {
  isPostingModalOpen.value = true
  isMobileActionMenuOpen.value = false // 關閉手機選單
}

const handleSelectDiscussion = () => (isPostingModalOpen.value = false)
const handleSelectFindTraveler = () => (isPostingModalOpen.value = false)

const handleQuickAction = () => {
  alert('抽卡功能開發中')
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
  <div class="min-h-screen bg-[#f5e6d3] pixel-bg relative">
    <AppHeader @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

    <div class="flex pt-16 md:pt-18 min-h-screen overflow-x-hidden">
      <AppSidebar @open-mobile-actions="isMobileActionMenuOpen = true" />

      <main
        class="lg:ml-[280px] w-full pb-24 md:pb-20 min-w-0 flex flex-col lg:flex-row gap-6 p-4 md:p-0 items-start max-w-7xl mx-auto"
      >
        <div
          class="w-full min-w-0 transition-all duration-300"
          :class="!route.meta.hideAd ? 'lg:w-[calc(100%-320px)]' : 'w-full'"
        >
          <RouterView />
        </div>

        <div v-if="!route.meta.hideAd" class="hidden lg:block w-[300px] shrink-0 mr-[10px]">
          <RightSidebarAd />
        </div>
      </main>
    </div>

    <div class="hidden lg:block">
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
          class="relative w-full bg-[#fffef7] rounded-t-3xl border-t-4 border-[#8b6f47] p-6 pb-24 shadow-2xl animate-slide-up"
        >
          <div class="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-2">
            <h3 class="text-xl font-bold text-amber-900">快速功能</h3>
            <button
              @click="isMobileActionMenuOpen = false"
              class="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
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
    <ChatWindow v-if="isAiChatOpen" @close="isAiChatOpen = false" />
  </div>
</template>

<style scoped>
.pixel-bg {
  background-image: url('https://images.unsplash.com/photo-1618083707368-b3823daa2726?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* 底部選單動畫 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
