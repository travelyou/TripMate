<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  X as XIcon,
  ArrowLeft as ArrowLeftIcon,
  Image as ImageIcon,
  Hash as HashIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  MapPin as MapPinIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  CheckSquare as CheckSquareIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
  AlertCircle as AlertIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  Type as TypeIcon,
  AlignLeft as AlignLeftIcon,
  AlignCenter as AlignCenterIcon,
  Palette as PaletteIcon,
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { auth } from '@/firebase/config'
import { createItinerary, updateItinerary } from '@/api/itinerary'

import { uploadImage } from '@/api/storage'
import { compressImage } from '@/utils/imageCompress'

// --- Tiptap 相關引入 ---
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import ImageExtension from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import CharacterCount from '@tiptap/extension-character-count'

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

const currentStep = ref('basic')
const formError = ref('')
const isSubmitting = ref(false)
const CHARACTER_LIMIT = 50000

// ★ 新增：分類選項 (與找旅伴一致)
const categories = [
  '國內旅遊',
  '日韓旅遊',
  '亞洲其他',
  '歐美紐澳',
  '海島度假',
  '攝影/興趣',
  '自駕共乘',
  '其他',
]

// 表單資料結構
const postData = ref({
  category: '',
  title: '',
  description: '',
  price: null,
  agencyName: '',
  location: '',
  start_date: '',
  end_date: '',
  durationDays: 1,
  max_people: 20,
  coverImage: '',
  tags: [],
  itinerary: { days: [] },
  packingList: [],
})

// Banner 相關
const bannerPreview = ref('')
const bannerFileInput = ref(null)
const bannerFile = ref(null)
const bannerPositionY = ref(50)
const isDraggingBanner = ref(false)
const dragStartY = ref(0)
const isUploading = ref(false)
const submitProgress = ref(0)
const submitStatus = ref('')

const editorFileInputRef = ref(null)
const activeDayIndex = ref(0)
const tagSearch = ref('')

// --- Helper ---
const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const minDate = getTodayString()

// --- Banner 拖曳邏輯 ---
const startDragBanner = (event) => {
  isDraggingBanner.value = true
  dragStartY.value = event.clientY
}

const onDragBanner = (event) => {
  if (!isDraggingBanner.value) return
  const deltaY = event.clientY - dragStartY.value
  dragStartY.value = event.clientY
  const sensitivity = 0.5
  let newPos = bannerPositionY.value - deltaY * sensitivity
  bannerPositionY.value = Math.max(0, Math.min(100, newPos))
}

const stopDragBanner = () => {
  isDraggingBanner.value = false
}

// --- 顏色選擇器 ---
const showColorPicker = ref(false)
const commonColors = [
  '#000000',
  '#4B5563',
  '#9CA3AF',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#CA8A04',
  '#16A34A',
  '#059669',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#9333EA',
  '#ffffff',
]
const toggleColorPicker = () => (showColorPicker.value = !showColorPicker.value)
const setColor = (color) => {
  editor.value.chain().focus().setColor(color).run()
  showColorPicker.value = false
}

// --- Tiptap 設定 ---
const ResetStyleOnEnter = Extension.create({
  name: 'resetStyleOnEnter',
  addPriority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) return false
        if (editor.isActive('heading')) {
          if (editor.can().splitBlock()) {
            editor
              .chain()
              .focus()
              .splitBlock({ keepMarks: false })
              .setParagraph()
              .unsetAllMarks()
              .run()
          }
          return true
        }
        if (!editor.can().splitBlock()) return false
        return editor.chain().focus().splitBlock({ keepMarks: false }).unsetAllMarks().run()
      },
    }
  },
})

