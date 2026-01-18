<script setup>
import { ref, computed } from 'vue'
import { Camera, Tag, Settings, Pencil, MessageCircle, UserPlus } from 'lucide-vue-next'

const props = defineProps({
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
  },
  friendRequestStatus: {
    type: String,
    default: null // 'none' | 'sent' | 'received' | 'accepted'
  }
})

const emit = defineEmits(['edit-profile', 'edit-bio', 'update-avatar', 'open-friends', 'chat', 'add-friend'])

const fileInputMobile = ref(null)
const fileInputDesktop = ref(null)

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('update-avatar', file)
  }
}

const locationFull = computed(() => {
  return props.user.location || '台灣'
})

const shouldMarquee = computed(() => {
  return (props.user.location || '台灣').length > 15
})
</script>

<template>
  <div
    class="bg-primary-600 rounded-3xl p-5 md:p-8 mb-4 md:mb-8 text-white relative overflow-hidden shadow-sm border border-primary-700"
  >
    <div class="absolute inset-0 bg-gradient-to-br from-primary-500/50 to-primary-800/60"></div>

    <div v-if="!isCurrentUser" class="absolute bottom-2 right-2 md:bottom-3 md:right-3 flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 z-20">
      <button
        class="px-2.5 py-1.5 md:px-3 md:py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition flex items-center gap-1.5 text-xs md:text-sm font-medium backdrop-blur-sm shadow-lg shrink-0 whitespace-nowrap"
        title="聊聊"
        @click="$emit('chat')"
      >
        <MessageCircle class="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
        <span class="hidden sm:inline">聊聊</span>
      </button>
      <button
        class="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-full text-white transition flex items-center gap-1.5 text-xs md:text-sm font-medium backdrop-blur-sm shadow-lg shrink-0 whitespace-nowrap"
        :class="props.friendRequestStatus === 'accepted' 
          ? 'bg-green-500/30 hover:bg-green-500/40 cursor-default' 
          : 'bg-white/20 hover:bg-white/30'"
        :title="props.friendRequestStatus === 'accepted' ? '已是好友' : (props.friendRequestStatus === 'sent' ? '取消邀請' : '加好友')"
        :disabled="props.friendRequestStatus === 'accepted'"
        @click="props.friendRequestStatus !== 'accepted' && $emit('add-friend')"
      >
        <UserPlus v-if="props.friendRequestStatus !== 'accepted'" class="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
        <span v-else class="text-base md:text-lg shrink-0">√</span>
        <span class="hidden sm:inline">
          {{ props.friendRequestStatus === 'accepted' ? '好友' : (props.friendRequestStatus === 'sent' ? '取消邀請' : '加好友') }}
        </span>
      </button>
    </div>

    <div class="relative z-10">
      <div class="md:hidden flex flex-col gap-4">
        <div class="flex items-start gap-4">
          <div class="flex flex-col items-center shrink-0 -mt-2">
            <div class="relative group">
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
                v-if="isCurrentUser"
                class="absolute bottom-0 right-0 p-1.5 bg-primary-600 rounded-full border border-white hover:bg-primary-700 transition shadow-lg cursor-pointer"
                @click="$refs.fileInputMobile.click()"
              >
                <Camera class="w-3 h-3 text-white" />
              </button>
            </div>
            <div v-if="user.tags && user.tags.length > 0" class="tags-container flex flex-wrap items-center justify-center mt-2 w-20 sm:w-24" style="gap: 0;">
              <span
                v-for="tag in user.tags"
                :key="tag"
                class="px-1 sm:px-1.5 py-0.5 bg-white/10 rounded text-[9px] sm:text-[10px] font-medium text-white border border-white/20 flex items-center whitespace-nowrap"
                :style="{ marginRight: '2px', marginBottom: '2px' }"
              >
                <Tag class="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" /> {{ tag }}
              </span>
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-center h-20">
            <div class="flex items-start justify-between mb-1 gap-1.5 sm:gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-0">
                  <h1 class="text-base sm:text-xl font-bold tracking-tight text-white break-words min-w-0 flex-1">{{ user.name || user.nickname || '用戶' }}</h1>
                </div>
                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span
                    class="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-white/10 rounded text-[10px] sm:text-xs font-medium text-white border border-white/20 inline-flex items-center overflow-hidden relative max-w-full sm:max-w-[120px]"
                    :title="locationFull"
                  >
                    <span v-if="!shouldMarquee" class="inline-block truncate">@{{ locationFull }}</span>
                    <span v-else class="location-marquee-container inline-block whitespace-nowrap">
                      <span class="location-marquee-text">@{{ locationFull }}</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>

             <div class="flex gap-2 sm:gap-4 self-start" :class="{ 'mb-12 sm:mb-14': !isCurrentUser }">
               <button class="text-center group" @click="$emit('open-friends')">
                 <div class="text-[9px] sm:text-[10px] text-primary-100 group-hover:text-white transition">好友</div>
                 <div class="text-sm sm:text-base font-bold text-white leading-tight group-hover:text-white transition">{{ stats.friends }}</div>
               </button>
               <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[9px] sm:text-[10px] text-primary-100">主揪</div>
                 <div class="text-sm sm:text-base font-bold text-white leading-tight">{{ stats.hosted }}</div>
               </div>
               <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[9px] sm:text-[10px] text-primary-100">貼文</div>
                 <div class="text-sm sm:text-base font-bold text-white leading-tight">{{ stats.posts }}</div>
               </div>
               <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
               <div class="text-center">
                 <div class="text-[9px] sm:text-[10px] text-primary-100">好評</div>
                 <div class="text-sm sm:text-base font-bold text-white leading-tight">{{ stats.reviews }}</div>
               </div>
             </div>
             <div v-if="isCurrentUser" class="flex items-center gap-1.5 sm:gap-2 self-end mt-1">
               <button
                 class="p-1 sm:p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                 title="編輯自我介紹"
                 @click="$emit('edit-bio')"
               >
                 <Pencil class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <button
                 class="p-1 sm:p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                 title="帳號設定"
                 @click="$emit('edit-profile')"
               >
                 <Settings class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
             </div>
          </div>
        </div>

        <div class="text-xs sm:text-sm">
           <div class="flex items-start gap-1.5 sm:gap-2 mb-2 relative">
             <p class="text-primary-100 font-light leading-relaxed line-clamp-2 flex-1 break-words">
            {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
          </p>
          </div>
        </div>
      </div>

      <div class="hidden md:flex items-start gap-6">
        <div class="flex flex-col items-center shrink-0 -mt-2">
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
              v-if="isCurrentUser"
              class="absolute bottom-2 right-2 p-2 bg-primary-600 rounded-full border-2 border-white hover:bg-primary-700 transition shadow-lg group-hover:scale-110 cursor-pointer"
              @click="$refs.fileInputDesktop.click()"
            >
              <Camera class="w-4 h-4 text-white" />
            </button>
          </div>
          <div v-if="user.tags && user.tags.length > 0" class="tags-container flex flex-wrap items-center justify-center mt-3 w-32 lg:w-36" style="gap: 0;">
            <span
              v-for="tag in user.tags"
              :key="tag"
              class="px-1.5 md:px-2 py-0.5 md:py-1 bg-white/10 rounded text-[10px] md:text-xs font-medium text-white border border-white/20 flex items-center whitespace-nowrap"
              :style="{ marginRight: '3px', marginBottom: '3px' }"
            >
              <Tag class="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" /> {{ tag }}
            </span>
          </div>
        </div>

        <div class="flex-1 text-left min-w-0">
          <div class="flex items-center justify-start gap-2 lg:gap-3 mb-2 flex-wrap">
            <h1 class="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white break-words min-w-0">{{ user.name || user.nickname || '用戶' }}</h1>
            <span
              class="px-2 md:px-3 lg:px-4 py-0.5 md:py-1 lg:py-1.5 bg-white/10 rounded text-[10px] md:text-xs lg:text-sm font-medium text-white border border-white/20 flex items-center shrink-0 overflow-hidden relative max-w-[150px] md:max-w-[180px] lg:max-w-[200px]"
              :title="locationFull"
            >
              <span v-if="!shouldMarquee" class="inline-block truncate">@{{ locationFull }}</span>
              <span v-else class="location-marquee-container inline-block whitespace-nowrap">
                <span class="location-marquee-text">@{{ locationFull }}</span>
              </span>
            </span>
          </div>
          <div class="flex items-start gap-1.5 md:gap-2 mb-3 md:mb-4 max-w-xl relative min-w-0">
            <p class="text-primary-100 text-sm md:text-base lg:text-lg font-light leading-relaxed flex-1 min-w-0 break-words">
            {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
          </p>
          </div>
        </div>

        <div class="flex flex-col items-end gap-3" :class="{ 'pb-16 md:pb-20': !isCurrentUser }">
          <div
            class="flex gap-4 lg:gap-8 bg-white/10 rounded-2xl p-4 lg:p-6 border border-white/20"
          >
            <button class="text-center group hover:scale-105 transition" @click="$emit('open-friends')">
              <div class="text-xs lg:text-sm text-primary-100 mb-1 group-hover:text-white transition">好友</div>
              <div class="text-2xl lg:text-3xl font-bold text-white leading-none group-hover:text-white transition">{{ stats.friends }}</div>
            </button>
            <div class="text-center">
              <div class="text-xs lg:text-sm text-primary-100 mb-1">主揪</div>
              <div class="text-2xl lg:text-3xl font-bold text-white leading-none">{{ stats.hosted }}</div>
            </div>
            <div class="text-center">
               <div class="text-xs lg:text-sm text-primary-100 mb-1">貼文</div>
               <div class="text-2xl lg:text-3xl font-bold text-white leading-none">{{ stats.posts }}</div>
            </div>
            <div class="text-center">
               <div class="text-xs lg:text-sm text-primary-100 mb-1">好評</div>
               <div class="text-2xl lg:text-3xl font-bold text-white leading-none">{{ stats.reviews }}</div>
            </div>
          </div>
          <div v-if="isCurrentUser" class="flex items-center gap-2">
            <button
              class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              title="編輯自我介紹"
              @click="$emit('edit-bio')"
            >
              <Pencil class="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              title="帳號設定"
              @click="$emit('edit-profile')"
            >
              <Settings class="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.location-marquee-container {
  display: inline-block;
  overflow: hidden;
  width: 100%;
}

.location-marquee-text {
  display: inline-block;
  animation: marquee-mobile 8s linear infinite;
  padding-left: 0;
}

@keyframes marquee-mobile {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100% + 80px));
  }
}

@media (min-width: 640px) {
  .location-marquee-text {
    animation: marquee-sm 8s linear infinite;
  }

  @keyframes marquee-sm {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-100% + 120px));
    }
  }
}

@media (min-width: 768px) {
  .location-marquee-text {
    animation: marquee-md 10s linear infinite;
  }

  @keyframes marquee-md {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-100% + 150px));
    }
  }
}

@media (min-width: 1024px) {
  .location-marquee-text {
    animation: marquee-lg 10s linear infinite;
  }

  @keyframes marquee-lg {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-100% + 180px));
    }
  }
}

@media (min-width: 1280px) {
  .location-marquee-text {
    animation: marquee-xl 12s linear infinite;
  }

  @keyframes marquee-xl {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(calc(-100% + 200px));
    }
  }
}

.location-marquee-container:hover .location-marquee-text {
  animation-play-state: paused;
}

.tags-container::after {
  content: '';
  flex: 1 1 100%;
  max-width: 100%;
}
</style>
