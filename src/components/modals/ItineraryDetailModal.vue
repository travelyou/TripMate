<script setup>
import { ref, computed } from 'vue'
import {
  X as XIcon,
  Trash2 as TrashIcon,
  Plus as PlusIcon,
  Camera as CameraIcon,
  Coffee as CoffeeIcon,
  MapPin as MapPinIcon,
  CheckSquare as CheckSquareIcon,
  Save as SaveIcon,
  Map as MapIcon,
  FileText as FileTextIcon, // 🟢 新增：草稿圖示
} from 'lucide-vue-next'

const props = defineProps({
  itinerary: {
    type: Object,
    required: true,
  },
})

// 🟢 新增 'save-draft' 事件
const emit = defineEmits(['close', 'save', 'delete', 'save-draft'])

const localItinerary = ref(JSON.parse(JSON.stringify(props.itinerary)))

const activeDayIndex = ref(0)
const activeDay = computed(() => {
  // 1. 先把 days 拿出來，如果是 undefined 就當作空陣列 (不要用 = 去賦值修改它)
  const days = localItinerary.value.days || []

  // 2. 安全地回傳當天的內容，如果找不到就回傳空活動
  return days[activeDayIndex.value] || { activities: [] }
})


const getDayLabel = (index) => {
  const startDateStr = localItinerary.value.startDate
  if (!startDateStr) return `Day ${index + 1}`
  const [year, month, day] = startDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + index)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d}`
}

const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'camera':
      return CameraIcon
    case 'coffee':
      return CoffeeIcon
    case 'map-pin':
      return MapPinIcon
    default:
      return MapIcon
  }
}

const addDay = () => {
  if (!localItinerary.value.days) localItinerary.value.days = []
  const nextDayNum = localItinerary.value.days.length + 1
  localItinerary.value.days.push({
    day: nextDayNum,
    date: '',
    activities: [],
  })
  activeDayIndex.value = localItinerary.value.days.length - 1
}

const deleteItem = (categoryIndex, itemIndex) => {
  localItinerary.value.packingList[categoryIndex].items.splice(itemIndex, 1)
}

const addItem = (categoryIndex) => {
  localItinerary.value.packingList[categoryIndex].items.push({
    id: Date.now(),
    name: '新物品',
    checked: false,
  })
}

const addCategory = () => {
  localItinerary.value.packingList.push({
    category: '新分類',
    items: [],
  })
}

const deleteCategory = (index) => {
  localItinerary.value.packingList.splice(index, 1)
}

const deleteActivity = (actIndex) => {
  if (activeDay.value.activities) {
    activeDay.value.activities.splice(actIndex, 1)
  }
}

const addActivity = () => {
  if (!activeDay.value.activities) activeDay.value.activities = []
  activeDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    icon: 'map-pin',
    title: '新活動',
    desc: '描述你的活動...',
  })
}

const handleSave = () => {
  emit('save', localItinerary.value)
}

// 🟢 新增：處理暫存草稿
const handleSaveDraft = () => {
  emit('save-draft', localItinerary.value)
}

const handleDelete = () => {
  if (confirm('確定要刪除這個行程嗎？')) {
    emit('delete', localItinerary.value.id)
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[200] flex justify-center items-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-[#fffef7] w-full max-w-6xl max-h-[90vh] flex flex-col pixel-modal shadow-2xl overflow-hidden relative"
    >
      <div class="p-4 border-b-2 border-gray-200 flex justify-between items-start bg-white z-10">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-3">
            <MapIcon class="w-6 h-6 text-indigo-600" />
            <input
              v-model="localItinerary.title"
              class="text-2xl font-black text-indigo-600 bg-transparent border-b-2 border-transparent focus:border-indigo-400 focus:outline-none w-full"
              placeholder="請輸入行程標題"
            />
          </div>
          <div class="flex items-center space-x-2 text-sm">
            <input
              v-model="localItinerary.startDate"
              type="date"
              class="border border-gray-300 rounded px-2 py-1 text-gray-600 font-bold"
            />
            <span class="text-gray-400">-</span>
            <input
              v-model="localItinerary.endDate"
              type="date"
              class="border border-gray-300 rounded px-2 py-1 text-gray-600 font-bold"
            />
          </div>
        </div>
        <button
          class="border-2 border-gray-800 p-1 hover:bg-gray-100 transition"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <div class="w-2/3 flex flex-col border-r-2 border-gray-200 bg-gray-50/50">
          <div
            class="flex overflow-x-auto p-4 space-x-2 border-b border-gray-200 bg-white items-center"
          >
            <button
              v-for="(day, index) in localItinerary.days"
              :key="index"
              :class="[
                'px-6 py-2 rounded-lg font-bold border-2 transition whitespace-nowrap',
                activeDayIndex === index
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md translate-y-1'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
              ]"
              @click="activeDayIndex = index"
            >
              {{ getDayLabel(index) }}
            </button>
            <button
              class="px-3 py-2 text-gray-400 hover:text-indigo-600 border-2 border-dashed border-gray-300 rounded hover:border-indigo-300 transition flex items-center shrink-0 bg-white"
              title="新增天數"
              @click="addDay"
            >
              <PlusIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <div v-if="activeDay && activeDay.activities && activeDay.activities.length > 0">
              <div
                v-for="(activity, index) in activeDay.activities"
                :key="activity.id"
                class="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm relative group mb-4"
              >
                <button
                  class="absolute right-2 top-2 text-gray-300 hover:text-red-500 transition"
                  @click="deleteActivity(index)"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
                <div class="flex gap-4">
                  <div class="w-40 shrink-0">
                    <label
                      class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block"
                      >Time</label
                    >
                    <input
                      v-model="activity.time"
                      type="time"
                      class="block w-full text-lg font-bold text-gray-800 bg-gray-50 border-b-2 border-gray-200 focus:border-indigo-500 focus:outline-none px-2 py-1 rounded-t transition"
                    />
                  </div>
                  <div class="w-32 shrink-0">
                    <label
                      class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block"
                      >Icon</label
                    >
                    <div
                      class="flex items-center space-x-2 border-b-2 border-gray-200 bg-gray-50 px-2 py-1 rounded-t focus-within:border-indigo-500 transition"
                    >
                      <component
                        :is="getIconComponent(activity.icon)"
                        class="w-5 h-5 text-indigo-500 shrink-0"
                      />
                      <input
                        v-model="activity.icon"
                        class="w-full text-sm bg-transparent focus:outline-none text-gray-600 font-medium"
                        placeholder="icon name"
                      />
                    </div>
                  </div>
                </div>
                <div class="mt-4 space-y-2">
                  <input
                    v-model="activity.title"
                    class="w-full text-xl font-bold text-gray-800 border-b border-gray-200 focus:border-indigo-500 focus:outline-none py-1"
                    placeholder="活動標題"
                  />
                  <textarea
                    v-model="activity.desc"
                    class="w-full text-sm text-gray-600 bg-gray-50 p-2 rounded border border-transparent focus:border-indigo-200 focus:outline-none resize-none"
                    rows="2"
                    placeholder="活動備註..."
                  ></textarea>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-10">這一天還沒有安排活動。</div>
            <button
              class="w-full border-2 border-dashed border-indigo-300 text-indigo-500 font-bold py-3 rounded-xl hover:bg-indigo-50 transition flex items-center justify-center"
              @click="addActivity"
            >
              <PlusIcon class="w-5 h-5 mr-2" /> 新增活動
            </button>
          </div>
        </div>

        <div class="w-1/3 flex flex-col bg-[#fffef7]">
          <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 class="font-black text-lg text-gray-800 flex items-center">
              <CheckSquareIcon class="w-5 h-5 mr-2 text-green-500" />
              所需物品
            </h3>
            <button
              class="text-green-600 border border-green-600 rounded p-0.5 hover:bg-green-50"
              @click="addCategory"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div
              v-for="(cat, catIndex) in localItinerary.packingList"
              :key="catIndex"
              class="relative"
            >
              <div class="flex justify-between items-center mb-2">
                <input
                  v-model="cat.category"
                  class="font-bold text-gray-700 bg-transparent focus:outline-none hover:bg-gray-100 px-1 rounded"
                />
                <button class="text-gray-300 hover:text-red-500" @click="deleteCategory(catIndex)">
                  <TrashIcon class="w-3 h-3" />
                </button>
              </div>
              <div
                class="border-2 border-gray-800 bg-white rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(31,41,55,0.1)]"
              >
                <div
                  v-for="(item, itemIndex) in cat.items"
                  :key="item.id"
                  class="flex items-center p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 group"
                >
                  <input
                    v-model="item.checked"
                    type="checkbox"
                    class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mr-2 accent-indigo-600"
                  />
                  <input
                    v-model="item.name"
                    :class="[
                      'flex-1 bg-transparent focus:outline-none text-sm',
                      item.checked ? 'text-gray-400 line-through' : 'text-gray-700',
                    ]"
                  />
                  <button
                    class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    @click="deleteItem(catIndex, itemIndex)"
                  >
                    <XIcon class="w-4 h-4" />
                  </button>
                </div>
                <button
                  class="w-full text-xs text-indigo-500 font-bold p-2 bg-indigo-50 hover:bg-indigo-100 transition flex items-center justify-center border-t border-indigo-100"
                  @click="addItem(catIndex)"
                >
                  <PlusIcon class="w-3 h-3 mr-1" /> 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 bg-white flex justify-end space-x-4">
        <button
          class="flex items-center px-4 py-2 text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border-2 border-indigo-200 mr-auto"
          @click="handleSaveDraft"
        >
          <FileTextIcon class="w-5 h-5 mr-2" /> 暫存草稿
        </button>

        <button
          class="flex items-center px-4 py-2 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-lg transition"
          @click="handleDelete"
        >
          <TrashIcon class="w-5 h-5 mr-2" /> 刪除
        </button>
        <button
          class="flex items-center px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition"
          @click="handleSave"
        >
          <SaveIcon class="w-5 h-5 mr-2" /> 儲存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixel-modal {
  border: 4px solid #1f2937;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
