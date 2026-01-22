<script setup>
import { ref, watch } from 'vue'
import { X, Loader2 } from 'lucide-vue-next'
import ImageCrop from '@/components/common/ImageCrop.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  imageFile: {
    type: File,
    default: null
  }
})

const emit = defineEmits(['close', 'crop'])

const imageCropRef = ref(null)
const isUploading = ref(false)
const isReady = ref(false)

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    // Reset upload state when modal closes
    isUploading.value = false
    isReady.value = false
  }
})

const handleReady = () => {
  isReady.value = true
}

const handleCropConfirm = (croppedFile) => {
  if (!croppedFile || isUploading.value) return

  isUploading.value = true
  emit('crop', croppedFile)
  // Note: isProcessing in ImageCrop will be reset when modal closes
}

const resetUploadState = () => {
  isUploading.value = false
  isReady.value = false
}

// 暴露方法供父组件调用
defineExpose({
  resetUploadState
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
  >
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
      <div class="p-6 border-b border-secondary-100 flex justify-between items-center">
        <h2 class="text-xl font-bold text-secondary-900">裁切頭貼</h2>
        <button
          class="p-2 hover:bg-secondary-50 rounded-full transition"
          @click="$emit('close')"
        >
          <X class="w-6 h-6 text-secondary-500" />
        </button>
      </div>

      <div class="p-4 md:p-6 flex-1 min-h-0 overflow-y-auto">
        <ImageCrop
          v-if="imageFile"
          ref="imageCropRef"
          :image-file="imageFile"
          shape="circle"
          :aspect-ratio="1"
          :min-size="100"
          :output-size="400"
          container-height="400px"
          @ready="handleReady"
          @confirm="handleCropConfirm"
        />

        <div class="mt-4 text-xs md:text-sm text-secondary-600">
          <p>• 拖動裁切框來移動位置</p>
          <p>• 拖動角落的白色方塊來調整大小</p>
          <p>• 裁切框會保持等比例（正方形）</p>
        </div>
      </div>

      <div class="p-6 border-t border-secondary-100 flex justify-end gap-3">
        <button
          class="px-6 py-2 text-secondary-600 hover:bg-secondary-50 rounded-xl font-medium transition"
          :disabled="isUploading"
          @click="$emit('close')"
        >
          取消
        </button>
        <div v-if="isUploading" class="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          上傳中...
        </div>
      </div>
    </div>
  </div>
</template>

