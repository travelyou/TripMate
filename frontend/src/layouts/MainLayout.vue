<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDiscussionsStore } from '@/stores/discussions'
import { auth } from '@/firebase/config'

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppFABs from '@/components/shared/AppFABs.vue'
import PostingChoiceCard from '@/components/cards/PostingChoiceCard.vue'
import PrivateChatWindow from '@/components/chat/PrivateChatWindow.vue'
import AIChatWindow from '@/components/chat/AIChatWindow.vue'
import RightSidebarAd from '@/components/shared/RightSidebarAd.vue'
import AddToCollectionModal from '@/components/modals/AddToCollectionModal.vue'
import SwipeMatchModal from '@/components/profile/card/SwipeMatchModal.vue'

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

// 動態設定 grid 模板欄位
const gridClass = computed(() => {
  if (hideSidebar.value && showRightAd.value) {
    return 'lg:[grid-template-columns:4fr_1fr] xl:[grid-template-columns:4fr_1fr]'
  }
  if (hideSidebar.value && !showRightAd.value) {
    return 'lg:[grid-template-columns:1fr]'
  }
  if (isSearchPage.value && showRightAd.value) {
    return 'lg:[grid-template-columns:4fr_1fr] xl:[grid-template-columns:4fr_1fr]'
  }
  return showRightAd.value
    ? 'lg:[grid-template-columns:1fr_3fr_1fr]'
    : 'lg:[grid-template-columns:1fr_4fr]'
})

const isMobileMenuOpen = ref(false)
const isPostingModalOpen = ref(false)
const isPrivateChatOpen = ref(false)
const isAiChatOpen = ref(false)
const isMobileActionMenuOpen = ref(false)
const isSwipeModalOpen = ref(false)
const openChatWithUser = ref(null) // 要開啟聊天的用戶資訊
const unreadMessageCount = ref(0) // 未讀訊息總數

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
const handleTogglePrivateChat = (user = null) => {
  if (user) {
    openChatWithUser.value = user
  }
  isPrivateChatOpen.value = !isPrivateChatOpen.value
  isAiChatOpen.value = false
  isMobileActionMenuOpen.value = false
}

// 監聽全局事件來開啟聊天（從 ProfilePage 觸發）
const handleOpenChat = (event) => {
  if (event.detail && event.detail.user) {
    openChatWithUser.value = event.detail.user
    isPrivateChatOpen.value = true
    isAiChatOpen.value = false
    isMobileActionMenuOpen.value = false
  }
}

// 計算未讀訊息總數
const calculateUnreadCount = () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    unreadMessageCount.value = 0
    return
  }

  try {
    let totalUnread = 0

    // 檢查好友請求
    const friendRequestsKey = `friend_requests_${currentUid}`
    const friendRequestsData = localStorage.getItem(friendRequestsKey)
    if (friendRequestsData) {
      try {
        const requests = JSON.parse(friendRequestsData)
        if (requests.received && Array.isArray(requests.received)) {
          totalUnread += requests.received.length
        }
      } catch (e) {
        console.warn('解析好友請求失敗:', e)
      }
    }

    // 檢查聊天室和未讀訊息
    const chatRoomsKey = `tripmate-private-chats-${currentUid}`
    const chatRoomsData = localStorage.getItem(chatRoomsKey)
    if (chatRoomsData) {
      try {
        const rooms = JSON.parse(chatRoomsData)
        if (Array.isArray(rooms)) {
          rooms.forEach((room) => {
            if (room.unreadCount) {
              totalUnread += room.unreadCount
            } else if (room.messages && Array.isArray(room.messages)) {
              // 如果沒有unreadCount，檢查最後一條訊息是否是自己發送的
              const lastMessage = room.messages[room.messages.length - 1]
              if (lastMessage && lastMessage.type !== 'user') {
                // 檢查是否有未讀標記
                const unreadKey = `unread_${currentUid}_${room.uid}`
                const unreadData = localStorage.getItem(unreadKey)
                if (unreadData) {
                  const unreadInfo = JSON.parse(unreadData)
                  if (unreadInfo.lastReadTime) {
                    const lastReadTime = new Date(unreadInfo.lastReadTime).getTime()
                    const lastMessageTime = new Date(
                      lastMessage.timestamp || lastMessage.created_at,
                    ).getTime()
                    if (lastMessageTime > lastReadTime) {
                      totalUnread += 1
                    }
                  } else {
                    totalUnread += 1
                  }
                } else {
                  totalUnread += 1
                }
              }
            }
          })
        }
      } catch (e) {
        console.warn('解析聊天室資料失敗:', e)
      }
    }

    // 檢查新建的聊天室（透過檢查是否有新訊息但未打開過）
    const newChatRoomsKey = `new_chat_rooms_${currentUid}`
    const newChatRoomsData = localStorage.getItem(newChatRoomsKey)
    if (newChatRoomsData) {
      try {
        const newRooms = JSON.parse(newChatRoomsData)
        if (Array.isArray(newRooms)) {
          totalUnread += newRooms.length
        }
      } catch (e) {
        console.warn('解析新建聊天室資料失敗:', e)
      }
    }

    // 限制最多顯示9
    unreadMessageCount.value = Math.min(totalUnread, 9)
  } catch (error) {
    console.error('計算未讀訊息失敗:', error)
    unreadMessageCount.value = 0
  }
}

