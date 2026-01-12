// src/api/storage.js
import { storage } from '@/firebase/config'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * 上傳圖片到 Firebase Storage
 * @param {File} file - 圖片文件
 * @param {string} folder - 儲存資料夾（例如：'posts', 'avatars'）
 * @returns {Promise<string>} 圖片的公開 URL
 */
export async function uploadImage(file, folder = 'posts') {
  try {
    if (!file) throw new Error('未提供檔案')

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name}`

    // 創建儲存路徑引用
    const storageRef = ref(storage, `${folder}/${fileName}`)

    // 上傳文件到 Firebase Storage
    await uploadBytes(storageRef, file, {
      cacheControl: 'public, max-age=3600'
    })

    // 獲取公開 URL
    const downloadURL = await getDownloadURL(storageRef)

    return downloadURL
  } catch (error) {
    console.error('圖片上傳失敗：', error)
    throw new Error('圖片上傳失敗：' + (error?.message || String(error)))
  }
}

export async function uploadMultipleImages(files, folder = 'posts') {
  try {
    const list = Array.from(files || [])
    return await Promise.all(list.map((f) => uploadImage(f, folder)))
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


