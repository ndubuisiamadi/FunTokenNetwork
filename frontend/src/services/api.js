// src/services/api.js - UPDATED WITH USERS ENDPOINTS
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

const searchUsers = async (query, filters = {}) => {
  const params = new URLSearchParams({
    q: query,
    ...filters
  })
  
  return await api.get(`/leaderboard/search?${params}`)
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      
      // Redirect to login (if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // Add these new email verification endpoints
  verifyEmail: (emailData) => api.post('/auth/verify-email', emailData),
  resendVerificationCode: (emailData) => api.post('/auth/resend-verification', emailData),
}

// Users API endpoints - NEW
export const usersAPI = {
  searchUsers: (query, page = 1, limit = 20) => 
    api.get(`/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  getAllUsers: (page = 1, limit = 20) => 
    api.get(`/users?page=${page}&limit=${limit}`),
  getUserById: (userId) => api.get(`/users/${userId}`),
  getUserPosts: (userId, page = 1, limit = 10) => 
    api.get(`/users/${userId}/posts?page=${page}&limit=${limit}`)
}

// Posts API endpoints  
export const postsAPI = {
  getFeed: (page = 1, limit = 10) => api.get(`/posts/feed?page=${page}&limit=${limit}`),
  createPost: (postData) => api.post('/posts', postData),
  getPost: (postId) => api.get(`/posts/${postId}`),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  unlikePost: (postId) => api.delete(`/posts/${postId}/like`),
  searchPosts: (query, page = 1, limit = 20) => 
    api.get(`/posts/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
}

// Comments API endpoints
export const commentsAPI = {
  // Get comments for a post with sorting
  getComments: (postId, page = 1, limit = 20, sortBy = 'top') => 
    api.get(`/comments/posts/${postId}/comments?page=${page}&limit=${limit}&sortBy=${sortBy}`),
  
  // Get replies for a specific comment
  getReplies: (commentId, page = 1, limit = 10) =>
    api.get(`/comments/comments/${commentId}/replies?page=${page}&limit=${limit}`),
  
  // Create a new comment
  createComment: (postId, content, parentId = null) =>
    api.post(`/comments/posts/${postId}/comments`, { 
      content, 
      ...(parentId && { parentId }) 
    }),
  
  // Like a comment
  likeComment: (commentId) =>
    api.post(`/comments/comments/${commentId}/like`),
  
  // Unlike a comment
  unlikeComment: (commentId) =>
    api.delete(`/comments/comments/${commentId}/like`),
  
  // Update a comment
  updateComment: (commentId, content) =>
    api.put(`/comments/comments/${commentId}`, { content }),
  
  // Delete a comment
  deleteComment: (commentId) =>
    api.delete(`/comments/comments/${commentId}`)
}

// Friends API endpoints
export const friendsAPI = {
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  respondToRequest: (requestId, action) => api.put(`/friends/request/${requestId}`, { action }),
  cancelRequest: (requestId) => api.delete(`/friends/request/${requestId}`),
  getFriends: (userId) => api.get(userId ? `/friends/list/${userId}` : '/friends/list'),
  getRequests: (type = 'received') => api.get(`/friends/requests?type=${type}`),
  checkStatus: (userId) => api.get(`/friends/status/${userId}`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
  getFriendsList: () => api.get('/friends/list'),
  getFriendsForChat: () => api.get('/friends/chat')
}

// Messages API endpoints
export const messagesAPI = {
  // Conversations
  getConversations: (page = 1, limit = 20) => api.get(`/messages/conversations?page=${page}&limit=${limit}`),
  createConversation: (data) => api.post('/messages/conversations', data),
  getConversation: (conversationId) => api.get(`/messages/conversations/${conversationId}`),
  updateConversation: (conversationId, data) => api.put(`/messages/conversations/${conversationId}`, data),
  leaveConversation: (conversationId) => api.delete(`/messages/conversations/${conversationId}/leave`),
  searchConversations: (query) => api.get(`/messages/conversations/search?q=${encodeURIComponent(query)}`),
  
  // Messages
  getMessages: (conversationId, page = 1, limit = 50) => 
    api.get(`/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (conversationId, messageData) => 
    api.post(`/messages/conversations/${conversationId}/messages`, messageData),
  markAsRead: (conversationId) => api.put(`/messages/conversations/${conversationId}/read`),
  getTotalUnreadCount: () => api.get('/messages/unread-count'),
  
  // Participants
  addParticipants: (conversationId, participantIds) => 
    api.post(`/messages/conversations/${conversationId}/participants`, { participantIds }),
  removeParticipant: (conversationId, userId) => 
    api.delete(`/messages/conversations/${conversationId}/participants/${userId}`),
  
  // Media & Other
  uploadMedia: (formData) => {
    return api.post('/messages/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getOnlineUsers: () => api.get('/messages/users/online'),

 // 🔥 ENHANCED: Update message status with better error handling
  updateMessageStatus: (messageId, status) => 
    api.put(`/messages/${messageId}/status`, { status }),
  
  // 🔥 ENHANCED: Bulk update conversation message status
  updateConversationMessageStatus: (conversationId, status, messageIds = null) => 
    api.put(`/messages/conversations/${conversationId}/messages/status`, { 
      status, 
      ...(messageIds && { messageIds }) 
    }),
}

// Upload API endpoints
export const uploadAPI = {
  uploadMedia: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('media', file))
    return api.post('/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadAvatar: (fileOrFormData) => {
    // Handle both file and FormData inputs
    let formData
    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData
    } else {
      formData = new FormData()
      formData.append('avatar', fileOrFormData)
    }
    
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Leaderboard API endpoints  
export const leaderboardAPI = {
  getLeaderboard: (params = {}) => api.get('/leaderboard', { params }),
  getUserRankInfo: () => api.get('/leaderboard/me'),
  getTopAchievers: (limit = 5) => api.get('/leaderboard/top', { params: { limit } }),
  getLevelDistribution: () => api.get('/leaderboard/stats'),
  searchUsers
}

// Communities API endpoints - NEW
export const communitiesAPI = {
  // Get all communities (explore page)
  getAllCommunities: (page = 1, limit = 20) => 
    api.get(`/communities?page=${page}&limit=${limit}`),
  
  // Search communities
  searchCommunities: (query, page = 1, limit = 20) => 
    api.get(`/communities/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  
  // Get user's communities (joined/owned/admin)
  getUserCommunities: (filter = '', page = 1, limit = 20) => 
    api.get(`/communities/my?filter=${filter}&page=${page}&limit=${limit}`),
  
  // Create community
  createCommunity: (communityData) => api.post('/communities', communityData),
  
  // Get specific community
  getCommunity: (communityId) => api.get(`/communities/${communityId}`),
  
  // Update community
  updateCommunity: (communityId, updateData) => api.put(`/communities/${communityId}`, updateData),
  
  // Delete community
  deleteCommunity: (communityId) => api.delete(`/communities/${communityId}`),
  
  // Join community
  joinCommunity: (communityId) => api.post(`/communities/${communityId}/join`),
  
  // Leave community
  leaveCommunity: (communityId) => api.delete(`/communities/${communityId}/leave`),
  
  // Get community members
  getCommunityMembers: (communityId, page = 1, limit = 20) => 
    api.get(`/communities/${communityId}/members?page=${page}&limit=${limit}`),
  
  // Update member role
  updateMemberRole: (communityId, userId, role) => 
    api.put(`/communities/${communityId}/members/${userId}`, { role }),
  
  // Remove member
  removeMember: (communityId, userId) => 
    api.delete(`/communities/${communityId}/members/${userId}`),
  
  // Get community posts
  getCommunityPosts: (communityId, page = 1, limit = 10) => 
    api.get(`/communities/${communityId}/posts?page=${page}&limit=${limit}`)
}

// Tasks API endpoints
export const tasksAPI = {
  // 🔧 Twitter Setup (Existing - keep as is)
  checkTwitterSetup: () => api.get('/tasks/twitter-setup'),
  setupTwitterId: (data) => api.post('/tasks/setup-twitter', data),
  
  // 🆕 ENHANCED: Server-side filtered tasks
  getFilteredTasks: (filters = {}) => {
    // Clean up filters and build query params
    const cleanFilters = {}
    
    // Only include non-empty/non-default values
    if (filters.platform && filters.platform !== 'all') cleanFilters.platform = filters.platform
    if (filters.status && filters.status !== 'all') cleanFilters.status = filters.status
    if (filters.difficulty && filters.difficulty !== 'all') cleanFilters.difficulty = filters.difficulty
    if (filters.search && filters.search.trim()) cleanFilters.search = filters.search.trim()
    if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom
    if (filters.dateTo) cleanFilters.dateTo = filters.dateTo
    if (filters.sortBy) cleanFilters.sortBy = filters.sortBy
    if (filters.sortOrder) cleanFilters.sortOrder = filters.sortOrder
    if (filters.page && filters.page > 1) cleanFilters.page = filters.page
    if (filters.limit && filters.limit !== 20) cleanFilters.limit = filters.limit
    
    const params = new URLSearchParams(cleanFilters)
    return api.get(`/tasks/filtered?${params}`)
  },
  
  // 🆕 ENHANCED: Server-side filtered user tasks  
  getUserTasksFiltered: (filters = {}) => {
    const cleanFilters = {}
    
    if (filters.status && filters.status !== 'all') cleanFilters.status = filters.status
    if (filters.platform && filters.platform !== 'all') cleanFilters.platform = filters.platform
    if (filters.difficulty && filters.difficulty !== 'all') cleanFilters.difficulty = filters.difficulty
    if (filters.search && filters.search.trim()) cleanFilters.search = filters.search.trim()
    if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom
    if (filters.dateTo) cleanFilters.dateTo = filters.dateTo
    if (filters.sortBy) cleanFilters.sortBy = filters.sortBy
    if (filters.sortOrder) cleanFilters.sortOrder = filters.sortOrder
    if (filters.page && filters.page > 1) cleanFilters.page = filters.page
    if (filters.limit && filters.limit !== 20) cleanFilters.limit = filters.limit
    
    const params = new URLSearchParams(cleanFilters)
    return api.get(`/tasks/my-tasks?${params}`)
  },

  // 🔄 LEGACY: Keep existing methods for backward compatibility
  getAvailableTasks: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.platform && filters.platform !== 'all') params.append('platform', filters.platform)
    if (filters.difficulty) params.append('difficulty', filters.difficulty)
    return api.get(`/tasks?${params}`)
  },
  
  getUserTasks: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'all') params.append('status', filters.status)
    return api.get(`/tasks/my-tasks?${params}`)
  },
  
  // 🎯 Task Actions (Existing - keep as is)
  getTaskStatus: (taskId) => api.get(`/tasks/${taskId}/status`),
  startTask: (taskId) => api.post(`/tasks/${taskId}/start`),
  verifyTask: (taskId, submissionData = {}) => 
    api.post(`/tasks/${taskId}/verify`, { submissionData }),
  
  // 👨‍💼 Admin Functions (Existing - keep as is)
  createTask: (taskData) => api.post('/tasks/create', taskData),
  
  // 🔍 System Health (Existing - keep as is)
  checkHealth: () => api.get('/tasks/health'),

  // 🆕 UTILITY: Get available platforms (for filter options)
  getAvailablePlatforms: async () => {
    try {
      const response = await api.get('/tasks/filtered?limit=1')
      return response.data.meta?.platformStats || []
    } catch (error) {
      console.error('Failed to get platforms:', error)
      return []
    }
  },

  // 🆕 UTILITY: Get task statistics (for dashboard)
  getTaskStats: async (userId) => {
    try {
      const [availableResponse, userTasksResponse] = await Promise.all([
        api.get('/tasks/filtered?status=available&limit=1'),
        api.get('/tasks/my-tasks?limit=1')
      ])
      
      return {
        available: availableResponse.data.pagination?.total || 0,
        userTotal: userTasksResponse.data.pagination?.total || 0,
        completed: userTasksResponse.data.stats?.completed || 0,
        inProgress: userTasksResponse.data.stats?.inProgress || 0,
        totalEarnings: userTasksResponse.data.stats?.totalEarnings || 0
      }
    } catch (error) {
      console.error('Failed to get task stats:', error)
      return {
        available: 0,
        userTotal: 0, 
        completed: 0,
        inProgress: 0,
        totalEarnings: 0
      }
    }
  }
}


