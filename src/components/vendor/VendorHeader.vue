<script setup>
import { Star as StarIcon, Award as AwardIcon, Plus as PlusIcon } from 'lucide-vue-next'

defineProps({
  vendor: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open-review-modal', 'open-post-modal'])
</script>

<template>
  <div
    class="bg-white rounded-3xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start border-2 border-gray-100 shadow-sm mb-8"
  >
    <div class="relative shrink-0">
      <img
        :src="vendor.avatar"
        class="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md object-cover"
      />
      <div
        v-if="vendor.isVerified"
        class="absolute bottom-0 right-0 bg-blue-500 p-1 rounded-full border-2 border-white"
      >
        <AwardIcon class="w-4 h-4 text-white" />
      </div>
    </div>

    <div class="flex-1 w-full">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-wide">
            {{ vendor.name }}
          </h1>

          <button
            class="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full hover:bg-yellow-100 transition group"
            @click="emit('open-review-modal')"
          >
            <StarIcon class="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span class="font-bold text-gray-800">{{ vendor.rating }}</span>
            <span class="text-xs text-gray-500 group-hover:text-amber-700"
              >({{ vendor.reviewCount }}則評價)</span
            >
          </button>
        </div>

        <button
          @click="emit('open-post-modal')"
          class="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-full transition shadow-md text-sm font-bold"
        >
          <PlusIcon class="w-4 h-4" />
          新增行程
        </button>
      </div>

      <div class="bg-gray-50 rounded-xl p-4 text-gray-600 text-sm leading-relaxed">
        {{ vendor.description }}
      </div>
    </div>
  </div>
</template>
