<script setup>
import { ref, computed, watch } from 'vue'
import { useVendorStore } from '@/stores/vendor'
import { Save, X, Edit, Plus } from 'lucide-vue-next'

const vendorStore = useVendorStore()
const currentVendor = computed(() => vendorStore.currentVendor)

// 編輯模式
const isEditing = ref(false)

// 表單資料
const form = ref({
  name: '',
  slogan: '',
  description: '',
  regionTags: [],
  avatar: '',
  bannerImage: '',
  isBannerVisible: true
})

// 預設地區選項
const defaultRegions = [
  '日本', '韓國', '東南亞', '歐洲', '美洲',
  '中國', '台灣', '香港', '澳洲', '紐西蘭',
  '中東', '非洲', '南美洲', '東北亞'
]

// 自訂地區輸入
const customRegionInput = ref('')

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
      isBannerVisible: vendor.isBannerVisible !== undefined ? vendor.isBannerVisible : true
    }
  }
}, { immediate: true })

// 監聽表單變化
watch(form, () => {
  if (isEditing.value) {
    hasChanges.value = true
  }
}, { deep: true })

// 切換地區標籤
const toggleRegion = (region) => {
  if (!isEditing.value) return

  const index = form.value.regionTags.indexOf(region)
  if (index > -1) {
    // 已選擇,則移除
    form.value.regionTags.splice(index, 1)
  } else {
    // 未選擇,檢查是否已達上限
    if (form.value.regionTags.length >= 5) {
      return // 靜默禁止,不跳彈窗
    }
    form.value.regionTags.push(region)
  }
}

// 新增自訂地區
const addCustomRegion = () => {
  const region = customRegionInput.value.trim()

  if (!region) {
    return
  }

  // 檢查是否已存在
  if (form.value.regionTags.includes(region)) {
    customRegionInput.value = ''
    return // 靜默禁止,不跳彈窗
  }

  // 檢查是否已達上限
  if (form.value.regionTags.length >= 5) {
    return // 靜默禁止,不跳彈窗
  }

  form.value.regionTags.push(region)
  customRegionInput.value = ''
}

// 移除地區標籤
const removeRegion = (region) => {
  if (!isEditing.value) return
  const index = form.value.regionTags.indexOf(region)
  if (index > -1) {
    form.value.regionTags.splice(index, 1)
  }
}

// 開始編輯
const startEditing = () => {
  isEditing.value = true
  hasChanges.value = false
}

// 取消編輯
const cancelEditing = () => {
  if (hasChanges.value && !confirm('您有未儲存的變更,確定要取消嗎?')) {
    return
  }
  handleReset()
  isEditing.value = false
}

// 儲存變更
const handleSave = async () => {
  if (!currentVendor.value) return

  saving.value = true
  try {
    await vendorStore.updateVendorProfile(currentVendor.value.id, form.value)
    hasChanges.value = false
    isEditing.value = false
    alert('儲存成功!')
  } catch (error) {
    console.error('儲存失敗:', error)
    alert('儲存失敗,請稍後再試')
  } finally {
    saving.value = false
  }
}

// 重置表單
const handleReset = () => {
  if (currentVendor.value) {
    form.value = {
      name: currentVendor.value.name || '',
      slogan: currentVendor.value.slogan || '',
      description: currentVendor.value.description || '',
      regionTags: [...(currentVendor.value.regionTags || [])],
      avatar: currentVendor.value.avatar || '',
      bannerImage: currentVendor.value.bannerImage || '',
      isBannerVisible: currentVendor.value.isBannerVisible !== undefined ? currentVendor.value.isBannerVisible : true
    }
    hasChanges.value = false
  }
}

