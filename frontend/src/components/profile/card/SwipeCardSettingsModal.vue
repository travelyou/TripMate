<script setup>
import { ref, computed, watch } from 'vue'
import {
  X as XIcon,
  MapPin as MapPinIcon,
  Sparkles as SparklesIcon,
  Tent as TentIcon,
  Camera as CameraIcon,
  Edit as EditIcon,
  UserCog as UserEditIcon,
  ArrowLeft as ArrowLeftIcon,
  PenLine as PenLineIcon,
  Plus as PlusIcon,
} from 'lucide-vue-next'
import WishBallPool from '@/components/WishBallPool.vue'

const props = defineProps({
  isOpen: Boolean,
  user: Object,
  isMatchingEnabled: Boolean,
})

const emit = defineEmits(['close', 'toggle-matching', 'save'])

// --- 狀態控制 ---
const isEditing = ref(false) // 控制是否在編輯模式

// --- 編輯模式的表單資料 ---
const formData = ref({
  bio: '',
  tags: [],
  wishlist: [],
})
const newWishItem = ref('')

// 當打開 Modal 或切換到編輯模式時，初始化表單
const initFormData = () => {
  if (props.user) {
    formData.value = {
      bio: props.user.bio || '',
      tags: props.user.tags ? [...props.user.tags] : [],
      wishlist: props.user.wishlist ? [...props.user.wishlist] : [],
    }
  }
}

// 監聽 isOpen，每次打開重置回預覽模式
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      isEditing.value = false
    }
  },
)

