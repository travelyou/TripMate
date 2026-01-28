import { storage } from '@/firebase/config'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

export async function uploadImage(file, folder = 'posts', onProgress = null) {
  try {
    if (!file) throw new Error('未提供檔案')

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name}`

    const storageRef = ref(storage, `${folder}/${fileName}`)

    const uploadTask = uploadBytesResumable(storageRef, file, {
      cacheControl: 'public, max-age=3600',
    })

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress && typeof onProgress === 'function') {
            onProgress(Math.round(progress))
          }
        },
        (error) => {
          reject(new Error('圖片上傳失敗：' + (error?.message || String(error))))
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(downloadURL)
          } catch (error) {
            reject(new Error('獲取圖片 URL 失敗：' + (error?.message || String(error))))
          }
        },
      )
    })
  } catch (error) {
    throw new Error('圖片上傳失敗：' + (error?.message || String(error)))
  }
}

export async function uploadMultipleImages(files, folder = 'posts', onProgress = null) {
  try {
    const list = Array.from(files || [])
    const totalFiles = list.length
    let completedFiles = 0

    const results = await Promise.all(
      list.map(async (file, index) => {
        const result = await uploadImage(file, folder, (progress) => {
          if (onProgress && typeof onProgress === 'function') {
            const fileProgress = (completedFiles / totalFiles) * 100 + progress / totalFiles
            onProgress(Math.round(fileProgress))
          }
        })
        completedFiles++
        return result
      }),
    )

    return results
  } catch (error) {
    throw new Error('批量圖片上傳失敗：' + error.message)
  }
}

export async function deleteImage(filePath, folder = 'posts') {
  try {
    let storagePath = filePath
    if (filePath.includes('/o/')) {
      const urlMatch = filePath.match(/\/o\/([^?]+)/)
      if (urlMatch) {
        storagePath = decodeURIComponent(urlMatch[1])
      }
    } else if (!filePath.startsWith(folder)) {
      storagePath = `${folder}/${filePath}`
    }

    const storageRef = ref(storage, storagePath)

    await deleteObject(storageRef)
  } catch (error) {
    throw new Error('圖片刪除失敗：' + error.message)
  }
}
