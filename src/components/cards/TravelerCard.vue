<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  MessageCircle as MessageCircleIcon,
  Users as UsersIcon,
  Heart as HeartIcon,
  Bookmark as BookmarkIcon,
} from 'lucide-vue-next'

const router = useRouter()

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

defineEmits(['open-detail'])

const userStore = useUserStore()

const handleAvatarClick = (e) => {
  e.stopPropagation()
  e.preventDefault()

  const authorUid = props.traveler.author_uid || props.traveler.authorUid
  const vendorId = props.traveler.vendor_id || props.traveler.vendorId

  if (vendorId) {
    router.push({ path: `/vendor/${vendorId}`, replace: false })
    return
  }

  if (authorUid) {
    router.push({ path: `/profile/${authorUid}`, replace: false })
    return
  }
}

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
      class="p-5 bg-white transition relative cursor-pointer rounded-2xl border border-secondary-200 shadow hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] h-full flex flex-col"
    >
      <div
        :class="getStatusClasses(traveler.status)"
        class="absolute top-0 right-0 px-3 py-1 font-bold text-xs rounded-bl-xl rounded-tr-xl border-b-2 border-l-2 border-primary-200 shadow-primary-sm z-10"
      >
        {{ traveler.status }}
      </div>

      <div class="flex flex-col lg:flex-row gap-4 h-full">
        <div
          class="w-full lg:w-1/3 shrink-0 rounded-xl overflow-hidden border-2 border-secondary-200"
        >
          <img :src="traveler.image" :alt="traveler.title" class="w-full h-full object-cover" />
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center space-x-3 mb-2">
              <img
                :src="traveler.avatar"
                class="w-8 h-8 rounded-full object-cover border-2 border-secondary-200 cursor-pointer hover:ring-2 hover:ring-primary-500 transition"
                @click.stop="handleAvatarClick"
              />
              <div>
                <div class="flex items-center space-x-1">
                  <span
                    class="font-bold text-sm text-secondary-900 cursor-pointer hover:text-primary-600 transition"
                    @click.stop="handleAvatarClick"
                  >{{ traveler.author }}</span>
                  <span
                    class="text-xs font-semibold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-full"
                  >
                    {{ traveler.spiritAnimal }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3
                class="text-xl font-bold text-secondary-900 mb-2 hover:text-primary-600 line-clamp-1"
              >
                {{ traveler.title }}
              </h3>
              <p class="text-secondary-600 text-sm mb-3 line-clamp-2">
                {{ traveler.content }}
              </p>
            </div>
          </div>

          <div class="space-y-2 text-sm text-secondary-700">
            <div class="flex flex-wrap gap-1 overflow-hidden line-clamp-1 min-h-[1.25rem]">
              <span
                v-for="tag in traveler.tags || []"
                :key="tag"
                class="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full hover:bg-primary-200 transition inline-flex items-center h-5 max-w-[6.5rem] truncate"
              >
                #{{ tag }}
              </span>
            </div>

            <div class="flex items-center flex-wrap gap-4 mt-2 min-w-0">
              <span class="flex items-center max-w-[10rem] truncate">
                <MapPinIcon class="w-4 h-4 mr-1 text-primary-500" />
                {{ traveler.location }}
              </span>
              <span class="flex items-center">
                <CalendarIcon class="w-4 h-4 mr-1 text-secondary-500" />
                {{ traveler.date }}
              </span>

              <button
                class="flex items-center group transition"
                :class="
                  userStore.isFavorite(itemData)
                    ? 'text-accent-600'
                    : 'text-secondary-400 hover:text-accent-600'
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
                    ? 'text-primary-600'
                    : 'text-secondary-400 hover:text-primary-600'
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

              <span class="flex items-center text-primary-600 ml-auto md:ml-0">
                <MessageCircleIcon class="w-4 h-4 mr-1" />
                {{ traveler.comments || 0 }}
              </span>
            </div>

            <div class="flex justify-between items-end pt-2 border-t border-secondary-100">
              <div class="flex items-center text-secondary-900 font-bold">
                <UsersIcon class="w-5 h-5 mr-1 text-primary-500" />
                招募人數：
                <span class="text-lg text-blue-600 ml-1">{{ traveler.people }}</span>
              </div>

              <button
                :disabled="traveler.status === '已額滿'"
                :class="
                  traveler.status === '已額滿'
                    ? 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
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
</template>
