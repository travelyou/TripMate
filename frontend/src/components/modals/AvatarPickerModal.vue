<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import {
  getAvatarUrl,
  getAvatarUrls,
  getCategoryFilenames,
  getAvailableCategories,
} from '@/config/avatars'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'select'])

const selectedCategory = ref(null)
const searchQuery = ref('')
const loadingAvatars = ref(false)
const loadingCategories = ref(false)
const avatarUrls = ref({}) // { category: { filename: url } }
const categoryFilenames = ref({}) // { category: [filename1, filename2, ...] }
const availableCategories = ref([])

// 當前分類的頭像列表（從 Storage 動態讀取）
const currentAvatars = computed(() => {
  if (!selectedCategory.value) return []
  return categoryFilenames.value[selectedCategory.value] || []
})

// 搜尋過濾後的頭像
const filteredAvatars = computed(() => {
  if (!searchQuery.value.trim()) return currentAvatars.value
  const query = searchQuery.value.toLowerCase()
  return currentAvatars.value.filter((filename) =>
    filename.toLowerCase().includes(query),
  )
})

// 獲取頭像 URL（從快取或載入）
const getAvatarUrlForDisplay = (filename) => {
  if (!selectedCategory.value) return ''
  const category = selectedCategory.value
  if (avatarUrls.value[category] && avatarUrls.value[category][filename]) {
    return avatarUrls.value[category][filename]
  }
  // 如果還沒有載入，返回空字串（會顯示載入狀態）
  return ''
}

// 載入可用分類列表
const loadAvailableCategories = async () => {
  if (availableCategories.value.length > 0) return // 已經載入過

  loadingCategories.value = true
  try {
    availableCategories.value = await getAvailableCategories()
  } catch (error) {
    console.error('載入分類列表失敗:', error)
  } finally {
    loadingCategories.value = false
  }
}

// 選擇分類時載入該分類的頭像
const selectCategory = async (category) => {
  selectedCategory.value = category
  searchQuery.value = ''

  // 如果已經載入過檔案列表和 URL，直接返回
  if (categoryFilenames.value[category] && avatarUrls.value[category]) {
    return
  }

  loadingAvatars.value = true
  try {
    // 如果還沒有載入檔案列表，先從 Storage 讀取
    if (!categoryFilenames.value[category]) {
      const filenames = await getCategoryFilenames(category)
      categoryFilenames.value[category] = filenames
    }

    // 載入該分類的所有頭像 URL
    const filenames = categoryFilenames.value[category] || []
    if (filenames.length > 0) {
      const results = await getAvatarUrls(category, filenames)

      // 儲存到快取
      if (!avatarUrls.value[category]) {
        avatarUrls.value[category] = {}
      }
      results.forEach(({ filename, url }) => {
        avatarUrls.value[category][filename] = url
      })
    }
  } catch (error) {
    console.error('載入頭像失敗:', error)
  } finally {
    loadingAvatars.value = false
  }
}

// 選擇頭像
const selectAvatar = async (filename) => {
  const category = selectedCategory.value
  let url = avatarUrls.value[category]?.[filename]

  // 如果還沒有載入，先載入
  if (!url) {
    try {
      url = await getAvatarUrl(category, filename)
      if (!avatarUrls.value[category]) {
        avatarUrls.value[category] = {}
      }
      avatarUrls.value[category][filename] = url
    } catch (error) {
      console.error('獲取頭像 URL 失敗:', error)
      return
    }
  }

  emit('select', url)
  emit('close')
}

// 關閉模態框
const handleClose = () => {
  selectedCategory.value = null
  searchQuery.value = ''
  emit('close')
}

// 監聽模態框開啟，重置狀態並載入分類列表
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // 開啟時載入可用分類
    loadAvailableCategories()
  } else {
    selectedCategory.value = null
    searchQuery.value = ''
  }
})

// 組件掛載時載入分類列表
onMounted(() => {
  if (props.isOpen) {
    loadAvailableCategories()
  }
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
    >
      <!-- 標題區域 -->
      <div class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-800">選擇頭像</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition"
          @click="handleClose"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <!-- 分類選擇 -->
        <div class="p-4 border-b border-gray-200 overflow-x-auto">
          <div v-if="loadingCategories" class="flex gap-2">
            <div
              v-for="i in 3"
              :key="i"
              class="h-10 w-24 bg-gray-200 animate-pulse rounded-lg"
            ></div>
          </div>
          <div v-else class="flex gap-2 min-w-max">
            <button
              v-for="category in availableCategories"
              :key="category"
              :class="[
                'px-4 py-2 rounded-lg font-bold transition whitespace-nowrap',
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
              @click="selectCategory(category)"
            >
              {{ category }}
            </button>
            <div v-if="availableCategories.length === 0" class="text-gray-500 text-sm py-2">
              暫無可用分類
            </div>
          </div>
        </div>

        <!-- 搜尋框（僅在選擇了分類後顯示） -->
        <div
          v-if="selectedCategory"
          class="p-4 border-b border-gray-200"
        >
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋頭像..."
            class="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>

        <!-- 頭像網格 -->
        <div
          v-if="selectedCategory"
          class="flex-1 overflow-y-auto p-4 sm:p-6"
        >
          <div
            v-if="filteredAvatars.length === 0"
            class="text-center text-gray-500 py-12"
          >
            {{ searchQuery ? '找不到符合的頭像' : '此分類暫無頭像' }}
          </div>
          <div
            v-else-if="loadingAvatars"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            <!-- 載入中的佔位符 -->
            <div
              v-for="filename in filteredAvatars"
              :key="filename"
              class="aspect-square rounded-xl bg-gray-200 animate-pulse border-2 border-gray-200"
            ></div>
          </div>
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            <button
              v-for="filename in filteredAvatars"
              :key="filename"
              class="aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-primary-500 hover:scale-105 transition-all duration-200 group relative"
              @click="selectAvatar(filename)"
            >
              <div
                v-if="!getAvatarUrlForDisplay(filename)"
                class="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
              >
                <span class="text-xs text-gray-400">載入中...</span>
              </div>
              <img
                v-else
                :src="getAvatarUrlForDisplay(filename)"
                :alt="filename"
                class="w-full h-full object-cover group-hover:opacity-90"
                @error="
                  (e) => {
                    e.target.src =
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=error'
                  }
                "
                @load="
                  (e) => {
                    // 圖片載入完成後，確保 URL 已快取
                    if (selectedCategory && !avatarUrls[selectedCategory]?.[filename]) {
                      const img = e.target
                      if (img && img.src) {
                        if (!avatarUrls.value[selectedCategory]) {
                          avatarUrls.value[selectedCategory] = {}
                        }
                        avatarUrls.value[selectedCategory][filename] = img.src
                      }
                    }
                  }
                "
              />
            </button>
          </div>
        </div>

        <!-- 未選擇分類時的提示 -->
        <div
          v-else
          class="flex-1 flex items-center justify-center text-gray-500"
        >
          <p class="text-center">請選擇一個分類</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自訂滾動條 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>

