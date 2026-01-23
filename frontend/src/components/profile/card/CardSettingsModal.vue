<script setup>
import { ref, computed, watch } from 'vue'
import {
  X as XIcon,
  MapPin as MapPinIcon,
  Sparkles as SparklesIcon,
  Tent as TentIcon,
  Camera as CameraIcon,
  Edit as EditIcon,
  ArrowLeft as ArrowLeftIcon,
  PenLine as PenLineIcon,
  Upload as UploadIcon,
  Loader2 as LoaderIcon,
} from 'lucide-vue-next'

import WishBallPool from '@/components/profile/WishBallPool.vue'
import { uploadImage } from '@/api/storage'

const props = defineProps({
  isOpen: Boolean,
  user: Object,
  isMatchingEnabled: Boolean,
  wishlist: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'toggle-matching', 'save'])

// --- 狀態控制 ---
const isEditing = ref(false)
const isUploading = ref(false)
const fileInput = ref(null)
const galleryInput = ref(null)
const isGalleryUploading = ref(false)

// --- 編輯模式的表單資料 ---
const formData = ref({
  card_bio: '',
  card_tags: [],
  card_photo: '', // 獨立的名片照片
  gallery: [],
})

// 預設標籤庫
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

// --- 初始化資料 ---
const initFormData = () => {
  if (props.user) {
    formData.value = {
      // 若無 card_bio，預設為空 (不帶入 profile bio)
      card_bio: props.user.card_bio || '',
      // 若無 card_tags，預設帶入 profile tags 當初始值，之後分離
      card_tags: props.user.card_tags
        ? [...props.user.card_tags]
        : props.user.tags
          ? [...props.user.tags]
          : [],
      // 若無 card_photo，預設為空 (編輯時不顯示 avatar，鼓勵上傳新照)
      card_photo: props.user.card_photo || '',
      gallery: Array.isArray(props.user.gallery) ? [...props.user.gallery] : [],
    }
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) isEditing.value = false
  },
)

