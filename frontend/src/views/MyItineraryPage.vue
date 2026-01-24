<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase as BriefcaseIcon } from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'
import MyItineraryTab from '@/components/itinerary-tabs/MyItineraryTab.vue'
import FindPartnerTab from '@/components/itinerary-tabs/FindPartnerTab.vue'
import { showAlert, showConfirm } from '@/utils/alert'

const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()

const { myItineraries, drafts, partnerItineraries } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)
const activeTab = ref('my')

const tabs = [
  { id: 'my', label: '我的行程規劃' },
  { id: 'partner', label: '找旅伴行程規劃' },
]

const openItineraryDetail = (itinerary) => {
  selectedItinerary.value = JSON.parse(JSON.stringify(itinerary))
  isDetailModalOpen.value = true
}

// 修正：移除日期預設值
const openAddItineraryModal = () => {
  selectedItinerary.value = {
    id: Date.now(),
    title: '',
    startDate: '', // 設為空，不預設日期
    endDate: '', // 設為空，不預設日期
    status: 'planning',
    days: [], // 初始無天數，待日期選取後生成
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
  } else {
    showAlert(`這是 ${draft.typeLabel} 的草稿，請至對應頁面編輯。`)
  }
}

const handleSaveDraft = (draftItinerary) => {
  myItineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '我的行程',
    title: draftItinerary.title || '(未命名行程)',
    data: draftItinerary,
  })
  isDetailModalOpen.value = false
}

const handleSaveItinerary = (updatedItinerary) => {
  if (!updatedItinerary.title.trim()) updatedItinerary.title = '新旅程'
  myItineraryStore.saveItinerary(updatedItinerary)
  isDetailModalOpen.value = false
}

const handleDeleteItinerary = async (id) => {
  const confirmed = await showConfirm('確定要刪除這個行程嗎？')
  if (confirmed) {
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

const handlePartnerUpdate = ({ id, comment, reviewLabel }) => {
  myItineraryStore.updatePartnerItinerary({ id, comment, reviewLabel })
}

onMounted(() => {
  tryOpenDraft()
})

watch(
  () => route.query.openDraft,
  (newDraftId) => {
    if (newDraftId) {
      nextTick(() => {
        tryOpenDraft()
      })
    }
  },
)
</script>

<template>
  <div class="p-4 max-w-5xl mx-auto">
    <div class="space-y-6 pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center justify-between">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

      <div class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="w-full px-4 py-3 rounded-lg font-semibold transition"
            :class="
              activeTab === tab.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-secondary-800 hover:bg-gray-300'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="min-h-[400px]">
          <MyItineraryTab
            v-if="activeTab === 'my'"
            :itineraries="myItineraries"
            @open="openItineraryDetail"
            @add="openAddItineraryModal"
          />
          <FindPartnerTab
            v-if="activeTab === 'partner'"
            :itineraries="partnerItineraries"
            @update="handlePartnerUpdate"
          />
        </div>
      </div>
    </div>

    <MyItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @save-draft="handleSaveDraft"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>
