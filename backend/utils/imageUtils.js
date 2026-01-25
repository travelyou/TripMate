/* eslint-env node */
/* global module */

/**
 * 檢查是否為有效的圖片 URL
 * 過濾掉 blob URL 和 data URL（這些在伺服器端是無效的）
 * @param {string} url - 圖片 URL
 * @returns {boolean} - 是否為有效的圖片 URL
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  // 過濾掉 blob URL 和 data URL
  if (url.startsWith('blob:') || url.startsWith('data:')) return false
  return true
}

/**
 * 清理圖片 URL 陣列，移除無效的 URL
 * @param {string[]} imageUrls - 圖片 URL 陣列
 * @returns {string[]} - 清理後的圖片 URL 陣列
 */
const cleanImageUrls = (imageUrls) => {
  if (!Array.isArray(imageUrls)) return []
  return imageUrls.filter(url => isValidImageUrl(url))
}

/**
 * 清理單個圖片 URL，如果無效則返回 null
 * @param {string} imageUrl - 圖片 URL
 * @returns {string|null} - 清理後的圖片 URL 或 null
 */
const cleanImageUrl = (imageUrl) => {
  return isValidImageUrl(imageUrl) ? imageUrl : null
}

module.exports = {
  isValidImageUrl,
  cleanImageUrls,
  cleanImageUrl,
}

