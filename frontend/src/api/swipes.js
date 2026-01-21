import { API_BASE_URL } from './config'

export async function likeSwipe(uid, targetUid) {
  try {
    const response = await fetch(`${API_BASE_URL}/swipes/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, target_uid: targetUid }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.message || '抽卡喜歡失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('抽卡喜歡錯誤：', error)
    throw error
  }
}

