// src/stores/discussions.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPosts, fetchPostById, createPost, updatePost, deletePost } from '@/api/discussions'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'

export const useDiscussionsStore = defineStore('discussions', () => {
  const discussions = ref([])
  const loading = ref(false)
  const error = ref(null)
  const userInfoCache = new Map()

  // ... (formatTime, formatComments, transformPost, getUserInfoFromFirestore, enrichPostsWithUserInfo 保持不變) ...
  // (為了節省篇幅，中間輔助函式請保留原樣，不要刪除)
  const formatTime = (timestamp) => {
    if (!timestamp) return '剛剛'
    const now = new Date()
    const postTime = new Date(timestamp)
    const diffMs = now - postTime
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays > 0) return `${diffDays}天前`
    if (diffHours > 0) return `${diffHours}小時前`
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins > 0) return `${diffMins}分鐘前`
    return '剛剛'
  }

  const formatComments = (comments) => {
    if (!Array.isArray(comments)) return []
    return comments.map((comment) => ({
      id: comment.id,
      author: comment.author_nickname || comment.author_uid || '匿名用戶',
      author_uid: comment.author_uid,
      avatar:
        comment.author_avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_uid}`,
      time: formatTime(comment.created_at),
      content: comment.content,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
      replies: comment.replies || [],
      created_at: comment.created_at,
    }))
  }

  const transformPost = (post) => {
    // 調試：檢查後端返回的 author_avatar
    console.log(`[transformPost] 處理貼文 ID: ${post.id}, UID: ${post.author_uid}`)
    console.log(`[transformPost] post.author_avatar 值:`, post.author_avatar)
    console.log(`[transformPost] post 物件包含的欄位:`, Object.keys(post))

    if (post.author_uid && post.author_avatar) {
      console.log(
        `[transformPost] ✅ 後端返回 author_avatar for ${post.author_uid}:`,
        post.author_avatar.substring(0, 50) + '...',
      )
    } else if (post.author_uid && !post.author_avatar) {
      console.warn(`[transformPost] ⚠️ 後端沒有返回 author_avatar for ${post.author_uid}`)
      console.warn(`[transformPost] ⚠️ post 物件的完整內容:`, JSON.stringify(post, null, 2))
    }

    return {
      id: post.id,
      author: post.author_nickname || post.author_name || '匿名用戶',
      author_uid: post.author_uid,
      spiritAnimal: post.author_spirit_animal || '',
      // 後端返回的 author_avatar 是 Firebase Storage URL（從 Neon 資料庫的 users.avatar 欄位）
      avatar:
        post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_uid}`,
      time: formatTime(post.created_at),
      title: post.title,
      content: post.content,
      image: post.banner || null,
      banner: post.banner || null,
      image_urls: post.image_urls || [],
      likes: post.likes_count || post.likes || 0,
      comments:
        post.comments_count || post.comments || (post.commentsData ? post.commentsData.length : 0),
      tags: post.tags || [],
      commentsData: formatComments(post.commentsData || []),
      board: post.board || 'discussion',
      category: post.category,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }
  }

  const getUserInfoFromFirestore = async (uid) => {
    if (!uid) return null
    if (userInfoCache.has(uid)) return userInfoCache.get(uid)
    try {
      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const data = userDoc.data()
        userInfoCache.set(uid, data)
        return data
      }
    } catch (error) {
      console.error(`獲取用戶 ${uid} 資訊失敗：`, error)
    }
    return null
  }

  const enrichPostsWithUserInfo = async (posts) => {
    console.log('[enrichPostsWithUserInfo] 開始處理，貼文數量:', posts.length)
    const uniqueUids = [...new Set(posts.map((p) => p.author_uid).filter(Boolean))]
    const userInfoMap = {}
    await Promise.all(
      uniqueUids.map(async (uid) => {
        const userInfo = await getUserInfoFromFirestore(uid)
        if (userInfo) {
          userInfoMap[uid] = userInfo
          console.log(`[enrichPostsWithUserInfo] 從 Firestore 獲取 UID ${uid} 的資料:`, {
            nickname: userInfo.nickname,
            hasAvatar: !!userInfo.avatar,
            avatarPreview: userInfo.avatar ? userInfo.avatar.substring(0, 50) + '...' : 'NULL',
          })
        } else {
          console.warn(`[enrichPostsWithUserInfo] Firestore 中沒有 UID ${uid} 的資料`)
        }
      }),
    )
    return posts.map((post) => {
      const userInfo = userInfoMap[post.author_uid]
      if (userInfo) {
        // 優先使用後端返回的資料（從 Neon 資料庫獲取的 Firebase Storage URL）
        // 只有在後端沒有返回時，才使用 Firestore 的資料
        if (!post.author_nickname) {
          post.author_nickname = userInfo.nickname
        }
        // 如果後端沒有返回 author_avatar，使用 Firestore 的資料作為備用
        if (!post.author_avatar && userInfo.avatar) {
          console.log(
            `[enrichPostsWithUserInfo] ✅ 使用 Firestore 備用頭貼 for ${post.author_uid}:`,
            userInfo.avatar.substring(0, 50) + '...',
          )
          post.author_avatar = userInfo.avatar
        } else if (!post.author_avatar && !userInfo.avatar) {
          console.warn(
            `[enrichPostsWithUserInfo] ⚠️ UID ${post.author_uid} 在後端和 Firestore 都沒有頭貼`,
          )
        }
        if (!post.author_spirit_animal) {
          post.author_spirit_animal = userInfo.spiritAnimal
        }
      } else {
        console.warn(`[enrichPostsWithUserInfo] ⚠️ 找不到 UID ${post.author_uid} 的用戶資訊`)
      }
      return post
    })
  }

  const loadDiscussions = async (params = {}, isLoadMore = false) => {
    loading.value = true
    error.value = null
    try {
      const data = await fetchPosts(params)

      const newPosts = data.posts.map(transformPost)

      enrichPostsWithUserInfo(data.posts)
        .then((enrichedPosts) => {
          const transformedEnriched = enrichedPosts.map(transformPost)

          if (isLoadMore) {
            transformedEnriched.forEach((updatedPost) => {
              const target = discussions.value.find((p) => p.id === updatedPost.id)
              if (target) {
                Object.assign(target, updatedPost)
              }
            })
          } else {
            discussions.value = transformedEnriched
          }
        })
        .catch((err) => {
          console.error('loadDiscussions enrich failed:', err)
        })

      // ★ 核心邏輯：附加還是覆蓋？
      if (isLoadMore) {
        discussions.value = [...discussions.value, ...newPosts]
      } else {
        discussions.value = newPosts
      }

      return data
    } catch (err) {
      error.value = err.message
      console.error('獲取貼文失敗：', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ... (其餘 Actions: loadPostById, addPost, editPost, removePost 保持不變) ...
  const loadPostById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const post = await fetchPostById(id)
      if (post.author_uid) {
        const userInfo = await getUserInfoFromFirestore(post.author_uid)
        if (userInfo) {
          // 只有在後端沒有返回時，才使用 Firestore 的資料
          if (!post.author_nickname) {
            post.author_nickname = userInfo.nickname
          }
          // author_avatar 已經從後端獲取（Firebase Storage URL），不要覆蓋
          // if (!post.author_avatar) {
          //   post.author_avatar = userInfo.avatar
          // }
          if (!post.author_spirit_animal) {
            post.author_spirit_animal = userInfo.spiritAnimal
          }
        }
      }
      if (post.commentsData && Array.isArray(post.commentsData)) {
        const commentUids = [...new Set(post.commentsData.map((c) => c.author_uid).filter(Boolean))]
        const commentUserInfoMap = {}
        await Promise.all(
          commentUids.map(async (uid) => {
            const userInfo = await getUserInfoFromFirestore(uid)
            if (userInfo) {
              commentUserInfoMap[uid] = userInfo
            }
          }),
        )
        post.commentsData = post.commentsData.map((comment) => ({
          ...comment,
          author_nickname: commentUserInfoMap[comment.author_uid]?.nickname,
          author_avatar: commentUserInfoMap[comment.author_uid]?.avatar,
          author_spirit_animal: commentUserInfoMap[comment.author_uid]?.spiritAnimal,
        }))
      }
      return transformPost(post)
    } catch (err) {
      error.value = err.message
      console.error('獲取貼文失敗：', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const addPost = async (postData) => {
    try {
      const newPost = await createPost(postData)
      if (newPost.author_uid) {
        const userInfo = await getUserInfoFromFirestore(newPost.author_uid)
        if (userInfo) {
          // 只有在後端沒有返回時，才使用 Firestore 的資料
          if (!newPost.author_nickname) {
            newPost.author_nickname = userInfo.nickname
          }
          // author_avatar 已經從後端獲取（Firebase Storage URL），不要覆蓋
          // if (!newPost.author_avatar) {
          //   newPost.author_avatar = userInfo.avatar
          // }
          if (!newPost.author_spirit_animal) {
            newPost.author_spirit_animal = userInfo.spiritAnimal
          }
        }
      }
      const transformedPost = transformPost(newPost)
      discussions.value.unshift(transformedPost)
      return transformedPost
    } catch (err) {
      console.error('建立貼文失敗：', err)
      throw err
    }
  }

  const editPost = async (id, postData) => {
    try {
      const updatedPost = await updatePost(id, postData)
      const transformedPost = transformPost(updatedPost)
      const index = discussions.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        discussions.value[index] = transformedPost
      }
      return transformedPost
    } catch (err) {
      console.error('更新貼文失敗：', err)
      throw err
    }
  }

  const removePost = async (id) => {
    try {
      await deletePost(id)
      discussions.value = discussions.value.filter((p) => p.id !== id)
    } catch (err) {
      console.error('刪除貼文失敗：', err)
      throw err
    }
  }

  return {
    discussions,
    loading,
    error,
    loadDiscussions,
    loadPostById,
    addPost,
    editPost,
    removePost,
  }
})
