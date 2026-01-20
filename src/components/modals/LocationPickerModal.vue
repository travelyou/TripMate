<script setup>
import { ref, watch, onMounted } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPin as MapPinIcon, Search as SearchIcon, X as XIcon, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  initialLocation: {
    type: Object,
    default: () => null, // { lat: number, lng: number, address: string, name: string, placeId: string }
  }
})

const emit = defineEmits(['close', 'select'])

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
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

// 初始化 Google Maps 配置（在组件挂载时执行）
onMounted(() => {
  if (!window.__GOOGLE_MAPS_SET_OPTIONS_DONE__) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.error('[Google Maps] API Key 未設定，請檢查環境變數 VITE_GOOGLE_MAPS_API_KEY')
      console.error('[Google Maps] 當前環境變數值:', {
        hasKey: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        keyLength: import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length || 0
      })
      return
    }
    
    console.log('[Google Maps] 設定 API Key:', apiKey.substring(0, 10) + '...')
    
    try {
      setOptions({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'maps', 'marker', 'geocoding', 'routes'],
        language: 'zh-TW',
      })
      window.__GOOGLE_MAPS_SET_OPTIONS_DONE__ = true
      console.log('[Google Maps] setOptions 設定成功')
    } catch (error) {
      console.error('[Google Maps] setOptions 失敗:', error)
    }
  }
})

const initMap = async () => {
  isLoading.value = true
  
  // 再次检查 API Key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('[Google Maps] initMap: API Key 未設定')
    alert('Google Maps API Key 未設定，請檢查環境變數設定')
    isLoading.value = false
    return
  }
  
  // 确保 setOptions 已设置
  if (!window.__GOOGLE_MAPS_SET_OPTIONS_DONE__) {
    try {
      setOptions({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'maps', 'marker', 'geocoding', 'routes'],
        language: 'zh-TW',
      })
      window.__GOOGLE_MAPS_SET_OPTIONS_DONE__ = true
      console.log('[Google Maps] initMap: setOptions 設定成功')
    } catch (error) {
      console.error('[Google Maps] initMap: setOptions 失敗:', error)
      alert('Google Maps 設定失敗：' + error.message)
      isLoading.value = false
      return
    }
  }
  
  try {
    console.log('[GoogleMaps] 初始化地圖，使用的 API Key:', apiKey ? apiKey.substring(0, 10) + '...' : '未定義')

    // 載入必要的 Library (平行載入)
    const [mapsLib, placesLib, markerLib] = await Promise.all([
        importLibrary('maps'),
        importLibrary('places'),
        importLibrary('marker')
    ])

    // 為了相容原本的寫法，我們可以把 google 物件模擬出來，或是直接用 library 裡的類別
    // 這裡我們直接獲取類別
    const MapClass = mapsLib.Map
    const MarkerClass = markerLib.Marker
    const AutocompleteClass = placesLib.Autocomplete
    // const GeocoderClass = mapsLib.Geocoder
    // 修正：Geocoder 可能需要 'geocoding' library，或者如果它是核心的一部分。
    // 通常 google.maps.Geocoder 在 'geocoding' library 或者 legacy 'maps' 裡。
    // 我們多載一個 geocoding 比較保險
    const geocodingLib = await importLibrary('geocoding').catch(e => {
        console.warn('Geocoding lib load failed, maybe in maps?', e)
        return null
    })

    // 為了讓下方的 google.maps.Map ... 繼續運作，我們可以建立一個假的 google 物件結構，
    // 或是直接重構下方的 code。重構比較好。

    // 預設台北 101

    // 預設台北 101
    const defaultCenter = { lat: 25.033964, lng: 121.564468 }
    const center = props.initialLocation?.lat ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng } : defaultCenter

    map = new MapClass(mapContainer.value, {
      center: center,
      zoom: 15,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      // mapId: 'DEMO_MAP_ID', // 移除 mapId 以避免 ApiProjectMapError，除非使用者真的有設定
    })

    // 初始化標記
    // 注意：v2 推薦用 AdvancedMarkerElement，但 MarkerClass (legacy) 如果有載入 marker 庫應該還能用
    // 為了相容性，我們先試試 MarkerClass
    marker = new MarkerClass({
      map: map,
      position: center,
      draggable: true, // 允許拖拉標記
      animation: google ? google.maps.Animation.DROP : null, // Animation 可能要從某個 lib 拿，或是省略
    })

    // 把 google 物件保留給其他 function 用 (如 Autocomplete 需要 google.maps.places.Autocomplete)
    // 但我們也可以把 AutocompleteClass 存到變數
    // 這裡為了方便 autocomplete 和 geocoder 函數使用，我們將它們存為全域引用或直接傳遞

    // 因為 geocodePosition 和 initAutocomplete 依賴 google 物件
    // 我們快速重新建立一個 google.maps 代理，讓舊 code 不用大改
    window.google = window.google || {}
    window.google.maps = window.google.maps || {}
    window.google.maps.places = window.google.maps.places || {}
    window.google.maps.places.Autocomplete = AutocompleteClass
    window.google.maps.Geocoder = geocodingLib ? geocodingLib.Geocoder : (mapsLib.Geocoder || null)

    // 重設 local 的 google 變數指向 window.google 以防萬一
    google = window.google

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
    const errorMessage = error.message || error.toString()
    let userMessage = 'Google Maps 載入失敗'
    
    if (errorMessage.includes('ApiProjectMapError') || errorMessage.includes('NoApiKeys')) {
      userMessage = 'Google Maps API Key 設定錯誤\n\n請檢查：\n1. 環境變數 VITE_GOOGLE_MAPS_API_KEY 是否正確設定\n2. API Key 是否有效\n3. 是否已啟用必要的 API\n4. 是否已啟用計費帳戶'
    } else if (errorMessage.includes('RefererNotAllowedMapError')) {
      userMessage = 'API Key 限制設定錯誤\n\n請在 Google Cloud Console 中添加當前網址到允許清單'
    }
    
    alert(userMessage + '\n\n詳細錯誤：' + errorMessage)
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
             if (marker) {
               marker.setPosition(center)
             }
             searchKeyword.value = props.initialLocation?.name || ''
             selectedPlace.value = props.initialLocation || null

             // 重新觸發 resize 確保顯示正常
             if (google && google.maps && google.maps.event) {
               google.maps.event.trigger(map, 'resize')
             }
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
