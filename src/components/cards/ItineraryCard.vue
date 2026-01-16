<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Bookmark as BookmarkIcon,
  Heart as HeartIcon,
  DollarSign as DollarSignIcon,
  MessageCircle as MessageCircleIcon,
  Repeat2 as Repeat2Icon,
  Building as BuildingIcon,
} from 'lucide-vue-next'

const router = useRouter()

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
  },
})

const userStore = useUserStore()
const emit = defineEmits(['open-detail', 'open-share'])

const handleAgencyClick = (e) => {
  e.stopPropagation()
  e.preventDefault()
  const vendorId = props.itinerary.vendor_id || props.itinerary.vendorId
  const authorUid = props.itinerary.author_uid || props.itinerary.authorUid

  if (vendorId) {
    router.push({ path: `/vendor/${vendorId}`, replace: false })
  } else if (authorUid) {
    router.push({ path: `/profile/${authorUid}`, replace: false })
  }
}

const itemData = computed(() => ({
  id: props.itinerary.id,
  type: 'itinerary',
  title: props.itinerary.title,
  coverImage: props.itinerary.coverImage,
  price: props.itinerary.price,
}))

const formatPrice = (price) => {
  if (price === undefined || price === null) return '洽詢'
  return `NT$ ${Number(price).toLocaleString()}`
}

const displayLocation = computed(() => {
  const dest = props.itinerary.destinations || props.itinerary.location
  if (Array.isArray(dest)) {
    return dest.join('、')
  }
  return dest || '未定地點'
})

const displayDate = computed(() => {
  const { start_date, end_date, durationDays } = props.itinerary

  if (start_date && end_date) {
    const d1 = new Date(start_date)
    const d2 = new Date(end_date)

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return `${durationDays || 1} 天`
    }

    const pad = (n) => n.toString().padStart(2, '0')

    const y1 = d1.getFullYear()
    const m1 = pad(d1.getMonth() + 1)
    const day1 = pad(d1.getDate())

    const y2 = d2.getFullYear()
    const m2 = pad(d2.getMonth() + 1)
    const day2 = pad(d2.getDate())

    if (y1 === y2 && m1 === m2 && day1 === day2) {
      return `${y1}/${m1}/${day1}`
    }

    if (y1 === y2) {
      return `${y1}/${m1}/${day1} - ${m2}/${day2}`
    }

    return `${y1}/${m1}/${day1} - ${y2}/${m2}/${day2}`
  }

  return `${durationDays || 1} 天`
})
</script>

<template>
  <div
    class="overflow-hidden cursor-pointer transition hover:scale-[1.02] active:scale-[0.98] duration-150 rounded-2xl border border-secondary-200 shadow-md bg-white group flex flex-col h-full"
    @click="emit('open-detail', props.itinerary, false)"
  >
    <div class="relative w-full aspect-[4/3] overflow-hidden bg-secondary-100">
      <img
        v-if="props.itinerary.coverImage"
        :src="props.itinerary.coverImage"
        :alt="props.itinerary.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-secondary-400 bg-secondary-200"
      >
        <MapPinIcon class="w-12 h-12 opacity-50" />
      </div>

      <div
        class="absolute bottom-2 left-2 bg-primary-600/95 backdrop-blur-sm text-white font-black text-sm px-3 py-1.5 rounded-full flex items-center shadow-lg border border-white/20"
      >
        <DollarSignIcon class="w-3.5 h-3.5 mr-0.5" />
        <span>{{ formatPrice(props.itinerary.price) }}</span>
      </div>
    </div>

    <div class="p-4 flex flex-col flex-1">
      <div
        v-if="props.itinerary.agencyName"
        class="text-xs font-bold text-primary-600 tracking-wider cursor-pointer hover:text-primary-700 transition"
        @click.stop="handleAgencyClick"
      >
        <BuildingIcon class="w-3 h-3 mr-1" />
        {{ props.itinerary.agencyName }}
      </div>

      <h3
        class="text-lg font-black text-secondary-900 line-clamp-2 mb-3 group-hover:text-primary-600 transition"
      >
        {{ props.itinerary.title || '無標題' }}
      </h3>

      <div class="flex items-center space-x-4 text-sm text-secondary-600 mb-auto pb-4">
        <div class="flex items-center space-x-1 shrink-0">
          <CalendarIcon class="w-4 h-4 text-primary-500" />
          <span class="font-bold text-xs">{{ displayDate }}</span>
        </div>
        <div class="flex items-center space-x-1 truncate">
          <MapPinIcon class="w-4 h-4 text-primary-600 shrink-0" />
          <span class="truncate">{{ displayLocation }}</span>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-secondary-100 pt-3 mt-auto">
        <div class="flex items-center space-x-3 text-xs text-secondary-500">
          <button
            class="flex items-center space-x-1 transition p-1 rounded-md hover:bg-secondary-50"
            :class="userStore.isFavorite(itemData) ? 'text-accent-600' : 'hover:text-accent-600'"
            @click.stop="userStore.toggleFavorite(itemData)"
          >
            <HeartIcon
              class="w-4 h-4 transition-transform active:scale-125"
              :class="{ 'fill-current': userStore.isFavorite(itemData) }"
            />
            <span class="font-bold">{{
              (props.itinerary.likes || 0) + (userStore.isFavorite(itemData) ? 1 : 0)
            }}</span>
          </button>

          <button
            class="flex items-center space-x-1 transition p-1 rounded-md hover:bg-secondary-50"
            :class="userStore.isCollected(itemData) ? 'text-primary-600' : 'hover:text-primary-600'"
            @click.stop="
              userStore.isCollected(itemData)
                ? userStore.removeFromCollection(itemData)
                : userStore.openCollectionModal(itemData)
            "
          >
            <BookmarkIcon
              class="w-4 h-4 transition-transform active:scale-125"
              :class="{ 'fill-current': userStore.isCollected(itemData) }"
            />
            <span class="font-bold">{{
              (props.itinerary.totalSaves || 0) + (userStore.isCollected(itemData) ? 1 : 0)
            }}</span>
          </button>
        </div>

        <div class="flex items-center space-x-2 text-secondary-400">
          <button
            class="p-1.5 hover:bg-secondary-50 rounded-full hover:text-secondary-600 transition"
            @click.stop="emit('open-detail', props.itinerary, true)"
          >
            <MessageCircleIcon class="w-4 h-4" />
          </button>

          <button
            class="p-1.5 hover:bg-secondary-50 rounded-full hover:text-secondary-600 transition"
            @click.stop="emit('open-share', props.itinerary.id)"
          >
            <Repeat2Icon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
