export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item)
  } catch (error) {
    console.warn(`讀取 localStorage 失敗 [${key}]:`, error)
    return defaultValue
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`寫入 localStorage 失敗 [${key}]:`, error)
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage 空間不足，嘗試清理舊資料')
    }
    return false
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`刪除 localStorage 失敗 [${key}]:`, error)
    return false
  }
}

export function clearStorage() {
  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('清空 localStorage 失敗:', error)
    return false
  }
}

export function getStorageSize() {
  try {
    let total = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return total
  } catch {
    return 0
  }
}


