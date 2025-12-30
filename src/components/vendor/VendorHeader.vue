<script setup>
import {
  Star as StarIcon,
  Award as AwardIcon,
  UserPlus as UserPlusIcon,
  Check as CheckIcon
} from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps({
  vendor: {
    type: Object,
    required: true
  }
});

// 暫時的追蹤狀態邏輯，未來可連接 User Store
const isFollowing = ref(false);

const toggleFollow = () => {
  isFollowing.value = !isFollowing.value;
};
</script>

<template>
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
          @click="toggleFollow"
          class="mb-4 md:mb-2 px-6 py-2.5 rounded-lg font-bold transition shadow-md border-2 flex items-center gap-2"
          :class="isFollowing
            ? 'bg-green-500 text-white border-green-600 hover:bg-green-600'
            : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'"
        >
          <component :is="isFollowing ? CheckIcon : UserPlusIcon" class="w-5 h-5" />
          {{ isFollowing ? '已追蹤' : '追蹤廠商' }}
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
</template>

<style scoped>
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow:
    4px 4px 0px 0px rgba(139, 111, 71, 0.2),
    inset -1px -1px 0px 0px rgba(255, 255, 255, 0.3);
}
</style>
