<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { X, FolderPlus, Check } from 'lucide-vue-next'

const userStore = useUserStore()
const newCategoryName = ref('')
const isCreating = ref(false)

const handleCreate = () => {
  if (newCategoryName.value.trim()) {
    userStore.createCategoryAndSave(newCategoryName.value)
    newCategoryName.value = ''
    isCreating.value = false
  }
}

const checkItemInCategory = (categoryId) => {
  const item = userStore.pendingCollectionItem || {}
  const category = userStore.collectionCategories.find((c) => c.id === categoryId)
  if (!category) return false
  return category.items.some((i) => i.id === item.id && i.type === item.type)
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="userStore.isCollectionModalOpen = false"
  >
    <div
      class="bg-[#fffef7] w-full max-w-sm rounded-2xl border-4 border-amber-700 shadow-[8px_8px_0px_0px_rgba(139,111,71,0.3)] overflow-hidden flex flex-col max-h-[80vh]"
    >
      <div class="p-4 border-b-2 border-gray-100 flex justify-between items-center bg-white">
        <h3 class="font-bold text-gray-800 text-lg">加入收藏</h3>
        <button
          @click="userStore.isCollectionModalOpen = false"
          class="text-gray-400 hover:text-gray-600"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="overflow-y-auto p-2 space-y-1">
        <button
          v-for="cat in userStore.collectionCategories"
          :key="cat.id"
          class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-orange-50 transition group text-left"
          @click="userStore.saveToCategory(cat.id)"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 group-hover:bg-orange-200 group-hover:text-orange-700 transition"
            >
              <span class="font-bold text-lg">{{ cat.name.charAt(0) }}</span>
            </div>
            <div>
              <div class="font-bold text-gray-800">{{ cat.name }}</div>
              <div class="text-xs text-gray-400">{{ cat.items.length }} 個項目</div>
            </div>
          </div>

          <Check v-if="checkItemInCategory(cat.id)" class="w-5 h-5 text-green-500" />
        </button>
      </div>

      <div class="p-4 border-t-2 border-gray-100 bg-gray-50">
        <div v-if="!isCreating">
          <button
            class="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-white hover:border-orange-400 hover:text-orange-500 transition flex items-center justify-center gap-2"
            @click="isCreating = true"
          >
            <FolderPlus class="w-5 h-5" />
            建立新分類
          </button>
        </div>
        <div v-else class="flex gap-2">
          <input
            v-model="newCategoryName"
            ref="inputRef"
            placeholder="輸入分類名稱..."
            class="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
            @keyup.enter="handleCreate"
          />
          <button
            class="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600"
            @click="handleCreate"
          >
            建立
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- 已移除 .pixel-modal（已用 Tailwind 類別替代） -->
