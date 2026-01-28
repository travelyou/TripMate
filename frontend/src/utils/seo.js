export function updateSEOMeta(meta = {}) {
  const {
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    siteName = 'TripMate',
  } = meta

  const baseTitle = 'TripMate - 找旅伴、行程規劃與旅遊社群平台'
  const baseDescription =
    'TripMate 致力於打造一個結合旅遊論壇、行程規劃、旅伴配對與旅遊交友的一站式平台。透過智慧性格測驗與獨特的護照系統，讓旅行不再孤單，下一站，我們一起出發。'
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const defaultImage = `${baseUrl}/og-image.jpg`

  const finalTitle = title ? `${title} | ${siteName}` : baseTitle
  const finalDescription = description || baseDescription
  const finalImage = image || defaultImage
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  if (typeof document !== 'undefined') {
    document.title = finalTitle

    updateMetaTag('name', 'description', finalDescription)
    updateMetaTag('name', 'keywords', keywords || 'TripMate, 馬遊友, 旅遊社群, 找旅伴, 旅伴配對, 行程規劃, 旅遊論壇, 旅遊交友, 自助旅行, 旅遊性格測驗, 行程市集')

    updateMetaTag('property', 'og:title', finalTitle)
    updateMetaTag('property', 'og:description', finalDescription)
    updateMetaTag('property', 'og:type', type)
    updateMetaTag('property', 'og:image', finalImage)
    updateMetaTag('property', 'og:url', finalUrl)
    updateMetaTag('property', 'og:site_name', siteName)
    updateMetaTag('property', 'og:locale', 'zh_TW')

    updateMetaTag('name', 'twitter:card', 'summary_large_image')
    updateMetaTag('name', 'twitter:title', finalTitle)
    updateMetaTag('name', 'twitter:description', finalDescription)
    updateMetaTag('name', 'twitter:image', finalImage)

    updateMetaTag('name', 'theme-color', '#3b82f6')
    updateMetaTag('name', 'apple-mobile-web-app-capable', 'yes')
    updateMetaTag('name', 'apple-mobile-web-app-status-bar-style', 'default')
    updateMetaTag('name', 'apple-mobile-web-app-title', siteName)
  }
}

function updateMetaTag(attr, value, content) {
  if (typeof document === 'undefined') return

  let selector = `meta[${attr}="${value}"]`
  let element = document.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, value)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

export function addStructuredData(data) {
  if (typeof document === 'undefined') return

  const scriptId = 'structured-data'
  let script = document.getElementById(scriptId)

  if (script) {
    script.remove()
  }

  script = document.createElement('script')
  script.id = scriptId
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

export function getDefaultStructuredData() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TripMate',
    alternateName: '馬遊友',
    url: baseUrl,
    description:
      'TripMate 致力於打造一個結合旅遊論壇、行程規劃、旅伴配對與旅遊交友的一站式平台。透過智慧性格測驗與獨特的護照系統，讓旅行不再孤單，下一站，我們一起出發。',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function getOrganizationStructuredData() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TripMate',
    alternateName: '馬遊友',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [],
  }
}

