<script setup>
import {
  Map as MapIcon,
  Star as StarIcon,
  Calendar as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-vue-next';
import { ref } from 'vue';

defineProps({
  itineraries: {
    type: Array,
    required: true
  },
  regions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['filter-change', 'page-change']);

const activeRegion = ref('全部');

const filterRegion = (region) => {
  activeRegion.value = region;
  emit('filter-change', region);
};

// Pagination Logic (Mock)
const currentPage = ref(1);
const changePage = (page) => {
  currentPage.value = page;
  emit('page-change', page);
};
</script>

<template>
  <div class="mb-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      <h2 class="inline-flex items-center text-2xl font-black text-amber-900 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-2xl border-4 border-green-300 shadow-[6px_6px_0px_0px_rgba(34,197,94,0.5)]">
        <MapIcon class="w-6 h-6 mr-2" />
        精選行程
      </h2>

      <!-- 地區標籤 Tabs -->
      <div class="flex overflow-x-auto pb-2 md:pb-0 gap-2 custom-scrollbar">
        <button
          v-for="region in ['全部', ...regions]"
          :key="region"
          class="px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border-2"
          :class="[
            activeRegion === region
              ? 'bg-green-500 text-white border-green-600 shadow-md'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
          ]"
          @click="filterRegion(region)"
        >
          {{ region }}
        </button>
      </div>
    </div>

    <!-- Desktop/Tablet View: Grid -->
    <div class="hidden md:block">
      <!-- Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="itinerary in itineraries"
          :key="itinerary.id"
          class="pixel-card bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer h-full flex flex-col"
        >
          <!-- 行程圖片 -->
          <div class="relative h-52 overflow-hidden shrink-0">
            <img :src="itinerary.image" class="w-full h-full object-cover transition duration-500 hover:scale-110" />
            <div class="absolute top-3 left-3 flex flex-wrap gap-2">
              <span v-for="tag in itinerary.tags" :key="tag" class="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md border-2 border-white">
                {{ tag }}
              </span>
            </div>
            <div class="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
              <StarIcon class="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span class="font-bold text-sm text-gray-800">{{ itinerary.rating }}</span>
            </div>
          </div>

          <!-- 行程資訊 -->
          <div class="p-5 flex-1 flex flex-col">
            <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">{{ itinerary.name }}</h3>
            <div class="flex items-center gap-4 mb-2 text-sm text-gray-600">
              <div class="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                <CalendarIcon class="w-4 h-4 text-blue-600" />
                <span class="font-semibold text-blue-600">{{ itinerary.days }}天{{ itinerary.nights }}夜</span>
              </div>
            </div>
            <div class="mb-3 flex-1">
              <div class="flex flex-wrap gap-2">
                <span v-for="highlight in itinerary.highlights" :key="highlight" class="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
                  {{ highlight }}
                </span>
              </div>
            </div>
            <div class="pt-3 border-t-2 border-gray-100 mt-auto">
              <div class="flex items-baseline gap-1 mb-3">
                <span class="text-3xl font-black text-orange-600">{{ itinerary.price.toLocaleString() }}</span>
                <span class="text-sm text-gray-500 font-medium">起</span>
                <span v-if="itinerary.originalPrice" class="ml-2 text-sm text-gray-400 line-through">NT$ {{ itinerary.originalPrice.toLocaleString() }}</span>
              </div>
              <button class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition shadow-md flex items-center justify-center gap-2">
                <ShoppingCartIcon class="w-4 h-4" /> 立即預訂
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div class="flex justify-center mt-6 gap-2">
        <button
          v-for="p in 3"
          :key="p"
          class="w-3 h-3 rounded-full transition-all"
          :class="currentPage === p ? 'w-6 bg-amber-600' : 'bg-gray-300 hover:bg-gray-400'"
          @click="changePage(p)"
        ></button>
      </div>
    </div>

    <!-- Mobile View: Scroll Snap Carousel -->
    <div class="md:hidden">
      <div class="relative w-full">
        <div class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 custom-scrollbar">
          <div
            v-for="itinerary in itineraries"
            :key="itinerary.id"
            class="snap-center w-[calc(50%-8px)] shrink-0 first:ml-0"
          >
            <div class="pixel-card bg-white overflow-hidden h-full flex flex-col">
              <div class="relative h-40 overflow-hidden">
                <img :src="itinerary.image" class="w-full h-full object-cover" />
                <div v-if="itinerary.tags && itinerary.tags[0]" class="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md border border-white">{{ itinerary.tags[0] }}</div>
              </div>
              <div class="p-3">
                <h3 class="text-sm font-bold text-gray-900 mb-2 line-clamp-2 h-10">{{ itinerary.name }}</h3>
                <div class="flex flex-col gap-1">
                  <div>
                    <span class="text-lg font-black text-orange-600">NT${{ itinerary.price.toLocaleString() }}</span>
                    <span class="text-xs text-gray-500">起</span>
                  </div>
                </div>
                <button class="w-full mt-3 bg-orange-500 text-white py-2 rounded-lg text-xs font-bold shadow-sm">查看</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Expand Button -->
    <div class="flex justify-center mt-4">
      <button
        class="flex items-center gap-2 bg-white text-amber-900 border-2 border-amber-200 px-8 py-3 rounded-full font-bold shadow-sm hover:bg-amber-50 hover:border-amber-400 transition-all hover:shadow-md"
      >
        <span>查看全部行程</span>
        <ChevronRightIcon class="w-5 h-5" />
      </button>
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