// Global Search API - Updated to handle standardized backend response
export const searchAPI = {
  // Global search using the backend global search endpoint
  globalSearch: async (query, options = {}) => {
    const { types = ['users', 'communities', 'posts'], limit = 5 } = options
    
    try {
      const params = new URLSearchParams({
        q: query,
        types: types.join(','),
        limit: limit.toString()
      })
      
      const response = await api.get(`/search?${params}`)
      
      // Handle standardized response format
      if (response.data.success) {
        return {
          success: true,
          results: response.data.data, // This will be { posts: [], users: [], communities: [] }
          pagination: response.data.pagination
        }
      } else {
        return {
          success: false,
          error: response.data.error,
          results: { posts: [], users: [], communities: [] }
        }
      }
    } catch (error) {
      console.error('Global search error:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        results: { posts: [], users: [], communities: [] }
      }
    }
  },

  // Individual search methods - now handle standardized responses
  searchPosts: async (query, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
      return {
        data: {
          posts: response.data.data,
          pagination: response.data.pagination
        }
      }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Search failed')
    }
  },
    
  searchUsers: async (query, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
      return {
        data: {
          users: response.data.data,
          pagination: response.data.pagination
        }
      }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Search failed')
    }
  },
    
  searchCommunities: async (query, page = 1, limit = 10) => {
    try {
      const response = await api.get(`/search/communities?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
      return {
        data: {
          communities: response.data.data,
          pagination: response.data.pagination
        }
      }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Search failed')
    }
  }
}

export default api