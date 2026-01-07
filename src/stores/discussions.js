// src/stores/discussions.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPosts, fetchPostById, createPost, updatePost, deletePost } from '@/api/posts'

// --- 輔助數據：旅遊人格 ---
const travelPersonalities = [
  { emoji: '🦁', label: '樂天派' },
  { emoji: '🦉', label: '觀察家' },
  { emoji: '🦅', label: '冒險王' },
  { emoji: '🐺', label: '獨行者' },
  { emoji: '🐧', label: '慢活者' },
  { emoji: '🦊', label: '藝術家' },
  { emoji: '🐼', label: '美食家' },
  { emoji: '🦋', label: '追夢人' },
  { emoji: '🐢', label: '佛系派' },
  { emoji: '🐬', label: '交際花' },
]

export const useDiscussionsStore = defineStore('discussions', () => {
  // --- 貼文資料（從 API 獲取） ---
  const discussions = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 將後端數據格式轉換為前端格式
  const transformPost = (post) => {
    // 格式化時間（將 timestamp 轉換為 "X小時前" 格式）
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
      image: post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null, // 取第一張圖片
      image_urls: post.image_urls || [],
      likes: post.likes_count || post.likes || 0, // 從資料庫獲取按讚數
      comments:
        post.comments_count || post.comments || (post.commentsData ? post.commentsData.length : 0),
      tags: post.tags || [],
      commentsData: formatComments(post.commentsData || []), // 格式化留言數據
      board: post.board,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }
  }

  const getUserInfoFromFirestore = async (uid) => {
    return null
  }

  // 批量獲取用戶資訊並更新貼文
  const enrichPostsWithUserInfo = async (posts) => {
    // 暫時直接回傳原始貼文，不進行豐富化
    return posts
  }

  // 獲取所有貼文
  const loadDiscussions = async (page = 1, limit = 10) => {
    loading.value = true
    error.value = null
    try {
      const data = await fetchPosts(page, limit)
      // 暫時跳過 enrichment
      const enrichedPosts = await enrichPostsWithUserInfo(data.posts)
      discussions.value = enrichedPosts.map(transformPost)
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
      // 暫時移除詳細資料 enrichment 邏輯，直接回傳
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
      // 暫時移除 enrichment
      const transformedPost = transformPost(newPost)
      discussions.value.unshift(transformedPost) // 添加到開頭
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
