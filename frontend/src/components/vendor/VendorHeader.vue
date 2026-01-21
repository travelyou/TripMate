<script setup>
import {
  Star as StarIcon,
  Award as AwardIcon,
  UserPlus,
  MessageCircle,
  Edit,
  LayoutDashboard,
} from 'lucide-vue-next'

defineProps({
  vendor: {
    type: Object,
    required: true,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-review-modal', 'follow', 'message', 'edit', 'manage'])
</script>

<template>
  <div
    class="bg-white rounded-2xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start border-2 border-primary-100 shadow-primary-sm mb-8"
  >
    <!-- 廠商頭像 -->
    <div class="relative shrink-0">
      <img
        :src="vendor.avatar"
        class="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md object-cover"
      />
      <!-- 認證徽章 -->
      <div
        v-if="vendor.isVerified"
        class="absolute bottom-0 right-0 bg-primary-600 p-1 rounded-full border-2 border-white"
      >
        <AwardIcon class="w-4 h-4 text-white" />
      </div>
    </div>

    <!-- 右側資訊區 -->
    <div class="flex-1 w-full">
      <!-- 第一排：名稱、評價-->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 名稱 -->
          <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-wide">
            {{ vendor.name }}
          </h1>

          <!-- 評分 (可點擊) -->
          <button
            class="flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition group"
            @click="emit('open-review-modal')"
          >
            <StarIcon class="w-5 h-5 text-primary-500 fill-primary-500" />
            <span class="font-bold text-gray-800">{{ vendor.rating }}</span>
            <span class="text-xs text-gray-500 group-hover:text-primary-700"
              >({{ vendor.reviewCount }}則評價)</span
            >
          </button>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- Owner Mode -->
          <template v-if="isOwner">
            <button
              class="flex items-center gap-1.5 px-4 py-2 bg-secondary-50 text-secondary-700 rounded-full font-bold hover:bg-secondary-100 transition border-2 border-secondary-100"
              @click="$emit('manage')"
            >
              <LayoutDashboard class="w-4 h-4" />
              管理
            </button>
            <button
              class="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition"
              @click="$emit('edit')"
            >
              <Edit class="w-4 h-4" />
              編輯
            </button>
          </template>

          <!-- Visitor Mode -->
          <template v-else>
            <button
              class="flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-primary-700 rounded-full font-bold hover:bg-primary-100 transition border-2 border-primary-100"
              @click="$emit('follow')"
            >
              <UserPlus class="w-4 h-4" />
              追蹤
            </button>
            <button
              class="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition"
              @click="$emit('message')"
            >
              <MessageCircle class="w-4 h-4" />
              私訊
            </button>
          </template>
        </div>
      </div>

      <!-- 第二排：簡介 -->
      <div class="bg-secondary-50 rounded-xl p-4 text-secondary-600 text-sm leading-relaxed border-2 border-secondary-100">
        {{ vendor.description }}
      </div>
    </div>
  </div>
</template>

