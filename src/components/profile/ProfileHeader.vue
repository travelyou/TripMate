<script setup>
import { ref } from 'vue'
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
      reviews: 0,
      friends: 0
    })
  }
})

const emit = defineEmits(['edit-profile', 'update-avatar', 'open-friends'])

const fileInputMobile = ref(null)
const fileInputDesktop = ref(null)

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('update-avatar', file)
  }
}
</script>

<template>
  <div
    class="bg-primary-600 rounded-3xl p-5 md:p-8 mb-4 md:mb-8 text-white relative overflow-hidden shadow-sm border border-primary-700"
  >
    <!-- Background Decor (Optional or subtle) -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary-500/50 to-primary-800/60"></div>

    <div class="relative z-10">
      <!-- Mobile Layout Wrapper (Hidden on Desktop) -->
      <div class="md:hidden flex flex-col gap-4">
        <!-- Top Row: Avatar + Info + Stats -->
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div class="relative group shrink-0">
            <img
              class="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-primary-50"
              :src="user.avatar"
              alt="Avatar"
            />
            <input
              ref="fileInputMobile"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />
            <button
              class="absolute bottom-0 right-0 p-1.5 bg-primary-600 rounded-full border border-white hover:bg-primary-700 transition shadow-lg cursor-pointer"
              @click="$refs.fileInputMobile.click()"
            >
              <Camera class="w-3 h-3 text-white" />
            </button>
          </div>

          <!-- Right Info Area -->
          <div class="flex-1 min-w-0 flex flex-col justify-center h-20">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-baseline gap-2 truncate">
                <h1 class="text-xl font-bold tracking-tight truncate text-white">{{ user.name }}</h1>
                <span v-if="user.nickname" class="text-xs text-primary-100 truncate">@{{ user.nickname }}</span>
              </div>
              <button
                v-if="isCurrentUser"
                class="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                @click="$emit('edit-profile')"
              >
                <Settings class="w-4 h-4" />
              </button>
            </div>

            <!-- Compact Stats (Label Top, Number Bottom) -->
            <!-- Compact Stats (Label Top, Number Bottom) -->
             <div class="flex gap-4 self-start">
               <button class="text-center group" @click="$emit('open-friends')">
                 <div class="text-[10px] text-primary-100 group-hover:text-white transition">好友</div>
                 <div class="font-bold text-white leading-tight group-hover:text-white transition">{{ stats.friends }}</div>
               </button>
               <div class="w-px bg-white/20 h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[10px] text-primary-100">主揪</div>
                 <div class="font-bold text-white leading-tight">{{ stats.hosted }}</div>
               </div>
               <div class="w-px bg-white/20 h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[10px] text-primary-100">貼文</div>
                 <div class="font-bold text-white leading-tight">{{ stats.posts }}</div>
               </div>
               <div class="w-px bg-white/20 h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[10px] text-primary-100">好評</div>
                 <div class="font-bold text-white leading-tight">{{ stats.reviews }}</div>
               </div>
             </div>
          </div>
        </div>

        <!-- Bottom Row: Bio + Tags -->
        <div class="text-sm">
           <p class="text-primary-100 mb-2 font-light leading-relaxed line-clamp-2">
            {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in user.tags"
              :key="tag"
              class="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-medium text-white border border-white/20 flex items-center"
            >
              <Tag class="w-2.5 h-2.5 mr-1" /> {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Desktop Layout Wrapper (Hidden on Mobile) -->
      <div class="hidden md:flex items-end gap-6">
        <!-- Avatar -->
        <div class="relative group">
          <img
            class="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover bg-primary-50"
            :src="user.avatar"
            alt="Avatar"
          />
          <input
            ref="fileInputDesktop"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
          <button
            class="absolute bottom-2 right-2 p-2 bg-primary-600 rounded-full border-2 border-white hover:bg-primary-700 transition shadow-lg group-hover:scale-110 cursor-pointer"
            @click="$refs.fileInputDesktop.click()"
          >
            <Camera class="w-4 h-4 text-white" />
          </button>
        </div>

        <!-- User Info -->
        <div class="flex-1 text-left">
          <div class="flex items-center justify-start gap-3 mb-2">
            <h1 class="text-3xl font-bold tracking-tight text-white">{{ user.name }}</h1>
            <span
              v-if="user.nickname"
              class="px-3 py-1 bg-white/10 rounded-full text-sm font-medium text-primary-100"
              >@{{ user.nickname }}</span
            >

            <!-- Settings Button -->
            <button
              v-if="isCurrentUser"
              class="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              title="帳號設定"
              @click="$emit('edit-profile')"
            >
              <Settings class="w-5 h-5" />
            </button>
          </div>
          <p class="text-primary-100 mb-4 max-w-xl text-lg font-light leading-relaxed">
            {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
          </p>
          <div class="flex flex-wrap justify-start gap-2">
            <span
              v-for="tag in user.tags"
              :key="tag"
              class="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium text-white border border-white/20 flex items-center"
            >
              <Tag class="w-3 h-3 mr-1" /> {{ tag }}
            </span>
          </div>
        </div>

        <!-- Quick Stats -->
        <div
          class="flex gap-8 bg-white/10 rounded-2xl p-6 border border-white/20"
        >
          <button class="text-center group hover:scale-105 transition" @click="$emit('open-friends')">
            <div class="text-sm text-primary-100 mb-1 group-hover:text-white transition">好友</div>
            <div class="text-3xl font-bold text-white leading-none group-hover:text-white transition">{{ stats.friends }}</div>
          </button>
          <div class="text-center">
            <div class="text-sm text-primary-100 mb-1">主揪</div>
            <div class="text-3xl font-bold text-white leading-none">{{ stats.hosted }}</div>
          </div>
          <div class="text-center">
             <div class="text-sm text-primary-100 mb-1">貼文</div>
             <div class="text-3xl font-bold text-white leading-none">{{ stats.posts }}</div>
          </div>
          <div class="text-center">
             <div class="text-sm text-primary-100 mb-1">好評</div>
             <div class="text-3xl font-bold text-white leading-none">{{ stats.reviews }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
