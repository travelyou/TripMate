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

const DEFAULT_CENTER = { lat: 25.033964, lng: 121.564468 }

const clearMapResources = () => {
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

  geocoder.geocode({ location }, async (results, status) => {
    if (status === 'OK' && results[0]) {
      const lat = location.lat && typeof location.lat === 'function' ? location.lat() : location.lat
      const lng = location.lng && typeof location.lng === 'function' ? location.lng() : location.lng
      const topResult = results[0]
      let placeName = ''

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

      if (!placeName) {
        const poiComponent = topResult.address_components?.find((component) =>
          component.types?.some((type) =>
            ['point_of_interest', 'establishment', 'premise'].includes(type),
          ),
        )
        placeName =
          poiComponent?.long_name || topResult.name || topResult.formatted_address || '選定位置'
      }

      setSelectedPlace({
        name: placeName,
        address: topResult.formatted_address || '',
        lat,
        lng,
        placeId: topResult.place_id || '',
      })
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

  marker.addListener('dragend', () => {
    const position = marker.getPosition()
    if (position) debouncedGeocodePosition(position)
  })

  map.addListener('click', (e) => {
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
