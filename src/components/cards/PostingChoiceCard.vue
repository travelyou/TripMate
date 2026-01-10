<script setup>
import { ref } from 'vue'
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  MapPin as MapPinIcon,
  X as XIcon,
} from 'lucide-vue-next'
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import ItineraryDetailModal from '@/components/modals/ItineraryDetailModal.vue'

const emit = defineEmits(['close'])

// 控制各個 Modal 的顯示
const showDiscussionModal = ref(false)
const showTravelerModal = ref(false)
const showItineraryModal = ref(false)

// 開啟對應的 Modal
const openDiscussionModal = () => {
  showDiscussionModal.value = true
}

const openTravelerModal = () => {
  showTravelerModal.value = true
}

const openItineraryModal = () => {
  showItineraryModal.value = true
}

// 當子 Modal 發布成功後，關閉所有 Modal
const handlePostSuccess = () => {
  showDiscussionModal.value = false
  showTravelerModal.value = false
  showItineraryModal.value = false
  emit('close')
}

// 獲取空白行程物件
const getBlankItinerary = () => ({
  id: null,
  title: '',
  startDate: '',
  endDate: '',
  days: [{ day: 1, date: '', activities: [] }],
  packingList: [],
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-md shadow-2xl border-4 border-gray-800 animate-pop-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-5 border-b-4 border-gray-800 bg-gradient-to-r from-amber-100 to-orange-100 rounded-t-2xl"
      >
        <h2 class="text-2xl font-black text-gray-800 text-shadow">選擇發文類型</h2>
        <button
          class="p-2 hover:bg-white/80 rounded-full transition border-2 border-gray-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6 text-gray-800" />
        </button>
      </div>

      <!-- Options -->
      <div class="p-6 space-y-4">
        <!-- 發起討論 -->
        <button
          class="w-full p-5 border-4 border-blue-300 rounded-xl hover:bg-blue-50 transition group text-left shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.4)] hover:translate-y-[-2px]"
          @click="openDiscussionModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-md group-hover:scale-110 transition-transform"
            >
              <MessageSquareIcon class="w-7 h-7 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-black text-gray-800 mb-1">發起討論</h3>
              <p class="text-sm text-gray-600 font-medium">分享旅遊心得、詢問建議</p>
            </div>
          </div>
        </button>

        <!-- 找旅伴 -->
        <button
          class="w-full p-5 border-4 border-green-300 rounded-xl hover:bg-green-50 transition group text-left shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(34,197,94,0.4)] hover:translate-y-[-2px]"
          @click="openTravelerModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-md group-hover:scale-110 transition-transform"
            >
              <UsersIcon class="w-7 h-7 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-black text-gray-800 mb-1">找旅伴</h3>
              <p class="text-sm text-gray-600 font-medium">招募志同道合的旅伴一起出發</p>
            </div>
          </div>
        </button>

        <!-- 制定行程 -->
        <button
          class="w-full p-5 border-4 border-purple-300 rounded-xl hover:bg-purple-50 transition group text-left shadow-[4px_4px_0px_0px_rgba(168,85,247,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.4)] hover:translate-y-[-2px]"
          @click="openItineraryModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-md group-hover:scale-110 transition-transform"
            >
              <MapPinIcon class="w-7 h-7 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-black text-gray-800 mb-1">制定行程</h3>
              <p class="text-sm text-gray-600 font-medium">規劃完整的旅遊行程表</p>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- 子 Modals -->
    <DiscussionPostModal
      v-if="showDiscussionModal"
      @close="showDiscussionModal = false"
      @success="handlePostSuccess"
    />

    <TravelerPostModal
      v-if="showTravelerModal"
      @close="showTravelerModal = false"
      @success="handlePostSuccess"
    />

    <ItineraryDetailModal
      v-if="showItineraryModal"
      :itinerary="getBlankItinerary()"
      @close="showItineraryModal = false"
      @save="handlePostSuccess"
    />
  </div>
</template>

<style scoped>
@keyframes popIn {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-pop-in {
  animation: popIn 0.15s ease-out forwards;
}

.text-shadow {
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
}
</style>
