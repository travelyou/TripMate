<script setup>
import { ref, computed, watch } from 'vue'
import { useVendorStore } from '@/stores/vendor'
import { Save, X, Edit, Plus, Trash2, Upload } from 'lucide-vue-next'

const vendorStore = useVendorStore()
const currentVendor = computed(() => vendorStore.currentVendor)

// 編輯模式
const isEditing = ref(false)

// 表單資料
const form = ref({
  name: '',
  slogan: '',
  description: '',
  regionTags: [], // 這是 Hashtags
  avatar: '',
  bannerImage: '', // 這是 Main Regions JSON 字串
})

// 主打地區 (從 bannerImage 解析而來)
const mainRegions = ref([])

// 預設 Hashtag 選項
const defaultHashtags = [
  '自由行', '跟團遊', '親子旅遊', '蜜月旅行', '小資旅遊',
  '奢華體驗', '海島度假', '滑雪滑草', '古蹟巡禮', '美食之旅'
]

// 自訂 Hashtag 輸入
const customTagInput = ref('')

const saving = ref(false)
const hasChanges = ref(false)

// 初始化表單
watch(currentVendor, (vendor) => {
  if (vendor) {
    form.value = {
      name: vendor.name || '',
      slogan: vendor.slogan || '',
      description: vendor.description || '',
      regionTags: vendor.regionTags || [],
      avatar: vendor.avatar || '',
      bannerImage: vendor.bannerImage || '',
    }

    // 解析主打地區
    try {
      if (vendor.bannerImage && vendor.bannerImage.startsWith('[')) {
        mainRegions.value = JSON.parse(vendor.bannerImage)
      } else {
        // 舊資料或空資料，初始化為空陣列
        mainRegions.value = []
      }
    } catch (e) {
      console.error('解析主打地區失敗:', e)
      mainRegions.value = []
    }
  }
}, { immediate: true })

// 監聽表單變化 (包含 mainRegions)
watch([form, mainRegions], () => {
  if (isEditing.value) {
    hasChanges.value = true
  }
}, { deep: true })

// --- Hashtags 邏輯 ---

const toggleHashtag = (tag) => {
  if (!isEditing.value) return
  const index = form.value.regionTags.indexOf(tag)
  if (index > -1) {
    form.value.regionTags.splice(index, 1)
  } else {
    if (form.value.regionTags.length >= 10) return
    form.value.regionTags.push(tag)
  }
}

const addCustomHashtag = () => {
  const tag = customTagInput.value.trim()
  if (!tag || form.value.regionTags.includes(tag)) {
    customTagInput.value = ''
    return
  }
  if (form.value.regionTags.length >= 10) return
  form.value.regionTags.push(tag)
  customTagInput.value = ''
}

const removeHashtag = (tag) => {
  if (!isEditing.value) return
  const index = form.value.regionTags.indexOf(tag)
  if (index > -1) form.value.regionTags.splice(index, 1)
}

// --- 主打地區 (Main Regions) 邏輯 ---

const addMainRegion = () => {
  if (mainRegions.value.length >= 5) return
  mainRegions.value.push({
    name: '',
    image: ''
  })
}

const removeMainRegion = (index) => {
  mainRegions.value.splice(index, 1)
}

const handleRegionImageUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    saving.value = true
    const url = await vendorStore.uploadVendorImage(file, 'bannerImage') // 重用 API，雖然 key 叫 bannerImage 但後端是通用的
    mainRegions.value[index].image = url
    hasChanges.value = true
    alert('圖片上傳成功！')
  } catch (err) {
    console.error('上傳失敗:', err)
    alert('圖片上傳失敗')
  } finally {
    saving.value = false
    event.target.value = ''
  }
}

// --- 一般邏輯 ---

const startEditing = () => {
  isEditing.value = true
  hasChanges.value = false
}

const cancelEditing = () => {
  if (hasChanges.value && !confirm('您有未儲存的變更，確定要取消嗎?')) return
  handleReset()
  isEditing.value = false
}

