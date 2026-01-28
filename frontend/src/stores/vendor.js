import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getVendorProfile,
  getVendorItineraries,
  getVendorPosts,
  updateVendorProfile as updateVendorProfileAPI,
} from '@/api/vendor'
import { createItinerary as createItineraryApi } from '@/api/vendor'

export const useVendorStore = defineStore('vendor', () => {
  const currentVendor = ref(null)
  const vendorPosts = ref([])
  const vendorItineraries = ref([])
  const vendorReviews = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchVendorProfile = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await getVendorProfile(id)
      if (res.success && res.data && res.data.name !== '預設廠商') {
        currentVendor.value = res.data
      } else {
        currentVendor.value = null
        error.value = '無法讀取廠商資料'
      }
    } catch (err) {
      currentVendor.value = null
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchVendorPosts = async (id) => {
    try {
      if (!id) {
        vendorPosts.value = []
        return
      }
      
      const res = await getVendorPosts(id)
      
      let posts = null
      if (res && res.success !== false) {
        if (Array.isArray(res.data)) {
          posts = res.data
        } else if (res.data && Array.isArray(res.data.data)) {
          posts = res.data.data
        } else if (Array.isArray(res)) {
          posts = res
        } else if (res.posts && Array.isArray(res.posts)) {
          posts = res.posts
        }
      }

      if (Array.isArray(posts) && posts.length > 0) {
        vendorPosts.value = posts.map((item) => ({
          ...item,
          id: item.id,
          title: item.title || '',
          content: item.content || '',
          image: item.image || (Array.isArray(item.image_urls) && item.image_urls[0]) || '',
          image_urls: item.image_urls || [],
          tags: item.tags || [],
          likes: item.likes || 0,
          comments: item.comments || 0,
          time: item.time || item.createdAt || item.created_at,
          createdAt: item.createdAt || item.created_at,
          updatedAt: item.updatedAt || item.updated_at,
        }))
      } else {
        vendorPosts.value = []
      }
    } catch (e) {
      vendorPosts.value = []
      throw e
    }
  }

  const fetchVendorItineraries = async (id, filter = {}) => {
    try {
      if (!id) {
        vendorItineraries.value = []
        return
      }
      
      const res = await getVendorItineraries(id)

      let itineraries = null
      if (res && res.success !== false) {
        if (Array.isArray(res.data)) {
          itineraries = res.data
        } else if (res.data && Array.isArray(res.data.data)) {
          itineraries = res.data.data
        } else if (Array.isArray(res)) {
          itineraries = res
        } else if (res.itineraries && Array.isArray(res.itineraries)) {
          itineraries = res.itineraries
        }
      }

      if (Array.isArray(itineraries) && itineraries.length > 0) {
        let result = itineraries.map((item) => ({
          ...item,
          id: item.id,
          name: item.name || item.title,
          title: item.title || item.name,
          category: item.category,
          region: item.region || item.location,
          location: item.location || item.region,
          coverImage: item.coverImage || item.image || item.banner_image,
          image: item.image || item.coverImage || item.banner_image,
          banner_image: item.banner_image || item.image || item.coverImage,
          durationDays: item.durationDays || item.days,
          days: item.days || item.durationDays,
          price: item.price || 0,
          tags: item.tags || [],
          rating: item.rating || 0,
          reviewCount: item.reviewCount || 0,
        }))
        
        if (filter.region && filter.region !== '全部') {
          result = result.filter((item) => (item.category || item.region) === filter.region)
        }
        vendorItineraries.value = result
      } else {
        vendorItineraries.value = []
      }
    } catch (e) {
      vendorItineraries.value = []
      throw e
    }
  }

  const fetchVendorReviews = async () => {
    vendorReviews.value = []
  }

  const updateVendorProfile = async (vendorId, profileData) => {
    error.value = null
    try {
      const res = await updateVendorProfileAPI(vendorId, profileData)

      if (!res.success) {
        throw new Error(res.message || '更新失敗')
      }

      if (res.data) {
        const updatedVendor = {
          ...res.data,
          bannerImage: res.data.bannerImage || res.data.banner_image || '',
          regionTags: res.data.regionTags || res.data.region_tags || [],
          isBannerVisible: res.data.isBannerVisible !== undefined ? res.data.isBannerVisible : res.data.is_banner_visible,
          reviewCount: res.data.reviewCount || res.data.review_count || 0,
          isVerified: res.data.isVerified !== undefined ? res.data.isVerified : res.data.is_verified,
        }
        if (updatedVendor.banner_image) delete updatedVendor.banner_image
        if (updatedVendor.region_tags) delete updatedVendor.region_tags
        if (updatedVendor.is_banner_visible !== undefined) delete updatedVendor.is_banner_visible
        if (updatedVendor.review_count !== undefined) delete updatedVendor.review_count
        if (updatedVendor.is_verified !== undefined) delete updatedVendor.is_verified

        currentVendor.value = updatedVendor
      }

      return { success: true, data: res.data }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const createItinerary = async (vendorId, itineraryData) => {
    loading.value = true
    try {
      const res = await createItineraryApi(vendorId, itineraryData)

      if (!res.success) {
        throw new Error(res.message || '發布失敗')
      }

      const newItinerary = {
        id: res.id,
        name: itineraryData.title,
        title: itineraryData.title,
        image: itineraryData.coverImage || 'https://picsum.photos/400/300?random=new',
        price: itineraryData.price,
        days: itineraryData.durationDays,
        rating: 0,
        reviewCount: 0,
        region: '最新發布',
        tags: itineraryData.tags || ['新行程'],
        highlights: [],
      }

      vendorItineraries.value.unshift(newItinerary)

      return { success: true, data: newItinerary }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateItinerary = async (itineraryId, itineraryData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const index = vendorItineraries.value.findIndex((i) => i.id === itineraryId)
      if (index !== -1) {
        vendorItineraries.value[index] = {
          ...vendorItineraries.value[index],
          ...itineraryData,
        }
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteItinerary = async (itineraryId) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      vendorItineraries.value = vendorItineraries.value.filter((i) => i.id !== itineraryId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPost = async (vendorId, postData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const mockRes = { success: true, id: Date.now() }

      const newPost = {
        id: mockRes.id,
        title: postData.title,
        content: postData.content,
        image: postData.image || 'https://picsum.photos/600/400?random=newpost',
        likes: 0,
        collects: 0,
        comments: 0,
        time: new Date().toISOString().split('T')[0],
        tags: postData.tags || [],
      }

      vendorPosts.value.unshift(newPost)

      return { success: true, data: newPost }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePost = async (postId, postData) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const index = vendorPosts.value.findIndex((p) => p.id === postId)
      if (index !== -1) {
        vendorPosts.value[index] = {
          ...vendorPosts.value[index],
          ...postData,
        }
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePost = async (postId) => {
    loading.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      vendorPosts.value = vendorPosts.value.filter((p) => p.id !== postId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const uploadVendorImage = async (file, type = 'avatar') => {
    try {
      const { uploadImage } = await import('@/api/storage')

      const folder = type === 'avatar' ? 'vendor-avatars' : 'vendor-banners'

      const downloadURL = await uploadImage(file, folder)

      return downloadURL
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    currentVendor,
    vendorPosts,
    vendorItineraries,
    vendorReviews,
    loading,
    error,
    fetchVendorProfile,
    fetchVendorPosts,
    fetchVendorItineraries,
    fetchVendorReviews,
    updateVendorProfile,
    createItinerary,
    createPost,
    updateItinerary,
    deleteItinerary,
    updatePost,
    deletePost,
    uploadVendorImage,
  }
})
