/* eslint-env node */
/* global module */

const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('blob:') || url.startsWith('data:')) return false
  return true
}

const cleanImageUrls = (imageUrls) => {
  if (!Array.isArray(imageUrls)) return []
  return imageUrls.filter(url => isValidImageUrl(url))
}

const cleanImageUrl = (imageUrl) => {
  return isValidImageUrl(imageUrl) ? imageUrl : null
}

module.exports = {
  isValidImageUrl,
  cleanImageUrls,
  cleanImageUrl,
}

