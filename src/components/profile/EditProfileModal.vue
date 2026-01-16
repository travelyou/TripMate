<script setup>
import { reactive, watch, ref } from 'vue'
import { X, ArrowRight, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  user: {
    type: Object,
    required: true
  },
  wishlist: {
    type: Array,
    required: true
  },
  hiddenStamps: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save', 'save-field', 'update-wishlist'])

const editForm = reactive({})
const savingFields = reactive({
  name: false,
  location: false,
  bio: false,
  tags: false,
  wishlist: false
})

const tagInputValue = ref('')
const wishlistInputValue = ref('')
const isSaving = ref(false)

// Init form when modal opens or user changes
const isInitialized = ref(false)
watch(
  () => [props.isOpen, props.user, props.wishlist],
  ([isOpen, newUser, newWishlist]) => {
    if (isOpen && newUser && !isInitialized.value) {
      Object.assign(editForm, JSON.parse(JSON.stringify(newUser)))
      // Merge wishlist into form for editing (only on initial open)
      editForm.wishlist = Array.isArray(newWishlist) ? [...newWishlist] : []
      editForm.hiddenStamps = Array.isArray(props.hiddenStamps) ? [...props.hiddenStamps] : []
      // 確保 location 有預設值
      if (!editForm.location) {
        editForm.location = '台灣'
      }
      // 確保 wishlist 是數組
      if (!Array.isArray(editForm.wishlist)) {
        editForm.wishlist = []
      }
      isInitialized.value = true
    } else if (!isOpen) {
      // Reset when modal closes
      isInitialized.value = false
      isSaving.value = false
    } else if (isOpen && isInitialized.value && newWishlist) {
      // 當彈窗已打開且 wishlist 更新時，同步更新 editForm.wishlist
      editForm.wishlist = Array.isArray(newWishlist) ? [...newWishlist] : []
    }
  },
  { immediate: true }
)

function save() {
  if (isSaving.value) return
  isSaving.value = true
  // 確保 wishlist 和 tags 是數組
  const formData = {
    ...editForm,
    wishlist: Array.isArray(editForm.wishlist) ? editForm.wishlist : [],
    tags: Array.isArray(editForm.tags) ? editForm.tags : [],
  }
  emit('save', formData)
}

async function saveField(fieldName) {
  savingFields[fieldName] = true
  try {
    const fieldData = {
      [fieldName]: editForm[fieldName]
    }
    
    // 特殊處理某些欄位
    if (fieldName === 'name') {
      fieldData.nickname = editForm.name
    }
    
    emit('save-field', { field: fieldName, data: fieldData })
  } catch (error) {
    console.error(`保存 ${fieldName} 失敗：`, error)
  } finally {
    savingFields[fieldName] = false
  }
}

// 箭頭按鈕只添加項目，不保存（保存由底部的「儲存變更」按鈕統一處理）
function addTagAndClear() {
  if (tagInputValue.value && tagInputValue.value.trim()) {
    addTag()
  }
}

function addWishlistAndClear() {
  if (wishlistInputValue.value && wishlistInputValue.value.trim()) {
    addWishlist()
  }
}

function addWishlist(e) {
  const val = wishlistInputValue.value.trim()
  if (val) {
    if (!editForm.wishlist) editForm.wishlist = []
    if (editForm.wishlist.length >= 5) return
    // 限制每個許願內容最多10字
    const trimmedVal = val.length > 10 ? val.substring(0, 10) : val
    editForm.wishlist.push(trimmedVal)
    wishlistInputValue.value = ''
    // 通知父組件更新右側許願球池
    emit('update-wishlist', [...editForm.wishlist])
  }
}

function removeWishlist(idx) {
  editForm.wishlist.splice(idx, 1)
  // 通知父組件更新右側許願球池
  emit('update-wishlist', [...editForm.wishlist])
}

function addTag(e) {
  const val = tagInputValue.value.trim()
  if (val) {
    if (!editForm.tags) editForm.tags = []
    if (editForm.tags.length >= 5) return
    // 限制每個標籤最多10字
    const trimmedVal = val.length > 10 ? val.substring(0, 10) : val
    editForm.tags.push(trimmedVal)
    tagInputValue.value = ''
  }
}

function removeTag(idx) {
  editForm.tags.splice(idx, 1)
}

function restoreStamp(key) {
  const idx = editForm.hiddenStamps.indexOf(key)
  if (idx > -1) {
    editForm.hiddenStamps.splice(idx, 1)
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up"
    >
      <div
        class="p-6 border-b border-secondary-100 flex justify-between items-center sticky top-0 bg-white z-10"
      >
        <h2 class="text-xl font-bold text-secondary-900">編輯個人資料</h2>
        <button
          class="p-2 hover:bg-secondary-50 rounded-full transition"
          @click="$emit('close')"
        >
          <X class="w-6 h-6 text-secondary-500" />
        </button>
      </div>
      <div class="p-6 space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-secondary-700 flex-shrink-0">顯示名稱</label>
              <span class="text-xs text-secondary-500 flex-shrink-0 ml-2">{{ (editForm.name || '').length }}/35</span>
            </div>
            <input
              v-model="editForm.name"
              type="text"
              maxlength="35"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none box-border"
            />
          </div>
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-secondary-700 flex-shrink-0">地區</label>
              <span class="text-xs text-secondary-500 flex-shrink-0 ml-2">{{ (editForm.location || '').length }}/35</span>
            </div>
            <input
              v-model="editForm.location"
              type="text"
              placeholder="台灣"
              maxlength="35"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none box-border"
            />
          </div>
          <div class="md:col-span-2 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-secondary-700 flex-shrink-0">個人簡介</label>
              <span class="text-xs text-secondary-500 flex-shrink-0 ml-2">{{ (editForm.bio || '').length }}/100</span>
            </div>
            <textarea
              v-model="editForm.bio"
              rows="3"
              maxlength="100"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none box-border"
            ></textarea>
          </div>

          <!-- Tags Management -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">興趣標籤 (最多5個，每個最多10字)</label>
            <div class="flex flex-wrap gap-2 mb-3">
              <span
                v-for="(tag, idx) in editForm.tags"
                :key="idx"
                class="px-3 py-1 bg-primary-50 text-primary-700 rounded-full flex items-center border border-primary-100"
              >
                #{{ tag }}
                <button class="ml-1 hover:text-red-500" @click="removeTag(idx)">
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
            <div class="relative">
              <input
                v-model="tagInputValue"
                :placeholder="editForm.tags?.length >= 5 ? '已達標籤上限 (5/5)' : '輸入標籤按 Enter 新增 (最多10字，例如：登山、攝影)'"
                maxlength="10"
                :class="[
                  'w-full px-4 py-2 pr-12 border rounded-xl outline-none transition',
                  editForm.tags?.length >= 5
                    ? 'border-secondary-300 text-secondary-500 placeholder-secondary-400 bg-secondary-50 cursor-not-allowed'
                    : 'border-secondary-200 focus:ring-2 focus:ring-primary-500'
                ]"
                :disabled="editForm.tags?.length >= 5"
                @keyup.enter="addTag"
              />
              <button
                @click="addTagAndClear"
                :disabled="editForm.tags?.length >= 5 || !tagInputValue.trim()"
                class="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="新增標籤"
              >
                <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Wishlist Management in Modal -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">許願球池 (最多5個，每個最多10字)</label>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="(wish, idx) in editForm.wishlist"
              :key="idx"
              class="px-3 py-1 bg-primary-50 text-primary-700 rounded-full flex items-center border border-primary-100"
            >
              {{ wish }}
              <button class="ml-1 hover:text-red-500" @click="removeWishlist(idx)">
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>
          <div class="relative">
            <input
              v-model="wishlistInputValue"
              :placeholder="editForm.wishlist?.length >= 5 ? '已達許願上限 (5/5)' : '輸入許願內容按 Enter 新增 (最多10字)'"
              maxlength="10"
              :class="[
                'w-full px-4 py-2 pr-12 border rounded-xl outline-none transition',
                editForm.wishlist?.length >= 5
                  ? 'border-secondary-300 text-secondary-500 placeholder-secondary-400 bg-secondary-50 cursor-not-allowed'
                  : 'border-secondary-200 focus:ring-2 focus:ring-primary-500'
              ]"
              :disabled="editForm.wishlist?.length >= 5"
              @keyup.enter="addWishlist"
            />
            <button
              @click="addWishlistAndClear"
              :disabled="editForm.wishlist?.length >= 5 || !wishlistInputValue.trim()"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="新增許願"
            >
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Hidden Footprints Management -->
        <div v-if="editForm.hiddenStamps && editForm.hiddenStamps.length > 0">
          <label class="block text-sm font-medium text-secondary-700 mb-2">隱藏的足跡</label>
          <div class="bg-secondary-50 rounded-xl p-4 space-y-2">
            <div
              v-for="stampKey in editForm.hiddenStamps"
              :key="stampKey"
              class="flex items-center justify-between bg-white p-3 rounded-lg border border-secondary-100"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">🙈</span>
                <div class="text-sm">
                  <div class="font-bold text-secondary-800">{{ stampKey.split('-')[1] }}</div>
                  <div class="text-xs text-secondary-500">{{ stampKey.split('-')[2] }}</div>
                </div>
              </div>
              <button
                class="text-xs bg-white border border-secondary-200 hover:bg-secondary-50 hover:text-primary-600 px-3 py-1.5 rounded-full transition"
                @click="restoreStamp(stampKey)"
              >
                還原顯示
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="p-6 border-t border-secondary-100 bg-secondary-50 flex justify-end">
        <button
          class="px-6 py-2 text-secondary-600 font-medium hover:underline mr-4"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          :disabled="isSaving"
          class="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          @click="save"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <span>{{ isSaving ? '儲存中...' : '儲存變更' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
