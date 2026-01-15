<script setup>
import { reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'

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

const emit = defineEmits(['close', 'save'])

const editForm = reactive({})

// Init form when modal opens or user changes
watch(
  () => [props.isOpen, props.user, props.wishlist, props.hiddenStamps],
  ([isOpen, newUser, newWishlist, newHiddenStamps]) => {
    if (isOpen && newUser) {
      Object.assign(editForm, JSON.parse(JSON.stringify(newUser)))
      // Merge wishlist into form for editing
      editForm.wishlist = [...(newWishlist || [])]
      editForm.hiddenStamps = [...(newHiddenStamps || [])]
    }
  },
  { immediate: true }
)

function save() {
  emit('save', editForm)
}

function addWishlist(e) {
  if (e.target.value.trim()) {
    if (!editForm.wishlist) editForm.wishlist = []
    if (editForm.wishlist.length >= 5) return
    editForm.wishlist.push(e.target.value.trim())
    e.target.value = ''
  }
}

function removeWishlist(idx) {
  editForm.wishlist.splice(idx, 1)
}

function addTag(e) {
  const val = e.target.value.trim()
  if (val) {
    if (!editForm.tags) editForm.tags = []
    if (editForm.tags.length >= 5) return
    editForm.tags.push(val)
    e.target.value = ''
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
    @click.self="$emit('close')"
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
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">顯示名稱</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">暱稱</label>
            <input
              v-model="editForm.nickname"
              type="text"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">個人簡介</label>
            <textarea
              v-model="editForm.bio"
              rows="3"
              class="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            ></textarea>
          </div>

          <!-- Tags Management -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-2">興趣標籤</label>
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
            <div class="flex gap-2">
               <input
                :placeholder="editForm.tags?.length >= 5 ? '已達標籤上限 (5/5)' : '輸入標籤按 Enter 新增 (例如：登山、攝影)'"
                :class="[
                  'flex-1 px-4 py-2 border rounded-xl outline-none transition',
                  editForm.tags?.length >= 5
                    ? 'border-red-500 text-red-500 placeholder-red-500 bg-red-50 cursor-not-allowed'
                    : 'border-secondary-200 focus:ring-2 focus:ring-primary-500'
                ]"
                :disabled="editForm.tags?.length >= 5"
                @keyup.enter="addTag"
              />
            </div>
          </div>
        </div>

        <!-- Wishlist Management in Modal -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">許願清單 (球池)</label>
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
          <div class="flex gap-2">
            <input
              :placeholder="editForm.wishlist?.length >= 5 ? '已達願望上限 (5/5)' : '輸入願望按 Enter 新增'"
              :class="[
                'flex-1 px-4 py-2 border rounded-xl outline-none transition',
                editForm.wishlist?.length >= 5
                  ? 'border-red-500 text-red-500 placeholder-red-500 bg-red-50 cursor-not-allowed'
                  : 'border-secondary-200 focus:ring-2 focus:ring-primary-500'
              ]"
              :disabled="editForm.wishlist?.length >= 5"
              @keyup.enter="addWishlist"
            />
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
          class="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary/20 transition"
          @click="save"
        >
          儲存變更
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
