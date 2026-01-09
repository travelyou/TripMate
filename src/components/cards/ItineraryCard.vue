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
    class="overflow-hidden cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] duration-150 rounded-2xl border-2 border-secondary-200 shadow-[4px_4px_0px_0px_rgba(7,52,76,0.2)]"
  >
    <div
      class="relative w-full h-48 md:h-52 overflow-hidden bg-secondary-100"
      @click="emit('open-detail', props.itinerary, false)"
    >
      <img
        v-if="props.itinerary.coverImage"
        :src="props.itinerary.coverImage"
        :alt="props.itinerary.title || '行程圖片'"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full bg-secondary-200 flex items-center justify-center text-secondary-400"
      >
        無圖片
      </div>

      <div
        v-if="props.itinerary.isFeatured"
        class="absolute top-2 right-2 bg-primary-100 text-primary-800 font-black text-xs px-2 py-1 border-2 border-primary-300 shadow-[2px_2px_0px_0px_rgba(7,52,76,0.35)]"
      >
        FEATURED
      </div>

      <div
        class="absolute bottom-2 left-2 bg-primary-600 text-white font-black text-sm px-3 py-1 rounded-full flex items-center shadow-lg"
      >
        <DollarSignIcon class="w-4 h-4 mr-0.5" />
        <span>{{ formatPrice(props.itinerary.price) }}</span>
      </div>
    </div>

    <div class="p-4 flex flex-col space-y-3">
      <div
        v-if="props.itinerary.agencyName"
        class="text-xs font-bold text-primary-600 tracking-wider"
      >
        由 {{ props.itinerary.agencyName }} 服務
      </div>

      <h3
        class="text-lg font-black text-secondary-900 line-clamp-2 hover:text-primary-600 transition"
        @click="emit('open-detail', props.itinerary, false)"
      >
        {{ props.itinerary.title || '未命名行程' }}
      </h3>

      <div class="flex items-center space-x-4 text-sm text-secondary-600">
        <div class="flex items-center space-x-1">
          <CalendarIcon class="w-4 h-4 text-primary-500" />
          <span>{{ props.itinerary.durationDays || 0 }} 天</span>
        </div>
        <div class="flex items-center space-x-1">
          <MapPinIcon class="w-4 h-4 text-primary-600" />
          <span class="font-bold line-clamp-1">
            {{ props.itinerary.destinations?.join('...') || '地點未定' }}
          </span>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-secondary-100 pt-3">
        <div class="flex items-center space-x-4 text-xs text-secondary-500">
          <button
            class="flex items-center space-x-1 transition group"
            :class="userStore.isFavorite(itemData) ? 'text-accent-600' : 'hover:text-accent-600'"
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
            :class="userStore.isCollected(itemData) ? 'text-primary-500' : 'hover:text-primary-600'"
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

        <div class="flex items-center space-x-4 text-secondary-500">
          <button
            class="flex items-center space-x-1 hover:text-primary-600 transition"
            @click.stop="emit('open-detail', props.itinerary, true)"
          >
            <MessageCircleIcon class="w-4 h-4" />
            <span>{{ props.itinerary.comments ? props.itinerary.comments.length : 0 }}</span>
          </button>

          <button
            class="flex items-center space-x-1 hover:text-secondary-600 transition"
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
/* Replaced pixel-card and pixel-card-mini with Tailwind classes in template */
</style>
