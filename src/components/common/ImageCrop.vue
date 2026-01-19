<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps({
  imageFile: {
    type: File,
    required: true
  },
  shape: {
    type: String,
    default: 'circle', // 'circle' or 'rect'
    validator: (value) => ['circle', 'rect'].includes(value)
  },
  aspectRatio: {
    type: Number,
    default: 1, // 1 = square, null = free
    validator: (value) => value === null || value > 0
  },
  minSize: {
    type: Number,
    default: 100
  },
  outputSize: {
    type: Number,
    default: 400
  },
  containerHeight: {
    type: String,
    default: '500px'
  }
})

const emit = defineEmits(['crop', 'ready', 'confirm'])

const canvasRef = ref(null)
const containerRef = ref(null)
const cropArea = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0
})
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const imageScale = ref(1)
const imageOffset = ref({ x: 0, y: 0 })
const imageLoaded = ref(false)
const isProcessing = ref(false)

let image = null
let ctx = null

// Define loadImage function before watch
const loadImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      image = new Image()
      image.onload = () => {
        imageLoaded.value = true
        // Wait for DOM to be ready and container to have dimensions
        nextTick(() => {
          // Use setTimeout to ensure container has rendered dimensions
          setTimeout(() => {
            initializeCrop()
            emit('ready')
            resolve()
          }, 100)
        })
      }
      image.onerror = () => {
        console.error('圖片載入失敗')
        resolve()
      }
      image.src = e.target.result
    }
    reader.onerror = () => {
      console.error('檔案讀取失敗')
      resolve()
    }
    reader.readAsDataURL(file)
  })
}

// Load image when file changes
watch(() => props.imageFile, async (newFile) => {
  if (newFile) {
    isProcessing.value = false // Reset processing state when new file is loaded
    await loadImage(newFile)
  }
}, { immediate: true })

const initializeCrop = () => {
  if (!canvasRef.value || !image) {
    console.warn('Canvas or image not ready')
    return
  }
  
  ctx = canvasRef.value.getContext('2d')
  const container = containerRef.value
  if (!container) {
    console.warn('Container ref not found')
    return
  }

  // Get actual container dimensions
  const containerWidth = container.clientWidth || 800
  const containerHeight = container.clientHeight || parseInt(props.containerHeight)
  
  // Calculate scale to fit image in container
  const scaleX = containerWidth / image.width
  const scaleY = containerHeight / image.height
  imageScale.value = Math.min(scaleX, scaleY, 1) // Don't scale up
  
  const displayWidth = image.width * imageScale.value
  const displayHeight = image.height * imageScale.value
  
  canvasRef.value.width = containerWidth
  canvasRef.value.height = containerHeight
  
  // Center image
  imageOffset.value = {
    x: (containerWidth - displayWidth) / 2,
    y: (containerHeight - displayHeight) / 2
  }
  
  // Initialize crop area
  const cropSize = Math.min(displayWidth, displayHeight) * 0.8
  cropArea.value = {
    x: imageOffset.value.x + (displayWidth - cropSize) / 2,
    y: imageOffset.value.y + (displayHeight - cropSize) / 2,
    width: cropSize,
    height: props.aspectRatio ? cropSize : cropSize * (props.aspectRatio || 1)
  }
  
  draw()
}

const draw = () => {
  if (!ctx || !image) return
  
  const canvas = canvasRef.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw image
  const displayWidth = image.width * imageScale.value
  const displayHeight = image.height * imageScale.value
  ctx.drawImage(
    image,
    imageOffset.value.x,
    imageOffset.value.y,
    displayWidth,
    displayHeight
  )
  
  // Draw overlay (darken outside crop area)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Clear crop area
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  const centerX = cropArea.value.x + cropArea.value.width / 2
  const centerY = cropArea.value.y + cropArea.value.height / 2
  
  if (props.shape === 'circle') {
    const radius = Math.min(cropArea.value.width, cropArea.value.height) / 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillRect(
      cropArea.value.x,
      cropArea.value.y,
      cropArea.value.width,
      cropArea.value.height
    )
  }
  ctx.restore()
  
  // Draw crop border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.setLineDash([8, 4])
  
  if (props.shape === 'circle') {
    const radius = Math.min(cropArea.value.width, cropArea.value.height) / 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.strokeRect(
      cropArea.value.x,
      cropArea.value.y,
      cropArea.value.width,
      cropArea.value.height
    )
  }
  
  // Draw corner handles
  const handleSize = 14
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  
  const handles = [
    { x: cropArea.value.x, y: cropArea.value.y }, // Top-left
    { x: cropArea.value.x + cropArea.value.width, y: cropArea.value.y }, // Top-right
    { x: cropArea.value.x, y: cropArea.value.y + cropArea.value.height }, // Bottom-left
    { x: cropArea.value.x + cropArea.value.width, y: cropArea.value.y + cropArea.value.height } // Bottom-right
  ]
  
  handles.forEach(handle => {
    ctx.beginPath()
    ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })
}

