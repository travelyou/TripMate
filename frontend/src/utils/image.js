/**
 * 圖片 URL 驗證工具函式
 */

/**
 * 檢查是否為有效的圖片 URL（基本版本）
 * 過濾掉 blob URL 和 data URL
 * @param {string} url - 圖片 URL
 * @returns {boolean} - 是否為有效的圖片 URL
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmedUrl = url.trim()
  // 過濾掉 blob URL 和 data URL（這些在伺服器端或跨頁面時會失效）
  if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) return false
  return true
}

/**
 * 檢查是否為有效的 HTTP/HTTPS 圖片 URL（嚴格版本）
 * 過濾掉 blob URL、data URL，並確保是 HTTP/HTTPS 協議
 * @param {string} url - 圖片 URL
 * @returns {boolean} - 是否為有效的 HTTP/HTTPS 圖片 URL
 */
export const isValidHttpImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmedUrl = url.trim()
  // 過濾掉 blob URL 和 data URL
  if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) return false
  // 確保是 HTTP 或 HTTPS 協議
  return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
}

/**
 * 清理圖片 URL 陣列，移除無效的 URL
 * @param {string[]} imageUrls - 圖片 URL 陣列
 * @param {boolean} strictMode - 是否使用嚴格模式（檢查 HTTP/HTTPS）
 * @returns {string[]} - 清理後的圖片 URL 陣列
 */
export const cleanImageUrls = (imageUrls, strictMode = false) => {
  if (!Array.isArray(imageUrls)) return []
  const validator = strictMode ? isValidHttpImageUrl : isValidImageUrl
  return imageUrls.filter(url => validator(url))
}

/**
 * 清理單個圖片 URL，如果無效則返回 null
 * @param {string} imageUrl - 圖片 URL
 * @param {boolean} strictMode - 是否使用嚴格模式（檢查 HTTP/HTTPS）
 * @returns {string|null} - 清理後的圖片 URL 或 null
 */
export const cleanImageUrl = (imageUrl, strictMode = false) => {
  const validator = strictMode ? isValidHttpImageUrl : isValidImageUrl
  return validator(imageUrl) ? imageUrl : null
}

/**
 * 檢查圖片是否載入失敗
 * @param {HTMLImageElement} imgElement - 圖片元素
 * @returns {boolean} - 是否載入失敗
 */
export const isImageLoadError = (imgElement) => {
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) return true
  return !imgElement.complete || imgElement.naturalWidth === 0
}

/**
 * 預載入圖片
 * @param {string} url - 圖片 URL
 * @returns {Promise<string>} - 成功時返回 URL，失敗時 reject
 */
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!isValidImageUrl(url)) {
      reject(new Error('Invalid image URL'))
      return
    }
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * 預載入多張圖片
 * @param {string[]} urls - 圖片 URL 陣列
 * @returns {Promise<string[]>} - 成功載入的 URL 陣列
 */
export const preloadImages = async (urls) => {
  if (!Array.isArray(urls)) return []
  const validUrls = cleanImageUrls(urls)
  const results = await Promise.allSettled(validUrls.map(url => preloadImage(url)))
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value)
}

