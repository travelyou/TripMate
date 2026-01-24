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
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config' // [修正] 引入 auth 以取得最準確的 UID

const myItineraryStore = useMyItineraryStore()
const userStore = useUserStore()
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

const openAddItineraryModal = () => {
  selectedItinerary.value = {
    id: Date.now(),
    title: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    days: [],
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

// [修正重點] 儲存邏輯：確保傳入 uid 並處理非同步結果
const handleSaveItinerary = async (updatedItinerary) => {
  if (!updatedItinerary.title.trim()) updatedItinerary.title = '新旅程'

  // 核心：直接從 Firebase Auth 拿當前登入者 ID
  const uid = auth.currentUser?.uid

  if (!uid) {
    showAlert('登入逾時，請重新登入')
    return
  }

  const res = await myItineraryStore.saveItinerary(updatedItinerary, uid)

  if (res.success) {
    isDetailModalOpen.value = false
    showAlert('行程已成功儲存至雲端！')
  } else {
    // 這裡會顯示後端報錯的詳細原因
    showAlert('儲存失敗：' + res.message)
  }
}

const handleDeleteItinerary = async (id) => {
  const confirmed = await showConfirm('確定要刪除這個行程嗎？')
  if (confirmed) {
    const res = await myItineraryStore.deleteItinerary(id)
    if (res.success) {
      isDetailModalOpen.value = false
      showAlert('行程已刪除')
    }
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

onMounted(async () => {
  tryOpenDraft()
  // 組件掛載時，若有 UID 則立即載入資料庫行程
  const uid = auth.currentUser?.uid
  if (uid) {
    await myItineraryStore.loadPersonalData(uid)
    await myItineraryStore.loadJoinedData(uid)
  }
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
