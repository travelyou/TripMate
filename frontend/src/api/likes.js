import { API_BASE_URL } from './config'
import { auth } from '@/firebase/config'

const LIKE_DEBOUNCE_MS = 200
const pendingMap = new Map()
const stateCache = new Map()

const getLikeKey = (postId, authorUid, board) => `${board}:${postId}:${authorUid || ''}`

export const buildLikeKey = getLikeKey

const emitLikesUpdated = (key, liked, likesCount) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('likes-updated', { detail: { key, liked, likesCount } }))
}

const updateCache = (key, data) => {
  if (!data) return
  const { liked, likesCount } = data
  if (typeof liked === 'boolean' && Number.isFinite(likesCount)) {
    stateCache.set(key, { liked, likesCount })
    emitLikesUpdated(key, liked, likesCount)
  }
}

export const seedLikeState = (
  postId,
  authorUid,
  board,
  state = {},
  options = { overwrite: false },
) => {
  if (!postId || !board) return
  const key = getLikeKey(postId, authorUid, board)
  if (!options.overwrite && stateCache.has(key)) return
  const liked = typeof state.liked === 'boolean' ? state.liked : false
  const likesCount = Number.isFinite(state.likesCount) ? state.likesCount : null
  if (likesCount === null) return
  updateCache(key, { liked, likesCount })
}

const getCachedState = (key) => stateCache.get(key) || { liked: false, likesCount: 0 }

const getOptimisticNext = (key) => {
  const current = getCachedState(key)
  const nextLiked = !current.liked
  const nextCount = Math.max(0, (current.likesCount || 0) + (nextLiked ? 1 : -1))
  return { liked: nextLiked, likesCount: nextCount }
}

const sendToggleLikeNow = async (postId, authorUid, board, options = {}) => {
  console.log('[Likes API] toggleLike 開始')
  console.log('[Likes API] 參數:', { postId, authorUid, board })

  const url = `${API_BASE_URL}/likes`
  console.log('[Likes API] 請求 URL:', url)

  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
      console.log('[Likes API] 已獲取認證 token')
    } catch (tokenError) {
      console.warn('[Likes API] 獲取 token 失敗:', tokenError)
    }
  }

  const payload = {
    post_id: postId,
    author_uid: authorUid,
    board: board,
  }
  console.log('[Likes API] Payload:', payload)

  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: !!options.keepalive,
  })

  console.log('[Likes API] HTTP 狀態:', response.status, response.statusText)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
    console.error('[Likes API] 錯誤響應:', errorData)
    throw new Error(errorData.error || errorData.details || '按讚操作失敗')
  }

  const data = await response.json()
  console.log('[Likes API] 成功響應:', data)
  return data
}

const flushPendingLike = async (key, force = false, options = {}) => {
  const pending = pendingMap.get(key)
  if (!pending) return

  if (pending.timer) clearTimeout(pending.timer)
  pendingMap.delete(key)

  const shouldCallApi = force || pending.count % 2 === 1
  if (!shouldCallApi) return

  try {
    const result = await sendToggleLikeNow(
      pending.postId,
      pending.authorUid,
      pending.board,
      options,
    )
    updateCache(key, result)
  } catch (error) {
    console.error('[Likes API] flush 失敗:', error)
  }
}

const scheduleFlush = (key) => {
  const pending = pendingMap.get(key)
  if (!pending) return
  if (pending.timer) clearTimeout(pending.timer)
  pending.timer = setTimeout(() => {
    flushPendingLike(key, false)
  }, LIKE_DEBOUNCE_MS)
}

const flushAllPending = (options = {}) => {
  pendingMap.forEach((_, key) => {
    flushPendingLike(key, true, options)
  })
}

export const flushPendingLikesNow = (options = {}) => {
  flushAllPending(options)
}

if (typeof window !== 'undefined') {
  const handleFlush = () => flushAllPending({ keepalive: true })

  window.addEventListener('pagehide', handleFlush)
  window.addEventListener('beforeunload', handleFlush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleFlush()
    }
  })
}

// 按讚/取消按讚
export async function toggleLike(postId, authorUid, board = 'discussion', options = {}) {
  const key = getLikeKey(postId, authorUid, board)

  if (
    options &&
    (typeof options.currentLiked === 'boolean' || Number.isFinite(options.currentLikesCount))
  ) {
    seedLikeState(
      postId,
      authorUid,
      board,
      {
        liked: typeof options.currentLiked === 'boolean' ? options.currentLiked : false,
        likesCount: Number.isFinite(options.currentLikesCount) ? options.currentLikesCount : 0,
      },
      { overwrite: true },
    )
  }

  const pending = pendingMap.get(key)
  const optimistic = getOptimisticNext(key)
  updateCache(key, optimistic)

  if (pending) {
    pending.count += 1
    scheduleFlush(key)
    return optimistic
  }

  pendingMap.set(key, {
    postId,
    authorUid,
    board,
    count: 1,
    timer: null,
  })
  scheduleFlush(key)

  return optimistic
}

// 獲取貼文的按讚資訊
export async function getLikesInfo(postId, authorUid = null, board = 'discussion') {
  console.log('[Likes API] getLikesInfo 開始')
  console.log('[Likes API] 參數:', { postId, authorUid, board })

  try {
    let url = `${API_BASE_URL}/likes/${postId}?board=${board}`

    if (authorUid) {
      url += `&author_uid=${authorUid}`
    }

    console.log('[Likes API] 請求 URL:', url)

    let token = null
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken()
        console.log('[Likes API] 已獲取認證 token')
      } catch (tokenError) {
        console.warn('[Likes API] 獲取 token 失敗:', tokenError)
      }
    }

    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    })
    console.log('[Likes API] HTTP 狀態:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      console.error('[Likes API] 錯誤響應:', errorData)
      throw new Error(errorData.error || errorData.details || '獲取按讚資訊失敗')
    }

    const data = await response.json()
    console.log('[Likes API] 成功響應:', data)
    const key = getLikeKey(postId, authorUid, board)
    updateCache(key, data)
    return data
  } catch (error) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('404')
    ) {
      console.warn(`獲取按讚資訊失敗，返回默認值。貼文 ID: ${postId}`, error.message)
      const fallback = {
        likesCount: 0,
        isLiked: false,
      }
      if (authorUid) {
        const key = getLikeKey(postId, authorUid, board)
        updateCache(key, { liked: fallback.isLiked, likesCount: fallback.likesCount })
      }
      return fallback
    }

    console.error('獲取按讚資訊錯誤：', error)
    const fallback = {
      likesCount: 0,
      isLiked: false,
    }
    if (authorUid) {
      const key = getLikeKey(postId, authorUid, board)
      updateCache(key, { liked: fallback.isLiked, likesCount: fallback.likesCount })
    }
    return fallback
  }
}
