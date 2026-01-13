// src/api/storage.js
import { storage } from '@/firebase/config'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * 上傳圖片到 Firebase Storage（支持進度回調）
 * @param {File} file - 圖片文件
 * @param {string} folder - 儲存資料夾（例如：'posts', 'avatars'）
 * @param {Function} onProgress - 進度回調函數 (progress) => void，progress 為 0-100 的數字
 * @returns {Promise<string>} 圖片的公開 URL
 */
export async function uploadImage(file, folder = 'posts', onProgress = null) {
  try {
    if (!file) throw new Error('未提供檔案')

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name}`

    // 創建儲存路徑引用
    const storageRef = ref(storage, `${folder}/${fileName}`)

    // 使用 uploadBytesResumable 以支持進度監聽
    const uploadTask = uploadBytesResumable(storageRef, file, {
      cacheControl: 'public, max-age=3600'
    })

    // 返回 Promise，同時監聽進度
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // 計算上傳進度
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress && typeof onProgress === 'function') {
            onProgress(Math.round(progress))
          }
        },
        (error) => {
          console.error('圖片上傳失敗：', error)
          reject(new Error('圖片上傳失敗：' + (error?.message || String(error))))
        },
        async () => {
          // 上傳完成，獲取公開 URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(downloadURL)
          } catch (error) {
            reject(new Error('獲取圖片 URL 失敗：' + (error?.message || String(error))))
          }
        }
      )
    })
  } catch (error) {
    console.error('圖片上傳失敗：', error)
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
        const result = await uploadImage(
          file,
          folder,
          (progress) => {
            // 計算整體進度：每個文件佔 100/totalFiles%，當前文件進度 * (1/totalFiles)
            if (onProgress && typeof onProgress === 'function') {
              const fileProgress = (completedFiles / totalFiles) * 100 + (progress / totalFiles)
              onProgress(Math.round(fileProgress))
            }
          }
        )
        completedFiles++
        return result
      })
    )
    
    return results
  } catch (error) {
    console.error('批量圖片上傳失敗：', error)
    throw new Error('批量圖片上傳失敗：' + error.message)
  }
}

/**
 * 刪除圖片
 * @param {string} filePath - 圖片路徑或完整 URL
 * @param {string} folder - 儲存資料夾
 */
export async function deleteImage(filePath, folder = 'posts') {
  try {
    // 如果 filePath 是完整 URL，需要提取路徑
    let storagePath = filePath
    if (filePath.includes('/o/')) {
      // Firebase Storage URL 格式：https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
      const urlMatch = filePath.match(/\/o\/([^?]+)/)
      if (urlMatch) {
        storagePath = decodeURIComponent(urlMatch[1])
      }
    } else if (!filePath.startsWith(folder)) {
      // 如果不是完整路徑，加上資料夾前綴
      storagePath = `${folder}/${filePath}`
    }

    // 創建儲存路徑引用
    const storageRef = ref(storage, storagePath)

    // 刪除文件
    await deleteObject(storageRef)
  } catch (error) {
    console.error('圖片刪除失敗：', error)
    throw new Error('圖片刪除失敗：' + error.message)
  }
}


