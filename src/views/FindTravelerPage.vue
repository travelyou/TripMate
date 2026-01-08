<script setup>
import { ref } from 'vue'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import { useTravelersStore } from '@/stores/travelers'
import TravelerCard from '@/components/posts/TravelerCard.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import TravelerDetailModal from '@/components/modals/TravelerDetailModal.vue'

const travelersStore = useTravelersStore()

const isPostingModalOpen = ref(false)

const isDetailModalOpen = ref(false)
const selectedTraveler = ref(null)
const shouldScrollToComments = ref(false)

const openTravelerDetail = (traveler, focusComment = false) => {
  selectedTraveler.value = traveler
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closeTravelerDetail = () => {
  isDetailModalOpen.value = false
  selectedTraveler.value = null
  shouldScrollToComments.value = false
}

const filterOptions = ref(['全部', '招募中', '已額滿', '單人遊', '團體遊'])
const activeFilter = ref('全部')
</script>

<template>
  <div class="p-4 overflow-x-hidden">
    <div class="w-full">
      <div class="bg-primary p-5 rounded-xl mb-6 mt-4 shadow-[4px_8px_0px_0px_rgba(7,52,76,0.25)]">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-secondary-50 flex items-center">
            <UsersIcon class="w-6 h-6 mr-3 text-white" />
            找旅伴
          </h1>
          <button
            class="bg-white text-primary px-5 py-2 rounded-lg font-bold hover:bg-secondary-800 transition flex items-center"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            發起招募
          </button>
        </div>
      </div>

      <div class="p-4 bg-white mb-6 space-y-4 border-4 border-primary shadow-[4px_8px_0px_0px_rgba(7,52,76,0.25)] rounded-xl">
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-secondary-800 shadow-[2px_2px_0px_0px_rgba(7,52,76,1)]',
              activeFilter === filter
                ? 'bg-primary text-secondary-50'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 🟢 更新點擊事件 -->
        <TravelerCard
          v-for="traveler in travelersStore.recommendations"
          :key="traveler.id"
          :traveler="traveler"
          @click="openTravelerDetail(traveler, false)"
        />
      </div>
    </div>
  </div>

  <PostingChoiceModal v-if="isPostingModalOpen" @close="isPostingModalOpen = false" />

  <!-- 🟢 使用新的 TravelerDetailModal -->
  <TravelerDetailModal
    v-if="isDetailModalOpen"
    :traveler="selectedTraveler"
    :scroll-to-comments="shouldScrollToComments"
    @close="closeTravelerDetail"
  />
</template>