// 圖片上傳處理
const handleImageUpload = async (event, type) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    saving.value = true // 顯示上傳中
    // 上傳圖片並取得 URL
    const url = await vendorStore.uploadVendorImage(file, type)

    // 更新表單資料 (僅更新圖片連結)
    form.value[type] = url
    // 標記為有變更 (讓使用者最後需要點擊儲存變更來送出)
    hasChanges.value = true

    alert('圖片上傳成功！別忘了點擊「儲存變更」來保存設定。')
  } catch (err) {
    console.error('上傳失敗:', err)
    alert('圖片上傳失敗，請稍後再試。')
  } finally {
    saving.value = false
    // 清空 input 讓同檔名可以再選
    event.target.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-gray-900">基本資料</h2>
      <div class="flex gap-2">
        <!-- 檢視模式:編輯按鈕 -->
        <button
          v-if="!isEditing"
          class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          @click="startEditing"
        >
          <Edit class="w-4 h-4" />
          編輯
        </button>

        <!-- 編輯模式:取消與儲存按鈕 -->
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

    <!-- 表單 -->
    <div class="space-y-6">
      <!-- 廠商名稱 -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          廠商名稱 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          :disabled="!isEditing"
          placeholder="請輸入廠商名稱"
          :class="[
            'w-full px-4 py-3 border rounded-lg transition',
            isEditing
              ? 'border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          ]"
        />
      </div>

      <!-- 標語 -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          廠商標語
        </label>
        <input
          v-model="form.slogan"
          type="text"
          :disabled="!isEditing"
          placeholder="一句話描述您的廠商特色"
          :class="[
            'w-full px-4 py-3 border rounded-lg transition',
            isEditing
              ? 'border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          ]"
        />
        <p class="mt-1 text-xs text-gray-500">建議 20-30 字</p>
      </div>

      <!-- 廠商簡介 -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          廠商簡介 <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.description"
          rows="5"
          :disabled="!isEditing"
          placeholder="詳細介紹您的廠商特色、服務內容、經營理念等..."
          :class="[
            'w-full px-4 py-3 border rounded-lg transition resize-none',
            isEditing
              ? 'border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          ]"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">
          目前 {{ form.description.length }} 字，建議 100-300 字
        </p>
      </div>

      <!-- 服務地區 -->
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          主打地區標籤 <span class="text-red-500">*</span>
        </label>
        <p class="text-sm text-gray-600 mb-3">
          選擇或新增您的旅行社主要服務地區,這些標籤將顯示在廠商頁面,幫助旅客快速了解您的專長領域
          <span class="text-amber-600 font-medium">(最多 5 個)</span>
        </p>

        <!-- 預設地區選項 -->
        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="region in defaultRegions"
            :key="region"
            :disabled="!isEditing"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all',
              form.regionTags.includes(region)
                ? 'bg-amber-500 text-white shadow-md'
                : isEditing
                  ? (form.regionTags.length >= 5 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                  : 'bg-gray-50 text-gray-400 cursor-default'
            ]"
            @click="toggleRegion(region)"
          >
            {{ region }}
          </button>
        </div>

        <!-- 已選擇的自訂地區 -->
        <div v-if="form.regionTags.some(r => !defaultRegions.includes(r))" class="mb-3">
          <p class="text-xs font-medium text-gray-600 mb-2">自訂地區:</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="region in form.regionTags.filter(r => !defaultRegions.includes(r))"
              :key="region"
              :disabled="!isEditing"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all bg-blue-500 text-white shadow-md',
                isEditing ? 'hover:bg-blue-600' : 'cursor-default opacity-75'
              ]"
              @click="removeRegion(region)"
            >
              {{ region }}
              <X v-if="isEditing" class="w-3 h-3 inline ml-1" />
            </button>
          </div>
        </div>

        <!-- 新增自訂地區 -->
        <div v-if="isEditing" class="flex gap-2">
          <input
            v-model="customRegionInput"
            type="text"
            :disabled="form.regionTags.length >= 5"
            placeholder="輸入自訂地區名稱 (例如:北海道、沖繩)"
            :class="[
              'flex-1 px-4 py-2 border rounded-lg transition',
              form.regionTags.length >= 5
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent'
            ]"
            @keyup.enter="addCustomRegion"
          />
          <button
            :disabled="!customRegionInput.trim() || form.regionTags.length >= 5"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              customRegionInput.trim() && form.regionTags.length < 5
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
            @click="addCustomRegion"
          >
            <Plus class="w-4 h-4" />
            新增
          </button>
        </div>

        <p
          :class="[
            'mt-2 text-xs font-medium',
            (isEditing && form.regionTags.length >= 5) ? 'text-red-600' : 'text-gray-500'
          ]"
        >
          已選擇 {{ form.regionTags.length }} / 5 個地區標籤
          <span v-if="isEditing && form.regionTags.length >= 5" class="ml-1">(已達上限)</span>
        </p>
      </div>

      <!-- 圖片設置區塊 -->
      <div class="border-t border-gray-100 pt-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">圖片設置</h3>

        <!-- 廠商頭像 -->
        <div class="mb-8">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            廠商頭像 (Avatar)
          </label>
          <div class="flex items-start gap-4">
            <div class="relative group cursor-pointer" @click="isEditing && $refs.avatarInput.click()">
              <img
                :src="form.avatar || 'https://via.placeholder.com/150'"
                class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
                alt="Avatar"
              />
              <div
                v-if="isEditing"
                class="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors z-10"
              >
                <Edit class="w-4 h-4 text-gray-600" />
              </div>

              <!-- 遮罩提示 -->
              <div v-if="isEditing" class="absolute inset-0 rounded-full bg-black/ opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </div>

            <div class="flex-1">
              <p class="text-sm text-gray-500 mb-2">
                建議尺寸 400x400px，支援 JPG/PNG。
              </p>
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="(e) => handleImageUpload(e, 'avatar')"
              />
              <button
                v-if="isEditing"
                class="text-sm text-amber-600 font-medium hover:text-amber-700 underline decoration-dashed underline-offset-4"
                @click="$refs.avatarInput.click()"
              >
                更換頭像
              </button>
            </div>
          </div>
        </div>

        <!-- 網站橫幅 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-semibold text-gray-700">
              網站首頁橫幅 (Banner)
            </label>

            <!-- 顯示設定開關 -->
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <div class="relative">
                <input
                  type="checkbox"
                  v-model="form.isBannerVisible"
                  :disabled="!isEditing"
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </div>
              <span class="text-sm text-gray-600 font-medium">在前台顯示</span>
            </label>
          </div>

          <div :class="['relative group rounded-xl overflow-hidden bg-gray-100 aspect-[21/9] transition-opacity', !form.isBannerVisible ? 'opacity-50 grayscale' : '']">
            <img
              :src="form.bannerImage || 'https://via.placeholder.com/1200x500'"
              class="w-full h-full object-cover"
              alt="Banner"
            />
            <div v-if="isEditing" class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                class="bg-white/90 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-white transition-colors flex items-center gap-2"
                @click="$refs.bannerInput.click()"
              >
                <Edit class="w-4 h-4" />
                更換橫幅
              </button>
            </div>

            <!-- 隱藏狀態提示 -->
            <div v-if="!form.isBannerVisible" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg backdrop-blur-sm">
                已隱藏
              </div>
            </div>
          </div>

          <p class="mt-2 text-xs text-gray-500 flex items-center gap-2">
             顯示於首頁輪播，僅限精選合作廠商，建議尺寸 1200x600px。
             <span v-if="!form.isBannerVisible" class="text-amber-600 font-medium">(此橫幅目前設定為不顯示)</span>
          </p>
          <input
            ref="bannerInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="(e) => handleImageUpload(e, 'bannerImage')"
          />
        </div>
      </div>
    </div>

    <!-- 變更提示 -->
    <div
      v-if="isEditing && hasChanges"
      class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3"
    >
      <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-sm text-amber-800">您有未儲存的變更,請記得點擊「儲存變更」按鈕</p>
    </div>
  </div>
</template>
