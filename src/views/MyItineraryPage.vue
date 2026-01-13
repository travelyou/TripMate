<script setup>
import { ref } from 'vue'
<<<<<<< HEAD
import { storeToRefs } from 'pinia' //  1. 引入這個確保響應性
import { Briefcase as BriefcaseIcon } from 'lucide-vue-next'
=======
import { storeToRefs } from 'pinia'
import {
  Calendar as CalendarIcon,
  FolderOpen as FolderIcon,
  Plus as PlusIcon,
  Briefcase as BriefcaseIcon,
} from 'lucide-vue-next'
>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
import { useMyItineraryStore } from '@/stores/myItinerary'
import MyItineraryDetailModal from '@/components/modals/MyItineraryDetailModal.vue'
import MyItineraryTab from '@/components/itinerary-tabs/MyItineraryTab.vue'
import FeaturedItineraryTab from '@/components/itinerary-tabs/FeaturedItineraryTab.vue'
import FindPartnerTab from '@/components/itinerary-tabs/FindPartnerTab.vue'

const myItineraryStore = useMyItineraryStore()

<<<<<<< HEAD
//  2. 使用 storeToRefs 拿資料，這樣資料變動時畫面才會跟著變
const { myItineraries, featuredItineraries, partnerItineraries } = storeToRefs(myItineraryStore)
=======
const { myItineraries, drafts } = storeToRefs(myItineraryStore)
>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f

const isDetailModalOpen = ref(false)
const selectedItinerary = ref(null)
const activeTab = ref('my')

const tabs = [
  { id: 'my', label: '我的行程' },
  { id: 'featured', label: '精選行程' },
  { id: 'partner', label: '找旅伴' },
]

// 開啟行程詳情 (編輯)
const openItineraryDetail = (itinerary) => {
  // 深拷貝一份，避免直接修改到原始資料
  selectedItinerary.value = JSON.parse(JSON.stringify(itinerary))
  isDetailModalOpen.value = true
}

// 開啟新增行程 (空白)
const openAddItineraryModal = () => {
  selectedItinerary.value = {
    id: Date.now(),
    title: '',
    startDate: '',
    endDate: '',
    status: 'planning',
<<<<<<< HEAD
    // ?? 3. 預設給一個 Day 1，不然組員的彈窗可能會報錯
=======

>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
    days: [{ day: 1, date: '', activities: [] }],
    packingList: [
      { category: '證件', items: [] },
      { category: '衣物', items: [] },
      { category: '電子產品', items: [] },
    ],
  }
  isDetailModalOpen.value = true
}

<<<<<<< HEAD
=======
// 開啟草稿
const openDraft = (draft) => {
  // 判斷草稿類型，如果是行程草稿就打開編輯
  if (
    (draft.type === 'my_itinerary' || draft.type === 'itinerary') &&
    (draft.data || draft.rawItinerary)
  ) {
    // 兼容兩種草稿結構 (你原本寫的 & 我之前教你的)
    const dataToLoad = draft.data || draft.rawItinerary
    selectedItinerary.value = JSON.parse(JSON.stringify(dataToLoad))
    isDetailModalOpen.value = true
  } else {
    alert(
      `這是 ${draft.typeLabel} 的草稿，請至 ${draft.typeLabel === '找旅伴' ? '找旅伴頁面' : '討論區'} 編輯。`,
    )
  }
}

// 處理「暫存草稿」
const handleSaveDraft = (draftItinerary) => {
  // 呼叫 Store 裡面的 addDraft (這是我們上一步新增的功能)
  myItineraryStore.addDraft({
    type: 'itinerary',
    typeLabel: '我的行程',
    title: draftItinerary.title || '(未命名行程)',
    content: `日期: ${draftItinerary.startDate || '?'} ~ ${draftItinerary.endDate || '?'}`,
    rawItinerary: draftItinerary, // 把整包資料存起來
  })

  isDetailModalOpen.value = false
}

>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
// 處理儲存 (發布/更新行程)
const handleSaveItinerary = (updatedItinerary) => {
  if (!updatedItinerary.title.trim()) updatedItinerary.title = '新旅程'

  // 1. 檢查是「修改」還是「新增」
  const index = myItineraryStore.myItineraries.findIndex((i) => i.id === updatedItinerary.id)

  if (index !== -1) {
    // 如果是舊的，就更新它
    myItineraryStore.myItineraries[index] = updatedItinerary
  } else {
    // 如果是新的，就放到最前面
    myItineraryStore.myItineraries.unshift(updatedItinerary)
  }

<<<<<<< HEAD
=======
  // 2. 從草稿夾移除 (如果這個行程原本是草稿)
  // (這裡簡單過濾掉 id 相同的草稿)
  const draftIndex = myItineraryStore.drafts.findIndex(
    (d) =>
      (d.data && d.data.id === updatedItinerary.id) ||
      (d.rawItinerary && d.rawItinerary.id === updatedItinerary.id),
  )

  if (draftIndex !== -1) {
    myItineraryStore.drafts.splice(draftIndex, 1)
  }

>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
  isDetailModalOpen.value = false
}

const handleDeleteItinerary = (id) => {
  if (confirm('確定要刪除這個行程嗎？')) {
    myItineraryStore.deleteItinerary(id)
    isDetailModalOpen.value = false
  }
}

<<<<<<< HEAD
const handleFeaturedRate = ({ id, rating, comment }) => {
  myItineraryStore.updateFeaturedRating({ id, rating, comment })
}

const handleFeaturedClear = (id) => {
  myItineraryStore.clearFeaturedRating(id)
}

const handlePartnerUpdate = ({ id, comment, reviewLabel }) => {
  myItineraryStore.updatePartnerItinerary({ id, comment, reviewLabel })
=======
const getTagColor = (type) => {
  if (type === 'discussion') return 'bg-primary-600 text-white border-primary-700'
  if (type === 'traveler') return 'bg-primary-500 text-white border-primary-600'
  if (type === 'my_itinerary' || type === 'itinerary')
    return 'bg-primary-700 text-white border-primary-800'
  return 'bg-secondary-500 text-white'
>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
}
</script>

<template>
  <div class="p-4 lg:mx-12">
    <div class="grid grid-cols-1 gap-6 items-start pt-4">
      <div class="bg-primary p-5 rounded-xl shadow-primary-tall flex items-center">
        <h1 class="text-2xl font-black text-secondary-50 flex items-center gap-3">
          <BriefcaseIcon class="w-6 h-6 text-secondary-50" />
          我的行程
        </h1>
      </div>

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
<<<<<<< HEAD
            {{ tab.label }}
          </button>
=======
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
>>>>>>> 677087ecd568f0a61fb0853d0b3ef9aff8b3031f
        </div>
      </div>

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

    <MyItineraryDetailModal
      v-if="isDetailModalOpen"
      :itinerary="selectedItinerary"
      @close="isDetailModalOpen = false"
      @save="handleSaveItinerary"
      @delete="handleDeleteItinerary"
    />
  </div>
</template>
