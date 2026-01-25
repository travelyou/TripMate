<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  MessageSquare as MessageSquareIcon,
  Users as UsersIcon,
  MapPin as MapPinIcon,
  X as XIcon,
} from 'lucide-vue-next'
import DiscussionPostModal from '@/components/modals/DiscussionPostModal.vue'
import TravelerPostModal from '@/components/modals/TravelerPostModal.vue'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'

const emit = defineEmits(['close'])

const showDiscussionModal = ref(false)
const showTravelerModal = ref(false)
const showItineraryModal = ref(false)
const router = useRouter()

const openDiscussionModal = () => {
  showDiscussionModal.value = true
}

const openTravelerModal = () => {
  showTravelerModal.value = true
}

const openItineraryModal = () => {
  emit('close')
  router.push({ name: 'my_itinerary' })
}

const handlePostSuccess = () => {
  showDiscussionModal.value = false
  showTravelerModal.value = false
  showItineraryModal.value = false
  emit('close')
}

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
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 animate-fade-in overflow-hidden"
    >
      <div class="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-800">選擇發文類型</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-gray-700"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <button
          class="w-full p-4 border-2 border-transparent bg-primary-50 hover:bg-white hover:border-primary-200 rounded-xl transition-all group text-left shadow-sm hover:shadow-md"
          @click="openDiscussionModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-primary-sm group-hover:scale-105 transition-transform"
            >
              <MessageSquareIcon class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 mb-0.5">發起討論</h3>
              <p class="text-sm text-gray-500">分享旅遊心得、詢問建議</p>
            </div>
          </div>
        </button>

        <button
          class="w-full p-4 border-2 border-transparent bg-primary-50 hover:bg-white hover:border-primary-200 rounded-xl transition-all group text-left shadow-sm hover:shadow-md"
          @click="openTravelerModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-primary-sm group-hover:scale-105 transition-transform"
            >
              <UsersIcon class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 mb-0.5">找旅伴</h3>
              <p class="text-sm text-gray-500">招募志同道合的旅伴一起出發</p>
            </div>
          </div>
        </button>

        <button
          class="w-full p-4 border-2 border-transparent bg-primary-50 hover:bg-white hover:border-primary-200 rounded-xl transition-all group text-left shadow-sm hover:shadow-md"
          @click="openItineraryModal"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-primary-sm group-hover:scale-105 transition-transform"
            >
              <MapPinIcon class="w-6 h-6 text-white" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 mb-0.5">制定行程</h3>
              <p class="text-sm text-gray-500">規劃完整的旅遊行程表</p>
            </div>
          </div>
        </button>
      </div>
    </div>

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
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
</style>
