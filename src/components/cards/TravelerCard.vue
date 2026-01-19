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

// ★ 新增：純文字預覽邏輯 (剝除 HTML 標籤)
const previewContent = computed(() => {
  if (!props.traveler.content) return ''
  let content = props.traveler.content
  // 簡單剝除 HTML 標籤
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  return tempDiv.textContent || tempDiv.innerText || ''
})

const getStatusClasses = (status) => {
  switch (status) {
    case '招募中':
      return 'bg-primary-600 text-white'
    case '已額滿':
      return 'bg-primary-700 text-white'
    case '已出發':
      return 'bg-secondary-500 text-white'
    default:
      return 'bg-primary-100 text-primary-800'
  }
}
</script>

<template>
  <div class="h-full" @click="$emit('open-detail', traveler)">
    <div
      class="bg-white transition relative cursor-pointer rounded-xl border border-secondary-200 shadow hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] h-full flex flex-col"
    >
      <div
        :class="getStatusClasses(traveler.status)"
        class="absolute top-0 right-0 px-3 py-1 font-bold text-xs rounded-bl-xl rounded-tr-xl border-b-2 border-l-2 border-primary-200 shadow-primary-sm z-10"
      >
        {{ traveler.status }}
      </div>

      <div class="flex flex-col gap-3 h-full">
        <div
          class="relative shrink-0 w-full overflow-hidden rounded-xl aspect-[3/4] lg:aspect-auto lg:h-[36rem]"
        >
          <img
            :src="traveler.image"
            :alt="traveler.title"
            class="w-full h-full object-cover"
            :style="{ objectPosition: `center ${traveler.banner_position_y || 50}%` }"
          />

          <div
            class="absolute inset-x-0 bottom-0 h-[45%] px-4 pb-4 pt-10 text-white bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end"
          >
            <div>
              <div class="flex items-center space-x-3 mb-2">
                <img
                  :src="traveler.avatar"
                  class="w-8 h-8 rounded-full object-cover border-2 border-white/80"
                />
                <div>
                  <div class="flex items-center space-x-1">
                    <span class="font-bold text-sm text-white">{{ traveler.author }}</span>
                    <span
                      class="text-xs font-semibold text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full"
                    >
                      {{ traveler.spiritAnimal }}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="text-xl font-bold mb-1 line-clamp-1">
                  {{ traveler.title }}
                </h3>
                <p class="text-sm text-white/85 mb-2 line-clamp-2 sm:line-clamp-1 xl:line-clamp-2">
                  {{ previewContent }}
                </p>
              </div>
            </div>

            <div class="space-y-2 text-sm text-white/85">
              <div class="flex flex-wrap gap-1 overflow-hidden line-clamp-1 min-h-[1.25rem]">
                <span
                  v-for="tag in traveler.tags || []"
                  :key="tag"
                  class="text-xs font-medium text-white/90 bg-white/15 px-2 py-0.5 rounded-full hover:bg-white/25 transition inline-flex items-center h-5 max-w-[6.5rem] truncate"
                >
                  #{{ tag }}
                </span>
              </div>

              <div class="flex items-center flex-wrap gap-4 mt-2 min-w-0">
                <span class="flex items-center max-w-[10rem] truncate">
                  <MapPinIcon class="w-4 h-4 mr-1 text-white/80" />
                  {{ traveler.location }}
                </span>
                <span class="flex items-center">
                  <CalendarIcon class="w-4 h-4 mr-1 text-white/70" />
                  {{ traveler.date }}
                </span>

                <button
                  class="flex items-center group transition"
                  :class="
                    userStore.isFavorite(itemData)
                      ? 'text-red-300'
                      : 'text-white/70 hover:text-red-300'
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
                      ? 'text-emerald-300'
                      : 'text-white/70 hover:text-emerald-300'
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

                <span class="flex items-center text-white/90 ml-auto md:ml-0">
                  <MessageCircleIcon class="w-4 h-4 mr-1" />
                  {{ traveler.comments || 0 }}
                </span>
              </div>

              <div class="flex justify-between items-end pt-2 border-t border-white/20">
                <div class="flex items-center font-bold text-white">
                  <UsersIcon class="w-5 h-5 mr-1 text-white/85" />
                  招募人數：
                  <span class="text-lg text-white ml-1">{{ traveler.people }}</span>
                </div>

                <button
                  :disabled="traveler.status === '已額滿'"
                  :class="
                    traveler.status === '已額滿'
                      ? 'bg-white/20 text-white/60 cursor-not-allowed'
                      : 'bg-white text-primary-700 hover:bg-white/90'
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
    </div>
  </div>
</template>