// --- 預覽模式的資料 (Computed) ---
const cardPreview = computed(() => {
  if (!props.user) return {}
  // 如果正在編輯，預覽可以選擇顯示「編輯中的資料」或是「原始資料」
  // 這裡我們顯示原始資料 (props.user)，等儲存後才會更新
  return {
    name: props.user.nickname || props.user.name || '使用者',
    age: props.user.age || '—',
    location: props.user.location || '台灣',
    spiritAnimal: props.user.spiritAnimal || '🐾',
    image: props.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${props.user.uid}`,
    bio: props.user.bio || '尚未填寫名片介紹...',
    wishlist: props.user.wishlist || [],
    activities: props.user.tags || [],
    gallery: props.user.gallery || [],
  }
})

// --- 編輯邏輯 ---
const PREDEFINED_TAGS = [
  '美食吃貨',
  '攝影愛好',
  '登山健行',
  '海島放鬆',
  '歷史文化',
  '背包客',
  '豪華度假',
  '咖啡廳巡禮',
  '極限運動',
  '自駕遊',
  '博物館迷',
  '獨旅',
  '購物狂',
  '自然生態',
  '露營',
  '文青之旅',
]

const startEditing = () => {
  initFormData()
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const toggleTag = (tag) => {
  const index = formData.value.tags.indexOf(tag)
  if (index === -1) {
    if (formData.value.tags.length >= 5) return alert('最多 5 個標籤')
    formData.value.tags.push(tag)
  } else {
    formData.value.tags.splice(index, 1)
  }
}

const addWishItem = () => {
  const val = newWishItem.value.trim()
  if (!val) return
  if (formData.value.wishlist.includes(val)) return alert('已存在')
  if (formData.value.wishlist.length >= 10) return alert('最多 10 個')
  formData.value.wishlist.push(val)
  newWishItem.value = ''
}

const removeWishItem = (index) => {
  formData.value.wishlist.splice(index, 1)
}

const handleSave = () => {
  emit('save', formData.value)
  isEditing.value = false // 儲存後回到預覽
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <div
      class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20">
        <div class="flex items-center gap-2">
          <button
            v-if="isEditing"
            @click="cancelEditing"
            class="p-1 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <ArrowLeftIcon class="w-6 h-6" />
          </button>
          <span v-else class="w-2 h-6 bg-primary-500 rounded-full"></span>

          <h3 class="text-lg font-bold text-gray-800">
            {{ isEditing ? '編輯名片內容' : '我的旅伴名片' }}
          </h3>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-full transition">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div v-if="!isEditing" class="flex flex-col h-full overflow-hidden">
        <div
          class="p-4 bg-gradient-to-r from-primary-50 to-white border-b border-primary-100 flex items-center justify-between shrink-0"
        >
          <div>
            <div class="font-bold text-gray-800 flex items-center gap-2 text-sm">
              配對功能
              <span
                v-if="isMatchingEnabled"
                class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                >進行中</span
              >
              <span v-else class="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full"
                >已隱藏</span
              >
            </div>
            <div class="text-xs text-gray-500 mt-1">開啟後，其他旅伴才能抽到你</div>
          </div>
          <button
            @click="$emit('toggle-matching')"
            :class="isMatchingEnabled ? 'bg-primary-600' : 'bg-gray-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300"
          >
            <span
              :class="isMatchingEnabled ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 rounded-full bg-white transition duration-300 shadow-sm"
            />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 bg-gray-50 detail-scrollbar">
          <div class="bg-white pb-10 min-h-full">
            <div class="relative h-80 w-full overflow-hidden group">
              <img :src="cardPreview.image" class="w-full h-full object-cover" />
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
              ></div>

              <div class="absolute bottom-0 left-0 p-6 text-white w-full">
                <h2 class="text-3xl font-black mb-1 flex items-end gap-2 drop-shadow-md">
                  {{ cardPreview.name }}
                  <span class="text-xl font-medium opacity-90">{{ cardPreview.age }}</span>
                </h2>
                <div class="flex items-center text-sm font-bold opacity-90">
                  <MapPinIcon class="w-4 h-4 mr-1 text-primary-200" /> {{ cardPreview.location }}
                </div>
              </div>

              <button
                @click="startEditing"
                class="absolute top-4 right-4 bg-white/90 backdrop-blur text-primary-700 px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-white transition transform hover:scale-105"
              >
                <EditIcon class="w-4 h-4" /> 修改名片
              </button>
            </div>

            <div class="p-6 space-y-8">
              <section>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  關於我
                </h3>
                <p class="text-gray-700 leading-relaxed text-base">{{ cardPreview.bio }}</p>
              </section>

              <section v-if="cardPreview.wishlist.length">
                <h3
                  class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center"
                >
                  <SparklesIcon class="w-4 h-4 mr-1 text-primary-500" /> 想去的地方 (許願球池)
                </h3>
                <div
                  class="h-40 rounded-xl overflow-hidden shadow-inner bg-gray-50 border border-gray-100"
                >
                  <WishBallPool :wishlist="cardPreview.wishlist" />
                </div>
              </section>

              <section v-if="cardPreview.activities.length">
                <h3
                  class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center"
                >
                  <TentIcon class="w-4 h-4 mr-1 text-green-600" /> 旅行風格
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in cardPreview.activities"
                    :key="tag"
                    class="px-3 py-1.5 border border-secondary-200 bg-secondary-50 text-secondary-700 rounded-lg text-sm font-bold"
                    >#{{ tag }}</span
                  >
                </div>
              </section>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 bg-white shrink-0">
          <button
            @click="$emit('close')"
            class="w-full py-3 bg-secondary-100 text-secondary-700 rounded-xl font-bold hover:bg-secondary-200 transition"
          >
            關閉
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col h-full overflow-hidden bg-gray-50">
        <div class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">
          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex items-center gap-2">
              <PenLineIcon class="w-4 h-4 text-primary-500" /> 自我介紹 (Bio)
            </label>
            <textarea
              v-model="formData.bio"
              rows="4"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 outline-none resize-none shadow-sm"
              placeholder="寫下你的旅行宣言..."
            ></textarea>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex justify-between">
              <span class="flex items-center gap-2"
                ><TentIcon class="w-4 h-4 text-green-600" /> 選擇標籤</span
              >
              <span class="text-xs text-gray-500">{{ formData.tags.length }}/5</span>
            </label>
            <div
              class="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
            >
              <button
                v-for="tag in PREDEFINED_TAGS"
                :key="tag"
                @click="toggleTag(tag)"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition border"
                :class="
                  formData.tags.includes(tag)
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm transform scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                "
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex items-center gap-2">
              <SparklesIcon class="w-4 h-4 text-yellow-500" />
              許願球池
            </label>
            <div class="flex gap-2">
              <input
                v-model="newWishItem"
                @keyup.enter="addWishItem"
                type="text"
                class="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 outline-none shadow-sm"
                placeholder="輸入城市按 Enter"
              />
              <button
                @click="addWishItem"
                class="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-bold shadow-sm"
              >
                <PlusIcon class="w-5 h-5" />
              </button>
            </div>

            <div
              class="relative mt-2 h-40 bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden"
            >
              <WishBallPool :wishlist="formData.wishlist" />
            </div>

            <div
              class="flex flex-wrap gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
              v-if="formData.wishlist.length > 0"
            >
              <span
                v-for="(item, idx) in formData.wishlist"
                :key="idx"
                class="inline-flex items-center px-2 py-1 bg-gray-100 border rounded-full text-xs text-gray-600 font-bold"
              >
                {{ item }}
                <button @click="removeWishItem(idx)" class="ml-1 text-gray-400 hover:text-red-500">
                  <XIcon class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          <button
            @click="cancelEditing"
            class="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition"
          >
            取消
          </button>
          <button
            @click="handleSave"
            class="px-8 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-lg transition transform active:scale-95"
          >
            儲存變更
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.detail-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.detail-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.detail-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}
</style>