const editor = useEditor({
  content: postData.value.description,
  extensions: [
    StarterKit.configure({
      // 明確排除 underline，避免與單獨添加的 Underline extension 衝突
      underline: false,
    }),
    Underline,
    TextStyle,
    FontFamily,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ImageExtension.configure({ inline: true, allowBase64: true }),
    ResetStyleOnEnter,
    CharacterCount.configure({ limit: CHARACTER_LIMIT }),
  ],
  editorProps: {
    attributes: { class: 'focus:outline-none min-h-[300px] px-4 py-2 text-gray-800 text-base' },
  },
  onUpdate: ({ editor }) => {
    postData.value.description = editor.getHTML()
  },
})

const setFontKai = () => {
  if (editor.value) editor.value.chain().focus().setFontFamily('BiauKai, DFKai-SB, 標楷體').run()
}

const triggerEditorImageUpload = () => editorFileInputRef.value?.click()
const handleEditorImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  try {
    const compressedFile = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    })
    const imageUrl = await uploadImage(compressedFile, 'itineraries', (progress) =>
      console.log(`內文圖片: ${progress}%`),
    )
    if (imageUrl && editor.value) editor.value.chain().focus().setImage({ src: imageUrl }).run()
  } catch (error) {
    alert('圖片插入失敗：' + error.message)
  }
  event.target.value = ''
}

watch(
  () => postData.value.description,
  (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
      if (editor.value.getText().trim() === '' && newContent) {
        editor.value.commands.setContent(newContent)
      }
    }
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// --- Banner 處理 ---
const triggerBannerSelect = () => bannerFileInput.value?.click()

const handleBannerSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('圖片大小不能超過 10MB')
    return
  }
  try {
    isUploading.value = true
    const compressedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      maxSizeMB: 2,
    })
    bannerFile.value = compressedFile
    const reader = new FileReader()
    reader.onload = (e) => (bannerPreview.value = e.target.result)
    reader.readAsDataURL(compressedFile)
  } catch (error) {
    alert('圖片處理失敗：' + error.message)
  } finally {
    isUploading.value = false
  }
}

const removeBanner = () => {
  bannerPreview.value = ''
  bannerFile.value = null
  postData.value.coverImage = ''
  bannerPositionY.value = 50
}

// --- 驗證邏輯 ---
const validateBasic = () => {
  if (!postData.value.category) return '請選擇分類'
  if (!postData.value.title) return '請輸入行程標題'
  if (postData.value.title.length > 35) return '標題不能超過 35 個字元'

  if (!bannerPreview.value && !postData.value.coverImage) return '請上傳封面圖片'

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = postData.value.description
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  if (!textContent.trim() && !postData.value.description.includes('<img')) {
    return '請輸入行程介紹內容'
  }

  if (postData.value.price === null || postData.value.price === '') return '請輸入價格'
  if (postData.value.price < 0) return '價格不能為負數'

  if (!postData.value.agencyName) return '請輸入旅行社/提供者名稱'
  if (!postData.value.location) return '請輸入地點'
  if (!postData.value.start_date || !postData.value.end_date) return '請選擇行程日期'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(postData.value.start_date)
  if (startDate < today) return '出發日期不能早於今天'

  return ''
}

// --- 日期與天數計算邏輯 ---
const calculateDuration = () => {
  if (postData.value.start_date && postData.value.end_date) {
    const start = new Date(postData.value.start_date)
    const end = new Date(postData.value.end_date)
    const diffTime = end - start
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (diffDays <= 0) {
      formError.value = '結束日期必須晚於或等於起始日期'
      postData.value.durationDays = 0
      return
    }
    if (diffDays > 364) {
      formError.value = '行程天數不能超過 364 天'
      postData.value.durationDays = 0
      return
    }
    formError.value = ''
    postData.value.durationDays = diffDays
    updateItineraryDays(diffDays)
  }
}

