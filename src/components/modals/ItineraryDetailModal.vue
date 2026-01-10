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
  FileText as FileTextIcon,
} from 'lucide-vue-next'

const props = defineProps({ itinerary: { type: Object, required: true } })
const emit = defineEmits(['close', 'save', 'delete', 'save-draft'])
const localItinerary = ref(JSON.parse(JSON.stringify(props.itinerary)))
const activeDayIndex = ref(0)
const activeDay = computed(() => {
  const days = localItinerary.value.days || []
  return days[activeDayIndex.value] || { activities: [] }
})
const getDayLabel = (index) => {
  const startDateStr = localItinerary.value.startDate
  if (!startDateStr) return `Day ${index + 1}`
  const [year, month, day] = startDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + index)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
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
  localItinerary.value.days.push({
    day: localItinerary.value.days.length + 1,
    date: '',
    activities: [],
  })
  activeDayIndex.value = localItinerary.value.days.length - 1
}
const deleteItem = (categoryIndex, itemIndex) =>
  localItinerary.value.packingList[categoryIndex].items.splice(itemIndex, 1)
const addItem = (categoryIndex) =>
  localItinerary.value.packingList[categoryIndex].items.push({
    id: Date.now(),
    name: '新物品',
    checked: false,
  })
const addCategory = () => localItinerary.value.packingList.push({ category: '新分類', items: [] })
const deleteCategory = (index) => localItinerary.value.packingList.splice(index, 1)
const deleteActivity = (actIndex) => activeDay.value.activities.splice(actIndex, 1)
const addActivity = () => {
  if (!activeDay.value.activities) activeDay.value.activities = []
  activeDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    icon: 'map-pin',
    title: '',
    desc: '',
  })
}
const handleSave = () => emit('save', localItinerary.value)
const handleSaveDraft = () => emit('save-draft', localItinerary.value)
const handleDelete = () => {
  if (confirm('確定要刪除？')) emit('delete', localItinerary.value.id)
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[200] flex justify-center items-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-gray-50 w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
    >
      <div class="p-4 border-b border-gray-200 flex justify-between items-start bg-white">
        <div class="flex-1">
          <div class="flex items-center space-x-2 mb-2">
            <MapIcon class="w-6 h-6 text-indigo-600" />
            <input
              v-model="localItinerary.title"
              class="text-2xl font-bold text-gray-800 bg-transparent focus:outline-none w-full placeholder-gray-300"
              placeholder="請輸入行程標題"
            />
          </div>
          <div class="flex items-center space-x-2 text-sm text-gray-500">
            <input
              v-model="localItinerary.startDate"
              type="date"
              class="bg-transparent hover:bg-gray-100 rounded px-1"
            />
            <span>-</span>
            <input
              v-model="localItinerary.endDate"
              type="date"
              class="bg-transparent hover:bg-gray-100 rounded px-1"
            />
          </div>
        </div>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <div class="w-2/3 flex flex-col border-r border-gray-200 bg-gray-50">
          <div class="flex overflow-x-auto p-4 space-x-2 bg-white border-b border-gray-100">
            <button
              v-for="(day, index) in localItinerary.days"
              :key="index"
              :class="[
                'px-4 py-2 rounded-lg font-bold transition whitespace-nowrap text-sm',
                activeDayIndex === index
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              ]"
              @click="activeDayIndex = index"
            >
              {{ getDayLabel(index) }}
            </button>
            <button
              class="px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              @click="addDay"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div v-if="activeDay.activities?.length > 0">
              <div
                v-for="(activity, index) in activeDay.activities"
                :key="activity.id"
                class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group mb-4"
              >
                <div class="flex gap-4">
                  <div
                    class="w-24 shrink-0 border-r border-gray-100 pr-4 flex flex-col justify-center"
                  >
                    <input
                      v-model="activity.time"
                      type="time"
                      class="text-xl font-bold text-indigo-600 bg-transparent focus:outline-none w-full"
                    />
                    <div class="mt-2 flex items-center text-gray-400">
                      <component :is="getIconComponent(activity.icon)" class="w-4 h-4 mr-1" />
                      <span class="text-xs">Icon</span>
                    </div>
                  </div>
                  <div class="flex-1">
                    <input
                      v-model="activity.title"
                      class="w-full text-lg font-bold text-gray-800 focus:outline-none mb-1 placeholder-gray-300"
                      placeholder="活動標題"
                    />
                    <textarea
                      v-model="activity.desc"
                      class="w-full text-sm text-gray-500 bg-transparent resize-none focus:outline-none"
                      rows="2"
                      placeholder="備註..."
                    ></textarea>
                  </div>
                  <button
                    class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    @click="deleteActivity(index)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-10">尚無活動</div>
            <button
              class="w-full py-3 border border-dashed border-indigo-200 text-indigo-500 rounded-xl hover:bg-indigo-50 transition font-bold"
              @click="addActivity"
            >
              + 新增活動
            </button>
          </div>
        </div>

        <div class="w-1/3 flex flex-col bg-white">
          <div class="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 class="font-bold text-gray-700 flex items-center">
              <CheckSquareIcon class="w-5 h-5 mr-2 text-indigo-500" /> 物品清單
            </h3>
            <button
              class="text-indigo-600 bg-indigo-50 p-1 rounded hover:bg-indigo-100 transition"
              @click="addCategory"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <div
              v-for="(cat, catIndex) in localItinerary.packingList"
              :key="catIndex"
              class="bg-gray-50 rounded-xl p-3"
            >
              <div class="flex justify-between items-center mb-2">
                <input
                  v-model="cat.category"
                  class="font-bold text-gray-700 bg-transparent focus:outline-none text-sm"
                  placeholder="分類名稱"
                />
                <button class="text-gray-400 hover:text-red-500" @click="deleteCategory(catIndex)">
                  <TrashIcon class="w-3 h-3" />
                </button>
              </div>
              <div class="space-y-1">
                <div
                  v-for="(item, itemIndex) in cat.items"
                  :key="item.id"
                  class="flex items-center group"
                >
                  <input v-model="item.checked" type="checkbox" class="accent-indigo-600 mr-2" />
                  <input
                    v-model="item.name"
                    class="flex-1 bg-transparent text-sm focus:outline-none text-gray-600"
                  />
                  <button
                    class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    @click="deleteItem(catIndex, itemIndex)"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
                </div>
                <button class="text-xs text-indigo-500 font-bold mt-2" @click="addItem(catIndex)">
                  + 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          class="px-4 py-2 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition mr-auto flex items-center"
          @click="handleSaveDraft"
        >
          <FileTextIcon class="w-4 h-4 mr-2" /> 草稿
        </button>
        <button
          class="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg transition"
          @click="handleDelete"
        >
          刪除
        </button>
        <button
          class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center"
          @click="handleSave"
        >
          <SaveIcon class="w-4 h-4 mr-2" /> 儲存
        </button>
      </div>
    </div>
  </div>
</template>
