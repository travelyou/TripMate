<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  X as XIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Bookmark as BookmarkIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Map as MapIcon,
  Coffee as CoffeeIcon,
  Camera as CameraIcon,
  CheckSquare as CheckSquareIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { getItineraryById } from '@/api/itinerary'

const userStore = useUserStore()
const router = useRouter()

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
  },
  scrollToComments: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const activeTab = ref('itinerary')
// 初始資料使用列表傳進來的基本資訊，詳細資訊等待 API 補完
const localItineraryData = ref({ ...props.itinerary })
const activeDayIndex = ref(0)
const isLoadingDetails = ref(false)

// 整合資料結構
const itineraryDetails = computed(() => {
  // 如果後端回傳結構在 itinerary 物件下
  if (localItineraryData.value.itinerary && localItineraryData.value.itinerary.days) {
    return {
      days: localItineraryData.value.itinerary.days,
      packingList: localItineraryData.value.packingList || [],
    }
  }
  return { days: [], packingList: [] }
})

const activeDay = computed(() => {
  if (!itineraryDetails.value.days || itineraryDetails.value.days.length === 0)
    return { activities: [] }
  return itineraryDetails.value.days[activeDayIndex.value] || { activities: [] }
})

// 呼叫後端 API 獲取詳細資料
const fetchFullItineraryDetails = async () => {
  if (!props.itinerary.id) return

  isLoadingDetails.value = true
  try {
    const response = await getItineraryById(props.itinerary.id)
    if (response.success) {
      // 合併後端回傳的完整資料 (包含 itinerary_days 和 packing_lists)
      localItineraryData.value = { ...localItineraryData.value, ...response.data }
    }
  } catch (error) {
    console.error('抓取詳細資料失敗:', error)
  } finally {
    isLoadingDetails.value = false
  }
}

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'camera':
      return CameraIcon
    case 'coffee':
      return CoffeeIcon
    case 'map-pin':
      return MapPinIcon
    default:
      return MapIcon
  }
}

const formatPrice = (price) => {
  if (!price) return '洽詢'
  return `NT$ ${Number(price).toLocaleString()}`
}

