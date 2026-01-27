import axios from 'axios'
import { auth } from '@/firebase/config'
import { API_BASE_URL } from './config'

// 取得所有精選行程 (列表用)
export const getItineraries = async (filters = {}) => {
  try {
    // 這裡傳送 query string 給後端進行篩選
    const response = await axios.get(`${API_BASE_URL}/itineraries`, { params: filters })
    return response.data
  } catch (error) {
    console.error('Error fetching itineraries:', error)
    return { success: false, data: [] }
  }
}

// 後端：GET /api/itineraries?ids=1,2,3
export const fetchItinerariesByIds = async (ids = []) => {
  const cleanIds = (ids || []).map((x) => Number(x)).filter(Number.isInteger)
  const qs = cleanIds.length ? `?ids=${cleanIds.join(',')}` : ''
  const { data } = await axios.get(`${API_BASE_URL}/itineraries${qs}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itineraries failed')
  return data.items || []
}

// 後端：GET /api/itineraries/:id
export const fetchItineraryById = async (id) => {
  const iid = Number(id)
  if (!Number.isInteger(iid)) throw new Error('id is invalid')
  const { data } = await axios.get(`${API_BASE_URL}/itineraries/${iid}`)
  if (!data?.ok) throw new Error(data?.message || 'fetch itinerary failed')
  return data.item
}

// 取得單一行程詳細資料 (包含 days 和 packingList)
export const getItineraryById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/itineraries/${id}`)
    return response.data

    /* --- 如果後端還沒好，可以使用下方的 Mock 資料測試 --- */
    /*
    return {
      success: true,
      data: {
        id: id,
        title: '京都深度五日遊 (Mock)',
        description: '這是一個測試用的假資料，包含完整的每日行程與打包清單。',
        price: 28900,
        agencyName: '開心旅行社',
        durationDays: 5,
        coverImage: 'https://picsum.photos/800/600',
        tags: ['日本', '古蹟', '美食'],
        totalViews: 120,
        totalSaves: 45,
        // 對應 itinerary_days 表
        itinerary: {
          days: [
            { day: 1, activities: [{ time: '10:00', title: '抵達關西機場', desc: '搭乘專車前往飯店', icon: 'map-pin' }] },
            { day: 2, activities: [{ time: '09:00', title: '清水寺', desc: '參觀世界遺產', icon: 'camera' }] }
          ]
        },
        // 對應 itinerary_packing_lists 表
        packingList: [
          { category: '證件類', items: [{ name: '護照', checked: false }, { name: '簽證', checked: false }] }
        ]
      }
    }
    */
  } catch (error) {
    console.error(`Error fetching itinerary ${id}:`, error)
    return { success: false, message: '無法讀取行程資料' }
  }
}

// 新增行程 (給 ItineraryPostModal 使用)
export const createItinerary = async (payload) => {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

    console.log('📤 [API] 發送創建行程請求:', {
      url: `${API_BASE_URL}/itineraries`,
      payload: { ...payload, coverImage: payload.coverImage ? '有圖片' : '無圖片' }
    })

    // 根據你的 CSV 結構，後端需要接收 itinerary (days) 和 packingList
    // payload 應該包含: title, price, ... itinerary: { days: [] }, packingList: []

    const response = await axios.post(`${API_BASE_URL}/itineraries`, payload, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })

    console.log('📥 [API] 創建行程回應:', response.data)

    // 處理後端返回格式：{ success: true, id: xxx } 或 { success: true, data: {...} }
    const result = response.data
    if (result.success || result.id) {
      return { success: true, id: result.id, data: result.data || result }
    }

    return result
  } catch (error) {
    console.error('❌ [API] 創建行程錯誤:', error)
    console.error('錯誤詳情:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    return { 
      success: false, 
      message: error.response?.data?.message || error.message || '建立失敗' 
    }
  }
}

// 更新行程
export const updateItinerary = async (id, payload) => {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
    const response = await axios.put(`${API_BASE_URL}/itineraries/${id}`, payload, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
    return response.data
  } catch (error) {
    console.error('Error updating itinerary:', error)
    return { success: false, message: error.response?.data?.message || '更新失敗' }
  }
}
