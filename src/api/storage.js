// src/api/storage.js
import { storage } from '@/firebase/config'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * 上傳圖片到 Firebase Storage
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function uploadImage(file, folder = 'posts') {
  try {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name}`
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
    throw new Error('圖片上傳失敗：' + error.message)
  }
}

/**
 * 上傳多張圖片
 * @param {File[]} files - 圖片文件陣列
 * @param {string} folder - 儲存資料夾
 * @returns {Promise<string[]>} 圖片的公開 URL 陣列
 */
export async function uploadMultipleImages(files, folder = 'posts') {
  try {
    const uploadPromises = Array.from(files).map((file) => uploadImage(file, folder))
    const urls = await Promise.all(uploadPromises)
    return urls
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
export async function deleteImage(filePath, _folder = 'posts') {
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

    // 刪除文件
    await deleteObject(storageRef)
  } catch (error) {
    console.error('圖片刪除失敗：', error)
    throw new Error('圖片刪除失敗：' + error.message)
  }
}

/**
 * 上傳任何檔案（聊天用：圖片/mp4/檔案）
 * @param {File} file
 * @param {string} bucket
 * @param {string} prefix
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadAnyFile(file, bucket = 'chat', prefix = '') {
  try {
    const folder = joinPath(bucket, prefix)
    const saved = await uploadFileToNeon(file, folder)

    let publicUrl = saved.url
    if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
      const baseUrl = API_BASE_URL.replace(/\/api$/, '') // 移除結尾的 /api
      publicUrl = publicUrl.startsWith('/') ? `${baseUrl}${publicUrl}` : `${baseUrl}/${publicUrl}`
    }
    return { publicUrl, path: saved.id }
  } catch (error) {
    console.error('檔案上傳失敗：', error)
    throw new Error('檔案上傳失敗：' + error.message)
  }
}

