<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
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
let sessionToken = null
let geocodeTimeout = null

const DEFAULT_CENTER = { lat: 25.033964, lng: 121.564468 }

const clearMapResources = () => {
  googleRef = null
  marker = null
  map = null
  autocomplete = null
  geocoder = null
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

  geocoder.geocode({ location }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const lat = location.lat && typeof location.lat === 'function' ? location.lat() : location.lat
      const lng = location.lng && typeof location.lng === 'function' ? location.lng() : location.lng
      setSelectedPlace({
        name: results[0].address_components[0]?.long_name || '選定位置',
        address: results[0].formatted_address,
        lat,
        lng,
        placeId: results[0].place_id,
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
  (isOpen) => {
    if (!isOpen) return
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
  <div v-if="isOpen" class="modal-backdrop">
    <div class="modal">
      <header class="header">
        <h3>選擇地點</h3>
        <button @click="emit('close')">✕</button>
      </header>

      <input ref="inputRef" class="search" placeholder="搜尋地點" />

      <div ref="mapRef" class="map"></div>

      <footer class="footer">
        <button class="cancel" @click="emit('close')">取消</button>
        <button class="confirm" @click="confirmLocation">確認</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 90%;
  max-width: 600px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header,
.footer {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search {
  margin: 12px 16px;
  padding: 8px 12px;
}

.map {
  height: 360px;
}

.footer {
  gap: 8px;
}

.confirm {
  background: #2563eb;
  color: white;
}
</style>