const getMousePos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const handleMouseDown = (e) => {
  if (!imageLoaded.value) return
  
  const pos = getMousePos(e)
  const handleSize = 14
  const { x, y, width, height } = cropArea.value
  
  // Check if clicking on corner handle (resize)
  const corners = [
    { x: x, y: y }, // top-left
    { x: x + width, y: y }, // top-right
    { x: x, y: y + height }, // bottom-left
    { x: x + width, y: y + height } // bottom-right
  ]
  
  let cornerIndex = -1
  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i]
    const distance = Math.sqrt(
      Math.pow(pos.x - corner.x, 2) + Math.pow(pos.y - corner.y, 2)
    )
    if (distance <= handleSize / 2) {
      cornerIndex = i
      break
    }
  }
  
  if (cornerIndex >= 0) {
    // Resize mode
    isDragging.value = true
    dragStart.value = { ...pos, cornerIndex, cropStart: { ...cropArea.value } }
  } else {
    // Check if clicking inside the crop area (for moving)
    let isInside = false
    if (props.shape === 'circle') {
      const centerX = x + width / 2
      const centerY = y + height / 2
      const radius = Math.min(width, height) / 2
      const distance = Math.sqrt(
        Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
      )
      isInside = distance <= radius
    } else {
      isInside = pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height
    }
    
    if (isInside) {
      // Move mode
      isDragging.value = true
      dragStart.value = { ...pos, cropStart: { ...cropArea.value } }
    }
  }
}

const handleMouseMove = (e) => {
  if (!isDragging.value || !imageLoaded.value) return
  
  const pos = getMousePos(e)
  const dx = pos.x - dragStart.value.x
  const dy = pos.y - dragStart.value.y
  
  if (dragStart.value.cornerIndex !== undefined) {
    // Resize crop area
    const { cropStart } = dragStart.value
    const cornerIndex = dragStart.value.cornerIndex
    
    if (props.aspectRatio) {
      // Keep aspect ratio
      const cornerX = cornerIndex === 0 || cornerIndex === 2 ? cropStart.x : cropStart.x + cropStart.width
      const cornerY = cornerIndex === 0 || cornerIndex === 1 ? cropStart.y : cropStart.y + cropStart.height
      
      const newSize = Math.max(
        Math.abs(cropStart.width + (cornerIndex === 0 || cornerIndex === 2 ? -dx : dx)),
        Math.abs(cropStart.height + (cornerIndex === 0 || cornerIndex === 1 ? -dy : dy))
      )
      
      const finalSize = Math.max(props.minSize, newSize)
      
      if (cornerIndex === 0) {
        cropArea.value.x = cropStart.x + cropStart.width - finalSize
        cropArea.value.y = cropStart.y + cropStart.height - finalSize
        cropArea.value.width = finalSize
        cropArea.value.height = finalSize
      } else if (cornerIndex === 1) {
        cropArea.value.x = cropStart.x
        cropArea.value.y = cropStart.y + cropStart.height - finalSize
        cropArea.value.width = finalSize
        cropArea.value.height = finalSize
      } else if (cornerIndex === 2) {
        cropArea.value.x = cropStart.x + cropStart.width - finalSize
        cropArea.value.y = cropStart.y
        cropArea.value.width = finalSize
        cropArea.value.height = finalSize
      } else if (cornerIndex === 3) {
        cropArea.value.x = cropStart.x
        cropArea.value.y = cropStart.y
        cropArea.value.width = finalSize
        cropArea.value.height = finalSize
      }
    } else {
      // Free resize
      if (cornerIndex === 0) {
        cropArea.value.x = Math.max(imageOffset.value.x, cropStart.x + dx)
        cropArea.value.y = Math.max(imageOffset.value.y, cropStart.y + dy)
        cropArea.value.width = cropStart.width - dx
        cropArea.value.height = cropStart.height - dy
      } else if (cornerIndex === 1) {
        cropArea.value.y = Math.max(imageOffset.value.y, cropStart.y + dy)
        cropArea.value.width = cropStart.width + dx
        cropArea.value.height = cropStart.height - dy
      } else if (cornerIndex === 2) {
        cropArea.value.x = Math.max(imageOffset.value.x, cropStart.x + dx)
        cropArea.value.width = cropStart.width - dx
        cropArea.value.height = cropStart.height + dy
      } else if (cornerIndex === 3) {
        cropArea.value.width = cropStart.width + dx
        cropArea.value.height = cropStart.height + dy
      }
      
      // Ensure minimum size
      if (cropArea.value.width < props.minSize) {
        cropArea.value.width = props.minSize
        if (cornerIndex === 0 || cornerIndex === 2) {
          cropArea.value.x = cropStart.x + cropStart.width - props.minSize
        }
      }
      if (cropArea.value.height < props.minSize) {
        cropArea.value.height = props.minSize
        if (cornerIndex === 0 || cornerIndex === 1) {
          cropArea.value.y = cropStart.y + cropStart.height - props.minSize
        }
      }
    }
    
    // Constrain to image bounds
    const maxX = imageOffset.value.x + image.width * imageScale.value
    const maxY = imageOffset.value.y + image.height * imageScale.value
    
    if (cropArea.value.x < imageOffset.value.x) {
      cropArea.value.x = imageOffset.value.x
    }
    if (cropArea.value.y < imageOffset.value.y) {
      cropArea.value.y = imageOffset.value.y
    }
    if (cropArea.value.x + cropArea.value.width > maxX) {
      cropArea.value.x = maxX - cropArea.value.width
    }
    if (cropArea.value.y + cropArea.value.height > maxY) {
      cropArea.value.y = maxY - cropArea.value.height
    }
    
    if (props.aspectRatio) {
      const size = Math.min(cropArea.value.width, cropArea.value.height)
      cropArea.value.width = size
      cropArea.value.height = size
    }
  } else {
    // Move crop area
    const { cropStart } = dragStart.value
    const newX = cropStart.x + dx
    const newY = cropStart.y + dy
    
    // Constrain to image bounds
    const maxX = imageOffset.value.x + image.width * imageScale.value
    const maxY = imageOffset.value.y + image.height * imageScale.value
    
    cropArea.value.x = Math.max(
      imageOffset.value.x,
      Math.min(newX, maxX - cropArea.value.width)
    )
    cropArea.value.y = Math.max(
      imageOffset.value.y,
      Math.min(newY, maxY - cropArea.value.height)
    )
  }
  
  draw()
}

