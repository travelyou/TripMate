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


  // 格式化時間
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

  // 格式化留言數據
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

  // 將後端數據格式轉換為前端格式
  const transformPost = (post) => {
    return {
      id: post.id,
      author: post.author_nickname || post.author_uid || '匿名用戶',
      author_uid: post.author_uid,
      spiritAnimal: post.author_spirit_animal || '',
      avatar:
        post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_uid}`,
      time: formatTime(post.created_at),
      title: post.title,
      content: post.content,
      image: post.banner || null, // 主要展示圖片（banner）
      banner: post.banner || null, // 封面圖
      image_urls: post.image_urls || [], // 內文圖片陣列
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

  // 從 Firestore 獲取用戶資訊
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

  // 批量獲取用戶資訊並更新貼文
  const enrichPostsWithUserInfo = async (posts) => {
    const uniqueUids = [...new Set(posts.map((p) => p.author_uid).filter(Boolean))]

    const userInfoMap = {}
    await Promise.all(
      uniqueUids.map(async (uid) => {
        const userInfo = await getUserInfoFromFirestore(uid)
        if (userInfo) {
          userInfoMap[uid] = userInfo
        }
      }),
    )

    return posts.map((post) => {
      const userInfo = userInfoMap[post.author_uid]
      if (userInfo) {
        post.author_nickname = userInfo.nickname
        post.author_avatar = userInfo.avatar
        post.author_spirit_animal = userInfo.spiritAnimal
      }
      return post
    })
  }

  // 獲取所有貼文
  const loadDiscussions = async (page = 1, limit = 10, category = null) => {
    loading.value = true
    error.value = null
    try {
      const data = await fetchPosts(page, limit, category)
      discussions.value = data.posts.map(transformPost)
      enrichPostsWithUserInfo(data.posts)
        .then((enrichedPosts) => {
          discussions.value = enrichedPosts.map(transformPost)
        })
        .catch((err) => {
          console.error('loadDiscussions enrich failed:', err)
        })
      return data
    } catch (err) {
      error.value = err.message
      console.error('獲取貼文失敗：', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 獲取單個貼文詳情
  const loadPostById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const post = await fetchPostById(id)

      // 從 Firestore 獲取貼文作者資訊
      if (post.author_uid) {
        const userInfo = await getUserInfoFromFirestore(post.author_uid)
        if (userInfo) {
          post.author_nickname = userInfo.nickname
          post.author_avatar = userInfo.avatar
          post.author_spirit_animal = userInfo.spiritAnimal
        }
      }

      // 從 Firestore 獲取留言作者資訊
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

  // 創建新貼文
  const addPost = async (postData) => {
    try {
      const newPost = await createPost(postData)

      // 從 Firestore 獲取作者資訊
      if (newPost.author_uid) {
        const userInfo = await getUserInfoFromFirestore(newPost.author_uid)
        if (userInfo) {
          newPost.author_nickname = userInfo.nickname
          newPost.author_avatar = userInfo.avatar
          newPost.author_spirit_animal = userInfo.spiritAnimal
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

  // 更新貼文
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

  // 刪除貼文
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
