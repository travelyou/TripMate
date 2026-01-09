<script setup>
import { ref, computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { auth } from '@/firebase/config'

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppFABs from '@/components/shared/AppFABs.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import PrivateChatWindow from '@/components/chat/PrivateChatWindow.vue'
import AIChatWindow from '@/components/chat/AIChatWindow.vue'
import RightSidebarAd from '@/components/shared/RightSidebarAd.vue'
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
const discussionsStore = useDiscussionsStore()
const route = useRoute()
const router = useRouter()
const isSearchPage = computed(() => route.name === 'search')
const hideLayout = computed(() => route.meta.hideLayout === true)
const hideSidebar = computed(() => route.meta.hideSidebar === true)

const showRightAd = computed(() => !hideLayout.value && !route.meta.hideAd)

const isMobileMenuOpen = ref(false)
const isPostingModalOpen = ref(false)
const isPrivateChatOpen = ref(false)
const isAiChatOpen = ref(false)
const isMobileActionMenuOpen = ref(false)
const isSwipeModalOpen = ref(false)

/*
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
*/

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

// 處理發文提交
const handleSubmitPost = async (postData) => {
  try {
    console.log('MainLayout 收到發文請求:', postData)

    // 檢查用戶是否已登入
    const firebaseUser = auth.currentUser
    const uid = firebaseUser?.uid || userStore.firebaseUser?.uid

    if (!uid) {
      alert('請先登入後才能發布貼文')
      console.error('發布貼文失敗：用戶未登入')
      // 導向登入頁面
      router.push('/login')
      return
    }

    console.log('⏳ 準備發布貼文，用戶 UID：', uid)

    // 如果有圖片，先上傳圖片到 Supabase Storage
    let imageUrls = []
    if (postData.imageFiles && postData.imageFiles.length > 0) {
      try {
        const { uploadMultipleImages } = await import('@/api/storage')
        console.log('開始上傳圖片...')
        imageUrls = await uploadMultipleImages(postData.imageFiles, 'posts')
        console.log('圖片上傳成功:', imageUrls)
      } catch (error) {
        console.error('圖片上傳失敗：', error)
        // 詢問用戶是否要繼續發布（不帶圖片）
        const shouldContinue = confirm(
          '圖片上傳失敗：' + error.message + '\n\n是否要繼續發布貼文（不帶圖片）？',
        )
        if (!shouldContinue) {
          return
        }
      }
    }

    // 準備提交的資料
    const submitData = {
      author_uid: uid,
      board: postData.board || 'general',
      title: postData.title,
      content: postData.content,
      tags: postData.tags || [],
      image_urls: imageUrls,
    }

    console.log('提交貼文資料：', {
      author_uid: submitData.author_uid,
      board: submitData.board,
      title: submitData.title?.substring(0, 50),
      contentLength: submitData.content?.length,
      tagsCount: submitData.tags?.length,
      imageUrlsCount: submitData.image_urls?.length,
    })

    // 調用 API 創建貼文
    console.log('調用 addPost API...')
    const newPost = await discussionsStore.addPost(submitData)

    console.log('貼文發布成功：', newPost)

    // 關閉模態框
    isPostingModalOpen.value = false

    // 如果在討論頁面，重新載入貼文列表
    if (route.name === 'discussion') {
      await discussionsStore.loadDiscussions()
    } else {
      // 如果不在討論頁面，導向討論頁面
      router.push('/discussion')
      // 等待路由切換後再載入
      setTimeout(async () => {
        await discussionsStore.loadDiscussions()
      }, 300)
    }

    // 顯示成功訊息
    alert('貼文發布成功！')
  } catch (error) {
    console.error('發布貼文失敗：', error)
    console.error('錯誤詳情：', {
      message: error.message,
      stack: error.stack,
      firebaseUser: auth.currentUser?.uid,
    })
    alert(`發布貼文失敗：${error.message || '請稍後再試'}`)
  }
}
</script>

<template>
  <div
    class="min-h-screen relative transition-all duration-1000"
    :class="
      hideLayout ? 'bg-secondary-50' : 'bg-secondary-50 bg-cover bg-center md:bg-fixed bg-no-repeat'
    "
  >
    <AppHeader v-if="!hideLayout" @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

    <div
      v-if="!hideLayout"
      class="max-w-[1500px] mx-auto grid grid-cols-1 pt-16 min-h-screen items-start gap-2"
      :class="
        isSearchPage && showRightAd
          ? 'lg:[grid-template-columns:4fr_1fr] xl:[grid-template-columns:4fr_1fr]'
          : showRightAd
            ? 'lg:[grid-template-columns:1fr_3fr_1fr] '
            : 'lg:[grid-template-columns:1fr_4fr]'
      "
    >
      <div
        v-if="!isSearchPage && !hideSidebar"
        class="contents lg:block shrink-0 sticky top-16 md:top-18 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar"
      >
        <AppSidebar @open-mobile-actions="isMobileActionMenuOpen = true" />
      </div>

      <main
        class="min-w-0 transition-all duration-300"
        :class="[isSearchPage ? 'pb-0' : 'pb-24 md:pb-20 ']"
      >
        <RouterView />
      </main>

      <div
        v-if="showRightAd"
        class="hidden lg:block shrink-0 mr-2"
        :class="{ 'mt-6': !isSearchPage }"
      >
        <RightSidebarAd />
      </div>
    </div>

    <div
      v-else
      class="w-screen h-screen overflow-y-auto overscroll-contain"
      style="-webkit-overflow-scrolling: touch"
    >
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

    <Transition
      enter-active-class="transition-all duration-300 ease"
      enter-from-class="opacity-0 translate-y-full"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-300 ease"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-full"
    >
      <div
        v-if="isMobileActionMenuOpen"
        class="fixed inset-0 z-[60] flex items-end justify-center lg:hidden"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="isMobileActionMenuOpen = false"
        ></div>
        <div class="relative w-full bg-secondary-50 rounded-t-3xl p-6 pb-24 shadow-2xl">
          <div class="flex justify-between items-center mb-6 border-b-2 border-secondary-100 pb-2">
            <h3 class="text-xl font-bold text-primary-700">快速功能</h3>
            <button
              class="p-2 bg-secondary-100 rounded-full hover:bg-secondary-200"
              @click="isMobileActionMenuOpen = false"
            >
              <XIcon class="w-5 h-5 text-secondary-600" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-4">
            <button class="flex flex-col items-center gap-2 group" @click="handleOpenPosting">
              <div
                class="w-14 h-14 bg-red-500 rounded-2xl border-4 border-gray-800 shadow-md flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <PlusIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-xs font-bold text-gray-700">發布</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleQuickAction">
              <div
                class="w-14 h-14 bg-yellow-400 rounded-2xl border-4 border-gray-800 shadow-md flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <SparklesIcon class="w-8 h-8 text-primary-700" />
              </div>
              <span class="text-xs font-bold text-gray-700">抽卡</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleTogglePrivateChat">
              <div
                class="w-14 h-14 bg-green-500 rounded-2xl border-4 border-gray-800 shadow-md flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
              >
                <MessageCircleIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-xs font-bold text-gray-700">聊天</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleToggleAiChat">
              <div
                class="w-14 h-14 bg-indigo-500 rounded-2xl border-4 border-gray-800 shadow-md flex items-center justify-center group-active:translate-y-1 group-active:shadow-none transition"
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
      @submit-post="handleSubmitPost"
    />
    <PrivateChatWindow v-if="isPrivateChatOpen" @close="isPrivateChatOpen = false" />
    <AIChatWindow v-if="isAiChatOpen" @close="isAiChatOpen = false" />
    <SwipeMatchModal v-if="isSwipeModalOpen" @close="isSwipeModalOpen = false" />
  </div>

  <Transition name="fade">
    <AddToCollectionModal v-if="userStore.isCollectionModalOpen" />
  </Transition>
</template>
