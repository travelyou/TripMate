<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Briefcase as BriefcaseIcon } from 'lucide-vue-next'
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'
import MyItineraryTab from '@/components/itinerary-tabs/MyItineraryTab.vue'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import FindPartnerTab from '@/components/itinerary-tabs/FindPartnerTab.vue'

const myItineraryStore = useMyItineraryStore()
const route = useRoute()
const router = useRouter()

// 使用 storeToRefs 拿資料，這樣資料變動時畫面才會跟著變
const { myItineraries, drafts, featuredItineraries, partnerItineraries } = storeToRefs(myItineraryStore)

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)
const activeTab = ref('my')

const tabs = [
  { id: 'my', label: '我的行程' },
  { id: 'featured', label: '精選行程' },
  { id: 'partner', label: '找旅伴' },
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
    days: [{ day: 1, date: '', activities: [] }],
    packingList: [
      { category: '證件', items: [] },
      { category: '衣物', items: [] },
      { category: '電子產品', items: [] },
    ],
  }
  isDetailModalOpen.value = true
}

// 開啟草稿
const openDraft = (draft) => {
  // 判斷草稿類型，如果是行程草稿就打開編輯
  if ((draft.type === 'my_itinerary' || draft.type === 'itinerary') && (draft.data || draft.rawItinerary)) {
    // 兼容兩種草稿結構
    const dataToLoad = draft.data || draft.rawItinerary
    selectedItinerary.value = JSON.parse(JSON.stringify(dataToLoad))
    isDetailModalOpen.value = true
  } else {
    alert(`這是 ${draft.typeLabel} 的草稿，請至 ${draft.typeLabel === '找旅伴' ? '找旅伴頁面' : '討論區'} 編輯。`)
  }
}

// 處理「暫存草稿」
const handleSaveDraft = (draftItinerary) => {
  // 呼叫 Store 裡面的 addDraft
  myItineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '我的行程',
    title: draftItinerary.title || '(未命名行程)',
    content: `日期: ${draftItinerary.startDate || '?'} ~ ${draftItinerary.endDate || '?'}`,
    rawItinerary: draftItinerary // 把整包資料存起來
  })

  isDetailModalOpen.value = false
}

// 處理儲存 (發布/更新行程)
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

const handleFeaturedRate = ({ id, rating, comment }) => {
  myItineraryStore.updateFeaturedRating({ id, rating, comment })
}

const handleFeaturedClear = (id) => {
  myItineraryStore.clearFeaturedRating(id)
}

const handlePartnerUpdate = ({ id, comment, reviewLabel }) => {
  myItineraryStore.updatePartnerItinerary({ id, comment, reviewLabel })
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

      <!-- 標籤頁籤容器 -->
      <div class="bg-white rounded-xl border-4 border-primary shadow-primary-tall p-2">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="w-full px-4 py-3 rounded-lg font-semibold transition"
            :class="
              activeTab === tab.id
                ? 'bg-primary text-white border-2 border-primary'
                : 'bg-white text-secondary-600'
            "
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 根據 activeTab 切換顯示內容 -->
      <MyItineraryTab
        v-if="activeTab === 'my'"
        :itineraries="myItineraries"
        @open="openItineraryDetail"
        @add="openAddItineraryModal"
      />
      <FeaturedItineraryTab
        v-if="activeTab === 'featured'"
        :itineraries="featuredItineraries"
        @rate="handleFeaturedRate"
        @clear="handleFeaturedClear"
      />
      <FindPartnerTab
        v-if="activeTab === 'partner'"
        :itineraries="partnerItineraries"
        @update="handlePartnerUpdate"
      />
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
