<script setup>
import { ref } from 'vue'
import { Plus as PlusIcon, Users as UsersIcon } from 'lucide-vue-next'
import { useTravelersStore } from '@/stores/travelers'
import TravelerCard from '@/components/posts/TravelerCard.vue'
import PostingChoiceModal from '@/components/modals/PostingChoiceModal.vue'
import PostDetailModal from '@/components/modals/PostDetailModal.vue'

const travelersStore = useTravelersStore()

const isPostingModalOpen = ref(false)

const isDetailModalOpen = ref(false)
const selectedPost = ref(null)
const shouldScrollToComments = ref(false)

const openPostDetailModal = (post, focusComment = false) => {
  selectedPost.value = post
  shouldScrollToComments.value = focusComment
  isDetailModalOpen.value = true
}

const closePostDetailModal = () => {
  isDetailModalOpen.value = false
  selectedPost.value = null
  shouldScrollToComments.value = false
}

const filterOptions = ref(['全部', '招募中', '已額滿', '單人遊', '團體遊'])
const activeFilter = ref('全部')
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-hidden">
    <div class="w-full">
      <div
        class="bg-green-100 p-5 rounded-xl mb-6 mt-4 border-4 border-green-300 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.5)]"
      >
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-black text-amber-900 flex items-center">
            <UsersIcon class="w-7 h-7 mr-3 text-red-500 fill-red-100" />
            找旅伴
          </h1>
          <button
            class="bg-green-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-600 transition shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex items-center border-4 border-gray-800"
            @click="isPostingModalOpen = true"
          >
            <PlusIcon class="w-5 h-5 mr-1" />
            發起招募
          </button>
        </div>
      </div>

      <div
        class="mb-8 p-4 bg-white/90 border-4 border-amber-700 shadow-[4px_4px_0px_0px_rgba(139,111,71,0.2)]"
      >
        <div class="flex flex-wrap gap-2 text-sm">
          <button
            v-for="filter in filterOptions"
            :key="filter"
            :class="[
              'px-3 py-1 rounded-full font-bold transition border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]',
              activeFilter === filter
                ? 'bg-red-400 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TravelerCard
          v-for="traveler in travelersStore.recommendations"
          :key="traveler.id"
          :traveler="traveler"
          @click="openPostDetailModal(traveler, false)"
        />
      </div>
    </div>
  </div>

  <PostingChoiceModal v-if="isPostingModalOpen" @close="isPostingModalOpen = false" />

  <PostDetailModal
    v-if="isDetailModalOpen"
    :post="selectedPost"
    :scroll-to-comments="shouldScrollToComments"
    @close="closePostDetailModal"
  />
</template>
