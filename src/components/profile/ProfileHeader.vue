<script setup>
import { Camera, Tag, Settings } from 'lucide-vue-next'

defineProps({
  user: {
    type: Object,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Object,
    required: false,
    default: () => ({
      hosted: 0,
      posts: 0,
      reviews: 0
    })
  }
})

defineEmits(['edit-profile'])
</script>

<template>
  <div
    class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-xl"
  >
    <div class="absolute inset-0 bg-black/10"></div>
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
    <div
      class="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl"
    ></div>

    <div class="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
      <!-- Avatar -->
      <div class="relative group">
        <img
          class="w-32 h-32 rounded-full border-4 border-white/30 shadow-2xl object-cover bg-white"
          :src="user.avatar"
          alt="Avatar"
        />
        <button
          class="absolute bottom-2 right-2 p-2 bg-indigo-600 rounded-full border border-white/50 hover:bg-indigo-700 transition shadow-lg group-hover:scale-110"
        >
          <Camera class="w-4 h-4 text-white" />
        </button>
      </div>

      <!-- User Info -->
      <div class="flex-1 text-center md:text-left">
        <div class="flex items-center justify-center md:justify-start gap-3 mb-2">
          <h1 class="text-3xl font-bold tracking-tight">{{ user.name }}</h1>
          <span
            v-if="user.nickname"
            class="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm"
            >@{{ user.nickname }}</span
          >

          <!-- Settings Button (Only visible to owner) -->
          <button
            v-if="isCurrentUser"
            class="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition backdrop-blur-sm"
            title="帳號設定"
            @click="$emit('edit-profile')"
          >
            <Settings class="w-5 h-5" />
          </button>
        </div>
        <p class="text-indigo-100 mb-4 max-w-xl text-lg font-light leading-relaxed">
          {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
        </p>
        <div class="flex flex-wrap justify-center md:justify-start gap-2">
          <span
            v-for="tag in user.tags"
            :key="tag"
            class="px-3 py-1 bg-indigo-800/40 rounded-lg text-xs font-medium text-indigo-100 border border-indigo-400/30 flex items-center"
          >
            <Tag class="w-3 h-3 mr-1" /> {{ tag }}
          </span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div
        class="flex gap-4 md:gap-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10"
      >
        <div class="text-center">
          <div class="text-2xl font-bold">{{ stats.hosted }}</div>
          <div class="text-xs text-indigo-200">主揪</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold">{{ stats.posts }}</div>
          <div class="text-xs text-indigo-200">貼文</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold">{{ stats.reviews }}</div>
          <div class="text-xs text-indigo-200">好評</div>
        </div>
      </div>
    </div>
  </div>
</template>
