<script setup>
import { defineEmits, ref } from 'vue';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-vue-next';

defineProps({
  regions: {
    type: Array,
    default: () => ['日本', '韓國', '東南亞', '北歐', '東歐', '英國']
  },
  activeRegion: {
    type: String,
    default: '全部'
  }
});

const emit = defineEmits(['select-region']);

const selectRegion = (region) => {
  emit('select-region', region);
};

// Scroll Logic
const scrollContainer = ref(null);
const isDragging = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);

const startDrag = (e) => {
  isDragging.value = true;
  startX.value = e.pageX - scrollContainer.value.offsetLeft;
  scrollLeft.value = scrollContainer.value.scrollLeft;
};

const stopDrag = () => {
  isDragging.value = false;
};

const doDrag = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  const x = e.pageX - scrollContainer.value.offsetLeft;
  const walk = (x - startX.value) * 2; // Scroll speed multiplier
  scrollContainer.value.scrollLeft = scrollLeft.value - walk;
};

const scroll = (direction) => {
  if (!scrollContainer.value) return;
  const scrollAmount = 300; // Scroll width of one card + gap approx
  scrollContainer.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  });
};

// Map regions to image URLs //mock data
const regionImages = {
  '日本': 'https://images.unsplash.com/photo-1528164344795-46b7f0801a61?q=80&w=800&auto=format&fit=crop',
  '韓國': 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=800&auto=format&fit=crop',
  '東南亞': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=800&auto=format&fit=crop',
  '北歐': 'https://images.unsplash.com/photo-1548180908-1e434e32d309?q=80&w=800&auto=format&fit=crop',
  '東歐': 'https://images.unsplash.com/photo-1515091943-9d5c0ad475af?q=80&w=800&auto=format&fit=crop',
  '英國': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800&auto=format&fit=crop'
};

const getRegionImage = (region) => {
  return regionImages[region] || regionImages['default'];
};
</script>

<template>
  <div class="mb-10 relative group/container">
    <!-- Left Button -->
    <button
      class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 bg-white/95 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-primary-50 text-primary-800 transition-all duration-300 opacity-0 group-hover/container:opacity-100 group-hover/container:translate-x-2 hidden md:flex border border-primary-100"
      @click="scroll('left')"
    >
      <ChevronLeftIcon class="w-6 h-6" />
    </button>

    <!-- Right Button -->
    <button
      class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 bg-white/95 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-primary-50 text-primary-800 transition-all duration-300 opacity-0 group-hover/container:opacity-100 group-hover/container:-translate-x-2 hidden md:flex border border-primary-100"
      @click="scroll('right')"
    >
      <ChevronRightIcon class="w-6 h-6" />
    </button>

    <div
      ref="scrollContainer"
      class="flex overflow-x-auto gap-4 py-6 px-1 custom-scrollbar snap-x cursor-grab active:cursor-grabbing scroll-smooth"
      @mousedown="startDrag"
      @mouseleave="stopDrag"
      @mouseup="stopDrag"
      @mousemove="doDrag"
    >
      <!-- "All" Card -->
      <button
        class="relative min-w-[200px] h-[300px] rounded-2xl overflow-hidden shrink-0 snap-start group transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg border-2 border-primary-100 shadow-primary-sm"
        @click="selectRegion('全部')"
      >
        <div class="absolute inset-0 bg-gray-900 group-hover:scale-110 transition-transform duration-700"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
          <h3 class="text-3xl font-black text-white tracking-widest uppercase mb-2">ALL</h3>
          <span class="text-gray-300 text-sm tracking-widest">全部地區</span>
        </div>

        <!-- Active Frame -->
        <div
            v-if="activeRegion === '全部'"
            class="absolute inset-0 border-4 border-primary-500 z-20"
        ></div>
      </button>

      <!-- Region Cards -->
      <button
        v-for="region in regions"
        :key="region"
        class="relative min-w-[200px] h-[300px] rounded-2xl overflow-hidden shrink-0 snap-start group transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg border-2 border-primary-100 bg-white/80 shadow-primary-sm"
        @click="selectRegion(region)"
      >
        <!-- Background Image -->
        <img
          :src="getRegionImage(region)"
          class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0 select-none"
        />

        <!-- Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90 transition-opacity select-none"></div>

        <!-- Content -->
        <div class="absolute inset-0 flex flex-col items-center justify-end p-8 z-10 select-none">
          <h3 class="text-2xl font-bold text-white tracking-wider mb-1 drop-shadow-md">{{ region }}</h3>
          <div class="w-8 h-1 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <!-- Active Frame -->
        <div
            v-if="activeRegion === region"
            class="absolute inset-0 border-4 border-primary-500 z-20"
        ></div>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Refined Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  height: 8px; /* Slightly taller for better usability on desktop if needed */
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 10px;
  margin: 0 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
  border: 2px solid #f8fafc; /* Create "padding" around thumb */
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
