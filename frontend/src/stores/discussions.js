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
    return {
      id: post.id,
      author: post.author_name || post.author_nickname || post.author_uid || '匿名用戶',
      author_uid: post.author_uid,
      spiritAnimal: post.author_spirit_animal || '',
      avatar: post.author_avatar || null,
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
    } catch {
    }
    return null
  }

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
        if (!post.author_nickname) {
          post.author_nickname = userInfo.nickname
        }
        if (!post.author_avatar && userInfo.avatar) {
          post.author_avatar = userInfo.avatar
        }
        if (!post.author_spirit_animal) {
          post.author_spirit_animal = userInfo.spiritAnimal
        }
      }
      return post
    })
  }

  const loadDiscussions = async (params = {}, isLoadMore = false) => {
    loading.value = true
    error.value = null
    try {
      const data = await fetchPosts(params)
      const enrichedPosts = await enrichPostsWithUserInfo(data.posts || [])
      const transformedEnriched = enrichedPosts.map(transformPost)

      if (isLoadMore) {
        const merged = [...discussions.value]
        transformedEnriched.forEach((post) => {
          const index = merged.findIndex((p) => p.id === post.id)
          if (index !== -1) {
            merged[index] = { ...merged[index], ...post }
          } else {
            merged.push(post)
          }
        })
        discussions.value = merged
      } else {
        discussions.value = transformedEnriched
      }

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadPostById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const post = await fetchPostById(id)

      if (post.author_uid) {
        const userInfo = await getUserInfoFromFirestore(post.author_uid)
        if (userInfo) {
          if (!post.author_nickname) {
            post.author_nickname = userInfo.nickname
          }

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
          if (!newPost.author_nickname) {
            newPost.author_nickname = userInfo.nickname
          }

          if (!newPost.author_spirit_animal) {
            newPost.author_spirit_animal = userInfo.spiritAnimal
          }
        }
      }
      const transformedPost = transformPost(newPost)
      discussions.value.unshift(transformedPost)
      return transformedPost
    } catch (err) {
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
      throw err
    }
  }

  const removePost = async (id) => {
    try {
      await deletePost(id)
      discussions.value = discussions.value.filter((p) => p.id !== id)
    } catch (err) {
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
    transformPost,
  }
})
