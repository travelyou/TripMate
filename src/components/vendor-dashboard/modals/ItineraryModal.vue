<script setup>
import { ref, watch, computed } from 'vue'
import { X, Upload, Plus, Trash2 } from 'lucide-vue-next'
import { useVendorStore } from '@/stores/vendor'

const props = defineProps({
  isOpen: Boolean,
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])
const vendorStore = useVendorStore()

const form = ref({
  name: '',
  region: '',
  price: '',
  originalPrice: '',
  days: 1,
  nights: 0,
  image: '',
  tags: [],
  highlights: []
})

const tempTag = ref('')
const tempHighlight = ref('')
const saving = ref(false)

const regions = [
  '日本', '韓國', '東南亞', '歐洲', '美洲',
  '中國', '台灣', '香港', '澳洲', '紐西蘭',
  '中東', '非洲', '南美洲', '東北亞'
]

// 監聽 initialData 變化來初始化表單
watch(() => props.initialData, (newVal) => {
  if (newVal) {
    form.value = {
      ...newVal,
      tags: [...(newVal.tags || [])],
      highlights: [...(newVal.highlights || [])]
    }
  } else {
    // Reset form
    form.value = {
      name: '',
      region: '',
      price: '',
      originalPrice: '',
      days: 1,
      nights: 0,
      image: '',
      tags: [],
      highlights: []
    }
  }
}, { immediate: true })

const isEdit = computed(() => !!props.initialData)

// 圖片上傳
const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    const url = await vendorStore.uploadVendorImage(file, 'itinerary')
    form.value.image = url
  } catch (error) {
    console.error('上傳失敗', error)
    alert('圖片上傳失敗')
  }
}

// 標籤操作
const addTag = () => {
  const tag = tempTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    if (form.value.tags.length >= 5) {
      alert('最多只能新增 5 個標籤')
      return
    }
    form.value.tags.push(tag)
    tempTag.value = ''
  }
}

const removeTag = (index) => {
  form.value.tags.splice(index, 1)
}

// 亮點操作
const addHighlight = () => {
  const highlight = tempHighlight.value.trim()
  if (highlight) {
    if (form.value.highlights.length >= 5) {
      alert('最多只能新增 5 個特點')
      return
    }
    form.value.highlights.push(highlight)
    tempHighlight.value = ''
  }
}

const removeHighlight = (index) => {
  form.value.highlights.splice(index, 1)
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.price || !form.value.region) {
    alert('請填寫必填欄位')
    return
  }

  saving.value = true
  try {
    await emit('save', form.value)
    // 成功後關閉由父層控制，這裡只需 emit
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <!-- 背景遮罩 -->
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="emit('close')"></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal 內容 -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-100">
          <div class="flex justify-between items-center">
            <h3 id="modal-title" class="text-lg leading-6 font-medium text-gray-900">
              {{ isEdit ? '編輯行程' : '新增行程' }}
            </h3>
            <button class="text-gray-400 hover:text-gray-500" @click="emit('close')">
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
          <div class="space-y-6">
            <!-- 圖片上傳 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">行程封面圖片</label>
              <div class="flex items-center gap-4">
                <div class="relative w-40 h-28 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img v-if="form.image" :src="form.image" class="w-full h-full object-cover" />
                  <div v-else class="flex items-center justify-center w-full h-full text-gray-400">
                    <Upload class="w-8 h-8" />
                  </div>
                </div>
                <div class="flex-1">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleImageUpload"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                    @click="$refs.fileInput.click()"
                  >
                    選擇圖片
                  </button>
                  <p class="mt-1 text-xs text-gray-500">建議尺寸 800x600，支援 JPG/PNG</p>
                </div>
              </div>
            </div>

            <!-- 基本資訊 -->
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">行程名稱 <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  placeholder="例如：京阪神五日遊"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">地區 <span class="text-red-500">*</span></label>
                <select
                  v-model="form.region"
                  class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="" disabled>請選擇地區</option>
                  <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">售價 (TWD) <span class="text-red-500">*</span></label>
                <input
                  v-model.number="form.price"
                  type="number"
                  class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">原價 (選填)</label>
                <input
                  v-model.number="form.originalPrice"
                  type="number"
                  class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">天數</label>
                  <input
                    v-model.number="form.days"
                    type="number"
                    min="1"
                    class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">夜數</label>
                  <input
                    v-model.number="form.nights"
                    type="number"
                    min="0"
                    class="w-full border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <!-- 行程亮點 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">行程亮點 (最多 5 個)</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="tempHighlight"
                  type="text"
                  placeholder="輸入亮點後按 Enter 或新增按鈕"
                  class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  @keyup.enter="addHighlight"
                />
                <button
                  type="button"
                  class="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                  @click="addHighlight"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <ul class="space-y-1">
                <li v-for="(item, index) in form.highlights" :key="index" class="flex items-center justify-between bg-amber-50 px-3 py-2 rounded text-sm text-amber-900">
                  <span>{{ index + 1 }}. {{ item }}</span>
                  <button class="text-amber-600 hover:text-amber-800" @click="removeHighlight(index)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </li>
              </ul>
            </div>

            <!-- 標籤 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">標籤 (最多 5 個)</label>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="tempTag"
                  type="text"
                  placeholder="輸入標籤後按 Enter"
                  class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  @keyup.enter="addTag"
                />
                <button
                  type="button"
                  class="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                  @click="addTag"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-for="(tag, index) in form.tags" :key="index" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ tag }}
                  <button class="ml-1 text-blue-600 hover:text-blue-800" @click="removeTag(index)">
                    <X class="w-3 h-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
          <button
            type="button"
            :disabled="saving"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-base font-medium text-white hover:from-amber-600 hover:to-orange-600 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            @click="handleSubmit"
          >
            {{ saving ? '儲存中...' : '確認儲存' }}
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            @click="emit('close')"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
