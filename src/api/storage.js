// src/api/storage.js
// 改用後端 API：檔案本體存 Neon(Postgres BYTEA)，Neon 只負責資料庫（非 Storage）。
import { API_BASE_URL } from './config'

function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length > 0)
    .join('/')
}

function extractFileIdFromUrl(url) {
  try {
    const u = new URL(url, window.location.origin)
    const m = /\/files\/(\d+)$/.exec(u.pathname)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function uploadFileToNeon(file, folder, uid = null) {
  const form = new FormData()
  form.append('file', file)
  if (folder) form.append('folder', folder)
  if (uid) form.append('uid', uid)

  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.details || '檔案上傳失敗')
  }

  const data = await res.json()
  return data.file // {id,url,mimeType,sizeBytes,...}
}

/**
 * 上傳圖片到 Neon（由後端提供檔案 URL）
 * @param {File} file - 圖片文件
 * @param {string} folder - 儲存資料夾（例如：'posts', 'avatars'）
 * @returns {Promise<string>} 圖片完整 URL（例如 http://127.0.0.1:3000/api/files/123）
 */
export async function uploadImage(file, folder = 'posts') {
  try {
    const saved = await uploadFileToNeon(file, folder)
    // 後端回傳的是相對路徑（例如 /api/files/123），需要轉換成完整 URL
    const url = saved.url
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url // 已經是完整 URL
    }
    // 相對路徑轉換成完整 URL
    const baseUrl = API_BASE_URL.replace(/\/api$/, '') // 移除結尾的 /api
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`
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
 * @param {string} filePath - 檔案 id 或 /api/files/:id URL
 * @param {string} folder - 儲存資料夾
 */
export async function deleteImage(filePath, _folder = 'posts') {
  try {
    void _folder
    const id =
      String(filePath || '').match(/^\d+$/)?.[0] ||
      extractFileIdFromUrl(String(filePath || ''))

    if (!id) {
      // 沒有 id 就無法刪除（目前設計）
      throw new Error('無法解析要刪除的檔案 ID（需要傳入 id 或 /api/files/:id）')
    }

    const res = await fetch(`${API_BASE_URL}/files/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || err.details || '刪除檔案失敗')
    }
  } catch (error) {
    console.error('圖片刪除失敗：', error)
    throw new Error('圖片刪除失敗：' + error.message)
  }
}

/**
 * 上傳任何檔案（聊天用：圖片/mp4/檔案）
 * @param {File} file
 * @param {string} bucket - 等同頂層資料夾（預設 chat）
 * @param {string} prefix - 子資料夾（例如 conversations/10）
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadAnyFile(file, bucket = 'chat', prefix = '') {
  try {
    const folder = joinPath(bucket, prefix)
    const saved = await uploadFileToNeon(file, folder)
    // 後端回傳的是相對路徑，需要轉換成完整 URL
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