onMounted(async () => {
  await fetchFullItineraryDetails()

  if (props.scrollToComments) {
    activeTab.value = 'comments'
  }
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[99] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border-2 border-primary overflow-hidden relative"
    >
      <button
        class="absolute top-4 right-4 z-20 bg-white border-2 border-primary p-2 rounded-full hover:bg-primary-50 transition shadow-primary-sm"
        @click="emit('close')"
      >
        <XIcon class="w-6 h-6" />
      </button>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="relative w-full h-72 overflow-hidden">
          <img
            :src="
              localItineraryData.coverImage ||
              localItineraryData.image ||
              'https://picsum.photos/800/400'
            "
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          <div
            class="absolute top-4 left-4 bg-primary-600 text-white px-4 py-2 font-bold text-lg rounded-full border-2 border-white shadow-lg flex items-center"
          >
            <DollarSignIcon class="w-5 h-5 mr-1" />
            {{ formatPrice(localItineraryData.price) }}
          </div>

          <div class="absolute bottom-4 left-4 text-white">
            <div class="flex items-center space-x-2 mb-1" v-if="localItineraryData.agencyName">
              <BuildingIcon class="w-4 h-4 text-primary-300" />
              <span class="font-bold text-primary-100 text-sm tracking-wider"
                >由 {{ localItineraryData.agencyName }} 提供</span
              >
            </div>
            <h1 class="text-3xl font-black text-white shadow-sm">
              {{ localItineraryData.title }}
            </h1>
          </div>
        </div>

        <div class="p-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
              <div class="flex items-center text-primary-600 mb-1">
                <MapPinIcon class="w-4 h-4 mr-1" />
                <span class="text-xs font-bold text-secondary-500">地點</span>
              </div>
              <div class="font-bold text-secondary-900 truncate">
                {{
                  Array.isArray(localItineraryData.destinations)
                    ? localItineraryData.destinations.join(',')
                    : localItineraryData.destinations || localItineraryData.location || '多個地點'
                }}
              </div>
            </div>

            <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
              <div class="flex items-center text-secondary-500 mb-1">
                <CalendarIcon class="w-4 h-4 mr-1" />
                <span class="text-xs font-bold text-secondary-500">天數</span>
              </div>
              <div class="font-bold text-secondary-900">
                {{ localItineraryData.durationDays || 1 }} 天
              </div>
            </div>

            <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
              <div class="flex items-center text-primary-500 mb-1">
                <UsersIcon class="w-4 h-4 mr-1" />
                <span class="text-xs font-bold text-secondary-500">瀏覽</span>
              </div>
              <div class="font-bold text-primary-600">{{ localItineraryData.totalViews || 0 }}</div>
            </div>

            <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-primary-sm">
              <div class="flex items-center text-accent-500 mb-1">
                <HeartIcon class="w-4 h-4 mr-1" />
                <span class="text-xs font-bold text-secondary-500">收藏</span>
              </div>
              <div class="font-bold text-secondary-900">
                {{ localItineraryData.totalSaves || 0 }}
              </div>
            </div>
          </div>

          <div
            v-if="localItineraryData.tags && localItineraryData.tags.length"
            class="flex flex-wrap gap-2 mb-6"
          >
            <span
              v-for="tag in localItineraryData.tags"
              :key="tag"
              class="text-sm font-medium text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="prose prose-lg max-w-none mb-6">
            <h3 class="font-bold text-xl mb-2 text-secondary-900">行程特色</h3>
            <p class="text-secondary-700 leading-relaxed whitespace-pre-wrap">
              {{ localItineraryData.description || localItineraryData.content || '暫無詳細介紹' }}
            </p>
          </div>

          <div class="flex items-center space-x-4 py-4 border-t border-b border-secondary-200 mb-6">
            <button
              class="flex items-center space-x-1 text-secondary-400 hover:text-accent-600 transition"
            >
              <HeartIcon class="w-6 h-6" />
            </button>
            <button
              class="flex items-center space-x-1 text-secondary-400 hover:text-primary-600 transition"
            >
              <BookmarkIcon class="w-6 h-6" />
            </button>

            <button
              class="ml-auto bg-primary-600 text-white px-8 py-3 rounded-full font-bold hover:bg-primary-700 transition shadow-md flex items-center"
            >
              立即預訂 / 諮詢
            </button>
          </div>

          <div class="border-b-2 border-primary-200 mb-6">
            <div class="flex space-x-1">
              <button
                :class="[
                  'px-6 py-3 font-bold transition relative',
                  activeTab === 'itinerary'
                    ? 'text-primary-600 border-b-4 border-primary-600'
                    : 'text-secondary-400 hover:text-secondary-600',
                ]"
                @click="activeTab = 'itinerary'"
              >
                <MapIcon class="w-5 h-5 inline mr-2" />
                每日行程
              </button>
              <button
                :class="[
                  'px-6 py-3 font-bold transition relative',
                  activeTab === 'comments'
                    ? 'text-primary-600 border-b-4 border-primary-600'
                    : 'text-secondary-400 hover:text-secondary-600',
                ]"
                @click="activeTab = 'comments'"
              >
                <MessageCircleIcon class="w-5 h-5 inline mr-2" />
                評價討論
              </button>
            </div>
          </div>

          <div v-if="activeTab === 'itinerary'" class="space-y-6">
            <div v-if="isLoadingDetails" class="text-center py-10 text-primary-600">
              正在載入詳細行程...
            </div>
            <div v-else-if="itineraryDetails.days && itineraryDetails.days.length > 0">
              <div class="flex overflow-x-auto space-x-2 pb-2">
                <button
                  v-for="(day, index) in itineraryDetails.days"
                  :key="index"
                  :class="[
                    'px-4 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                    activeDayIndex === index
                      ? 'bg-primary-600 text-white border-primary-700'
                      : 'bg-white text-secondary-500 border-secondary-200 hover:bg-secondary-50',
                  ]"
                  @click="activeDayIndex = index"
                >
                  Day {{ index + 1 }}
                </button>
              </div>

              <div class="space-y-4">
                <div v-if="activeDay.activities && activeDay.activities.length > 0">
                  <div
                    v-for="(activity, actIndex) in activeDay.activities"
                    :key="actIndex"
                    class="bg-white p-4 rounded-xl border-2 border-secondary-200 shadow-primary-sm relative overflow-hidden"
                  >
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>
                    <div class="flex gap-4">
                      <div class="w-16 shrink-0 text-right">
                        <div class="text-xl font-black text-primary-600">
                          {{ activity.time || 'All Day' }}
                        </div>
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                          <component
                            :is="getIconComponent(activity.icon)"
                            class="w-5 h-5 text-primary-500"
                          />
                          <h4 class="text-lg font-bold text-secondary-900">{{ activity.title }}</h4>
                        </div>
                        <p class="text-secondary-600 text-sm">{{ activity.desc }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
                >
                  本日無特定行程安排，享受自由時間！
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-10 bg-gray-50 rounded-lg">
              尚未建立詳細行程表
            </div>

            <div
              v-if="itineraryDetails.packingList && itineraryDetails.packingList.length > 0"
              class="mt-8 pt-6 border-t border-secondary-200"
            >
              <h3 class="font-black text-lg text-secondary-900 flex items-center mb-4">
                <CheckSquareIcon class="w-5 h-5 mr-2 text-primary" />
                建議攜帶物品 (官方建議)
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(cat, catIndex) in itineraryDetails.packingList"
                  :key="catIndex"
                  class="bg-white border-2 border-secondary-200 rounded-lg p-4"
                >
                  <h4 class="font-bold text-secondary-700 mb-3">{{ cat.category }}</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(item, itemIndex) in cat.items"
                      :key="itemIndex"
                      class="flex items-center"
                    >
                      <div class="w-2 h-2 rounded-full bg-primary-400 mr-2"></div>
                      <span class="text-sm text-secondary-700">
                        {{ item.name || item }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'comments'" class="py-10 text-center text-secondary-500">
            這裡可以放置針對此行程的評價或 Q&A
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
