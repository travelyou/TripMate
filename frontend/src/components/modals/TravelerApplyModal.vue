<script setup>
import { ref, computed } from 'vue'
import { X as XIcon, Send as SendIcon } from 'lucide-vue-next'
import { submitApplication } from '@/api/travelers'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  traveler: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'success'])
const userStore = useUserStore()

const message = ref('')
const isSubmitting = ref(false)
const error = ref('')

const messageLength = computed(() => message.value.length)
const maxLength = 200
const canSubmit = computed(() => message.value.trim().length > 0 && message.value.length <= maxLength)

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true
  error.value = ''

  try {
    await submitApplication(props.traveler.id, message.value.trim())
    emit('success')
    emit('close')
  } catch (err) {
    error.value = err.response?.data?.message || '提交失敗，請稍後再試'
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  message.value = ''
  error.value = ''
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[101]">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-800">報名參加</h2>
        <button
          class="p-2 hover:bg-gray-100 rounded-full transition"
          @click="handleClose"
        >
          <XIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="mb-4">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            寫給作者的話
          </label>
          <textarea
            v-model="message"
            :maxlength="maxLength"
            rows="6"
            placeholder="請簡單介紹自己，並說明為什麼想參加這次旅行..."
            class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 transition resize-none outline-none text-black placeholder-gray-400"
          ></textarea>
          <div class="flex justify-between items-center mt-2">
            <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
            <span
              :class="[
                'text-xs',
                messageLength > maxLength ? 'text-red-500 font-bold' : 'text-gray-400',
              ]"
            >
              {{ messageLength }} / {{ maxLength }}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition"
          @click="handleClose"
        >
          取消
        </button>
        <button
          :disabled="!canSubmit || isSubmitting"
          :class="[
            'px-6 py-2 rounded-lg font-bold transition flex items-center space-x-2',
            canSubmit && !isSubmitting
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed',
          ]"
          @click="handleSubmit"
        >
          <SendIcon class="w-4 h-4" />
          <span>{{ isSubmitting ? '提交中...' : '報名' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

