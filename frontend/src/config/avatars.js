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
  const pathsToTry = [
    getAvatarStoragePath(category, filename),
    `preset-avatars/${category}/${filename}`,
    `preset-avatars/${encodeURIComponent(category)}/${filename}`,
    `preset-avatars/${category}/${encodeURIComponent(filename)}`,
  ]

  for (const storagePath of pathsToTry) {
    try {
      const storageRef = ref(storage, storagePath)
      const url = await getDownloadURL(storageRef)
      return url
    } catch {
      continue
    }
  }

  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(category)}-${encodeURIComponent(filename)}`
}

export async function getCategoryFilenames(category) {
  try {
    const categoryPathEncoded = `preset-avatars/${encodeURIComponent(category)}`
    const categoryPathRaw = `preset-avatars/${category}`

    let categoryRef = ref(storage, categoryPathEncoded)
    let result = await listAll(categoryRef)

    if (result.items.length === 0) {
      try {
        categoryRef = ref(storage, categoryPathRaw)
        result = await listAll(categoryRef)
      } catch {
        return []
      }
    }

    const filenames = result.items.map((item) => {
      const fullPath = item.fullPath
      let filename = fullPath

      if (fullPath.startsWith(categoryPathEncoded + '/')) {
        filename = fullPath.substring(categoryPathEncoded.length + 1)
      }
      else if (fullPath.startsWith(categoryPathRaw + '/')) {
        filename = fullPath.substring(categoryPathRaw.length + 1)
      }
      else if (fullPath.includes('/')) {
        const parts = fullPath.split('/')
        filename = parts[parts.length - 1]
      }

      try {
        return decodeURIComponent(filename)
      } catch {
        return filename
      }
    }).filter(Boolean)

    return filenames
  } catch (error) {
    console.error('getCategoryFilenames - error:', error)
    console.error('getCategoryFilenames - category:', category)
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
      let categoryName = fullPath.replace(/^preset-avatars\//, '')

      try {
        categoryName = decodeURIComponent(categoryName)
      } catch {
        // 如果解碼失敗，使用原始本來的名字
      }

      return categoryName
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
      } catch (err) {
        console.error('讀取分類列表失敗:', category, 'error:', err)
      }
    }
    return availableCategories
  }
}

