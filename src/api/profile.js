import { API_BASE_URL } from './config'

// 獲取用戶完整個人檔案資料
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
    console.error('獲取個人檔案錯誤：', error)
    throw error
  }
}

// 新增去過的地方
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
    console.error('新增去過的地方錯誤：', error)
    throw error
  }
}

// 刪除去過的地方
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
    console.error('刪除去過的地方錯誤：', error)
    throw error
  }
}

// 新增許願球池項目
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
    console.error('新增許願球池項目錯誤：', error)
    throw error
  }
}

// 刪除許願球池項目
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
    console.error('刪除許願球池項目錯誤：', error)
    throw error
  }
}

// 批量更新許願球池
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
    console.error('更新許願球池錯誤：', error)
    throw error
  }
}

// 加好友（發送好友請求）
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
    console.error('加好友錯誤：', error)
    throw error
  }
}

// 取消好友請求
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
    console.error('取消好友請求錯誤：', error)
    throw error
  }
}

// 接受好友請求
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
    console.error('接受好友請求錯誤：', error)
    throw error
  }
}

// 拒絕好友請求
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
    console.error('拒絕好友請求錯誤：', error)
    throw error
  }
}

// 獲取好友請求列表
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
    console.error('獲取好友請求列表錯誤：', error)
    throw error
  }
}

// 獲取對話次數
export async function getChatInteractionCount(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-interactions/${friendUid}`)
    if (!response.ok) {
      // 如果失敗，返回允許發送
      return { count: 0, remaining: 3, canSend: true }
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('獲取對話次數錯誤：', error)
    return { count: 0, remaining: 3, canSend: true }
  }
}

// 增加對話次數
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
    console.error('增加對話次數錯誤：', error)
    throw error
  }
}

// 保存聊天消息
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
      // 如果是 404，可能是路由未註冊或表不存在，返回一個模擬的成功響應
      if (response.status === 404) {
        console.warn('保存聊天消息：路由可能未註冊，消息不會持久化')
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
      throw new Error(errorData.error || errorData.message || '保存聊天消息失敗')
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('保存聊天消息錯誤：', error)
    // 即使保存失敗，也返回一個模擬響應，讓前端可以繼續顯示消息
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

// 獲取聊天記錄
export async function getChatMessages(uid, friendUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${uid}/chat-messages/${friendUid}`)
    if (!response.ok) {
      // 如果是 404，可能是表不存在或路由未註冊，返回空數組
      if (response.status === 404) {
        console.warn('獲取聊天記錄：表可能不存在或路由未註冊，返回空數組')
        return []
      }
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '獲取聊天記錄失敗')
    }
    const data = await response.json()
    return data.messages || []
  } catch (error) {
    console.error('獲取聊天記錄錯誤：', error)
    // 即使出錯也返回空數組，不影響用戶體驗
    return []
  }
}

