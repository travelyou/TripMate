// src/api/storage.js
import { supabase } from '@/supabase/config'

/**
 * 上傳圖片到 Supabase Storage
 * @param {File} file - 圖片文件
 * @param {string} folder - 儲存資料夾（例如：'posts', 'avatars'）
 * @returns {Promise<string>} 圖片的公開 URL
 */
export async function uploadImage(file, folder = 'posts') {
  try {
    // 生成唯一檔名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}_${randomString}_${file.name}`

    // 上傳文件到 Supabase Storage
    const { data, error } = await supabase.storage
      .from(folder) // Storage bucket 名稱
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from(folder)
      .getPublicUrl(data.path)

    return urlData.publicUrl
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
 * @param {string} filePath - 圖片路徑
 * @param {string} folder - 儲存資料夾
 */
export async function deleteImage(filePath, folder = 'posts') {
  try {
    const { error } = await supabase.storage
      .from(folder)
      .remove([filePath])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('圖片刪除失敗：', error)
    throw new Error('圖片刪除失敗：' + error.message)
  }
}


