<script setup>
import {
  Star as StarIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  UserPlus as UserPlusIcon,
  Award as AwardIcon,
  FileText as FileTextIcon,
  Map as MapIcon,
  Calendar as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  // ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next';

// Components
import VendorHeader from '@/components/vendor/VendorHeader.vue';
import VendorItineraryList from '@/components/vendor/VendorItineraryList.vue';
import VendorPostList from '@/components/vendor/VendorPostList.vue';
import VendorReviewList from '@/components/vendor/VendorReviewList.vue';

const route = useRoute();
const vendorStore = useVendorStore();
const { currentVendor, vendorItineraries, vendorPosts, vendorReviews, loading } = storeToRefs(vendorStore);

const loadData = async () => {
  const vendorId = route.params.id || 'vendor001'; // Default to mock ID if none
  await Promise.all([
    vendorStore.fetchVendorProfile(vendorId),
    vendorStore.fetchVendorItineraries(vendorId),
    vendorStore.fetchVendorPosts(vendorId),
    vendorStore.fetchVendorReviews(vendorId)
  ]);
};

// Initial load
onMounted(() => {
  loadData();
});

// Watch for route changes (e.g. switching between vendors)
watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadData();
  }
);

// Event Handlers
const handleRegionFilter = (region) => {
  const vendorId = route.params.id || 'vendor001';
  vendorStore.fetchVendorItineraries(vendorId, { region });
};

const handlePageChange = (page) => {
  // Implement real pagination here
  console.log('Page changed to:', page);
};
</script>

