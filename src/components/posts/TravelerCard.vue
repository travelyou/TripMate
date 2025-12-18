<script setup>
import {
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  MessageCircle as MessageCircleIcon,
  Users as UsersIcon,
} from 'lucide-vue-next'
import { defineProps } from 'vue'

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

// 根據招募狀態返回不同的樣式
const getStatusClasses = (status) => {
  switch (status) {
    case '招募中':
      return 'bg-green-500 text-white border-green-700'
    case '已額滿':
      return 'bg-red-500 text-white border-red-700'
    case '已出發':
      return 'bg-gray-500 text-white border-gray-700'
    default:
      return 'bg-yellow-500 text-gray-900 border-yellow-700'
  }
}
</script>

<template>
  <div class="pixel-card-traveler p-5 bg-[#fffef7] transition relative cursor-pointer">
    <div
      :class="getStatusClasses(traveler.status)"
      class="absolute top-0 right-0 px-3 py-1 font-bold text-xs rounded-bl-lg border-b-4 border-l-4 z-10"
    >
      {{ traveler.status }}
    </div>

    <div class="flex flex-col lg:flex-row gap-4">
      <div
        class="w-full lg:w-1/3 h-40 lg:h-auto shrink-0 rounded-lg overflow-hidden border-2 border-gray-200"
      >
        <img :src="traveler.image" :alt="traveler.title" class="w-full h-full object-cover" />
      </div>

      <div class="flex-1 flex flex-col justify-between">
        <div class="flex items-center space-x-3 mb-2">
          <img
            :src="traveler.avatar"
            class="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
          />
          <div>
            <div class="flex items-center space-x-1">
              <span class="font-bold text-sm text-gray-800">{{ traveler.author }}</span>
              <span
                class="text-xs font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full"
              >
                {{ traveler.spiritAnimal }}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-bold text-gray-900 mb-2 hover:text-indigo-600">
            {{ traveler.title }}
          </h3>
          <p class="text-gray-600 text-sm mb-3 line-clamp-2">
            {{ traveler.content }}
          </p>
        </div>

        <div class="space-y-2 text-sm text-gray-700">
          <div v-if="traveler.tags && traveler.tags.length" class="flex flex-wrap gap-1">
            <span
              v-for="tag in traveler.tags"
              :key="tag"
              class="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center space-x-4">
            <span class="flex items-center">
              <MapPinIcon class="w-4 h-4 mr-1 text-red-500" />
              {{ traveler.location }}
            </span>
            <span class="flex items-center">
              <CalendarIcon class="w-4 h-4 mr-1 text-amber-500" />
              {{ traveler.date }}
            </span>
            <span class="flex items-center text-indigo-500">
              <MessageCircleIcon class="w-4 h-4 mr-1" />
              {{ traveler.comments }}
            </span>
          </div>

          <div class="flex justify-between items-end pt-2 border-t border-gray-100">
            <div class="flex items-center text-gray-800 font-bold">
              <UsersIcon class="w-5 h-5 mr-1 text-blue-500" />
              招募人數：
              <span class="text-lg text-blue-600 ml-1">{{ traveler.people }}</span>
            </div>

            <button
              :disabled="traveler.status === '已額滿'"
              :class="
                traveler.status === '已額滿'
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              "
              class="px-4 py-2 rounded-full font-bold transition text-sm shadow-md"
            >
              聯繫作者
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-card-traveler {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}
.grid > .pixel-card-traveler:hover {
  transform: translateX(3px) translateY(3px);
}
</style>
