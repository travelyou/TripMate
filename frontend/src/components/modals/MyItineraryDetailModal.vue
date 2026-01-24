<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import {
  X as XIcon,
  Trash2 as TrashIcon,
  Plus as PlusIcon,
  Clock as ClockIcon,
  CheckSquare as CheckSquareIcon,
  Save as SaveIcon,
  Map as MapIcon,
  FileText as FileTextIcon,
} from 'lucide-vue-next'
import { showConfirm, showAlert } from '@/utils/alert'

const props = defineProps({ itinerary: { type: Object, required: true } })
const emit = defineEmits(['close', 'save', 'delete', 'save-draft'])

const localItinerary = ref(JSON.parse(JSON.stringify(props.itinerary)))
const activeDayIndex = ref(0)
const todayStr = dayjs().format('YYYY-MM-DD')

const activeDay = computed(() => {
  const days = localItinerary.value.days || []
  return days[activeDayIndex.value] || { activities: [] }
})

// 自動生成 MM/DD 格式標籤
const getDayLabel = (index) => {
  const startDateStr = localItinerary.value.startDate
  if (!startDateStr) return `Day ${index + 1}`
  return dayjs(startDateStr).add(index, 'day').format('MM/DD')
}

// 監聽日期變化：不早於今日 + 自動產生日程標籤
watch(
  [() => localItinerary.value.startDate, () => localItinerary.value.endDate],
  ([newStart, newEnd]) => {
    if (!newStart || !newEnd) {
      localItinerary.value.days = []
      return
    }

    const start = dayjs(newStart)
    const end = dayjs(newEnd)

    // 禁止選擇過去
    if (start.isBefore(dayjs(), 'day')) {
      localItinerary.value.startDate = ''
      showAlert('開始日期不能早於今天喔！')
      return
    }

    if (end.isBefore(start)) {
      localItinerary.value.endDate = newStart
      return
    }

    const diffDays = end.diff(start, 'day') + 1
    const newDays = []

    for (let i = 0; i < diffDays; i++) {
      const targetDate = start.add(i, 'day').format('YYYY-MM-DD')
      const existingDay = localItinerary.value.days?.find((d) => d.date === targetDate)
      newDays.push({
        day: i + 1,
        date: targetDate,
        activities: existingDay ? existingDay.activities : [],
      })
    }
    localItinerary.value.days = newDays

    if (activeDayIndex.value >= newDays.length) {
      activeDayIndex.value = Math.max(0, newDays.length - 1)
    }
  },
  { immediate: true },
)

const deleteItem = (categoryIndex, itemIndex) =>
  localItinerary.value.packingList[categoryIndex].items.splice(itemIndex, 1)

const addItem = (categoryIndex) =>
  localItinerary.value.packingList[categoryIndex].items.push({
    id: Date.now(),
    name: '',
    checked: false,
  })

const addCategory = () => localItinerary.value.packingList.push({ category: '', items: [] })
const deleteCategory = (index) => localItinerary.value.packingList.splice(index, 1)
const deleteActivity = (actIndex) => activeDay.value.activities.splice(actIndex, 1)

const addActivity = () => {
  if (!activeDay.value.activities) activeDay.value.activities = []
  activeDay.value.activities.push({
    id: Date.now(),
    time: '09:00',
    title: '',
    desc: '',
  })
}

// 儲存前檢查：時間重疊 + 自動依時間排序
const handleSave = () => {
  if (!localItinerary.value.title?.trim()) {
    showAlert('請輸入行程標題')
    return
  }

  for (const day of localItinerary.value.days) {
    // 1. 自動排序：按時間字串 (如 "10:00") 進行排序
    day.activities.sort((a, b) => (a.time || '').localeCompare(b.time || ''))

    const timeTracker = new Set()
    for (const act of day.activities) {
      if (!act.time) continue
      if (timeTracker.has(act.time)) {
        showAlert(`${day.date} 有重複的時間點：${act.time}，請調整後再儲存。`)
        return
      }
      timeTracker.add(act.time)
    }
  }

  emit('save', localItinerary.value)
}

const handleSaveDraft = () => emit('save-draft', localItinerary.value)

