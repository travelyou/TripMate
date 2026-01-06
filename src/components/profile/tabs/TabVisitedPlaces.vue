<script setup>
import { ref } from 'vue'
import { X, Plus } from 'lucide-vue-next'

const props = defineProps({
  visitedPlaces: {
    type: Object,
    required: true
  },
  isCurrentUser: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add-place', 'remove-place'])

const newDomesticPlace = ref('')
const newDomesticDate = ref('')
const newInternationalPlace = ref('')
const newInternationalDate = ref('')

function handleAdd(type) {
  const nameVal = type === 'domestic' ? newDomesticPlace.value : newInternationalPlace.value
  const dateVal = type === 'domestic' ? newDomesticDate.value : newInternationalDate.value

  if (nameVal && nameVal.trim()) {
    emit('add-place', { type, name: nameVal, date: dateVal })
    // Clear Input
    if (type === 'domestic') {
      newDomesticPlace.value = ''
      newDomesticDate.value = ''
    } else {
      newInternationalPlace.value = ''
      newInternationalDate.value = ''
    }
  }
}

function handleRemove(type, index) {
  emit('remove-place', { type, index })
}
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Domestic -->
    <div>
      <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg">
        <span class="text-indigo-500 mr-2">🇹🇼</span> 國內足跡
      </h3>
      <div class="flex flex-wrap gap-3 mb-3">
        <div
          v-for="(place, idx) in visitedPlaces.domestic"
          :key="idx"
          class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium flex items-center group relative pr-10"
        >
          <div class="flex flex-col">
            <span>{{ place.name }}</span>
            <span class="text-[10px] text-indigo-400">{{ place.date }}</span>
          </div>
          <button
            v-if="isCurrentUser"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition"
            @click="handleRemove('domestic', idx)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div v-if="isCurrentUser" class="flex gap-2 max-w-md items-center">
        <input
          v-model="newDomesticPlace"
          placeholder="新增國內城市..."
          class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
          @keyup.enter="handleAdd('domestic')"
        />
        <input
          v-model="newDomesticDate"
          type="month"
          class="px-4 py-2 border rounded-xl text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-500"
        />
        <button
          class="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
          @click="handleAdd('domestic')"
        >
          <Plus class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
    <!-- International -->
    <div>
      <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg">
        <span class="text-indigo-500 mr-2">✈️</span> 國外足跡
      </h3>
      <div class="flex flex-wrap gap-3 mb-3">
        <div
          v-for="(place, idx) in visitedPlaces.international"
          :key="idx"
          class="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium flex items-center group relative pr-10"
        >
          <div class="flex flex-col">
            <span>{{ place.name }}</span>
            <span class="text-[10px] text-orange-400">{{ place.date }}</span>
          </div>
          <button
            v-if="isCurrentUser"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-orange-300 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition"
            @click="handleRemove('international', idx)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div v-if="isCurrentUser" class="flex gap-2 max-w-md items-center">
        <input
          v-model="newInternationalPlace"
          placeholder="新增國外城市..."
          class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
          @keyup.enter="handleAdd('international')"
        />
        <input
          v-model="newInternationalDate"
          type="month"
          class="px-4 py-2 border rounded-xl text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-500"
        />
        <button
          class="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
          @click="handleAdd('international')"
        >
          <Plus class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
