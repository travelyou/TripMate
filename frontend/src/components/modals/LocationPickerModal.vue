<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { loadGoogleMaps } from '@/utils/googleMapLoader'

const props = defineProps({
  isOpen: Boolean,
  initialLocation: {
    type: Object,
    default: () => null, // { lat, lng, address, name, placeId }
  },
})

const emit = defineEmits(['select', 'close'])

const mapRef = ref(null)
const inputRef = ref(null)
const selectedPlace = ref(null)

let googleRef = null
let map = null
let marker = null
let autocomplete = null
let geocoder = null
let placesService = null
let sessionToken = null
let geocodeTimeout = null
const geocodeCache = new Map()
const GEO_CACHE_TTL = 10000
const mapListeners = []

const DEFAULT_CENTER = { lat: 25.033964, lng: 121.564468 }

const clearMapResources = () => {
  if (mapListeners.length > 0) {
    mapListeners.forEach((listener) => {
      if (listener?.remove) {
        listener.remove()
      } else if (googleRef?.maps?.event?.removeListener) {
        googleRef.maps.event.removeListener(listener)
      }
    })
    mapListeners.length = 0
  }
  googleRef = null
  marker = null
  map = null
  autocomplete = null
  geocoder = null
  placesService = null
  sessionToken = null
}

const setSelectedPlace = ({ name, address, lat, lng, placeId }) => {
  selectedPlace.value = { name, address, lat, lng, placeId }
}

const getCacheKey = (lat, lng) => `${lat.toFixed(6)},${lng.toFixed(6)}`

const getCachedPlace = (lat, lng) => {
  const key = getCacheKey(lat, lng)
  const cached = geocodeCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > GEO_CACHE_TTL) {
    geocodeCache.delete(key)
    return null
  }
  return cached.value
}

const setCachedPlace = (lat, lng, value) => {
  const key = getCacheKey(lat, lng)
  geocodeCache.set(key, { value, timestamp: Date.now() })
}

const addMapListener = (target, eventName, handler) => {
  if (!target?.addListener) return
  const listener = target.addListener(eventName, handler)
  mapListeners.push(listener)
}

const debouncedGeocodePosition = (latLng) => {
  if (geocodeTimeout) {
    clearTimeout(geocodeTimeout)
  }
  geocodeTimeout = setTimeout(() => {
    geocodePosition(latLng)
  }, 500)
}

const geocodePosition = (latLng) => {
  if (!geocoder) return

  const location =
    latLng.lat && typeof latLng.lat === 'function' ? latLng : { lat: latLng.lat, lng: latLng.lng }

  const lat = location.lat && typeof location.lat === 'function' ? location.lat() : location.lat
  const lng = location.lng && typeof location.lng === 'function' ? location.lng() : location.lng
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  const cached = getCachedPlace(lat, lng)
  if (cached) {
    setSelectedPlace(cached)
    return
  }

  geocoder.geocode({ location }, async (results, status) => {
    if (status === 'OK' && results[0]) {
      const poiResult = results.find((result) =>
        result.types?.some((type) =>
          ['point_of_interest', 'establishment', 'premise'].includes(type),
        ),
      )
      const topResult = poiResult || results[0]
      let placeName = ''
      let resolvedPlaceId = topResult.place_id || ''
      let resolvedAddress = topResult.formatted_address || ''

      if (topResult.place_id && placesService) {
        placeName = await new Promise((resolve) => {
          placesService.getDetails(
            {
              placeId: topResult.place_id,
              fields: ['name'],
            },
            (place, placeStatus) => {
              if (placeStatus === 'OK' && place?.name) {
                resolve(place.name)
              } else {
                resolve('')
              }
            },
          )
        })
      }

      if (!placeName && placesService) {
        const nearby = await new Promise((resolve) => {
          const supportsRankBy = googleRef?.maps?.places?.RankBy?.DISTANCE
          const searchOptions = supportsRankBy
            ? {
                location: { lat, lng },
                rankBy: googleRef.maps.places.RankBy.DISTANCE,
                type: 'establishment',
              }
            : {
                location: { lat, lng },
                radius: 80,
                type: 'establishment',
              }

          placesService.nearbySearch(searchOptions, (resultsList, searchStatus) => {
            if (searchStatus === 'OK' && resultsList?.length) {
              resolve(resultsList[0])
            } else {
              resolve(null)
            }
          })
        })

        if (nearby?.name) {
          placeName = nearby.name
          resolvedPlaceId = nearby.place_id || resolvedPlaceId
          resolvedAddress = nearby.vicinity || resolvedAddress
        }
      }

      if (!placeName) {
        const poiComponent = topResult.address_components?.find((component) =>
          component.types?.some((type) =>
            ['point_of_interest', 'establishment', 'premise'].includes(type),
          ),
        )
        placeName =
          poiComponent?.long_name || topResult.name || topResult.formatted_address || '選定位置'
      }

      const placeData = {
        name: placeName,
        address: resolvedAddress,
        lat,
        lng,
        placeId: resolvedPlaceId,
      }
      setSelectedPlace(placeData)
      setCachedPlace(lat, lng, placeData)
    }
  })
}

