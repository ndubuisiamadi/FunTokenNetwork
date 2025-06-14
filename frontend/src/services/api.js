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

// Friends API endpoints
export const friendsAPI = {
  sendRequest: (userId) => api.post(`/friends/request/${userId}`),
  respondToRequest: (requestId, action) => api.put(`/friends/request/${requestId}`, { action }),
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

  // Update message status
  updateMessageStatus: (messageId, status) => 
    api.put(`/messages/messages/${messageId}/status`, { status }),
  
  // Bulk update conversation message status
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
// export const tasksAPI = {
//   // Get available tasks with filtering and pagination
//   getTasks: (page = 1, limit = 20, filters = {}) => {
//     const params = new URLSearchParams({
//       page: page.toString(),
//       limit: limit.toString(),
//       ...filters
//     })
//     return api.get(`/tasks?${params}`)
//   },

//   // Get task by ID
//   getTask: (taskId) => api.get(`/tasks/${taskId}`),

//   // Start a task
//   startTask: (taskId) => api.post(`/tasks/${taskId}/start`),

//   // Complete a task
//   completeTask: (taskId, submissionData) => 
//     api.post(`/tasks/${taskId}/complete`, submissionData),

//   // Verify task completion
//   verifyTask: (taskId, proof) => 
//     api.post(`/tasks/${taskId}/verify`, proof),

//   // Get user's completed tasks
//   getCompletedTasks: () => api.get('/tasks/completed'),

//   // Get user's task progress
//   getTaskProgress: (taskId) => api.get(`/tasks/${taskId}/progress`),

//   // Get task analytics
//   getAnalytics: () => api.get('/tasks/analytics'),

//   // Get platform configurations
//   getPlatforms: () => api.get('/tasks/platforms'),

//   // Admin endpoints (for your admin dashboard)
//   admin: {
//     // Create new task
//     createTask: (taskData) => api.post('/admin/tasks', taskData),
    
//     // Update task
//     updateTask: (taskId, updates) => api.put(`/admin/tasks/${taskId}`, updates),
    
//     // Delete task
//     deleteTask: (taskId) => api.delete(`/admin/tasks/${taskId}`),
    
//     // Get task analytics
//     getTaskAnalytics: (taskId) => api.get(`/admin/tasks/${taskId}/analytics`),
    
//     // Get all user submissions
//     getSubmissions: (page = 1, status = 'all') => 
//       api.get(`/admin/tasks/submissions?page=${page}&status=${status}`),
    
//     // Review submission
//     reviewSubmission: (submissionId, decision, feedback = '') =>
//       api.post(`/admin/tasks/submissions/${submissionId}/review`, { 
//         decision, 
//         feedback 
//       }),

//     // Bulk operations
//     bulkUpdateTasks: (taskIds, updates) =>
//       api.put('/admin/tasks/bulk', { taskIds, updates }),

//     // Platform management
//     createPlatform: (platformData) => api.post('/admin/platforms', platformData),
//     updatePlatform: (platformId, updates) => api.put(`/admin/platforms/${platformId}`, updates),
//     deletePlatform: (platformId) => api.delete(`/admin/platforms/${platformId}`)
//   }
// }

// Temporary mock API for development
export const tasksAPI = {
  getTasks: () => Promise.resolve({ 
    data: { 
      tasks: [], 
      pagination: { page: 1, hasMore: false },
      platforms: [] 
    } 
  }),
  getTask: (taskId) => Promise.resolve({ data: { task: { id: taskId } } }),
  startTask: (taskId) => Promise.resolve({ data: { task: { id: taskId }, userTask: {} } }),
  completeTask: (taskId, submissionData) => Promise.resolve({ 
    data: { 
      task: { id: taskId }, 
      userTask: {}, 
      reward: { amount: 15000 } 
    } 
  })
}

// Global Search API
export const searchAPI = {
  // Global search across all content types
  globalSearch: async (query, options = {}) => {
    const { types = ['users', 'communities', 'conversations'], limit = 5 } = options
    
    const promises = []
    const results = {
      users: [],
      communities: [],
      conversations: [],
      posts: []
    }

    try {
      // Search users
      if (types.includes('users')) {
        promises.push(
          usersAPI.searchUsers(query, 1, limit)
            .then(response => ({ type: 'users', data: response.data.users }))
            .catch(() => ({ type: 'users', data: [] }))
        )
      }

      // Search communities  
      if (types.includes('communities')) {
        promises.push(
          communitiesAPI.searchCommunities(query, 1, limit)
            .then(response => ({ type: 'communities', data: response.data.communities }))
            .catch(() => ({ type: 'communities', data: [] }))
        )
      }

      // Search conversations
      if (types.includes('conversations')) {
        promises.push(
          messagesAPI.searchConversations(query)
            .then(response => ({ type: 'conversations', data: response.data.conversations?.slice(0, limit) || [] }))
            .catch(() => ({ type: 'conversations', data: [] }))
        )
      }

      const responses = await Promise.all(promises)
      
      responses.forEach(({ type, data }) => {
        results[type] = data || []
      })

      return { success: true, results }
    } catch (error) {
      console.error('Global search error:', error)
      return { success: false, error: error.message, results }
    }
  }
}

export default api