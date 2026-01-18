<script setup>
import { ref, computed, onMounted } from 'vue'
import { X as XIcon, MessageCircle as MessageCircleIcon } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { getProfile } from '@/api/profile'

// 定義事件：通知父層關閉視窗
defineEmits(['close'])

const userStore = useUserStore()
const activeTab = ref('chatrooms') // 'chatrooms' 或 'friends'

// 假資料：聊天室列表
const chatRooms = ref([
  {
    id: 1,
    name: '旅伴討論群',
    avatar: '',
    lastMessage: '大家覺得這個行程怎麼樣？',
    lastMessageTime: '2 分鐘前',
    unreadCount: 2,
  },
  {
    id: 2,
    name: '張小明',
    avatar: '',
    lastMessage: '明天幾點見面？',
    lastMessageTime: '1 小時前',
    unreadCount: 0,
  },
])

// 載入好友列表
const loadFriends = async () => {
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) return

  try {
    const profileData = await getProfile(currentUid)
    if (profileData && profileData.friends) {
      // 更新 userStore 中的好友列表
      userStore.currentUser.friends = profileData.friends
    }
  } catch (error) {
    console.error('載入好友列表失敗：', error)
  }
}

// 從 userStore 獲取好友列表（使用 computed 以便響應式更新）
const friends = computed(() => {
  return userStore.currentUser?.friends || []
})

// 當組件掛載時，重新載入好友列表
onMounted(() => {
  loadFriends()
})

// 處理點擊聊天室
const handleChatRoomClick = (room) => {
  // 這裡可以切換到該聊天室的聊天界面
  console.log('點擊聊天室:', room)
}

// 處理點擊好友
const handleFriendClick = (friend) => {
  // 這裡可以開始與好友聊天
  console.log('點擊好友:', friend)
}
</script>

<template>
  <div
    class="fixed bottom-4 md:bottom-8 right-[80px] md:right-[96px] w-80 md:w-80 max-w-80 h-[480px] md:h-[480px] max-h-[480px] border-4 border-primary-600 shadow-primary-strong z-50 flex flex-col rounded-xl overflow-hidden animate-slide-up"
  >
    <div
      class="bg-primary text-secondary-50 p-4 flex items-center justify-between border-b-4 border-primary-700"
    >
      <div class="flex items-center space-x-3">
        <div>
          <h3 class="font-bold text-lg">私人聊天</h3>
        </div>
      </div>
      <button class="p-1 hover:bg-primary-600 rounded-full transition" @click="$emit('close')">
        <XIcon class="w-6 h-6" />
      </button>
    </div>

    <!-- 標籤頁切換 -->
    <div class="flex border-b-2 border-primary-700 bg-primary-100">
      <button
        class="flex-1 px-4 py-3 font-bold text-sm transition"
        :class="
          activeTab === 'chatrooms'
            ? 'bg-primary-600 text-white border-b-4 border-primary-800'
            : 'text-primary-700 hover:bg-primary-200'
        "
        @click="activeTab = 'chatrooms'"
      >
        聊天室列表
      </button>
      <button
        class="flex-1 px-4 py-3 font-bold text-sm transition"
        :class="
          activeTab === 'friends'
            ? 'bg-primary-600 text-white border-b-4 border-primary-800'
            : 'text-primary-700 hover:bg-primary-200'
        "
        @click="activeTab = 'friends'"
      >
        好友列表
      </button>
    </div>

    <!-- 聊天室列表 -->
    <div v-if="activeTab === 'chatrooms'" class="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
      <div class="p-4 space-y-2">
        <div
          v-if="chatRooms.length === 0"
          class="text-center text-gray-400 py-8"
        >
          還沒有聊天室
        </div>
        <div
          v-for="room in chatRooms"
          :key="room.id"
          class="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition cursor-pointer border-2 border-transparent hover:border-primary-200"
          @click="handleChatRoomClick(room)"
        >
          <div
            class="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 border-2 border-primary-700"
          >
            <MessageCircleIcon class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <div class="font-bold text-gray-800 text-sm truncate">{{ room.name }}</div>
              <div class="text-xs text-gray-500 ml-2 flex-shrink-0">{{ room.lastMessageTime }}</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-600 truncate">{{ room.lastMessage }}</div>
              <div
                v-if="room.unreadCount > 0"
                class="ml-2 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"
              >
                {{ room.unreadCount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 好友列表 -->
    <div v-if="activeTab === 'friends'" class="flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
      <div class="p-4 space-y-2">
        <div
          v-if="friends.length === 0"
          class="text-center text-gray-400 py-8"
        >
          還沒有加任何好友喔！
        </div>
        <div
          v-for="friend in friends"
          :key="friend.id || friend.uid"
          class="flex items-center justify-between p-3 hover:bg-white rounded-xl transition cursor-pointer border-2 border-transparent hover:border-primary-200 group"
          @click="handleFriendClick(friend)"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <img
              :src="friend.avatar || ''"
              class="w-12 h-12 rounded-full bg-gray-200 object-cover border-2 border-primary-200 flex-shrink-0"
              alt="Avatar"
              @error="$event.target.src = ''"
            />
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-800 text-sm truncate">
                {{ friend.name || friend.nickname || '未知用戶' }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                @{{ friend.nickname || friend.name || 'user' }}
              </div>
            </div>
          </div>
          <button
            class="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full transition ml-2 flex-shrink-0"
            title="聊聊"
            @click.stop="handleFriendClick(friend)"
          >
            <MessageCircleIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 上滑動畫 */
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slide-up {
  animation: slideUp 0.2s ease-out forwards;
}
</style>