const handleMouseUp = () => {
  isDragging.value = false
}

const getCroppedImage = () => {
  if (!image || !canvasRef.value) return null
  
  // Calculate crop coordinates in original image
  const scaleX = image.width / (image.width * imageScale.value)
  const scaleY = image.height / (image.height * imageScale.value)
  
  const cropX = (cropArea.value.x - imageOffset.value.x) * scaleX
  const cropY = (cropArea.value.y - imageOffset.value.y) * scaleY
  const cropWidth = cropArea.value.width * scaleX
  const cropHeight = cropArea.value.height * scaleY
  
  // Create output canvas
  const outputSize = Math.max(props.outputSize, cropWidth, cropHeight)
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = outputSize
  outputCanvas.height = outputSize
  const outputCtx = outputCanvas.getContext('2d')
  
  // Draw cropped image
  outputCtx.drawImage(
    image,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, outputSize, outputSize
  )
  
  // Apply shape mask if needed
  if (props.shape === 'circle') {
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = outputSize
    maskCanvas.height = outputSize
    const maskCtx = maskCanvas.getContext('2d')
    
    maskCtx.fillStyle = '#ffffff'
    maskCtx.beginPath()
    maskCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    maskCtx.fill()
    
    outputCtx.globalCompositeOperation = 'destination-in'
    outputCtx.drawImage(maskCanvas, 0, 0)
  }
  
  // Convert to blob
  return new Promise((resolve) => {
    outputCanvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], props.imageFile.name, {
          type: props.imageFile.type,
          lastModified: Date.now()
        })
        resolve(croppedFile)
      } else {
        resolve(null)
      }
    }, props.imageFile.type, 0.95)
  })
}

const handleConfirm = async () => {
  if (!imageLoaded.value || isProcessing.value) return
  
  try {
    isProcessing.value = true
    const croppedFile = await getCroppedImage()
    if (croppedFile) {
      emit('confirm', croppedFile)
    }
  } catch (error) {
    console.error('裁切失敗：', error)
    isProcessing.value = false
  }
}

// Expose method for parent to call
defineExpose({
  getCroppedImage,
  isReady: () => imageLoaded.value
})

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="w-full min-w-0">
    <div ref="containerRef" class="w-full bg-secondary-100 rounded-xl overflow-hidden relative min-h-[300px]" :style="{ height: containerHeight, maxHeight: '70vh' }">
      <canvas
        ref="canvasRef"
        class="w-full h-full cursor-move"
        @mousedown="handleMouseDown"
      ></canvas>
      
      <div
        v-if="!imageLoaded"
        class="absolute inset-0 flex flex-col items-center justify-center bg-secondary-100/90 backdrop-blur-sm z-10"
      >
        <Loader2 class="w-12 h-12 text-primary-600 animate-spin mb-4" />
        <p class="text-secondary-600 font-medium text-lg">載入圖片中...</p>
        <p class="text-secondary-400 text-sm mt-2">請稍候</p>
      </div>
    </div>
    
    <!-- 確定變更按鈕 -->
    <div v-if="imageLoaded" class="mt-4 flex justify-end">
      <button
        class="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isProcessing"
        @click="handleConfirm"
      >
        <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
        {{ isProcessing ? '處理中...' : '確定變更' }}
      </button>
    </div>
  </div>
</template>