const handleReset = () => {
  if (currentVendor.value) {
    // 除了重置 form，也要重置 mainRegions
    form.value = {
      name: currentVendor.value.name || '',
      slogan: currentVendor.value.slogan || '',
      description: currentVendor.value.description || '',
      regionTags: [...(currentVendor.value.regionTags || [])],
      avatar: currentVendor.value.avatar || '',
      bannerImage: currentVendor.value.bannerImage || '',
    }

     try {
      if (currentVendor.value.bannerImage && currentVendor.value.bannerImage.startsWith('[')) {
        mainRegions.value = JSON.parse(currentVendor.value.bannerImage)
      } else {
        mainRegions.value = []
      }
    } catch (e) {
      mainRegions.value = []
    }
    hasChanges.value = false
  }
}

const handleSave = async () => {
  if (!currentVendor.value) return

  // 驗證主打地區資料
  for (const region of mainRegions.value) {
    if (!region.name || !region.image) {
      alert('請確認所有主打地區皆已輸入名稱並上傳圖片')
      return
    }
  }

  saving.value = true

  // 將 mainRegions 序列化存入 bannerImage
  form.value.bannerImage = JSON.stringify(mainRegions.value)

  try {
    await vendorStore.updateVendorProfile(currentVendor.value.id, form.value)
    hasChanges.value = false
    isEditing.value = false
    alert('儲存成功!')
  } catch (error) {
    console.error('儲存失敗:', error)
    alert('儲存失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}

// 頭像上傳
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    saving.value = true
    const url = await vendorStore.uploadVendorImage(file, 'avatar')
    form.value.avatar = url
    hasChanges.value = true
    alert('圖片上傳成功！')
  } catch (err) {
    console.error('上傳失敗:', err)
    alert('圖片上傳失敗')
  } finally {
    saving.value = false
    event.target.value = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-gray-900">基本資料設定</h2>
      <div class="flex gap-2">
        <button
          v-if="!isEditing"
          class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          @click="startEditing"
        >
          <Edit class="w-4 h-4" />
          編輯模式
        </button>
        <template v-else>
          <button
            :disabled="saving"
            class="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            @click="cancelEditing"
          >
            <X class="w-4 h-4" />
            取消
          </button>
          <button
            :disabled="!hasChanges || saving"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              hasChanges && !saving
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
            @click="handleSave"
          >
            <Save class="w-4 h-4" />
            {{ saving ? '儲存中...' : '儲存變更' }}
          </button>
        </template>
      </div>
    </div>

    <!-- 1. 廠商基本資訊 -->
    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
      <h3 class="text-lg font-bold text-gray-800 border-b pb-2">廠商概況</h3>

      <div class="flex flex-col md:flex-row gap-8">
        <!-- 頭像 -->
        <div class="w-full md:w-auto flex flex-col items-center">
            <div class="relative group cursor-pointer w-32 h-32" @click="isEditing && $refs.avatarInput.click()">
              <img
                :src="form.avatar || 'https://placehold.co/400x400?text=Logo'"
                class="w-full h-full rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
              />
              <div
                v-if="isEditing"
                class="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
              >
                <Edit class="w-6 h-6" />
              </div>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarUpload"
            />
            <button
                v-if="isEditing"
                class="mt-2 text-sm text-amber-600 font-medium hover:underline"
                @click="$refs.avatarInput.click()"
            >
                更換 Logo
            </button>
        </div>

        <!-- 文字欄位 -->
        <div class="flex-1 space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">廠商名稱 <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  :disabled="!isEditing"
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-gray-50"
                  placeholder="請輸入旅行社或廠商名稱"
                />
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">品牌標語 (Slogan)</label>
                <input
                  v-model="form.slogan"
                  type="text"
                  :disabled="!isEditing"
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-gray-50"
                  placeholder="一句話描述品牌精神"
                />
            </div>
             <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">廠商簡介 <span class="text-red-500">*</span></label>
                <textarea
                  v-model="form.description"
                  rows="4"
                  :disabled="!isEditing"
                  class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-gray-50 resize-none"
                  placeholder="詳細介紹您的服務內容與特色..."
                ></textarea>
            </div>
        </div>
      </div>
    </div>

    <!-- 2. 主打地區 (Region Categories) -->
    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div class="flex justify-between items-center border-b pb-2">
            <div>
                <h3 class="text-lg font-bold text-gray-800">主打地區 (Region Categories)</h3>
                <p class="text-sm text-gray-500 mt-1">
                    這將在前台作為主要導航入口顯示，請設定您最擅長的 5 個地區。
                </p>
            </div>
            <button
                v-if="isEditing"
                :disabled="mainRegions.length >= 5"
                class="text-sm bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                @click="addMainRegion"
            >
                <Plus class="w-4 h-4" />
                新增地區
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="(region, index) in mainRegions"
                :key="index"
                class="group relative border rounded-xl overflow-hidden bg-gray-50 hover:shadow-md transition"
            >
                <!-- 刪除按鈕 -->
                 <button
                    v-if="isEditing"
                    class="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition z-10"
                    @click="removeMainRegion(index)"
                >
                    <Trash2 class="w-4 h-4" />
                </button>

                <!-- 圖片上傳 -->
                <div
                    class="relative h-40 bg-gray-200 cursor-pointer overflow-hidden"
                    @click="isEditing && $refs[`regionImg_${index}`][0].click()"
                >
                    <img
                        v-if="region.image"
                        :src="region.image"
                        class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                         <Upload class="w-6 h-6" />
                         <span class="text-xs">點擊上傳圖片</span>
                    </div>

                    <!-- Overlay Edit Hint -->
                    <div v-if="isEditing" class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium transition">
                        更換圖片
                    </div>
                </div>
                <input
                    :ref="`regionImg_${index}`"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="(e) => handleRegionImageUpload(e, index)"
                />

                <!-- Region Name Input -->
                <div class="p-3">
                    <label class="text-xs text-gray-500 font-bold mb-1 block">地區名稱</label>
                    <input
                        v-model="region.name"
                        type="text"
                        :disabled="!isEditing"
                        class="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-amber-500 outline-none font-bold text-gray-800"
                        placeholder="例如: 日本"
                    />
                </div>
            </div>

            <!-- Empty State -->
            <div
                v-if="mainRegions.length === 0"
                class="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl"
            >
                尚未設定主打地區，請點擊右上角新增。
            </div>
        </div>
    </div>


    <!-- 3. 服務標籤 (Hashtags) -->
    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div>
            <h3 class="text-lg font-bold text-gray-800 border-b pb-2">服務標籤 (Hashtags)</h3>
            <p class="text-sm text-gray-500 mt-2">
                這些標籤將顯示在您的首頁下方，幫助使用者快速了解您的服務強項（如：親子旅遊、自由行）。
            </p>
        </div>

        <div class="flex flex-wrap gap-2">
             <!-- Preset Tags -->
             <button
                v-for="tag in defaultHashtags"
                :key="tag"
                :disabled="!isEditing"
                :class="[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  form.regionTags.includes(tag)
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : isEditing
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 opacity-60'
                ]"
                @click="toggleHashtag(tag)"
             >
                # {{ tag }}
             </button>
        </div>

        <!-- Custom Tag Input -->
        <div v-if="isEditing" class="flex gap-2 max-w-sm mt-4">
             <input
                v-model="customTagInput"
                type="text"
                placeholder="自訂標籤 (Enter 新增)"
                class="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                @keyup.enter="addCustomHashtag"
             />
             <button
                class="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-900"
                @click="addCustomHashtag"
             >
                新增
             </button>
        </div>

        <!-- Selected Tags Display -->
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
             <h4 class="text-sm font-bold text-gray-700 mb-2">已選擇的標籤：</h4>
             <div class="flex flex-wrap gap-2">
                <span
                    v-for="tag in form.regionTags"
                    :key="tag"
                    class="bg-white border border-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 shadow-sm"
                >
                    # {{ tag }}
                    <button v-if="isEditing" class="hover:text-red-500 ml-1" @click="removeHashtag(tag)">
                        <X class="w-3 h-3" />
                    </button>
                </span>
                <span v-if="form.regionTags.length === 0" class="text-gray-400 text-sm italic">
                    (尚未選擇任何標籤)
                </span>
             </div>
        </div>
    </div>

  </div>
</template>

