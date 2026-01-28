import { storage } from '@/firebase/config'
import { ref, getDownloadURL, listAll } from 'firebase/storage'

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

export function getAvatarStoragePath(category, filename) {
  return `preset-avatars/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`
}

export async function getAvatarUrl(category, filename) {
  try {
    const storagePath = getAvatarStoragePath(category, filename)
    const storageRef = ref(storage, storagePath)
    const url = await getDownloadURL(storageRef)
    return url
  } catch {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(category)}-${encodeURIComponent(filename)}`
  }
}

export async function getCategoryFilenames(category) {
  try {
    const categoryPath = `preset-avatars/${encodeURIComponent(category)}`
    const categoryRef = ref(storage, categoryPath)
    const result = await listAll(categoryRef)

    const filenames = result.items.map((item) => {
      const fullPath = item.fullPath
      const filename = fullPath.replace(`${categoryPath}/`, '')
      return decodeURIComponent(filename)
    })

    return filenames
  } catch {
    return []
  }
}

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

export async function getAvailableCategories() {
  try {
    const presetAvatarsRef = ref(storage, 'preset-avatars')
    const result = await listAll(presetAvatarsRef)

    const categories = result.prefixes.map((prefix) => {
      const fullPath = prefix.fullPath
      const categoryName = fullPath.replace('preset-avatars/', '')
      return decodeURIComponent(categoryName)
    })

    return categories.sort()
  } catch (error) {
    console.error('讀取分類列表失敗:', error)
    const availableCategories = []
    for (const category of avatarCategories) {
      try {
        const filenames = await getCategoryFilenames(category)
        if (filenames.length > 0) {
          availableCategories.push(category)
        }
      } catch {
        console.error('讀取分類列表失敗:', category, 'error:', error)
      }
    }
    return availableCategories
  }
}