// 監聽訊息變化
const handleMessageUpdate = () => {
  calculateUnreadCount()
}

// 監聽新建聊天室
const handleNewChatRoom = () => {
  calculateUnreadCount()
}

// 在組件掛載時監聽全局事件
onMounted(() => {
  window.addEventListener('open-chat', handleOpenChat)
  window.addEventListener('message-updated', handleMessageUpdate)
  window.addEventListener('new-chat-room', handleNewChatRoom)
  // 初始計算未讀訊息
  calculateUnreadCount()
  // 定期檢查未讀訊息（每5秒）
  const interval = setInterval(calculateUnreadCount, 5000)
  // 存储interval以便清理
  window._unreadMessageInterval = interval
})
onUnmounted(() => {
  window.removeEventListener('open-chat', handleOpenChat)
  window.removeEventListener('message-updated', handleMessageUpdate)
  window.removeEventListener('new-chat-room', handleNewChatRoom)
  if (window._unreadMessageInterval) {
    clearInterval(window._unreadMessageInterval)
    delete window._unreadMessageInterval
  }
})

// 監聽聊天視窗打開/關閉，更新未讀計數
watch(
  () => isPrivateChatOpen.value,
  (isOpen) => {
    if (isOpen) {
      // 打開聊天視窗時，延遲一下再重新計算（給時間載入資料）
      setTimeout(calculateUnreadCount, 500)
    } else {
      // 關閉時也重新計算
      calculateUnreadCount()
    }
  },
)
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

    // 如果有圖片，先上傳圖片到 Firebase Storage
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

const handleClosePrivateChat = () => {
  isPrivateChatOpen.value = false
  openChatWithUser.value = null
}
</script>

<template>
  <div
    class="min-h-screen relative transition-all duration-1000"
    :class="
      hideLayout ? 'bg-secondary-50' : 'bg-secondary-50 bg-cover bg-center md:bg-fixed bg-no-repeat'
    "
  >
    <div class="transition-[filter] duration-300">
      <AppHeader v-if="!hideLayout" @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

      <div
        v-if="!hideLayout"
        class="max-w-[1500px] mx-auto grid grid-cols-1 pt-16 min-h-screen items-start gap-2"
        :class="gridClass"
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
    </div>

    <div
      v-if="isMobileActionMenuOpen"
      class="fixed inset-0 z-[50] bg-black/40 backdrop-blur-sm lg:hidden"
      @click="isMobileActionMenuOpen = false"
    ></div>

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
          class="relative w-full bg-white rounded-t-3xl p-6 pb-24 shadow-2xl border-t border-secondary-100"
        >
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
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <PlusIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-lg font-bold text-gray-700">發布</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleQuickAction">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <SparklesIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-sm font-bold text-gray-700">抽卡</span>
            </button>
            <button
              class="flex flex-col items-center gap-2 group relative"
              @click="handleTogglePrivateChat"
            >
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <MessageCircleIcon class="w-8 h-8 text-white" />
                <span
                  v-if="unreadMessageCount > 0"
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center border-2 border-white shadow-lg"
                >
                  {{ unreadMessageCount > 9 ? '9+' : unreadMessageCount }}
                </span>
              </div>
              <span class="text-sm font-bold text-gray-700">聊天</span>
            </button>
            <button class="flex flex-col items-center gap-2 group" @click="handleToggleAiChat">
              <div
                class="w-14 h-14 bg-primary-600 rounded-2xl border border-secondary-200 shadow-primary-sm flex items-center justify-center group-active:translate-y-0.5 group-active:shadow-none transition"
              >
                <BotIcon class="w-8 h-8 text-white" />
              </div>
              <span class="text-sm font-bold text-gray-700">AI</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PostingChoiceCard
      v-if="isPostingModalOpen"
      @close="isPostingModalOpen = false"
      @select-discussion="handleSelectDiscussion"
      @select-find-traveler="handleSelectFindTraveler"
      @submit-post="handleSubmitPost"
    />
    <PrivateChatWindow
      v-if="isPrivateChatOpen"
      :open-chat-with-user="openChatWithUser"
      @close="handleClosePrivateChat"
    />
    <AIChatWindow v-if="isAiChatOpen" @close="isAiChatOpen = false" />
    <SwipeMatchModal v-if="isSwipeModalOpen" @close="isSwipeModalOpen = false" />
  </div>

  <Transition name="fade">
    <AddToCollectionModal v-if="userStore.isCollectionModalOpen" />
  </Transition>
</template>
