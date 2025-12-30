<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  MessageCircle as MessageCircleIcon,
  Users as UsersIcon,
  Heart as HeartIcon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

const userStore = useUserStore()

const itemData = computed(() => ({
  id: props.traveler.id,
  type: 'traveler', 
  title: props.traveler.title,
  content: props.traveler.content,
  image: props.traveler.image,
  author: props.traveler.author,
  avatar: props.traveler.avatar,
  location: props.traveler.location,
  date: props.traveler.date,
  status: props.traveler.status,
  people: props.traveler.people,
  tags: props.traveler.tags,
  comments: props.traveler.comments,
}))

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

          <div class="flex items-center flex-wrap gap-4 mt-2">
            <span class="flex items-center">
              <MapPinIcon class="w-4 h-4 mr-1 text-red-500" />
              {{ traveler.location }}
            </span>
            <span class="flex items-center">
              <CalendarIcon class="w-4 h-4 mr-1 text-amber-500" />
              {{ traveler.date }}
            </span>

            <button
              class="flex items-center group transition"
              :class="
                userStore.isFavorite(itemData) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              "
              @click.stop="userStore.toggleFavorite(itemData)"
            >
              <HeartIcon
                class="w-4 h-4 mr-1 transition-transform group-active:scale-125"
                :class="{ 'fill-current': userStore.isFavorite(itemData) }"
              />
            </button>

            <button
              class="flex items-center space-x-1 transition group"
              :class="
                userStore.isCollected(itemData)
                  ? 'text-yellow-500'
                  : 'text-gray-400 hover:text-yellow-600'
              "
              @click.stop="
                userStore.isCollected(itemData)
                  ? userStore.removeFromCollection(itemData)
                  : userStore.openCollectionModal(itemData)
              "
            >
              <BookmarkIcon
                class="w-4 h-4 transition-transform group-active:scale-125"
                :class="{ 'fill-current': userStore.isCollected(itemData) }"
              />
              <span>{{
                (traveler.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
              }}</span>
            </button>

            <span class="flex items-center text-indigo-500 ml-auto md:ml-0">
              <MessageCircleIcon class="w-4 h-4 mr-1" />
              {{ traveler.comments || 0 }}
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