const handleDelete = async () => {
  const confirmed = await showConfirm('確定要刪除？')
  if (confirmed) emit('delete', localItinerary.value.id)
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[200] flex justify-center items-center p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="bg-gray-50 w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-y-auto lg:overflow-hidden"
    >
      <div
        class="p-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between bg-white"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2 mb-2">
            <MapIcon class="w-6 h-6 text-primary-600" />
            <input
              v-model="localItinerary.title"
              class="text-xl sm:text-2xl font-bold text-gray-800 bg-transparent focus:outline-none w-full"
              placeholder="請輸入行程標題"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <input
              v-model="localItinerary.startDate"
              type="date"
              :min="todayStr"
              class="bg-gray-100 rounded px-2 py-1 outline-none"
            />
            <span>-</span>
            <input
              v-model="localItinerary.endDate"
              type="date"
              :min="localItinerary.startDate || todayStr"
              class="bg-gray-100 rounded px-2 py-1 outline-none"
            />
          </div>
        </div>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition text-gray-400"
          @click="emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>

      <div class="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden">
        <div class="w-full lg:w-2/3 flex flex-col border-r border-gray-200 bg-gray-50">
          <div class="flex overflow-x-auto p-3 sm:p-4 space-x-2 bg-white border-b border-gray-100">
            <button
              v-for="(day, index) in localItinerary.days"
              :key="index"
              :class="[
                'px-4 py-2 rounded-lg font-bold transition whitespace-nowrap text-sm',
                activeDayIndex === index
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-500',
              ]"
              @click="activeDayIndex = index"
            >
              Day {{ index + 1 }} ({{ getDayLabel(index) }})
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            <div v-if="activeDay.activities?.length > 0">
              <div
                v-for="(activity, index) in activeDay.activities"
                :key="activity.id"
                class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group mb-4"
              >
                <div class="flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-primary-600 font-black">
                      <input
                        v-model="activity.time"
                        type="time"
                        class="text-xl bg-gray-50 px-2 py-1 rounded focus:outline-none cursor-pointer"
                      />
                    </div>
                    <button
                      class="text-gray-300 hover:text-red-500 transition p-1"
                      @click="deleteActivity(index)"
                    >
                      <TrashIcon class="w-5 h-5" />
                    </button>
                  </div>

                  <div class="border-t border-gray-50 pt-3 space-y-2">
                    <input
                      v-model="activity.title"
                      class="w-full text-lg font-bold text-gray-800 focus:outline-none border-b border-transparent focus:border-primary-100"
                      placeholder="景點名稱或活動"
                    />
                    <textarea
                      v-model="activity.desc"
                      class="w-full text-sm text-gray-500 bg-transparent resize-none focus:outline-none"
                      rows="2"
                      placeholder="備註資訊..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-10">
              {{ localItinerary.startDate ? '今天還沒安排行程唷' : '請先在上方選擇日期範圍' }}
            </div>
            <button
              v-if="localItinerary.days.length > 0"
              class="w-full py-3 border-2 border-dashed border-primary-200 text-primary-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-50"
              @click="addActivity"
            >
              <PlusIcon class="w-5 h-5" /> 新增行程點
            </button>
          </div>
        </div>

        <div class="w-full lg:w-1/3 flex flex-col bg-white">
          <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 class="font-bold text-gray-700 flex items-center">
              <CheckSquareIcon class="w-5 h-5 mr-2 text-primary-500" /> 打包清單
            </h3>
            <button class="text-primary-600 bg-primary-50 p-1.5 rounded-lg" @click="addCategory">
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div
              v-for="(cat, catIndex) in localItinerary.packingList"
              :key="catIndex"
              class="bg-gray-50 border border-gray-100 rounded-xl p-3"
            >
              <div class="flex justify-between items-center mb-3">
                <input
                  v-model="cat.category"
                  class="font-bold text-gray-700 bg-transparent focus:outline-none text-sm"
                  placeholder="分類名稱"
                />
                <button class="text-gray-400 hover:text-red-500" @click="deleteCategory(catIndex)">
                  <TrashIcon class="w-3 h-3" />
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(item, itemIndex) in cat.items"
                  :key="item.id"
                  class="flex items-center group bg-white p-2 rounded-lg"
                >
                  <input v-model="item.checked" type="checkbox" class="accent-primary-600 mr-2" />
                  <input
                    v-model="item.name"
                    class="flex-1 bg-transparent text-sm focus:outline-none"
                    placeholder="物品名稱"
                  />
                  <button
                    class="text-gray-400 opacity-0 group-hover:opacity-100 transition"
                    @click="deleteItem(catIndex, itemIndex)"
                  >
                    <XIcon class="w-3 h-3" />
                  </button>
                </div>
                <button
                  class="text-xs text-primary-500 font-bold mt-2 hover:text-primary-600"
                  @click="addItem(catIndex)"
                >
                  + 新增物品
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 shadow-lg">
        <button
          class="px-4 py-2 text-gray-600 font-bold bg-gray-100 rounded-lg mr-auto"
          @click="handleSaveDraft"
        >
          <FileTextIcon class="w-4 h-4 mr-2 inline" />暫存草稿
        </button>
        <button
          class="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg"
          @click="handleDelete"
        >
          刪除行程
        </button>
        <button
          class="px-8 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 transition-colors"
          @click="handleSave"
        >
          <SaveIcon class="w-4 h-4 mr-2 inline" />儲存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
