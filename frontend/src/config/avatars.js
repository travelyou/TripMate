// 預設頭像配置
// 頭像儲存在 Firebase Storage 中
// 儲存路徑：preset-avatars/{分類名稱}/{圖片檔案名稱}
// 注意：檔案列表會從 Firebase Storage 動態讀取，無需在此配置檔案名稱

import { storage } from '@/firebase/config'
import { ref, getDownloadURL, listAll } from 'firebase/storage'

// 預設頭像分類列表
// 這些分類對應 Firebase Storage 中的資料夾名稱
export const avatarCategories = [
  '再見機器人',
  '下課後',
  '阿甘妙世界',
  'Ben Ten',
  '馬男波傑克',
  '遊戲王',
  '海綿寶寶',
  '飛天小女警',
  '探險活寶',
  '蠟筆小新',
  '飛哥與小佛',
  '動物方城市',
  '愛吃鬼巧達',
  '神秘小鎮大冒險',
  '神奇小捲毛',
]

// 獲取頭像在 Firebase Storage 中的路徑
export function getAvatarStoragePath(category, filename) {
  return `preset-avatars/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`
}

// 從 Firebase Storage 獲取頭像 URL（非同步，按需載入）
export async function getAvatarUrl(category, filename) {
  try {
    const storagePath = getAvatarStoragePath(category, filename)
    const storageRef = ref(storage, storagePath)
    const url = await getDownloadURL(storageRef)
    return url
  } catch (error) {
    console.error(`獲取頭像 URL 失敗 [${category}/${filename}]:`, error)
    // 返回一個佔位符或預設頭像
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(category)}-${encodeURIComponent(filename)}`
  }
}

// 從 Firebase Storage 動態讀取指定分類的所有檔案名稱
export async function getCategoryFilenames(category) {
  try {
    const categoryPath = `preset-avatars/${encodeURIComponent(category)}`
    const categoryRef = ref(storage, categoryPath)
    const result = await listAll(categoryRef)

    // 提取檔案名稱（移除路徑前綴）
    const filenames = result.items.map((item) => {
      const fullPath = item.fullPath
      const filename = fullPath.replace(`${categoryPath}/`, '')
      return decodeURIComponent(filename)
    })

    return filenames
  } catch (error) {
    console.error(`讀取分類檔案列表失敗 [${category}]:`, error)
    return []
  }
}

// 批次獲取頭像 URL（用於按需載入）
export async function getAvatarUrls(category, filenames) {
  const promises = filenames.map((filename) =>
    getAvatarUrl(category, filename).then((url) => ({
      category,
      filename,
      url,
    })),
  )
  return Promise.all(promises)
}

// 獲取所有有頭像的分類（動態從 Storage 讀取）
export async function getAvailableCategories() {
  const availableCategories = []

  for (const category of avatarCategories) {
    try {
      const filenames = await getCategoryFilenames(category)
      if (filenames.length > 0) {
        availableCategories.push(category)
      }
    } catch (error) {
      console.error(`檢查分類失敗 [${category}]:`, error)
    }
  }

  return availableCategories
}