<template>
  <div class="p-4 md:p-0">
    <!-- 廠商封面與頭像區塊 -->
    <div class="bg-white rounded-3xl overflow-hidden shadow-lg border-2 border-amber-100 mb-6 pixel-card">
      <!-- 封面圖片 -->
      <div
        class="h-48 md:h-64 bg-cover bg-center relative"
        :style="{ backgroundImage: `url(${vendor.coverImage})` }"
      >
        <div class="absolute inset-0 bg-black/20"></div>
      </div>

      <!-- 廠商資訊 -->
      <div class="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 md:p-6 relative">
        <div class="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20">
          <!-- 廠商頭像 -->
          <div class="relative group">
            <img
              :src="vendor.avatar"
              class="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
            />
            <!-- 認證徽章 -->
            <div
              v-if="vendor.isVerified"
              class="absolute bottom-2 right-2 bg-blue-500 p-1.5 rounded-full border-2 border-white"
            >
              <AwardIcon class="w-4 h-4 text-white" />
            </div>
          </div>

          <!-- 廠商名稱與統計資訊 -->
          <div class="flex-1 text-center md:text-left mt-3 md:mt-0 md:ml-6 mb-2">
            <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 class="text-2xl md:text-3xl font-black tracking-wide">{{ vendor.name }}</h1>
            </div>
            <p class="text-orange-100 text-sm font-medium mb-3">{{ vendor.slogan }}</p>

            <!-- 評分 -->
            <div class="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div class="flex items-center">
                <StarIcon class="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <span class="ml-1 font-bold text-lg">{{ vendor.rating }}</span>
              </div>
              <span class="text-orange-100 text-sm">({{ vendor.reviewCount }} 則評價)</span>
            </div>

            <!-- 統計資訊 -->
            <div class="flex justify-center md:justify-start space-x-6">
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.postsCount }}</div>
                <div class="text-xs text-orange-100">貼文</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.itineraryCount }}</div>
                <div class="text-xs text-orange-100">行程</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold">{{ vendor.followersCount }}</div>
                <div class="text-xs text-orange-100">追蹤者</div>
              </div>
            </div>
          </div>

          <!-- 追蹤按鈕 -->
          <button
            class="mb-4 md:mb-2 bg-white text-orange-600 px-6 py-2.5 rounded-lg font-bold hover:bg-orange-50 transition shadow-md border-2 border-orange-200 flex items-center gap-2"
          >
            <UserPlusIcon class="w-5 h-5" />
            追蹤廠商
          </button>
        </div>
      </div>

      <!-- 廠商簡介 -->
      <div class="p-6 bg-[#fffef7] border-t-2 border-amber-100">
        <p class="text-gray-700 leading-relaxed text-sm md:text-base">
          {{ vendor.description }}
        </p>
      </div>
    </div>


    <!-- 廠商 Banner 區塊 -->
    <div class="mb-8 rounded-3xl overflow-hidden shadow-lg border-2 border-amber-100 h-40 md:h-64 relative pixel-card">
      <img :src="vendor.bannerImage" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
        <h2 class="text-white text-2xl md:text-3xl font-black drop-shadow-lg tracking-wide">
          本季主打行程
        </h2>
      </div>
    </div>

    <!-- 精選行程區塊 -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 class="inline-flex items-center text-2xl font-black text-amber-900 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-2xl border-4 border-green-300 shadow-[6px_6px_0px_0px_rgba(34,197,94,0.5)]">
          <MapIcon class="w-6 h-6 mr-2" />
          精選行程
        </h2>

        <!-- 地區標籤 Tabs (示意 UI) -->
        <div class="flex overflow-x-auto pb-2 md:pb-0 gap-2 custom-scrollbar">
          <button
            v-for="region in ['全部', ...vendor.regionTags]"
            :key="region"
            class="px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border-2"
            :class="[
              region === '全部'
                ? 'bg-green-500 text-white border-green-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
            ]"
          >
            {{ region }}
          </button>
        </div>
      </div>

      <!-- 響應式網格與手機版輪播 (CSS Only) -->

      <!-- Desktop/Tablet View (md:block): Static Grid -->
      <div class="hidden md:block">
           <!-- Grid of 6 items -->
           <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="itinerary in featuredItineraries.slice(0, 6)"
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

           <!-- Pagination Controls (Static UI) -->
           <div class="flex justify-center mt-6 gap-2">
              <span class="w-6 h-3 rounded-full bg-amber-600"></span>
              <span class="w-3 h-3 rounded-full bg-gray-300"></span>
              <span class="w-3 h-3 rounded-full bg-gray-300"></span>
           </div>
      </div>

      <!-- Mobile View (md:hidden): CSS Scroll Snap Carousel -->
      <div class="md:hidden">
        <div class="relative w-full">
            <!-- Scroll Snap Container -->
            <div class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 custom-scrollbar">
               <div
                 v-for="itinerary in featuredItineraries"
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

      <!-- Expand Button (Static UI) -->
       <div class="flex justify-center mt-4">
           <button
             class="flex items-center gap-2 bg-white text-amber-900 border-2 border-amber-200 px-8 py-3 rounded-full font-bold shadow-sm hover:bg-amber-50 hover:border-amber-400 transition-all hover:shadow-md"
           >
             <span>查看全部行程</span>
             <ChevronRightIcon class="w-5 h-5" />
           </button>
      </div>
    </div>

    <!-- 廠商貼文區塊 (放置在精選行程下方) -->
    <div class="mb-8">
      <div class="mb-6">
        <h2
          class="inline-flex items-center text-xl font-bold text-amber-900 bg-orange-100 px-5 py-2 rounded-xl border-4 border-orange-200 shadow-[4px_4px_0px_0px_rgba(251,146,60,0.5)]"
        >
          <FileTextIcon class="w-5 h-5 mr-2" />
          廠商貼文
        </h2>
      </div>

      <div class="space-y-6">
        <div
          v-for="post in vendorPosts"
          :key="post.id"
          class="pixel-card p-5 bg-[#fffef7] hover:shadow-lg transition-shadow cursor-pointer"
        >
          <h3 class="text-lg font-bold text-gray-900 mb-2">
            {{ post.title }}
          </h3>

          <p class="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {{ post.content }}
          </p>

          <div class="w-full h-64 rounded-xl overflow-hidden mb-4 border-2 border-amber-100">
            <img
              :src="post.image"
              class="w-full h-full object-cover hover:scale-105 transition duration-500"
            />
          </div>

          <div v-if="post.tags && post.tags.length" class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-200 transition"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="flex items-center text-gray-400 text-sm">
            <button class="flex items-center space-x-1 hover:text-red-500 transition mr-6">
              <HeartIcon class="w-4 h-4" /> <span>{{ post.likes }}</span>
            </button>

            <button class="flex items-center space-x-1 hover:text-indigo-600 transition mr-6">
              <MessageCircleIcon class="w-4 h-4" /> <span>{{ post.comments }}</span>
            </button>

            <span class="ml-auto text-xs text-gray-400">{{ post.time }}</span>
          </div>
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
