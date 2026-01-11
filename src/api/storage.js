// 這個檔案是拿來抓上傳圖片、檔案用的，會到 Firebase Storage 裡面再以 URL 的形式讓 Neon 管理
import { storage } from '@/firebase/config'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export async function uploadImage(file, folder = 'posts') {
  try {
    if (!file) throw new Error('未提供檔案')

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const safeName = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const path = `public/${folder}/${timestamp}_${randomString}_${safeName}`

    const fileRef = ref(storage, path)
    await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' })
    const url = await getDownloadURL(fileRef)

    return { url, path }
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
    throw new Error('批量圖片上傳失敗：' + (error?.message || String(error)))
  }
}

export async function deleteImageByPath(path) {
  if (!path) throw new Error('缺少 path')
  const fileRef = ref(storage, path)
  await deleteObject(fileRef)
}
