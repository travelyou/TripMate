import { API_BASE_URL } from './config'

export async function getMyConversations(uid) {
  const res = await fetch(`${API_BASE_URL}/chat/conversations?uid=${encodeURIComponent(uid)}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '取得聊天室列表失敗')
  return await res.json()
}

export async function createOrGetDm(uid, otherUid) {
  const res = await fetch(`${API_BASE_URL}/chat/dm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, otherUid }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '建立/取得 DM 失敗')
  return await res.json()
}

export async function getMessages(conversationId, uid, before = null, limit = 30) {
  const qs = new URLSearchParams({ uid, limit: String(limit) })
  if (before) qs.set('before', String(before))
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages?${qs.toString()}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '取得訊息失敗')
  return await res.json()
}

export async function sendMessage(conversationId, payload) {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '送訊息失敗')
  return await res.json()
}

export async function markRead(conversationId, payload) {
  const res = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '標記已讀失敗')
  return await res.json()
}
