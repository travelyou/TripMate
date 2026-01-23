export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.8,
      maxSizeMB = 2,
      outputType = null,
      alwaysResize = false,
    } = options

    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    if (!alwaysResize && file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const targetType = outputType || file.type
        const toBlobAsync = (type, q) =>
          new Promise((resolveBlob) => {
            canvas.toBlob((blob) => resolveBlob(blob), type, q)
          })

        toBlobAsync(targetType, quality)
          .then(async (blob) => {
            if (!blob && targetType !== file.type) {
              blob = await toBlobAsync(file.type, quality)
            }

            if (!blob) {
              reject(new Error('圖片壓縮失敗'))
              return
            }

            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.5) {
              compressImage(file, {
                maxWidth,
                maxHeight,
                quality: quality - 0.1,
                maxSizeMB,
                outputType,
                alwaysResize,
              })
                .then(resolve)
                .catch(reject)
              return
            }

            const finalType = blob.type || targetType || file.type
            const nextName =
              finalType === 'image/webp'
                ? (file.name.includes('.') ? file.name.replace(/\.[^.]+$/, '') : file.name) + '.webp'
                : file.name

            const compressedFile = new File([blob], nextName, {
              type: finalType,
              lastModified: Date.now(),
            })

            resolve(compressedFile)
          })
          .catch(reject)
      }

      img.onerror = () => {
        reject(new Error('圖片載入失敗'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'))
    }

    reader.readAsDataURL(file)
  })
}
