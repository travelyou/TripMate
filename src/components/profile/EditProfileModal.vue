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
  }
})

const emit = defineEmits(['close', 'save'])

const editForm = reactive({})

// Init form when modal opens or user changes
watch(
  () => [props.isOpen, props.user],
  ([isOpen, newUser]) => {
    if (isOpen && newUser) {
      Object.assign(editForm, JSON.parse(JSON.stringify(newUser)))
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
    editForm.wishlist.push(e.target.value.trim())
    e.target.value = ''
  }
}

function removeWishlist(idx) {
  editForm.wishlist.splice(idx, 1)
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
        class="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10"
      >
        <h2 class="text-xl font-bold text-gray-800">編輯個人資料</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition"
          @click="$emit('close')"
        >
          <X class="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <div class="p-6 space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">顯示名稱</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">暱稱</label>
            <input
              v-model="editForm.nickname"
              type="text"
              class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">個人簡介</label>
            <textarea
              v-model="editForm.bio"
              rows="3"
              class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Wishlist Management in Modal -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">許願清單 (球池)</label>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="(wish, idx) in editForm.wishlist"
              :key="idx"
              class="px-3 py-1 bg-purple-50 text-purple-700 rounded-full flex items-center"
            >
              {{ wish }}
              <button class="ml-1 hover:text-red-500" @click="removeWishlist(idx)">
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              placeholder="輸入願望按 Enter 新增"
              class="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              @keyup.enter="addWishlist"
            />
          </div>
        </div>
      </div>
      <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
        <button
          class="px-6 py-2 text-gray-600 font-medium hover:underline mr-4"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          class="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition"
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
