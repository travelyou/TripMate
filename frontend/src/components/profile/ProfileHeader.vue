<script setup>
import { ref, computed } from 'vue'
import {
  Camera,
  Tag,
  Settings,
  Pencil,
  MessageCircle,
  UserPlus,
  IdCard, // [NEW] 引入名片圖示
} from 'lucide-vue-next'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  isCurrentUser: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  stats: {
    type: Object,
    required: false,
    default: () => ({
      hosted: 0,
      posts: 0,
      reviews: 0,
      friends: 0,
    }),
  },
  friendRequestStatus: {
    type: String,
    default: null, // 'none' | 'sent' | 'received' | 'accepted'
  },
})

// [NEW] 加入 'open-card-settings' 和 'open-settings' 事件
const emit = defineEmits([
  'edit-profile',
  'edit-bio',
  'update-avatar',
  'open-friends',
  'chat',
  'add-friend',
  'start-test',
  'open-card-settings',
  'open-settings',
])

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

    <div class="relative z-10">
      <div class="md:hidden flex flex-col gap-4">
        <div class="flex items-start gap-3 sm:gap-4">
          <div class="flex flex-col items-center shrink-0 -mt-2">
            <div class="relative group">
              <div
                v-if="loading"
                class="w-20 h-20 rounded-full border-4 border-white/60 bg-white/30 animate-pulse"
              ></div>
              <img
                v-else
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
                v-if="isCurrentUser && !loading"
                class="absolute bottom-0 right-0 p-1.5 bg-primary-600 rounded-full border border-white hover:bg-primary-700 transition shadow-lg cursor-pointer"
                @click="$refs.fileInputMobile.click()"
              >
                <Camera class="w-3 h-3 text-white" />
              </button>
            </div>
            <div
              v-if="loading"
              class="tags-container flex flex-wrap items-center justify-center mt-2 w-20 sm:w-24"
              style="gap: 0"
            >
              <span
                class="px-2 py-1 bg-white/20 rounded text-[9px] border border-white/20 flex items-center"
              ></span>
            </div>
            <div
              v-else-if="user.tags && user.tags.length > 0"
              class="tags-container flex flex-wrap items-center justify-center mt-2 w-20 sm:w-24"
              style="gap: 0"
            >
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

          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between mb-1 gap-1.5 sm:gap-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-0">
                    <h1
                      class="text-base sm:text-xl font-bold tracking-tight text-white break-words min-w-0 flex-1"
                    >
                      <span
                        v-if="loading"
                        class="inline-block h-4 w-24 bg-white/30 rounded animate-pulse"
                      ></span>
                      <span v-else>{{ user.name || user.nickname || '用戶' }}</span>
                    </h1>
                    <span
                      class="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-white/10 rounded text-[10px] sm:text-xs font-medium text-white border border-white/20 inline-flex items-center overflow-hidden relative max-w-full sm:max-w-[120px]"
                      :title="locationFull"
                    >
                      <span
                        v-if="loading"
                        class="inline-block h-2 w-16 bg-white/30 rounded animate-pulse"
                      ></span>
                      <span v-else-if="!shouldMarquee" class="inline-block truncate"
                        >@{{ locationFull }}</span
                      >
                      <span
                        v-else
                        class="location-marquee-container inline-block whitespace-nowrap"
                      >
                        <span class="location-marquee-text">@{{ locationFull }}</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="flex gap-2 sm:gap-4 self-start"
              :class="{ 'mb-12 sm:mb-14': !isCurrentUser }"
            >
              <button class="text-center group" :disabled="loading" @click="$emit('open-friends')">
                <div
                  class="text-[9px] sm:text-[10px] text-primary-100 group-hover:text-white transition"
                >
                  好友
                </div>
                <div
                  class="text-sm sm:text-base font-bold text-white leading-tight group-hover:text-white transition"
                >
                  <span
                    v-if="loading"
                    class="inline-block h-3 w-6 bg-white/30 rounded animate-pulse"
                  ></span
                  ><span v-else>{{ stats.friends }}</span>
                </div>
              </button>
              <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
              <div class="text-center">
                <div class="text-[9px] sm:text-[10px] text-primary-100">主揪</div>
                <div class="text-sm sm:text-base font-bold text-white leading-tight">
                  <span
                    v-if="loading"
                    class="inline-block h-3 w-6 bg-white/30 rounded animate-pulse"
                  ></span
                  ><span v-else>{{ stats.hosted }}</span>
                </div>
              </div>
              <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
              <div class="text-center">
                <div class="text-[9px] sm:text-[10px] text-primary-100">貼文</div>
                <div class="text-sm sm:text-base font-bold text-white leading-tight">
                  <span
                    v-if="loading"
                    class="inline-block h-3 w-6 bg-white/30 rounded animate-pulse"
                  ></span
                  ><span v-else>{{ stats.posts }}</span>
                </div>
              </div>
              <div class="w-px bg-white/20 h-5 sm:h-6 self-center"></div>
              <div class="text-center">
                <div class="text-[9px] sm:text-[10px] text-primary-100">好評</div>
                <div class="text-sm sm:text-base font-bold text-white leading-tight">
                  <span
                    v-if="loading"
                    class="inline-block h-3 w-6 bg-white/30 rounded animate-pulse"
                  ></span
                  ><span v-else>{{ stats.reviews }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="isCurrentUser && !loading"
              class="flex items-center gap-1.5 sm:gap-2 self-end mt-1"
            >
              <button
                class="p-1 sm:p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition flex items-center gap-1"
                title="我的名片"
                @click="$emit('open-card-settings')"
              >
                <IdCard class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
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
                @click="$emit('open-settings')"
              >
                <Settings class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div v-else-if="!loading" class="flex gap-2 self-end mt-1">
              <button
                :class="[
                  'flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg transition whitespace-nowrap',
                  friendRequestStatus === 'accepted'
                    ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                    : friendRequestStatus === 'sent'
                      ? 'bg-orange-500/20 text-white border border-orange-500'
                      : 'bg-white text-primary-600 hover:bg-gray-100',
                ]"
                @click="$emit('add-friend')"
              >
                <UserPlus class="w-4 h-4" />
                {{
                  friendRequestStatus === 'accepted'
                    ? '解除好友'
                    : friendRequestStatus === 'sent'
                      ? '已發送邀請'
                      : '加好友'
                }}
              </button>
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-400 text-white rounded-full text-xs font-bold shadow-lg hover:bg-secondary-500 transition"
                @click="$emit('chat')"
              >
                <MessageCircle class="w-4 h-4" /> 聊聊
              </button>
            </div>
          </div>
        </div>

        <div class="text-xs sm:text-sm">
          <div class="flex items-start gap-1.5 sm:gap-2 mb-2 relative">
            <p class="text-primary-100 font-light leading-relaxed line-clamp-2 flex-1 break-words">
              <span
                v-if="loading"
                class="block h-3 w-56 bg-white/30 rounded animate-pulse mb-2"
              ></span>
              <span v-if="loading" class="block h-3 w-40 bg-white/20 rounded animate-pulse"></span>
              <span v-else>{{ user.bio || '這傢伙很懶，什麼都沒留下...' }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="hidden md:flex items-start gap-6">
        <div class="flex flex-col items-center shrink-0 -mt-2">
          <div class="relative group">
            <div
              v-if="loading"
              class="w-32 h-32 rounded-full border-4 border-white/60 bg-white/30 animate-pulse"
            ></div>
            <img
              v-else
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
              v-if="isCurrentUser && !loading"
              class="absolute bottom-2 right-2 p-2 bg-primary-600 rounded-full border-2 border-white hover:bg-primary-700 transition shadow-lg group-hover:scale-110 cursor-pointer"
              @click="$refs.fileInputDesktop.click()"
            >
              <Camera class="w-4 h-4 text-white" />
            </button>
          </div>

          <div
            v-if="loading"
            class="tags-container flex flex-wrap items-center justify-center mt-3 w-32 lg:w-36"
            style="gap: 0"
          >
            <span class="px-12 py-3 bg-white/20 rounded-xl text-[10px] flex items-center"></span>
          </div>
          <div
            v-else-if="user.tags && user.tags.length > 0"
            class="tags-container flex flex-wrap items-center justify-center mt-3 w-32 lg:w-36"
            style="gap: 0"
          >
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
            <h1
              class="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-white break-words min-w-0"
            >
              <span
                v-if="loading"
                class="inline-block h-6 w-48 bg-white/30 rounded animate-pulse"
              ></span>
              <span v-else>{{ user.name || user.nickname || '用戶' }}</span>
            </h1>
            <span
              class="px-2 md:px-3 lg:px-4 py-0.5 md:py-1 lg:py-1.5 bg-white/10 rounded text-[10px] md:text-xs lg:text-sm font-medium text-white border border-white/20 flex items-center shrink-0 overflow-hidden relative max-w-[150px] md:max-w-[180px] lg:max-w-[200px]"
              :title="locationFull"
            >
              <span
                v-if="loading"
                class="inline-block h-3 w-20 bg-white/30 rounded animate-pulse"
              ></span>
              <span v-else-if="!shouldMarquee" class="inline-block truncate"
                >@{{ locationFull }}</span
              >
              <span v-else class="location-marquee-container inline-block whitespace-nowrap">
                <span class="location-marquee-text">@{{ locationFull }}</span>
              </span>
            </span>
          </div>
          <div class="flex items-start gap-1.5 md:gap-2 mb-3 md:mb-4 max-w-xl relative min-w-0">
            <p
              class="text-primary-100 text-sm md:text-base lg:text-lg font-light leading-relaxed flex-1 min-w-0 break-words"
            >
              <span
                v-if="loading"
                class="block h-4 w-72 bg-white/30 rounded animate-pulse mb-2"
              ></span>
              <span v-if="loading" class="block h-4 w-56 bg-white/20 rounded animate-pulse"></span>
              <span v-else>{{ user.bio || '這傢伙很懶，什麼都沒留下...' }}</span>
            </p>
          </div>
        </div>

        <div
          class="flex flex-col items-end gap-3 shrink-0"
          :class="{ 'pb-16 md:pb-20': !isCurrentUser }"
        >
          <div
            class="flex gap-3 md:gap-4 lg:gap-6 bg-white/10 rounded-2xl p-3 md:p-4 lg:p-6 border border-white/20"
          >
            <button
              class="text-center group hover:scale-105 transition"
              :disabled="loading"
              @click="$emit('open-friends')"
            >
              <div
                class="text-xs lg:text-sm text-primary-100 mb-1 group-hover:text-white transition"
              >
                好友
              </div>
              <div
                class="text-2xl lg:text-3xl font-bold text-white leading-none group-hover:text-white transition"
              >
                <span
                  v-if="loading"
                  class="inline-block h-6 w-10 bg-white/30 rounded animate-pulse"
                ></span
                ><span v-else>{{ stats.friends }}</span>
              </div>
            </button>
            <div class="text-center shrink-0">
              <div class="text-xs lg:text-sm text-primary-100 mb-1">主揪</div>
              <div class="text-2xl lg:text-3xl font-bold text-white leading-none">
                <span
                  v-if="loading"
                  class="inline-block h-6 w-10 bg-white/30 rounded animate-pulse"
                ></span
                ><span v-else>{{ stats.hosted }}</span>
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs lg:text-sm text-primary-100 mb-1">貼文</div>
              <div class="text-2xl lg:text-3xl font-bold text-white leading-none">
                <span
                  v-if="loading"
                  class="inline-block h-6 w-10 bg-white/30 rounded animate-pulse"
                ></span
                ><span v-else>{{ stats.posts }}</span>
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs lg:text-sm text-primary-100 mb-1">好評</div>
              <div class="text-2xl lg:text-3xl font-bold text-white leading-none">
                <span
                  v-if="loading"
                  class="inline-block h-6 w-10 bg-white/30 rounded animate-pulse"
                ></span
                ><span v-else>{{ stats.reviews }}</span>
              </div>
            </div>
          </div>

          <div v-if="isCurrentUser && !loading" class="flex items-center gap-2">
            <button
              class="p-1.5 md:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition flex items-center gap-2 px-3"
              title="我的名片"
              @click="$emit('open-card-settings')"
            >
              <IdCard class="w-4 h-4 md:w-5 md:h-5" />
              <span class="text-sm font-bold">旅伴名片</span>
            </button>
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
              @click="$emit('open-settings')"
            >
              <Settings class="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <div v-else-if="!loading" class="flex gap-2">
            <button
              :class="[
                'flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm lg:text-base font-bold shadow-lg transition whitespace-nowrap',
                friendRequestStatus === 'accepted'
                  ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                  : friendRequestStatus === 'sent'
                    ? 'bg-white/20 text-white border border-white'
                    : 'bg-white text-primary-600 hover:bg-gray-100',
              ]"
              @click="$emit('add-friend')"
            >
              <UserPlus class="w-5 h-5" />
              {{
                friendRequestStatus === 'accepted'
                  ? '解除好友'
                  : friendRequestStatus === 'sent'
                    ? '已發送邀請'
                    : '加好友'
              }}
            </button>
            <button
              class="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-secondary-400 text-white rounded-full text-xs md:text-sm lg:text-base font-bold shadow-lg hover:bg-secondary-500 transition whitespace-nowrap"
              @click="$emit('chat')"
            >
              <MessageCircle class="w-4 h-4 md:w-5 md:h-5" /> 聊聊
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
