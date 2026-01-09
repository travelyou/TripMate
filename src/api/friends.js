import { API_BASE_URL } from './config'

export async function getFriends(uid) {
  const res = await fetch(`${API_BASE_URL}/friends?uid=${encodeURIComponent(uid)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.details || '取得好友列表失敗')
  }
  return await res.json() // { friends: [{uid,nickname,avatar}] }
}

export async function addFriend(uid, friendUid) {
  const res = await fetch(`${API_BASE_URL}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, friendUid }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.details || '新增好友失敗')
  }
  return await res.json() // { ok: true }
}


