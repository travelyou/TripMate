import { API_BASE_URL } from './config'

export async function getProfile(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}`)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取個人檔案失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function addVisitedPlace(uid, placeData) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/visited-places`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(placeData),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '新增去過的地方失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function removeVisitedPlace(uid, id) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/visited-places/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '刪除去過的地方失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function addWishlistItem(uid, item) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ item }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '新增許願球池項目失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function removeWishlistItem(uid, id) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/wishlist/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '刪除許願球池項目失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function updateWishlist(uid, items) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/wishlist`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '更新許願球池失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function addFriend(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friend_uid: friendUid }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '加好友失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function cancelFriendRequest(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friends/${friendUid}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '取消好友請求失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function acceptFriendRequest(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friends/${friendUid}/accept`, {
      method: 'PATCH',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '接受好友請求失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function rejectFriendRequest(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friends/${friendUid}/reject`, {
      method: 'PATCH',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '拒絕好友請求失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function removeFriend(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friends/${friendUid}/remove`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '解除好友關係失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function getFriendRequests(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/friend-requests`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '獲取好友請求列表失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function getChatInteractionCount(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-interactions/${friendUid}`)
    if (!response.ok) {
      return { count: 0, remaining: 3, canSend: true }
    }
    const data = await response.json()
    return data
  } catch (error) {
    return { count: 0, remaining: 3, canSend: true }
  }
}

export async function incrementChatInteraction(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-interactions/${friendUid}/increment`, {
      method: 'POST',
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '記錄對話次數失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function saveChatMessage(uid, friendUid, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-messages/${friendUid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: true,
          message: {
            id: Date.now(),
            sender_uid: uid,
            receiver_uid: friendUid,
            content: content,
            created_at: new Date().toISOString(),
          },
        }
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '保存聊天訊息失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: true,
      message: {
        id: Date.now(),
        sender_uid: uid,
        receiver_uid: friendUid,
        content: content,
        created_at: new Date().toISOString(),
      },
    }
  }
}

export async function getChatMessages(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-messages/${friendUid}`)
    if (!response.ok) {
      if (response.status === 404) {
        return []
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '獲取聊天記錄失敗')
    }
    const data = await response.json()
    return data.messages || []
  } catch (error) {
    return []
  }
}

