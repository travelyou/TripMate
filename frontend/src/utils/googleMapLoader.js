let loaderPromise = null

const resetLoaderIfNeeded = (apiKey) => {
  const previousKey = window.__GOOGLE_MAPS_API_KEY__
  if (window.google?.maps && (!previousKey || previousKey !== apiKey)) {
    try {
      const scripts = document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]')
      scripts.forEach((script) => script.parentNode?.removeChild(script))
    } catch (error) {
      console.warn('[Google Maps] 清理舊 Script 失敗:', error)
    }

    try {
      if (window.google) delete window.google
    } catch (error) {
      console.warn('[Google Maps] 移除 google 物件失敗:', error)
      window.google = undefined
    }

    window.__GOOGLE_MAPS_SET_OPTIONS_DONE__ = false
    window.__GOOGLE_MAPS_API_KEY__ = undefined
    loaderPromise = null
  }
}

export function loadGoogleMaps() {
  const apiKeyRaw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const apiKey = typeof apiKeyRaw === 'string' ? apiKeyRaw.replace(/^\uFEFF/, '').trim() : ''
  if (!apiKey) {
    console.error('[Google Maps] 未讀到 VITE_GOOGLE_MAPS_API_KEY')
    console.error('[Google Maps] 請確認 frontend/.env 並重啟前端 dev server')
    throw new Error('Missing Google Maps API key')
  }

  if (import.meta.env.DEV) {
    console.log('[Google Maps] API Key 已讀取 (長度):', apiKey.length)
  }

  try {
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]')
    scripts.forEach((script) => {
      const src = script.getAttribute('src') || ''
      if (import.meta.env.DEV) {
        console.log('[Google Maps] 現有 Script src:', src)
      }
      const hasKey = src.includes('key=')
      const keyMatches = hasKey ? src.includes(`key=${apiKey}`) : false
      if (!hasKey || !keyMatches) {
        script.parentNode?.removeChild(script)
        window.__GOOGLE_MAPS_SET_OPTIONS_DONE__ = false
        window.__GOOGLE_MAPS_API_KEY__ = undefined
        loaderPromise = null
      }
    })
  } catch (error) {
    console.warn('[Google Maps] 檢查舊 Script 失敗:', error)
  }

  resetLoaderIfNeeded(apiKey)

  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      try {
        const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
        if (existing) {
          existing.parentNode?.removeChild(existing)
        }

        const callbackName = '__initGoogleMaps__'
        const ensureGoogleNamespace = () => {
          if (!window.google) {
            window.google = { maps: {} }
          } else if (!window.google.maps) {
            window.google.maps = {}
          }
        }

        ensureGoogleNamespace()
        window.google.maps[callbackName] = () => {
          if (import.meta.env.DEV) {
            const scripts = document.querySelectorAll(
              'script[src*="maps.googleapis.com/maps/api/js"]',
            )
            scripts.forEach((script) => {
              console.log('[Google Maps] 載入後 Script src:', script.getAttribute('src') || '')
            })
          }

          if (!window.google) {
            reject(new Error('Google Maps failed to load'))
            return
          }

          window.__GOOGLE_MAPS_API_KEY__ = apiKey
          window.__GOOGLE_MAPS_SET_OPTIONS_DONE__ = true
          const googleInstance = window.google
          try {
            delete window.google.maps[callbackName]
          } catch {
            window.google.maps[callbackName] = undefined
          }
          resolve(googleInstance)
        }

        const script = document.createElement('script')
        const params = new URLSearchParams({
          key: apiKey,
          v: 'weekly',
          libraries: 'places,maps,marker',
          language: 'zh-TW',
          callback: `google.maps.${callbackName}`,
        })
        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
        script.async = true
        script.defer = true
        script.onerror = () => {
          loaderPromise = null
          reject(new Error('Google Maps failed to load'))
        }

        ensureGoogleNamespace()

        document.head.appendChild(script)
      } catch (error) {
        loaderPromise = null
        reject(error)
      }
    })
  }

  return loaderPromise
}
