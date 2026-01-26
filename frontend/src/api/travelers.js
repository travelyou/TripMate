import axios from 'axios'
import { useUserStore } from '@/stores/user'

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

export const createGroupChatRoom = async (name, memberUids) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  try {
    const response = await axios.post(`${API_BASE_URL}/travelers/group-chat-rooms`, {
      user_uid: currentUid,
      name,
      member_uids: memberUids,
    })
    return response.data
  } catch (error) {
    console.error('創建群組聊天室失敗：', error)
    throw error
  }
}

export const getGroupChatRooms = async () => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/travelers/group-chat-rooms`, {
      params: { user_uid: currentUid },
    })
    return response.data
  } catch (error) {
    console.error('獲取群組聊天室列表失敗：', error)
    throw error
  }
}

export const getGroupChatMessages = async (roomId) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.get(`${API_BASE_URL}/travelers/group-chat-rooms/${roomId}/messages`, {
    params: { user_uid: currentUid },
  })
  return response.data
}

export const sendGroupChatMessage = async (roomId, content) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.post(`${API_BASE_URL}/travelers/group-chat-rooms/${roomId}/messages`, {
    user_uid: currentUid,
    sender_name: userStore.currentUser?.name || userStore.currentUser?.nickname || '匿名用戶',
    sender_avatar: userStore.currentUser?.avatar || null,
    content,
  })
  return response.data
}

export const getGroupChatMembers = async (roomId) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.get(`${API_BASE_URL}/travelers/group-chat-rooms/${roomId}/members`, {
    params: { user_uid: currentUid },
  })
  return response.data
}

export const removeGroupChatMember = async (roomId, memberUid) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.post(
    `${API_BASE_URL}/travelers/group-chat-rooms/${roomId}/members/${memberUid}/remove`,
    { user_uid: currentUid },
  )
  return response.data
}

export const addGroupChatMember = async (roomId, memberUid) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.post(
    `${API_BASE_URL}/travelers/group-chat-rooms/${roomId}/members`,
    { user_uid: currentUid, member_uid: memberUid },
  )
  return response.data
}

export const updateGroupChatRoom = async (roomId, payload = {}) => {
  const userStore = useUserStore()
  const currentUid = userStore.currentUser?.uid || userStore.currentUser?.id
  if (!currentUid) {
    throw new Error('User not logged in.')
  }
  const response = await axios.patch(
    `${API_BASE_URL}/travelers/group-chat-rooms/${roomId}`,
    { user_uid: currentUid, ...payload },
  )
  return response.data
}
