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
  const url = `${API_BASE_URL}/likes`

  let token = null
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
    } catch (tokenError) {
    }
  }

  const payload = {
    post_id: postId,
    author_uid: authorUid,
    board: board,
  }

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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
    throw new Error(errorData.error || errorData.details || '按讚操作失敗')
  }

  const data = await response.json()
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

export async function getLikesInfo(postId, authorUid = null, board = 'discussion') {
  try {
    let url = `${API_BASE_URL}/likes/${postId}?board=${board}`

    if (authorUid) {
      url += `&author_uid=${authorUid}`
    }

    let token = null
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken()
      } catch (tokenError) {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '未知錯誤' }))
      throw new Error(errorData.error || errorData.details || '獲取按讚資訊失敗')
    }

    const data = await response.json()
    const key = getLikeKey(postId, authorUid, board)
    updateCache(key, data)
    return data
  } catch (error) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('404')
    ) {
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