const updateItineraryDays = (daysCount) => {
  const currentDays = postData.value.itinerary.days
  if (daysCount > currentDays.length) {
    for (let i = currentDays.length; i < daysCount; i++) {
      currentDays.push({ day: i + 1, activities: [] })
    }
  } else if (daysCount < currentDays.length) {
    postData.value.itinerary.days = currentDays.slice(0, daysCount)
  }
  if (activeDayIndex.value >= daysCount) {
    activeDayIndex.value = Math.max(0, daysCount - 1)
  }
}

watch(() => [postData.value.start_date, postData.value.end_date], calculateDuration)

const currentDay = computed(() => {
  return postData.value.itinerary.days[activeDayIndex.value] || { day: 1, activities: [] }
})

const addActivity = () => {
  if (!currentDay.value.activities) currentDay.value.activities = []
  currentDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    title: '',
    desc: '',
    icon: 'map-pin',
  })
}
const removeActivity = (index) => currentDay.value.activities.splice(index, 1)

// --- 打包清單邏輯 ---
const addPackingCategory = () => postData.value.packingList.push({ category: '新分類', items: [] })
const removePackingCategory = (index) => postData.value.packingList.splice(index, 1)
const addPackingItem = (catIndex) => postData.value.packingList[catIndex].items.push('')
const removePackingItem = (catIndex, itemIndex) =>
  postData.value.packingList[catIndex].items.splice(itemIndex, 1)

