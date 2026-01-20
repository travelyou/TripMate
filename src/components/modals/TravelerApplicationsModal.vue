<script setup>
import { ref, onMounted } from 'vue'
import { X as XIcon, Check as CheckIcon, X as XCloseIcon } from 'lucide-vue-next'
import { getApplications, acceptApplication, rejectApplication } from '@/api/travelers'
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils/time'

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'application-updated'])
const userStore = useUserStore()

const applications = ref([])
const isLoading = ref(false)
const processingIds = ref(new Set())

const loadApplications = async () => {
  isLoading.value = true
  try {
    const response = await getApplications(props.traveler.id)
    if (response.success) {
      applications.value = response.data || []
    }
  } catch (error) {
    console.error('載入報名列表失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const handleAccept = async (application) => {
  if (processingIds.value.has(application.id)) return

  processingIds.value.add(application.id)
  try {
    await acceptApplication(props.traveler.id, application.id)
    await loadApplications()
    emit('application-updated')
  } catch (error) {
    console.error('接受報名失敗:', error)
    alert('接受報名失敗，請稍後再試')
  } finally {
    processingIds.value.delete(application.id)
  }
}

const handleReject = async (application) => {
  if (processingIds.value.has(application.id)) return

  if (!confirm('確定要拒絕此報名嗎？')) return

  processingIds.value.add(application.id)
  try {
    await rejectApplication(props.traveler.id, application.id)
    await loadApplications()
  } catch (error) {
    console.error('拒絕報名失敗:', error)
    alert('拒絕報名失敗，請稍後再試')
  } finally {
    processingIds.value.delete(application.id)
  }
}

onMounted(() => {
  loadApplications()
})
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[101]">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-800">報名清單</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition"
          @click="$emit('close')"
        >
          <XIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="isLoading" class="text-center py-10 text-gray-500">載入中...</div>
        <div v-else-if="applications.length === 0" class="text-center py-10 text-gray-500">
          目前還沒有報名
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="app in applications"
            :key="app.id"
            class="border-2 border-gray-200 rounded-lg p-4 hover:border-primary-300 transition"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center space-x-3">
                <img
                  :src="app.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.author_uid}`"
                  class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
                <div>
                  <p class="font-bold text-gray-800">{{ app.author_name || '匿名用戶' }}</p>
                  <p class="text-xs text-gray-400">{{ formatTime(app.created_at) }}</p>
                </div>
              </div>
              <div
                v-if="app.status === 'pending'"
                class="flex items-center space-x-2"
              >
                <button
                  :disabled="processingIds.has(app.id)"
                  class="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                  @click="handleAccept(app)"
                  title="接受"
                >
                  <CheckIcon class="w-4 h-4" />
                </button>
                <button
                  :disabled="processingIds.has(app.id)"
                  class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                  @click="handleReject(app)"
                  title="拒絕"
                >
                  <XCloseIcon class="w-4 h-4" />
                </button>
              </div>
              <div
                v-else-if="app.status === 'accepted'"
                class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold"
              >
                已接受
              </div>
              <div
                v-else-if="app.status === 'rejected'"
                class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold"
              >
                已拒絕
              </div>
            </div>
            <p class="text-gray-700 whitespace-pre-wrap">{{ app.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

