<script setup>
import { ref, watch } from 'vue'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPin as MapPinIcon, Search as SearchIcon, X as XIcon, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  initialLocation: {
    type: Object,
    default: () => null, // { lat: number, lng: number, address: string, name: string, placeId: string }
  }
})

const emit = defineEmits(['close', 'select'])

const API_KEY = 'AIzaSyAiTPzHinwP8YKKbgyJs426B05In-cJBPs'
const mapContainer = ref(null)
const searchInput = ref(null)
const isLoading = ref(true)
const searchKeyword = ref('')

let map = null
let marker = null
let autocomplete = null
let google = null

// 當前選中的地點狀態
const selectedPlace = ref(null)

const initMap = async () => {
  isLoading.value = true
  try {
    const loader = new Loader({
      apiKey: API_KEY,
      version: 'weekly',
      libraries: ['places'],
      language: 'zh-TW', // 強制繁體中文
    })

    google = await loader.load()

    // 預設台北 101
    const defaultCenter = { lat: 25.033964, lng: 121.564468 }
    const center = props.initialLocation?.lat ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng } : defaultCenter

    map = new google.maps.Map(mapContainer.value, {
      center: center,
      zoom: 15,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })

    // 初始化標記
    marker = new google.maps.Marker({
      map: map,
      position: center,
      draggable: true, // 允許拖拉標記
      animation: google.maps.Animation.DROP,
    })

    // 如果有初始地點，設置選中狀態
    if (props.initialLocation) {
        selectedPlace.value = props.initialLocation
    }

    // 監聽標記拖拉結束事件，反查地點
    marker.addListener('dragend', () => {
      const position = marker.getPosition()
      geocodePosition(position)
    })

    // 點擊地圖也能移動標記
    map.addListener('click', (e) => {
        marker.setPosition(e.latLng)
        geocodePosition(e.latLng)
    })

    // 初始化搜尋框
    initAutocomplete()

  } catch (error) {
    console.error('Google Maps Load Error:', error)
    alert('Google Maps 載入失敗，請檢查網路或 API Key 設定。')
  } finally {
    isLoading.value = false
  }
}

const initAutocomplete = () => {
    if (!searchInput.value || !google) return

    autocomplete = new google.maps.places.Autocomplete(searchInput.value, {
        fields: ['formatted_address', 'geometry', 'name', 'place_id'],
        strictBounds: false,
    })

    // 綁定地圖視野，讓搜尋優先顯示目前區域
    autocomplete.bindTo('bounds', map)

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()

        if (!place.geometry || !place.geometry.location) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            alert("找不到該地點的詳細資訊：'" + place.name + "'")
            return
        }

        // 更新地圖與標記
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport)
        } else {
            map.setCenter(place.geometry.location)
            map.setZoom(17)
        }
        marker.setPosition(place.geometry.location)

        // 設定選中地點
        selectedPlace.value = {
            name: place.name,
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id,
        }
        searchKeyword.value = place.name // 更新輸入框顯示
    })
}

// 反查座標 (Geocoding)
const geocodePosition = (latLng) => {
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
             selectedPlace.value = {
                name: results[0].address_components[0]?.long_name || '選定位置', // 嘗試抓第一個部分當名稱，或是用地址
                address: results[0].formatted_address,
                lat: latLng.lat(),
                lng: latLng.lng(),
                placeId: results[0].place_id
            }
            searchKeyword.value = results[0].formatted_address // 更新搜尋框顯示地址
        } else {
             console.log('Geocoder failed due to: ' + status)
        }
    })
}

const confirmSelection = () => {
    if (selectedPlace.value) {
        emit('select', selectedPlace.value)
        emit('close')
    } else {
        alert('請先選擇一個地點！')
    }
}

// 監聽 Modal 開啟
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // 稍微延遲以確保 DOM 已經 render
    setTimeout(() => {
        if (!map) {
            initMap()
        } else {
            // 重置地圖狀態
             const center = props.initialLocation?.lat
                ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng }
                : { lat: 25.033964, lng: 121.564468 }

             map.setCenter(center)
             marker.setPosition(center)
             searchKeyword.value = props.initialLocation?.name || ''
             selectedPlace.value = props.initialLocation || null

             // 重新觸發 resize 確保顯示正常
             google.maps.event.trigger(map, 'resize')
        }
    }, 100)
  }
})

</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
    <div class="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">

      <!-- Header -->
      <div class="p-4 border-b flex items-center justify-between bg-white z-10 shrink-0">
        <h3 class="text-xl font-bold flex items-center gap-2">
            <MapPinIcon class="w-5 h-5 text-primary-600" />
            選擇地點
        </h3>
        <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="$emit('close')">
          <XIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Search Bar Layer (Floating) -->
      <div class="absolute top-20 left-4 right-4 z-10 sm:w-96">
          <div class="relative shadow-lg">
              <input
                ref="searchInput"
                v-model="searchKeyword"
                type="text"
                class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="搜尋地點 (例如: 台北 101)"
              />
              <SearchIcon class="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
          </div>
      </div>

      <!-- Map Container -->
      <div class="flex-1 relative bg-gray-100">
         <div ref="mapContainer" class="w-full h-full"></div>

         <!-- Loading State -->
         <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
             <div class="flex flex-col items-center gap-2">
                 <Loader2 class="w-8 h-8 text-primary-600 animate-spin" />
                 <span class="text-gray-500 font-medium">地圖載入中...</span>
             </div>
         </div>
      </div>

      <!-- Footer / Selected Info -->
      <div class="p-4 border-t bg-gray-50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
              <p v-if="selectedPlace" class="text-sm font-bold text-gray-800 truncate">
                  {{ selectedPlace.name }}
              </p>
              <p v-if="selectedPlace" class="text-xs text-gray-500 truncate">
                  {{ selectedPlace.address }}
              </p>
              <p v-else class="text-sm text-gray-500 flex items-center gap-1">
                  <MapPinIcon class="w-4 h-4" /> 請在圖上點選或搜尋地點
              </p>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto">
              <button
                class="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-gray-300 font-bold hover:bg-gray-100 transition"
                @click="$emit('close')"
              >
                  取消
              </button>
              <button
                class="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition shadow-lg shadow-primary-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                :disabled="!selectedPlace"
                @click="confirmSelection"
              >
                  確定選擇
              </button>
          </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