// --- 標籤邏輯 ---
const addTag = (tagText) => {
  const clean = tagText.replace(/^#/, '').trim()
  if (!clean) return
  if (clean.length > 30) {
    alert('標籤名稱不能超過 30 個字元')
    return
  }
  if (postData.value.tags.length >= 5) {
    alert('標籤最多只能設定 5 個')
    return
  }
  if (!postData.value.tags.includes(clean)) {
    postData.value.tags.push(clean)
  }
  tagSearch.value = ''
}
const removeTag = (index) => postData.value.tags.splice(index, 1)

// --- 步驟控制 ---
const nextStep = () => {
  if (isUploading.value || isSubmitting.value) return

  if (currentStep.value === 'basic') {
    const error = validateBasic()
    if (error) {
      formError.value = error
      return
    }
    currentStep.value = 'itinerary'
  } else if (currentStep.value === 'itinerary') {
    if (postData.value.packingList.length === 0) {
      postData.value.packingList.push(
        { category: '證件與金錢', items: ['護照', '現金', '信用卡'] },
        { category: '衣物', items: ['換洗衣物', '外套'] },
      )
    }
    currentStep.value = 'packing'
  } else if (currentStep.value === 'packing') {
    currentStep.value = 'tags'
  } else if (currentStep.value === 'tags') {
    currentStep.value = 'preview'
  }
}

const prevStep = () => {
  formError.value = ''
  if (currentStep.value === 'preview') currentStep.value = 'tags'
  else if (currentStep.value === 'tags') currentStep.value = 'packing'
  else if (currentStep.value === 'packing') currentStep.value = 'itinerary'
  else if (currentStep.value === 'itinerary') currentStep.value = 'basic'
}

// Watch initialData for Edit Mode
watch(
  () => props.initialData,
  (newData) => {
    if (props.isEdit && newData) {
      console.log('🔄 Loading initial data for edit:', newData)
      postData.value = {
        category: newData.category || '',
        title: newData.title || newData.name || '',
        description: newData.description || '',
        price: newData.price,
        agencyName: newData.agencyName || userStore.currentUser?.nickname || '',
        location: newData.location || '',
        start_date: newData.start_date ? newData.start_date.split('T')[0] : '',
        end_date: newData.end_date ? newData.end_date.split('T')[0] : '',
        durationDays: newData.days || newData.durationDays || 1,
        max_people: newData.max_people || 20,
        coverImage: newData.image || newData.coverImage || '',
        tags: newData.tags || [],
        itinerary: newData.itinerary || { days: [] },
        packingList: newData.packingList || [],
      }

      // Restore Banner Preview if existing
      if (postData.value.coverImage) {
        bannerPreview.value = postData.value.coverImage
      }

      // Ensure itinerary days are initialized
      if (!postData.value.itinerary.days || postData.value.itinerary.days.length === 0) {
        updateItineraryDays(postData.value.durationDays)
      }

      // Update Editor Content
      if (editor.value) {
        editor.value.commands.setContent(postData.value.description)
      }
    }
  },
  { immediate: true, deep: true }
)


// --- 送出表單 ---
const handleFinalSubmit = async () => {
  if (!auth.currentUser) {
    formError.value = '請先登入'
    return
  }

  isSubmitting.value = true
  submitProgress.value = 0
  submitStatus.value = '準備中...'
  formError.value = ''

  try {
    let bannerImageUrl = postData.value.coverImage

    if (bannerFile.value) {
      submitStatus.value = '上傳封面圖...'
      submitProgress.value = 30
      bannerImageUrl = await uploadImage(bannerFile.value, 'itineraries')
    }

    const payload = {
      ...postData.value,
      coverImage: bannerImageUrl,
      banner_position_y: Math.round(bannerPositionY.value),
      author_uid: auth.currentUser.uid,
      author_name: userStore.currentUser?.displayName || '匿名',
      author_avatar: userStore.currentUser?.avatar,
    }

    submitProgress.value = 70
    submitStatus.value = '正在提交中...'

    let res
    if (props.isEdit) {
      res = await updateItinerary(props.initialData.id, payload)
    } else {
      res = await createItinerary(payload)
    }

    if (res.success) {
      submitProgress.value = 100
      submitStatus.value = props.isEdit ? '更新成功！' : '發布成功！'
      alert(props.isEdit ? '行程更新成功！' : '精選行程上架成功！')
      emit('success')
      emit('close')
    } else {
      formError.value = res.message || (props.isEdit ? '更新失敗' : '發布失敗')
    }
  } catch (e) {
    console.error(e)
    formError.value = '伺服器錯誤，請稍後再試'
  } finally {
    isSubmitting.value = false
  }
}

// 初始化
if (postData.value.itinerary.days.length === 0) {
  postData.value.itinerary.days.push({ day: 1, activities: [] })
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div
      :class="[
        'modal-content-container bg-white w-full flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all duration-300',
        currentStep === 'preview' ? 'max-w-5xl h-[90vh]' : 'max-w-4xl max-h-[90vh]',
      ]"
    >
      <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep !== 'basic' && currentStep !== 'preview'"
            class="p-2 hover:bg-gray-100 rounded-full transition"
            @click="prevStep"
          >
            <ArrowLeftIcon class="w-5 h-5 text-gray-500" />
          </button>
          <h2 class="text-xl font-bold text-gray-800">
            {{ currentStep === 'preview' ? '預覽行程' : '上架精選行程' }}
          </h2>
        </div>
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="emit('close')">
          <XIcon class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <div v-if="currentStep !== 'preview'" class="px-6 border-b border-gray-100">
        <div class="flex items-center space-x-8 text-sm font-bold overflow-x-auto">
          <div
            v-for="step in ['basic', 'itinerary', 'packing', 'tags', 'preview']"
            :key="step"
            :class="[
              'py-3 border-b-2 transition cursor-default whitespace-nowrap capitalize',
              currentStep === step
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-400',
            ]"
          >
            {{
              step === 'basic'
                ? '基本資訊'
                : step === 'itinerary'
                  ? '每日行程'
                  : step === 'packing'
                    ? '打包清單'
                    : step === 'tags'
                      ? '標籤'
                      : '預覽'
            }}
          </div>
        </div>
      </div>

      <div
        :class="[
          'flex-1 overflow-y-auto custom-scrollbar',
          currentStep === 'preview' ? 'p-0' : 'p-6 space-y-6',
        ]"
      >
        <div v-if="currentStep === 'basic'" class="space-y-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2"
              >分類 <span class="text-red-500">*</span></label
            >
            <select
              id="category"
              name="category"
              v-model="postData.category"
              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition bg-white"
              :class="{ 'border-red-500': !postData.category && formError }"
            >
              <option value="" disabled selected>請選擇分類</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700"
                >行程標題 <span class="text-red-500">*</span></label
              >
              <span
                :class="[
                  'text-xs',
                  postData.title.trim().length > 35 ? 'text-red-500 font-bold' : 'text-gray-400',
                ]"
                >{{ postData.title.trim().length }}/35</span
              >
            </div>
            <input
              id="title"
              name="title"
              v-model="postData.title"
              type="text"
              placeholder="例如：京都深度五日遊"
              :class="[
                'w-full p-3 border-2 rounded-xl focus:outline-none transition',
                !postData.title.trim() && formError
                  ? 'border-red-500'
                  : 'border-gray-200 focus:border-primary-500',
              ]"
              maxlength="35"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-bold text-gray-700"
              >封面圖片 <span class="text-red-500">*</span></label
            >
            <div
              v-if="bannerPreview"
              class="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group cursor-move select-none"
              @mousedown.prevent="startDragBanner"
              @mousemove="onDragBanner"
              @mouseup="stopDragBanner"
              @mouseleave="stopDragBanner"
            >
              <img
                :src="bannerPreview"
                class="w-full h-full object-cover pointer-events-none"
                :style="{ objectPosition: `center ${bannerPositionY}%` }"
              />
              <div
                class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none"
              >
                上下拖曳調整位置
              </div>
              <button
                class="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition"
                @click.stop="removeBanner"
              >
                <XIcon class="w-5 h-5" />
              </button>
            </div>
            <button
              v-else
              :disabled="isUploading"
              class="w-full py-8 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl hover:bg-gray-50 hover:border-primary-500 hover:text-primary-600 transition flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              @click="triggerBannerSelect"
            >
              <ImageIcon class="w-8 h-8 opacity-50" /> 點擊上傳封面圖片
            </button>
            <input
              id="bannerFile"
              name="bannerFile"
              ref="bannerFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleBannerSelect"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-gray-700">行程介紹</label>
              <span
                v-if="editor"
                class="text-xs"
                :class="{
                  'text-red-500 font-bold':
                    editor.storage.characterCount.characters() >= CHARACTER_LIMIT,
                }"
                >{{ editor.storage.characterCount.characters() }} / {{ CHARACTER_LIMIT }}</span
              >
            </div>
            <div
              class="border-2 rounded-xl overflow-x-hidden transition flex flex-col bg-white border-gray-200 focus-within:border-primary-500"
            >
              <div
                v-if="editor"
                class="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-30 shadow-sm"
              >
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H2"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 2 }) }"
                  @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                >
                  <Heading2Icon class="w-4 h-4" />
                </button>
                <button
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="H3"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('heading', { level: 3 }) }"
                  @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                >
                  <Heading3Icon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="editor.chain().focus().toggleBold().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('bold') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="粗體"
                >
                  <BoldIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().toggleItalic().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('italic') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="斜體"
                >
                  <ItalicIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().toggleUnderline().run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive('underline') }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="底線"
                >
                  <UnderlineIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="editor.chain().focus().setTextAlign('left').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'left' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="靠左"
                >
                  <AlignLeftIcon class="w-4 h-4" />
                </button>
                <button
                  @click="editor.chain().focus().setTextAlign('center').run()"
                  :class="{ 'bg-gray-200 text-black': editor.isActive({ textAlign: 'center' }) }"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="置中"
                >
                  <AlignCenterIcon class="w-4 h-4" />
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <div class="relative">
                  <button
                    @click="toggleColorPicker"
                    class="p-2 rounded hover:bg-gray-200 flex items-center"
                    title="文字顏色"
                  >
                    <PaletteIcon class="w-4 h-4" />
                    <div
                      class="w-2 h-2 rounded-full ml-1 border border-gray-300"
                      :style="{
                        backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                      }"
                    ></div>
                  </button>
                  <div
                    v-if="showColorPicker"
                    class="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 grid grid-cols-4 gap-2 z-50 w-40"
                  >
                    <button
                      v-for="color in commonColors"
                      :key="color"
                      @click="setColor(color)"
                      class="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 shadow-sm"
                      :style="{ backgroundColor: color }"
                    ></button>
                  </div>
                  <div
                    v-if="showColorPicker"
                    class="fixed inset-0 z-40"
                    @click="showColorPicker = false"
                  ></div>
                </div>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="setFontKai"
                  :class="{
                    'bg-gray-200 text-black': editor.isActive('textStyle', {
                      fontFamily: 'BiauKai, DFKai-SB, 標楷體',
                    }),
                  }"
                  class="p-2 rounded hover:bg-gray-200 flex items-center gap-1"
                  title="標楷體"
                >
                  <TypeIcon class="w-4 h-4" /><span class="text-xs font-bold">楷</span>
                </button>
                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                <button
                  @click="triggerEditorImageUpload"
                  class="p-2 rounded hover:bg-gray-200 text-gray-600"
                  title="插入圖片"
                >
                  <ImageIcon class="w-4 h-4" />
                </button>
                <input
                  id="editorFile"
                  name="editorFile"
                  type="file"
                  ref="editorFileInputRef"
                  class="hidden"
                  accept="image/*"
                  @change="handleEditorImageSelect"
                />
              </div>
              <editor-content
                :editor="editor"
                class="min-h-[300px] cursor-text bg-white rounded-b-xl"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">價格</label>
              <div class="relative">
                <DollarSignIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="price"
                  name="price"
                  v-model.number="postData.price"
                  type="number"
                  min="0"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="請輸入金額"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">旅行社/提供者</label>
              <div class="relative">
                <BuildingIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="agencyName"
                  name="agencyName"
                  v-model="postData.agencyName"
                  maxlength="15"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="例如：雄獅旅遊"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">出發日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="start_date"
                  name="start_date"
                  v-model="postData.start_date"
                  type="date"
                  :min="minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">結束日期</label>
              <div class="relative">
                <CalendarIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="end_date"
                  name="end_date"
                  v-model="postData.end_date"
                  type="date"
                  :min="postData.start_date || minDate"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">地點</label>
              <div class="relative">
                <MapPinIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="location"
                  name="location"
                  v-model="postData.location"
                  maxlength="10"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="例如：日本關西"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">團體人數上限</label>
              <div class="relative">
                <UsersIcon class="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  id="max_people"
                  name="max_people"
                  v-model.number="postData.max_people"
                  type="number"
                  min="1"
                  max="999"
                  class="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-primary-500 transition"
                  placeholder="請輸入人數"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'itinerary'" class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg text-gray-800">每日行程規劃</h3>
            <div class="text-sm text-gray-500">共 {{ postData.durationDays }} 天</div>
          </div>
          <div class="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
            <button
              v-for="(day, idx) in postData.itinerary.days"
              :key="idx"
              :class="[
                'px-4 py-2 rounded-lg font-bold border transition whitespace-nowrap',
                activeDayIndex === idx ? 'bg-primary-600 text-white' : 'bg-white border-gray-200',
              ]"
              @click="activeDayIndex = idx"
            >
              Day {{ day.day }}
            </button>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div class="mb-4 font-bold text-gray-700 flex justify-between">
              <span>正在編輯 Day {{ currentDay.day }}</span>
              <span class="text-sm text-gray-400" v-if="postData.start_date">{{
                new Date(
                  new Date(postData.start_date).getTime() + activeDayIndex * 86400000,
                ).toLocaleDateString()
              }}</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="(act, aIdx) in currentDay.activities"
                :key="act.id"
                class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
              >
                <div class="flex justify-between mb-2">
                  <input
                    :id="`activity-time-${aIdx}`"
                    :name="`activity-time-${aIdx}`"
                    v-model="act.time"
                    type="time"
                    class="bg-gray-100 rounded px-2 font-bold text-gray-700"
                  />
                  <button @click="removeActivity(aIdx)" class="text-gray-400 hover:text-red-500">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <input
                  :id="`activity-title-${aIdx}`"
                  :name="`activity-title-${aIdx}`"
                  v-model="act.title"
                  placeholder="活動標題"
                  class="w-full font-bold mb-1 border-b border-transparent focus:border-primary-300 outline-none"
                />
                <textarea
                  :id="`activity-desc-${aIdx}`"
                  :name="`activity-desc-${aIdx}`"
                  v-model="act.desc"
                  placeholder="詳細描述..."
                  class="w-full text-sm text-gray-600 resize-none outline-none bg-transparent"
                ></textarea>
              </div>
            </div>
            <button
              @click="addActivity"
              class="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-primary-400 hover:text-primary-600 transition"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 'packing'" class="space-y-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <h3 class="font-bold text-lg text-gray-800">打包建議清單</h3>
              <p class="text-xs text-gray-500">幫旅客列出這趟旅程必備的物品</p>
            </div>
            <button
              @click="addPackingCategory"
              class="text-primary-600 font-bold hover:bg-primary-50 px-3 py-1 rounded transition"
            >
              <PlusIcon class="inline w-4 h-4" /> 新增分類
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="(cat, cIdx) in postData.packingList"
              :key="cIdx"
              class="p-4 border border-gray-200 rounded-xl bg-gray-50 relative group"
            >
              <button
                @click="removePackingCategory(cIdx)"
                class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <XIcon class="w-4 h-4" />
              </button>
              <input
                :id="`packing-category-${cIdx}`"
                :name="`packing-category-${cIdx}`"
                v-model="cat.category"
                class="font-bold text-primary-700 w-full mb-3 border-b border-dashed border-gray-300 focus:border-primary-500 outline-none bg-transparent"
                placeholder="分類名稱 (例如：衣物)"
              />
              <div class="space-y-2">
                <div
                  v-for="(item, iIdx) in cat.items"
                  :key="iIdx"
                  class="flex items-center bg-white p-2 rounded border border-gray-100"
                >
                  <CheckSquareIcon class="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" />
                  <input
                    :id="`packing-item-${cIdx}-${iIdx}`"
                    :name="`packing-item-${cIdx}-${iIdx}`"
                    v-model="cat.items[iIdx]"
                    class="text-sm text-gray-600 w-full outline-none"
                    placeholder="物品名稱"
                  />
                  <button
                    @click="removePackingItem(cIdx, iIdx)"
                    class="text-gray-300 hover:text-red-400 ml-2"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
                </div>
                <button
                  @click="addPackingItem(cIdx)"
                  class="text-xs font-bold text-primary-500 mt-2 hover:underline"
                >
                  + 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 'tags'" class="space-y-6">
          <div class="relative mb-6">
            <input
              id="tagSearch"
              name="tagSearch"
              v-model="tagSearch"
              type="text"
              placeholder="輸入標籤..."
              class="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:border-primary-500"
              maxlength="30"
              @keyup.enter="addTag(tagSearch)"
            />
            <HashIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="(tag, i) in postData.tags"
              :key="i"
              class="px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1 bg-primary-50 text-primary-700 border-primary-100"
            >
              #{{ tag }} <button @click="removeTag(i)"><XIcon class="w-3 h-3" /></button>
            </span>
          </div>
          <div class="text-sm text-gray-500">最多 5 個標籤。輸入後按 Enter 新增。</div>
        </div>

        <div v-else-if="currentStep === 'preview'" class="bg-white h-full relative">
          <div class="relative w-full h-72 overflow-hidden">
            <img
              :src="bannerPreview || 'https://picsum.photos/1200/400'"
              class="w-full h-full object-cover"
              :style="{ objectPosition: `center ${bannerPositionY}%` }"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div
              class="absolute top-4 left-4 px-4 py-2 font-bold text-sm rounded-lg border-2 border-primary bg-primary-600 text-white"
            >
              預覽中
            </div>
          </div>

          <div class="p-6">
            <h1 class="text-3xl font-black text-secondary-900 mb-4">{{ postData.title }}</h1>

            <div class="flex items-center space-x-3 mb-6">
              <img
                :src="
                  userStore.currentUser?.avatar ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
                "
                class="w-12 h-12 rounded-full object-cover border-2 border-secondary-200"
              />
              <div>
                <div class="font-bold text-secondary-900">
                  {{ userStore.currentUser?.displayName || '你' }}
                </div>
                <div class="text-xs text-secondary-400">
                  剛剛發布 •
                  <span class="text-primary-600 font-bold ml-1">@ {{ postData.category }}</span>
                </div>
              </div>
            </div>

            <div
              class="prose prose-lg max-w-none mb-8 text-secondary-700 leading-relaxed"
              v-html="postData.description"
            ></div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-primary-600 mb-1">
                  <MapPinIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >地點</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.location }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-secondary-500 mb-1">
                  <CalendarIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >日期</span
                  >
                </div>
                <div class="font-bold text-secondary-900">{{ postData.start_date }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-primary-500 mb-1">
                  <UsersIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >人數</span
                  >
                </div>
                <div class="font-bold text-primary-600">{{ postData.max_people }}</div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-secondary-200 shadow-sm">
                <div class="flex items-center text-green-600 mb-1">
                  <DollarSignIcon class="w-4 h-4 mr-1" /><span
                    class="text-xs font-bold text-secondary-500"
                    >價格</span
                  >
                </div>
                <div class="font-bold text-green-700">NT$ {{ postData.price }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-white flex flex-col gap-2 z-10">
        <p
          v-if="formError"
          class="text-red-500 font-bold text-sm text-center flex items-center justify-center"
        >
          <AlertIcon class="w-4 h-4 mr-1" />
          {{ formError }}
        </p>

        <div v-if="isSubmitting" class="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            class="bg-primary-600 h-3 rounded-full transition-all duration-300"
            :style="{ width: submitProgress + '%' }"
          ></div>
        </div>
        <p v-if="isSubmitting" class="text-sm text-center text-primary-600 font-bold">
          {{ submitStatus }}
        </p>

        <div class="flex gap-3 justify-end">
          <template v-if="currentStep === 'preview'">
            <button
              v-if="!isSubmitting"
              type="button"
              class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition"
              @click="prevStep"
            >
              返回修改
            </button>
            <button
              type="button"
              :disabled="isSubmitting"
              class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
              @click="handleFinalSubmit"
            >
              {{ isSubmitting ? '發布中...' : '確認發布' }}
            </button>
          </template>
          <button
            v-else
            type="button"
            :disabled="isUploading || isSubmitting"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 disabled:bg-gray-400"
            @click="nextStep"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Tiptap Styles */
:deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  line-height: 1.5;
  font-size: 16px;
}
:deep(.ProseMirror p) {
  margin: 0 !important;
  padding: 0;
  min-height: 1.5em;
}
:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 !important;
  line-height: 1.2;
  color: #111827;
}
:deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 !important;
  line-height: 1.2;
  color: #1f2937;
}
:deep(.ProseMirror strong) {
  font-weight: bold !important;
}
:deep(.ProseMirror em) {
  font-style: italic !important;
}
:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
:deep(.ProseMirror img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  margin-left: 0;
  margin-right: auto;
}
:deep(.ProseMirror [style*='font-family: BiauKai']) {
  font-family: BiauKai, 'DFKai-SB', 標楷體, serif;
}
</style>
