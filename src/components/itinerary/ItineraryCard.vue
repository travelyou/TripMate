<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Bookmark as BookmarkIcon,
  Heart as HeartIcon,
  DollarSign as DollarSignIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
} from 'lucide-vue-next'

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
    default: () => ({}),
  },
})

const userStore = useUserStore()
const emit = defineEmits(['open-detail', 'open-share'])

const itemData = computed(() => ({
  id: props.itinerary.id,
  type: 'itinerary',
  title: props.itinerary.title,
  coverImage: props.itinerary.coverImage,
  price: props.itinerary.price,
  agencyName: props.itinerary.agencyName,
  durationDays: props.itinerary.durationDays,
  destinations: props.itinerary.destinations,
  totalViews: props.itinerary.totalViews,
  totalSaves: props.itinerary.totalSaves,
  likes: props.itinerary.likes,
  comments: props.itinerary.comments,
}))

const formatPrice = (price) => {
  if (price === undefined || price === null) return 'NT$ 0'
  return price
    .toLocaleString('en-US', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    .replace('TWD', 'NT$')
}
</script>

<template>
  <div
    class="pixel-card bg-white overflow-hidden cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] duration-150"
  >
    <div
      class="relative w-full h-48 md:h-52 overflow-hidden bg-gray-100"
      @click="emit('open-detail', props.itinerary, false)"
    >
      <img
        v-if="props.itinerary.coverImage"
        :src="props.itinerary.coverImage"
        :alt="props.itinerary.title || '行程圖片'"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
        無圖片
      </div>

      <div
        v-if="props.itinerary.isFeatured"
        class="absolute top-2 right-2 bg-yellow-500 text-gray-900 font-black text-xs px-2 py-1 pixel-card-mini"
      >
        FEATURED
      </div>

      <div
        class="absolute bottom-2 left-2 bg-indigo-600 text-white font-black text-sm px-3 py-1 rounded-full flex items-center shadow-lg"
      >
        <DollarSignIcon class="w-4 h-4 mr-0.5" />
        <span>{{ formatPrice(props.itinerary.price) }}</span>
      </div>
    </div>

    <div class="p-4 flex flex-col space-y-3">
      <div
        v-if="props.itinerary.agencyName"
        class="text-xs font-bold text-orange-600 tracking-wider"
      >
        由 {{ props.itinerary.agencyName }} 服務
      </div>

      <h3
        class="text-lg font-black text-gray-900 line-clamp-2 hover:text-orange-500 transition"
        @click="emit('open-detail', props.itinerary, false)"
      >
        {{ props.itinerary.title || '未命名行程' }}
      </h3>

      <div class="flex items-center space-x-4 text-sm text-gray-600">
        <div class="flex items-center space-x-1">
          <CalendarIcon class="w-4 h-4 text-green-500" />
          <span>{{ props.itinerary.durationDays || 0 }} 天</span>
        </div>
        <div class="flex items-center space-x-1">
          <MapPinIcon class="w-4 h-4 text-red-500" />
          <span class="font-bold line-clamp-1">
            {{ props.itinerary.destinations?.join('...') || '地點未定' }}
          </span>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 pt-3">
        <div class="flex items-center space-x-4 text-xs text-gray-500">
          <button
            class="flex items-center space-x-1 transition group"
            :class="userStore.isFavorite(itemData) ? 'text-red-500' : 'hover:text-red-500'"
            @click.stop="userStore.toggleFavorite(itemData)"
          >
            <HeartIcon
              class="w-4 h-4 transition-transform group-active:scale-125"
              :class="{ 'fill-current': userStore.isFavorite(itemData) }"
            />
            <span>{{
              (props.itinerary.likes || 0) + (userStore.isFavorite(itemData) ? 1 : 0)
            }}</span>
          </button>

          <button
            class="flex items-center space-x-1 transition group"
            :class="userStore.isCollected(itemData) ? 'text-yellow-500' : 'hover:text-yellow-600'"
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
              (props.itinerary.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
            }}</span>
          </button>
        </div>

        <div class="flex items-center space-x-4 text-gray-500">
          <button
            class="flex items-center space-x-1 hover:text-indigo-600 transition"
            @click.stop="emit('open-detail', props.itinerary, true)"
          >
            <MessageCircleIcon class="w-4 h-4" />
            <span>{{ props.itinerary.comments ? props.itinerary.comments.length : 0 }}</span>
          </button>

          <button
            class="flex items-center space-x-1 hover:text-gray-600 transition"
            @click.stop="emit('open-share', props.itinerary.id)"
          >
            <Repeat2Icon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}

.pixel-card-mini {
  border: 2px solid #374151;
  box-shadow: 2px 2px 0px 0px rgba(55, 65, 81, 0.5);
}
</style>
