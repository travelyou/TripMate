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

  // 驗證 API Key 格式（有效的 API Key 通常以 AIzaSy 開頭，長度至少 30 個字符）
  if (apiKey.length < 30 || !apiKey.startsWith('AIza')) {
    console.warn('[Google Maps] API Key 格式可能不正確')
    console.warn('[Google Maps] 有效的 API Key 應該以 AIza 開頭，長度至少 30 個字符')
    console.warn('[Google Maps] 當前 API Key 長度:', apiKey.length)
    console.warn('[Google Maps] 當前 API Key 開頭:', apiKey.substring(0, Math.min(10, apiKey.length)))
    // 不阻止執行，讓 Google Maps API 自己驗證
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

    // 從 library 中取得類別
    const MapClass = mapsLib.Map
    const AdvancedMarkerElement = markerLib.AdvancedMarkerElement
    const PinElement = markerLib.PinElement
    const AutocompleteClass = placesLib.Autocomplete
    const GeocoderClass = mapsLib.Geocoder // Geocoder 在 maps library 中

    // 預設台北 101
    const defaultCenter = { lat: 25.033964, lng: 121.564468 }
    const center = props.initialLocation?.lat ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng } : defaultCenter

    // 建立 google 物件結構，供後續使用
    window.google = window.google || {}
    window.google.maps = window.google.maps || {}
    window.google.maps.places = window.google.maps.places || {}
    window.google.maps.places.Autocomplete = AutocompleteClass
    window.google.maps.Geocoder = GeocoderClass
    window.google.maps.Animation = mapsLib.Animation || {} // Animation 常數
    window.google.maps.event = mapsLib.event || {} // Event 系統

    // 重設 local 的 google 變數指向 window.google
    google = window.google

    // 獲取 mapId（從環境變數）
    // 注意：使用 AdvancedMarkerElement 需要有效的 mapId
    // 有效的 Map ID 通常是長字符串（至少 10 個字符），例如：8e0a97a1b2c3d4e5f6g7h8i9j0k1l2m
    // 如果 Map ID 太短或格式不正確，將視為無效並回退到舊版 API
    // 參考：https://developers.google.com/maps/documentation/javascript/get-map-id
    const rawMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    // 驗證 Map ID 格式：有效的 Map ID 應該至少 10 個字符，且不應該是純數字
    let mapId = rawMapId && rawMapId.length >= 10 && rawMapId.trim() !== '' ? rawMapId.trim() : null

    if (!mapId) {
      if (rawMapId) {
        console.warn('[Google Maps] Map ID 格式無效:', rawMapId)
        console.warn('[Google Maps] 有效的 Map ID 應該是至少 10 個字符的字符串')
      } else {
        console.warn('[Google Maps] 未設定 VITE_GOOGLE_MAPS_MAP_ID')
      }
      console.warn('[Google Maps] 將使用舊版 Marker API（會顯示棄用警告，但功能正常）')
      console.warn('[Google Maps] 如需使用 AdvancedMarkerElement，請在 Google Cloud Console 創建有效的 Map ID')
      console.warn('[Google Maps] 參考：https://developers.google.com/maps/documentation/javascript/get-map-id')
    } else {
      console.log('[Google Maps] 使用 Map ID:', mapId.substring(0, 10) + '...')
    }

    // 構建地圖配置
    const mapConfig = {
      center: center,
      zoom: 15,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    }

    // 只有在有有效的 mapId 時才添加（避免 ApiProjectMapError）
    if (mapId) {
      mapConfig.mapId = mapId
    }

    // 嘗試創建地圖
    // 注意：即使有 mapId，如果 mapId 無效，Google Maps 可能會在異步加載時報錯
    // 我們先嘗試創建，如果後續出現 ApiProjectMapError，會在 catch 區塊處理
    map = new MapClass(mapContainer.value, mapConfig)

    // 監聽全域 Google Maps 錯誤（ApiProjectMapError 通常在異步時發生）
    let errorHandled = false

    // 處理 ApiProjectMapError 的函數
    const handleApiProjectMapError = async () => {
      try {
        console.log('[Google Maps] 開始回退流程...')

        // 清除現有地圖和標記
        if (marker) {
          marker.map = null
          marker = null
        }
        if (map) {
          // 清理地圖
          google.maps.event.clearInstanceListeners(map)
        }

        // 重新創建地圖，不使用 mapId
        const fallbackConfig = {
          center: center,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        }
        // 明確不使用 mapId
        delete fallbackConfig.mapId

        map = new MapClass(mapContainer.value, fallbackConfig)
        mapId = null // 清除 mapId，強制使用舊版 Marker

        // 重新初始化標記（使用舊版 API）
        const LegacyMarker = markerLib.Marker || window.google?.maps?.Marker
        if (LegacyMarker) {
          marker = new LegacyMarker({
            map: map,
            position: center,
            draggable: true,
            animation: google.maps.Animation?.DROP || null,
          })

          // 重新設置事件監聽
          marker.addListener('dragend', () => {
            const position = marker.getPosition?.()
            if (position) {
              geocodePosition(position)
            }
          })

          map.addListener('click', (e) => {
            if (marker.setPosition) {
              marker.setPosition(e.latLng)
            }
            geocodePosition(e.latLng)
          })

          // 重新初始化搜尋框
          initAutocomplete()

          console.log('[Google Maps] 已成功回退到舊版 API（不使用 Map ID）')
        }
      } catch (retryError) {
        console.error('[Google Maps] 回退初始化失敗:', retryError)
      }
    }

    // 監聽 window 錯誤事件（捕獲異步 ApiProjectMapError）
    const errorHandler = (event) => {
      const errorMsg = event.message || event.error?.message || event.error?.toString() || ''
      const errorUrl = event.filename || event.source?.location?.href || ''

      // 檢查是否是 ApiProjectMapError
      if ((errorMsg.includes('ApiProjectMapError') || errorUrl.includes('api-project-map-error')) && mapId && !errorHandled) {
        errorHandled = true
        console.warn('[Google Maps] 從 window 錯誤事件檢測到 ApiProjectMapError')
        console.warn('[Google Maps] 錯誤訊息:', errorMsg)
        event.preventDefault() // 阻止錯誤繼續傳播
        handleApiProjectMapError()
      }
    }

    // 監聽未處理的 Promise rejection
    const unhandledRejectionHandler = (event) => {
      const errorMsg = event.reason?.message || event.reason?.toString() || ''
      if (errorMsg.includes('ApiProjectMapError') && mapId && !errorHandled) {
        errorHandled = true
        console.warn('[Google Maps] 從 Promise rejection 檢測到 ApiProjectMapError')
        event.preventDefault()
        handleApiProjectMapError()
      }
    }

    window.addEventListener('error', errorHandler, true)
    window.addEventListener('unhandledrejection', unhandledRejectionHandler, true)

    // 監聽地圖 idle 事件，在地圖載入完成後檢查
    if (map && map.addListener) {
      map.addListener('idle', () => {
        // 地圖載入完成後，檢查是否有錯誤
        setTimeout(() => {
          if (mapId && !errorHandled) {
            try {
              // 嘗試訪問地圖屬性來驗證
              const zoom = map.getZoom?.()
              if (zoom === undefined || zoom === null) {
                console.warn('[Google Maps] 地圖可能未正常載入，可能是 Map ID 問題')
              }
            } catch (checkError) {
              // 如果訪問地圖屬性失敗，可能是 Map ID 問題
              if (checkError.message?.includes('ApiProjectMapError') || checkError.toString().includes('ApiProjectMapError')) {
                errorHandled = true
                console.warn('[Google Maps] 從地圖屬性檢查檢測到 ApiProjectMapError')
                handleApiProjectMapError()
              }
            }
          }
        }, 1000)
      })
    }

    // 在組件卸載時移除監聽器
    const cleanup = () => {
      window.removeEventListener('error', errorHandler, true)
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler, true)
    }

    // 存儲清理函數以便後續使用
    if (!window.__GOOGLE_MAPS_ERROR_HANDLERS__) {
      window.__GOOGLE_MAPS_ERROR_HANDLERS__ = []
    }
    window.__GOOGLE_MAPS_ERROR_HANDLERS__.push(cleanup)

    // 設置延遲檢查，因為 ApiProjectMapError 可能在異步加載時發生
    setTimeout(() => {
      // 檢查控制台是否有 ApiProjectMapError（通過檢查地圖狀態）
      if (map && mapId && !errorHandled) {
        try {
          const bounds = map.getBounds?.()
          if (!bounds) {
            console.warn('[Google Maps] 地圖邊界未設置，可能是 Map ID 問題')
          }
        } catch {
          // 忽略檢查錯誤
        }
      }
    }, 2000)

    // 初始化標記 - 使用 AdvancedMarkerElement（新 API）
    // 注意：AdvancedMarkerElement 需要有效的 mapId
    // 如果沒有 mapId 或 mapId 無效，將回退到舊版 Marker（會顯示棄用警告）
    // 使用 let 以便在錯誤處理中重新賦值
    let effectiveMapId = mapId

    if (effectiveMapId) {
      try {
        const pinElement = new PinElement({
          background: '#4285F4',
          borderColor: '#137333',
          glyphColor: '#ffffff',
          scale: 1.1,
        })

        marker = new AdvancedMarkerElement({
          map: map,
          position: center,
          content: pinElement.element,
          gmpDraggable: true, // 允許拖拉標記
        })
        console.log('[Google Maps] AdvancedMarkerElement 初始化成功')

        // 設置延遲檢查，如果之後出現 ApiProjectMapError，會自動回退
        setTimeout(() => {
          if (marker && mapId && !errorHandled) {
            try {
              // 嘗試訪問標記屬性來驗證它是否仍然有效
              const pos = marker.position
              if (!pos) {
                console.warn('[Google Maps] AdvancedMarkerElement position 無效，可能是 Map ID 問題')
              }
            } catch (checkError) {
              const errorMsg = checkError.message || checkError.toString() || ''
              if (errorMsg.includes('ApiProjectMapError')) {
                errorHandled = true
                console.warn('[Google Maps] 從標記檢查檢測到 ApiProjectMapError')
                handleApiProjectMapError()
              }
            }
          }
        }, 3000)
      } catch (error) {
        console.error('[Google Maps] AdvancedMarkerElement 初始化失敗:', error)
        console.warn('[Google Maps] 回退到舊版 Marker API')
        // 清除 mapId，強制使用舊版 Marker
        effectiveMapId = null
        // 回退到舊版 Marker（如果 AdvancedMarkerElement 失敗）
        const LegacyMarker = markerLib.Marker || window.google?.maps?.Marker
        if (LegacyMarker) {
          marker = new LegacyMarker({
            map: map,
            position: center,
            draggable: true,
            animation: google.maps.Animation?.DROP || null,
          })
        } else {
          throw new Error('無法初始化標記：缺少 Map ID 且舊版 Marker 不可用')
        }
      }
    } else {
      // 沒有 mapId，使用舊版 Marker（會顯示棄用警告，但功能正常）
      console.warn('[Google Maps] 未設定有效的 Map ID，使用舊版 Marker API（已棄用）')
      const LegacyMarker = markerLib.Marker || window.google?.maps?.Marker
      if (LegacyMarker) {
        marker = new LegacyMarker({
          map: map,
          position: center,
          draggable: true,
          animation: google.maps.Animation?.DROP || null,
        })
      } else {
        throw new Error('無法初始化標記：缺少 Map ID 且舊版 Marker 不可用')
      }
    }

    // 如果有初始地點，設置選中狀態
    if (props.initialLocation) {
        selectedPlace.value = props.initialLocation
    }

    // 監聽標記拖拉結束事件，反查地點
    marker.addListener('dragend', () => {
      // AdvancedMarkerElement 使用 position 屬性，舊版 Marker 使用 getPosition() 方法
      const position = marker.position || marker.getPosition?.()
      if (position) {
        geocodePosition(position)
      }
    })

    // 點擊地圖也能移動標記
    map.addListener('click', (e) => {
      // AdvancedMarkerElement 使用 position 屬性，舊版 Marker 使用 setPosition() 方法
      if (marker.position !== undefined) {
        marker.position = e.latLng
      } else if (marker.setPosition) {
        marker.setPosition(e.latLng)
      }
      geocodePosition(e.latLng)
    })

    // 初始化搜尋框
    initAutocomplete()

  } catch (error) {
    console.error('Google Maps Load Error:', error)
    const errorMessage = error.message || error.toString()
    const errorString = JSON.stringify(error, null, 2)

    // 檢查是否是 ApiProjectMapError
    if (errorMessage.includes('ApiProjectMapError') || errorString.includes('ApiProjectMapError')) {
      console.warn('[Google Maps] ApiProjectMapError - Map ID 可能無效或不存在')
      console.warn('[Google Maps] 嘗試不使用 Map ID 重新初始化...')

      // 嘗試重新初始化，不使用 mapId
      // 需要重新載入 libraries，因為它們在 try 區塊中定義
      try {
        const [mapsLib, placesLib, markerLib] = await Promise.all([
          importLibrary('maps'),
          importLibrary('places'),
          importLibrary('marker')
        ])

        const MapClass = mapsLib.Map
        const center = props.initialLocation?.lat ? { lat: props.initialLocation.lat, lng: props.initialLocation.lng } : { lat: 25.033964, lng: 121.564468 }

        const fallbackConfig = {
          center: center,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        }
        // 確保不使用 mapId
        delete fallbackConfig.mapId

        map = new MapClass(mapContainer.value, fallbackConfig)

        // 建立 google 物件結構
        window.google = window.google || {}
        window.google.maps = window.google.maps || {}
        window.google.maps.places = window.google.maps.places || {}
        window.google.maps.places.Autocomplete = placesLib.Autocomplete
        window.google.maps.Geocoder = mapsLib.Geocoder
        window.google.maps.Animation = mapsLib.Animation || {}
        window.google.maps.event = mapsLib.event || {}
        google = window.google

        // 重新初始化標記（使用舊版 API）
        const LegacyMarker = markerLib.Marker || window.google?.maps?.Marker
        if (LegacyMarker) {
          marker = new LegacyMarker({
            map: map,
            position: center,
            draggable: true,
            animation: google.maps.Animation?.DROP || null,
          })

          // 設置事件監聽
          marker.addListener('dragend', () => {
            const position = marker.getPosition?.()
            if (position) {
              geocodePosition(position)
            }
          })

          map.addListener('click', (e) => {
            if (marker.setPosition) {
              marker.setPosition(e.latLng)
            }
            geocodePosition(e.latLng)
          })

          // 初始化搜尋框
          initAutocomplete()

          console.log('[Google Maps] 已成功回退到舊版 API，地圖應該可以正常使用')
          isLoading.value = false
          return // 成功回退，直接返回
        }
      } catch (retryError) {
        console.error('[Google Maps] 回退初始化也失敗:', retryError)
      }

      // 如果回退失敗，顯示警告但不阻止用戶
      console.warn('[Google Maps] 已嘗試自動修復，如果地圖仍無法顯示，請檢查 Map ID')
    } else if (errorMessage.includes('NoApiKeys') || errorString.includes('NoApiKeys')) {
      console.error('[Google Maps] NoApiKeys - API Key 可能未正確設定')
      alert('Google Maps API Key 設定錯誤\n\n請檢查：\n1. 環境變數 VITE_GOOGLE_MAPS_API_KEY 是否正確設定\n2. API Key 是否完整（應該以 AIzaSy 開頭）\n3. API Key 是否有效\n4. 是否已啟用必要的 API（Maps JavaScript API、Places API 等）\n5. 是否已啟用計費帳戶\n\n詳細錯誤：' + errorMessage)
    } else if (errorMessage.includes('RefererNotAllowedMapError')) {
      alert('API Key 限制設定錯誤\n\n請在 Google Cloud Console 中添加當前網址到允許清單\n\n詳細錯誤：' + errorMessage)
    } else {
      // 其他錯誤，顯示通用錯誤訊息
      console.error('[Google Maps] 未知錯誤:', error)
      alert('Google Maps 載入失敗\n\n詳細錯誤：' + errorMessage)
    }
  } finally {
    isLoading.value = false
  }
}