const initAutocomplete = async () => {
  if (!inputRef.value || !googleRef) return

  if (googleRef.maps.places?.AutocompleteSessionToken) {
    sessionToken = new googleRef.maps.places.AutocompleteSessionToken()
  }

  autocomplete = new googleRef.maps.places.Autocomplete(inputRef.value, {
    fields: ['geometry', 'formatted_address', 'name', 'place_id'],
    strictBounds: false,
    ...(sessionToken ? { sessionToken } : {}),
  })

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace()
    if (!place.geometry || !place.geometry.location) return

    const location = place.geometry.location
    map.panTo(location)
    map.setZoom(16)
    marker.setPosition(location)

    setSelectedPlace({
      name: place.name || '選定位置',
      address: place.formatted_address || '',
      lat: location.lat(),
      lng: location.lng(),
      placeId: place.place_id || '',
    })

    if (googleRef.maps.places?.AutocompleteSessionToken) {
      sessionToken = new googleRef.maps.places.AutocompleteSessionToken()
    }
  })
}

const initMap = async () => {
  if (!mapRef.value) {
    await nextTick()
  }
  if (!mapRef.value) return

  googleRef = await loadGoogleMaps()

  await googleRef.maps.importLibrary('maps')
  await googleRef.maps.importLibrary('places')

  const center = props.initialLocation?.lat
    ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng }
    : DEFAULT_CENTER

  map = new googleRef.maps.Map(mapRef.value, {
    center,
    zoom: 14,
  })

  marker = new googleRef.maps.Marker({
    map,
    position: center,
    draggable: true,
  })

  geocoder = new googleRef.maps.Geocoder()
  if (googleRef.maps.places?.PlacesService) {
    placesService = new googleRef.maps.places.PlacesService(map)
  }

  if (props.initialLocation) {
    selectedPlace.value = props.initialLocation
  }

  addMapListener(marker, 'dragend', () => {
    const position = marker.getPosition()
    if (position) debouncedGeocodePosition(position)
  })

  addMapListener(map, 'click', (e) => {
    marker.setPosition(e.latLng)
    debouncedGeocodePosition(e.latLng)
  })

  await initAutocomplete()
}

const refreshMapState = () => {
  const center = props.initialLocation?.lat
    ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng }
    : DEFAULT_CENTER

  if (!map || !marker) return
  map.setCenter(center)
  marker.setPosition(center)
  if (props.initialLocation) {
    selectedPlace.value = props.initialLocation
  } else {
    selectedPlace.value = null
  }

  if (googleRef?.maps?.event?.trigger) {
    setTimeout(() => {
      googleRef.maps.event.trigger(map, 'resize')
      map.setCenter(center)
    }, 0)
  }
}

const confirmLocation = () => {
  if (selectedPlace.value) {
    emit('select', selectedPlace.value)
    emit('close')
    return
  }

  if (!marker) return

  const pos = marker.getPosition()
  emit('select', {
    name: '選定位置',
    address: '',
    lat: pos.lat(),
    lng: pos.lng(),
    placeId: '',
  })
  emit('close')
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    if (!map) {
      setTimeout(() => {
        if (!map) initMap()
      }, 0)
    } else {
      refreshMapState()
    }
  },
)

onBeforeUnmount(() => {
  if (geocodeTimeout) {
    clearTimeout(geocodeTimeout)
  }
  clearMapResources()
})
</script>

<template>
  <div
    v-show="isOpen"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
  >
    <div
      class="flex w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
    >
      <header class="flex items-center justify-between border-b border-gray-200 px-8 py-3">
        <h3>選擇地點</h3>
        <button @click="emit('close')">✕</button>
      </header>

      <input
        ref="inputRef"
        class="mx-8 my-4 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
        placeholder="搜尋地點"
      />

      <div ref="mapRef" class="h-[520px] min-h-[360px] w-full"></div>

      <footer class="flex items-center justify-between gap-3 border-t border-gray-200 px-8 py-3">
        <div class="text-xs text-gray-500">
          <span>請在圖上點選或搜尋地點</span>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-200"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-primary px-4 py-2 font-semibold text-white shadow-lg hover:bg-secondary-700"
            @click="confirmLocation"
          >
            確定選擇
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
