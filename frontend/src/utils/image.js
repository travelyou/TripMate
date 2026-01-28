export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmedUrl = url.trim()
  if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) return false
  return true
}

export const isValidHttpImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const trimmedUrl = url.trim()
  if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) return false
  return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
}

export const cleanImageUrls = (imageUrls, strictMode = false) => {
  if (!Array.isArray(imageUrls)) return []
  const validator = strictMode ? isValidHttpImageUrl : isValidImageUrl
  return imageUrls.filter(url => validator(url))
}

export const cleanImageUrl = (imageUrl, strictMode = false) => {
  const validator = strictMode ? isValidHttpImageUrl : isValidImageUrl
  return validator(imageUrl) ? imageUrl : null
}

export const isImageLoadError = (imgElement) => {
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) return true
  return !imgElement.complete || imgElement.naturalWidth === 0
}

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

export const preloadImages = async (urls) => {
  if (!Array.isArray(urls)) return []
  const validUrls = cleanImageUrls(urls)
  const results = await Promise.allSettled(validUrls.map(url => preloadImage(url)))
  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value)
}