// --- 預覽資料 (Computed) ---
const cardPreview = computed(() => {
  if (!props.user) return {}

  // 照片邏輯：編輯模式優先顯示 formData，否則顯示 user.card_photo，最後 fallback 到 avatar
  const displayPhoto = isEditing.value
    ? formData.value.card_photo || props.user.card_photo || props.user.avatar
    : props.user.card_photo || props.user.avatar

  const displayBio = isEditing.value
    ? formData.value.card_bio
    : props.user.card_bio || '尚未填寫名片介紹...'

  const displayTags = isEditing.value
    ? formData.value.card_tags
    : props.user.card_tags || props.user.tags || []

  const displayGallery = isEditing.value
    ? formData.value.gallery
    : Array.isArray(props.user.gallery)
      ? props.user.gallery
      : []

  return {
    name: props.user.nickname || props.user.name || '使用者',
    age: props.user.age || '—',
    location: props.user.location || '台灣',
    spiritAnimal: props.user.spiritAnimal || '🐾',
    image: displayPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${props.user.uid}`,
    bio: displayBio,
    // [重點] 強制連動 user.wishlist (唯讀)
    wishlist: props.wishlist?.length ? props.wishlist : props.user.wishlist || [],
    tags: displayTags,
    gallery: displayGallery,
  }
})

// --- 編輯邏輯 ---
const startEditing = () => {
  initFormData()
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const toggleTag = (tag) => {
  const index = formData.value.card_tags.indexOf(tag)
  if (index === -1) {
    if (formData.value.card_tags.length >= 5) return alert('最多 5 個標籤')
    formData.value.card_tags.push(tag)
  } else {
    formData.value.card_tags.splice(index, 1)
  }
}

// 處理照片上傳
const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isUploading.value = true
  try {
    const url = await uploadImage(file, 'card-photos')
    formData.value.card_photo = url
  } catch (error) {
    console.error('上傳失敗', error)
    alert('照片上傳失敗，請重試')
  } finally {
    isUploading.value = false
  }
}

const handleSave = () => {
  // Emit 包含 card_ 前綴的獨立資料
  emit('save', {
    card_bio: formData.value.card_bio,
    card_tags: formData.value.card_tags,
    card_photo: formData.value.card_photo,
    gallery: formData.value.gallery,
  })
  isEditing.value = false
}

const triggerGalleryUpload = () => {
  if (galleryInput.value) galleryInput.value.click()
}

const handleGalleryChange = async (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const remaining = 6 - formData.value.gallery.length
  if (remaining <= 0) {
    alert('最多 6 張照片')
    return
  }
  const uploadFiles = files.slice(0, remaining)
  isGalleryUploading.value = true
  try {
    const urls = []
    for (const file of uploadFiles) {
      const url = await uploadImage(file, 'gallery')
      urls.push(url)
    }
    formData.value.gallery = [...formData.value.gallery, ...urls]
  } catch (error) {
    console.error('相簿上傳失敗', error)
    alert('相簿上傳失敗，請重試')
  } finally {
    isGalleryUploading.value = false
    event.target.value = ''
  }
}

const removeGalleryImage = (idx) => {
  formData.value.gallery.splice(idx, 1)
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
            <div class="relative h-96 w-full overflow-hidden group bg-gray-200">
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

              <section v-if="cardPreview.gallery && cardPreview.gallery.length">
                <h3
                  class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center"
                >
                  <CameraIcon class="w-4 h-4 mr-1" /> 旅遊相簿
                </h3>
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(photo, idx) in cardPreview.gallery"
                    :key="photo || idx"
                    class="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  >
                    <img :src="photo" class="w-full h-full object-cover" />
                  </div>
                </div>
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

              <section v-if="cardPreview.tags.length">
                <h3
                  class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center"
                >
                  <TentIcon class="w-4 h-4 mr-1 text-green-600" /> 旅行風格
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in cardPreview.tags"
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
              <CameraIcon class="w-4 h-4 text-primary-500" /> 名片封面照
            </label>
            <div
              class="relative w-full aspect-[4/5] bg-gray-200 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 group"
            >
              <img
                v-if="formData.card_photo || props.user.card_photo || props.user.avatar"
                :src="formData.card_photo || props.user.card_photo || props.user.avatar"
                class="w-full h-full object-cover"
              />

              <div
                class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                @click="triggerFileUpload"
              >
                <UploadIcon class="w-8 h-8 text-white mb-2" />
                <span class="text-white text-xs font-bold">更換照片 (支援長方形)</span>
              </div>

              <div
                v-if="isUploading"
                class="absolute inset-0 bg-black/60 flex items-center justify-center z-10"
              >
                <LoaderIcon class="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />
            <p class="text-xs text-gray-500">建議上傳長方形或方形的生活照，讓旅伴更認識你。</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex items-center gap-2">
              <PenLineIcon class="w-4 h-4 text-primary-500" /> 名片自我介紹 (Card Bio)
            </label>
            <textarea
              v-model="formData.card_bio"
              rows="4"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 outline-none resize-none shadow-sm"
              placeholder="寫一段專屬於抽卡的自我介紹..."
            ></textarea>
            <p class="text-xs text-gray-400">此介紹只會顯示在抽卡頁面，不會影響您的個人檔案。</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex items-center justify-between">
              <span class="flex items-center gap-2">
                <CameraIcon class="w-4 h-4 text-primary-500" /> 旅遊相簿
              </span>
              <span class="text-xs text-gray-500">{{ formData.gallery.length }}/6</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-if="formData.gallery.length < 6"
                type="button"
                class="aspect-square rounded-xl border-2 border-dashed border-gray-300 text-gray-400 flex flex-col items-center justify-center hover:border-primary-400 hover:text-primary-500 transition"
                @click="triggerGalleryUpload"
              >
                <UploadIcon class="w-5 h-5 mb-1" />
                <span class="text-xs font-bold">新增</span>
              </button>
              <div
                v-for="(photo, idx) in formData.gallery"
                :key="photo"
                class="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
              >
                <img :src="photo" class="w-full h-full object-cover" />
                <button
                  type="button"
                  class="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  @click="removeGalleryImage(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <input
              ref="galleryInput"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleGalleryChange"
            />
            <div v-if="isGalleryUploading" class="text-xs text-gray-500 flex items-center gap-2">
              <LoaderIcon class="w-4 h-4 animate-spin" />
              上傳中...
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-700 flex justify-between">
              <span class="flex items-center gap-2"
                ><TentIcon class="w-4 h-4 text-green-600" /> 選擇標籤</span
              >
              <span class="text-xs text-gray-500">{{ formData.card_tags.length }}/5</span>
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
                  formData.card_tags.includes(tag)
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm transform scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                "
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div class="space-y-2 opacity-80">
            <label class="text-sm font-bold text-gray-700 flex items-center gap-2">
              <SparklesIcon class="w-4 h-4 text-yellow-500" />
              許願球池 (連動中)
            </label>

            <div
              class="relative mt-2 h-40 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden"
            >
              <WishBallPool :wishlist="props.wishlist?.length ? props.wishlist : props.user?.wishlist || []" />
            </div>

            <p class="text-xs text-orange-500 font-medium">
              * 許願球池與個人檔案同步，如需修改請至個人檔案頁面。
            </p>
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
