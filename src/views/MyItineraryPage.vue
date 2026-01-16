<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Calendar as CalendarIcon,
  Briefcase as BriefcaseIcon,
  Plus as PlusIcon,
} from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'

const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()

const { myItineraries, drafts } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)

const openItineraryDetail = (itinerary) => {
  selectedItinerary.value = JSON.parse(JSON.stringify(itinerary))
  isDetailModalOpen.value = true
}

const openAddItineraryModal = () => {
  selectedItinerary.value = {
    id: Date.now(),
    title: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    days: [{ day: 1, date: '', activities: [] }],
    packingList: [
      { category: '證件', items: [] },
      { category: '衣物', items: [] },
      { category: '電子產品', items: [] },
    ],
  }
  isDetailModalOpen.value = true
}

const openDraft = (draft) => {
  if (
    (draft.type === 'my_itinerary' || draft.type === 'itinerary') &&
    (draft.data || draft.rawItinerary)
  ) {
    const dataToLoad = draft.data || draft.rawItinerary
    selectedItinerary.value = JSON.parse(JSON.stringify(dataToLoad))
    isDetailModalOpen.value = true
  }
}

const handleSaveItinerary = (updatedItinerary) => {
  if (!updatedItinerary.title.trim()) updatedItinerary.title = '新旅程'

  const index = myItineraryStore.myItineraries.findIndex((i) => i.id === updatedItinerary.id)

  if (index !== -1) {
    myItineraryStore.myItineraries[index] = updatedItinerary
  } else {
    myItineraryStore.myItineraries.unshift(updatedItinerary)
  }

  isDetailModalOpen.value = false
}

const handleDeleteItinerary = (id) => {
  if (confirm('確定要刪除這個行程嗎？')) {
    myItineraryStore.deleteItinerary(id)
    isDetailModalOpen.value = false
  }
}

const tryOpenDraft = () => {
  const draftId = route.query.openDraft
  if (draftId) {
    const draft = drafts.value.find((d) => String(d.id) === String(draftId))
    if (draft) {
      openDraft(draft)
      router.replace({ path: '/my-itinerary', query: {} })
    }
  }
}

onMounted(() => {
  tryOpenDraft()
})

watch(() => route.query.openDraft, (newDraftId) => {
  if (newDraftId) {
    nextTick(() => {
      tryOpenDraft()
    })
  }
})
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="space-y-6 pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

      <div
        class="bg-white rounded-xl p-6 relative overflow-hidden border-4 border-primary shadow-primary-tall"
      >
        <div class="flex items-center mb-6 pb-4 border-b-2 border-secondary-100">
          <div class="bg-primary-100 p-2 rounded-lg border-2 border-primary-200 mr-4">
            <CalendarIcon class="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-secondary-800">行程列表</h3>
            <p class="text-sm text-secondary-500">查看並管理你的旅遊行程</p>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="item in myItineraries"
            :key="item.id"
            class="border-2 border-secondary-200 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition cursor-pointer group"
            @click="openItineraryDetail(item)"
          >
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-bold text-lg text-secondary-800 group-hover:text-primary-700 mb-1">
                  {{ item.title }}
                </h4>
                <div class="flex items-center text-sm text-secondary-500">
                  <span
                    class="bg-secondary-100 px-2 py-0.5 rounded text-xs mr-2 border border-secondary-300"
                    >日期</span
                  >
                  {{ item.startDate || '未定' }} - {{ item.endDate || '未定' }}
                </div>
              </div>
              <div class="text-secondary-300 group-hover:text-primary-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            v-if="myItineraries.length === 0"
            class="text-center py-10 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg"
          >
            目前沒有行程，點擊下方按鈕新增！
          </div>
        </div>

        <button
          class="w-full mt-8 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition flex items-center justify-center shadow-primary-strong active:translate-y-1 active:shadow-none"
          @click="openAddItineraryModal"
        >
          <PlusIcon class="w-5 h-5 mr-2" />
          新增行程
        </button>
      </div>
    </div>

    <MyItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>
