import axios from 'axios'

import { API_BASE_URL } from './config'

export const getTravelers = async (filters = {}) => {
  try {
    const params = new URLSearchParams()
    if (filters.author_uid) params.append('author_uid', filters.author_uid)
    if (filters.status) params.append('status', filters.status)
    if (filters.location) params.append('location', filters.location)
    if (filters.category) params.append('category', filters.category)
    if (filters.limit) params.append('limit', filters.limit)

    if (filters.offset !== undefined) {
      params.append('offset', filters.offset)
    } else if (filters.page && filters.limit) {
      const pageNum = Number(filters.page) || 1
      const limitNum = Number(filters.limit) || 20
      const offset = Math.max(0, (pageNum - 1) * limitNum)
      params.append('offset', offset)
    }

    const response = await axios.get(`${API_BASE_URL}/travelers?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('獲取旅伴列表失敗：', error)
    throw error
  }
}

export const getTravelerById = async (id, userUid = null) => {
  try {
    const params = userUid ? `?user_uid=${userUid}` : ''
    const response = await axios.get(`${API_BASE_URL}/travelers/${id}${params}`)
    return response.data
  } catch (error) {
    console.error('獲取旅伴詳情失敗：', error)
    throw error
  }
}

export const incrementView = async (id) => {
  try {
    await axios.post(`${API_BASE_URL}/travelers/${id}/view`)
  } catch (error) {
    console.error('更新瀏覽次數失敗（靜默失敗）:', error)
  }
}

export const createTraveler = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/travelers`, data)
    return response.data
  } catch (error) {
    console.error('建立旅伴貼文失敗：', error)
    throw error
  }
}

export const updateTraveler = async (id, data) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/travelers/${id}`, data)
    return response.data
  } catch (error) {
    console.error('更新旅伴貼文失敗：', error)
    throw error
  }
}

export const deleteTraveler = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/travelers/${id}`)
    return response.data
  } catch (error) {
    console.error('刪除旅伴貼文失敗：', error)
    throw error
  }
}

// 提交報名
export const submitApplication = async (travelerId, message) => {
  try {
    const { auth } = await import('@/firebase/config')
    const user = auth.currentUser
    if (!user) throw new Error('請先登入')

    const { useUserStore } = await import('@/stores/user')
    const userStore = useUserStore()

    const response = await axios.post(`${API_BASE_URL}/travelers/${travelerId}/applications`, {
      message,
      author_uid: user.uid,
      author_name: userStore.currentUser?.name || userStore.currentUser?.nickname || '匿名用戶',
      author_avatar: userStore.currentUser?.avatar || null,
    })
    return response.data
  } catch (error) {
    console.error('提交報名失敗：', error)
    throw error
  }
}

// 獲取報名列表（作者）
export const getApplications = async (travelerId) => {
  try {
    const { auth } = await import('@/firebase/config')
    const user = auth.currentUser
    if (!user) throw new Error('請先登入')

    const response = await axios.get(
      `${API_BASE_URL}/travelers/${travelerId}/applications?user_uid=${user.uid}`,
    )
    return response.data
  } catch (error) {
    console.error('獲取報名列表失敗：', error)
    throw error
  }
}

// 接受报名
export const acceptApplication = async (travelerId, applicationId) => {
  try {
    const { auth } = await import('@/firebase/config')
    const user = auth.currentUser
    if (!user) throw new Error('請先登入')

    const response = await axios.post(
      `${API_BASE_URL}/travelers/${travelerId}/applications/${applicationId}/accept`,
      { user_uid: user.uid },
    )
    return response.data
  } catch (error) {
    console.error('接受報名失敗：', error)
    throw error
  }
}

// 拒绝报名
// 獲取用戶的群組聊天室列表
export const getGroupChatRooms = async () => {
  const userStore = useUserStore()
  if (!userStore.currentUser?.uid) {
    throw new Error('User not logged in.')
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/travelers/group-chat-rooms`, {
      params: { user_uid: userStore.currentUser.uid },
    })
    return response.data
  } catch (error) {
    console.error('獲取群組聊天室列表失敗：', error)
    throw error
  }
}

export const rejectApplication = async (travelerId, applicationId) => {
  try {
    const { auth } = await import('@/firebase/config')
    const user = auth.currentUser
    if (!user) throw new Error('請先登入')

    const response = await axios.post(
      `${API_BASE_URL}/travelers/${travelerId}/applications/${applicationId}/reject`,
      { user_uid: user.uid },
    )
    return response.data
  } catch (error) {
    console.error('拒絕報名失敗：', error)
    throw error
  }
}