const initAutocomplete = () => {
    if (!searchInput.value || !google || !google.maps || !google.maps.places) {
        console.warn('[Google Maps] Autocomplete 初始化失敗：google 物件未準備好')
        return
    }

    // 注意：google.maps.places.Autocomplete 已被棄用，建議使用 PlaceAutocompleteElement (Web Component)
    // 但舊版 API 仍然可以正常使用，只是會顯示警告
    // 如需完全消除警告，需要遷移到 Web Component 實現方式
    // 參考：https://developers.google.com/maps/documentation/javascript/places-migration-overview
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
        // AdvancedMarkerElement 使用 position 屬性，舊版 Marker 使用 setPosition() 方法
        if (marker.position !== undefined) {
          marker.position = place.geometry.location
        } else if (marker.setPosition) {
          marker.setPosition(place.geometry.location)
        }

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
    if (!google || !google.maps || !google.maps.Geocoder) {
        console.error('[Google Maps] Geocoder 未初始化')
        return
    }

    const geocoder = new google.maps.Geocoder()

    // 確保 latLng 是正確格式（可能是 LatLng 物件或 {lat, lng}）
    const location = latLng.lat && typeof latLng.lat === 'function'
        ? latLng
        : { lat: latLng.lat, lng: latLng.lng }

    geocoder.geocode({ location: location }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const lat = location.lat && typeof location.lat === 'function' ? location.lat() : location.lat
            const lng = location.lng && typeof location.lng === 'function' ? location.lng() : location.lng

            selectedPlace.value = {
                name: results[0].address_components[0]?.long_name || '選定位置', // 嘗試抓第一個部分當名稱，或是用地址
                address: results[0].formatted_address,
                lat: lat,
                lng: lng,
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
               // AdvancedMarkerElement 使用 position 屬性，舊版 Marker 使用 setPosition() 方法
               if (marker.position !== undefined) {
                 marker.position = center
               } else if (marker.setPosition) {
                 marker.setPosition(center)
               }
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
