<script setup>
import {
  Map as MapIcon,
  Star as StarIcon,
  Calendar as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowUpDown as ArrowUpDownIcon
} from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps({
  itineraries: {
    type: Array,
    required: true
  },
  activeRegion: {
    type: String,
    default: '全部'
  }
});

const emit = defineEmits(['page-change']);

// Filter Logic
const filteredItineraries = computed(() => {
  if (props.activeRegion === '全部') {
    return props.itineraries;
  }
  return props.itineraries.filter(item => (item.category || item.region) === props.activeRegion);
});

// Sorting Logic
const sortOption = ref('recommended');
const sortedItineraries = computed(() => {
  const list = [...filteredItineraries.value];
  switch (sortOption.value) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'date-asc':
      // Mock date sorting (using id as proxy: smaller ID = older)
      return list.sort((a, b) => a.id - b.id);
    case 'date-desc':
      // Mock date sorting (using id as proxy: larger ID = newer)
      return list.sort((a, b) => b.id - a.id);
    case 'recommended':
    default:
      return list;
  }
});

// Pagination Logic (Mock)
const currentPage = ref(1);
const changePage = (page) => {
  currentPage.value = page;
  emit('page-change', page);
};

// Navigation
const navigateToItinerary = (id) => {
  router.push({
    name: 'featured_itinerary',
    params: { id }
  });
};
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center justify-between mb-6">
      <h2 class="inline-flex items-center text-2xl font-black text-primary-800 bg-primary-50 px-6 py-3 rounded-2xl border-2 border-primary-200 shadow-primary-sm">
        <MapIcon class="w-6 h-6 mr-2" />
        精選行程
        <span v-if="activeRegion !== '全部'" class="ml-2 text-sm bg-primary-600 text-white px-2 py-1 rounded-lg shadow-sm">
          {{ activeRegion }}
        </span>
      </h2>

      <!-- Sorting Sorter -->
      <div class="flex items-center gap-2">
        <div class="relative group">
          <select
            v-model="sortOption"
            class="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-bold shadow-sm cursor-pointer"
          >
            <option value="recommended">🔥 熱門推薦 🔥</option>
            <option value="price-asc">價格由低到高</option>
            <option value="price-desc">價格由高到低</option>
            <option value="date-asc">日期由近到遠</option>
            <option value="date-desc">日期由遠到近</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <ArrowUpDownIcon class="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop/Tablet View: Grid -->
    <div class="hidden md:block">
      <!-- Empty State -->
      <div v-if="filteredItineraries.length === 0" class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <p class="text-gray-500 font-bold">此地區暫無相關行程</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="itinerary in sortedItineraries"
          :key="itinerary.id"
          class="bg-white overflow-hidden rounded-2xl border-2 border-primary-100 shadow-primary-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer h-full flex flex-col"
          @click="navigateToItinerary(itinerary.id)"
        >
          <!-- 行程圖片 -->
          <div class="relative h-52 overflow-hidden shrink-0">
            <img :src="itinerary.image" class="w-full h-full object-cover transition duration-500 hover:scale-110" />
            <div class="absolute top-3 left-3 flex flex-wrap gap-2">
              <span v-for="tag in itinerary.tags" :key="tag" class="bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md border-2 border-white">
                {{ tag }}
              </span>
            </div>
            <div class="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
              <StarIcon class="w-4 h-4 text-primary-500 fill-primary-500" />
              <span class="font-bold text-sm text-gray-800">{{ itinerary.rating }}</span>
            </div>
          </div>

          <!-- 行程資訊 -->
          <div class="p-5 flex-1 flex flex-col">
            <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">{{ itinerary.title || itinerary.name }}</h3>
            <div class="flex items-center gap-4 mb-2 text-sm text-gray-600">
              <div class="flex items-center gap-1 bg-primary-50 px-3 py-1 rounded-full">
                <CalendarIcon class="w-4 h-4 text-primary-600" />
                <span class="font-semibold text-primary-600">{{ itinerary.days }}天{{ itinerary.nights }}夜</span>
              </div>
            </div>
            <div class="mb-3 flex-1">
              <div class="flex flex-wrap gap-2">
                <span v-for="highlight in itinerary.highlights" :key="highlight" class="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded border border-primary-200">
                  {{ highlight }}
                </span>
              </div>
            </div>
            <div class="pt-3 border-t-2 border-gray-100 mt-auto">
              <div class="flex items-baseline gap-1 mb-3">
                <span class="text-3xl font-black text-primary-600">{{ itinerary.price.toLocaleString() }}</span>
                <span class="text-sm text-gray-500 font-medium">起</span>
                <span v-if="itinerary.originalPrice" class="ml-2 text-sm text-gray-400 line-through">NT$ {{ itinerary.originalPrice.toLocaleString() }}</span>
              </div>
              <button class="w-full bg-primary-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-primary-700 transition shadow-md flex items-center justify-center gap-2">
                <ShoppingCartIcon class="w-4 h-4" /> 立即預訂
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="filteredItineraries.length > 0" class="flex justify-center mt-6 gap-2">
        <button
          v-for="p in 3"
          :key="p"
          class="w-3 h-3 rounded-full transition-all"
          :class="currentPage === p ? 'w-6 bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'"
          @click="changePage(p)"
        ></button>
      </div>
    </div>

    <!-- Mobile View: Scroll Snap Carousel (2 Rows) -->
    <div class="md:hidden">
      <div v-if="sortedItineraries.length === 0" class="text-center py-8 text-gray-500 text-sm">
        此地區暫無相關行程
      </div>
      <div v-else class="relative w-full">
         <!-- HINT: grid-rows-2 + grid-flow-col creates the layout. h-[24rem] defines total height ~ 2 cards high -->
        <div class="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory px-1">
          <div
            v-for="itinerary in sortedItineraries"
            :key="itinerary.id"
            class="snap-start w-[280px] h-full"
          >
            <div
              class="bg-white overflow-hidden h-full flex flex-col border-2 border-primary-100 shadow-primary-sm rounded-2xl"
              @click="navigateToItinerary(itinerary.id)"
            >
              <div class="relative h-40 overflow-hidden">
                <img :src="itinerary.image" class="w-full h-full object-cover" />
                <div v-if="itinerary.tags && itinerary.tags[0]" class="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md border border-white">{{ itinerary.tags[0] }}</div>
              </div>
              <div class="p-3">
                <h3 class="text-sm font-bold text-gray-900 mb-2 line-clamp-2 h-10">{{ itinerary.name }}</h3>
                <div class="flex flex-col gap-1">
                  <div>
                    <span class="text-lg font-black text-primary-600">NT${{ itinerary.price.toLocaleString() }}</span>
                    <span class="text-xs text-gray-500">起</span>
                  </div>
                </div>
                <button class="w-full mt-3 bg-primary-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm">查看</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
