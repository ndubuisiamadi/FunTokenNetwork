// admin-dashboard/src/services/api.js - FIXED VERSION
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance for admin dashboard
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add admin auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAuthToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-Admin-Client'] = 'true' // Identify as admin client
  }
  return config
})

// Handle admin-specific token expiration and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only auto-logout on certain error conditions
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn('Admin token invalid, clearing session')
      localStorage.removeItem('adminAuthToken')
      localStorage.removeItem('adminAuthUser')
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=session_expired'
      }
    } else if (error.response?.status === 403) {
      // Insufficient admin privileges
      console.error('Admin access denied:', error.response.data)
      // Don't auto-logout on 403, just log the error
    }
    return Promise.reject(error)
  }
)

// Admin Authentication API endpoints
export const authAPI = {
  // Admin login (same endpoint but with role verification)
  adminLogin: (credentials) => api.post('/auth/login', {
    username: credentials.username || credentials.email, // Support both
    password: credentials.password,
    adminRequest: true // Flag for backend to verify admin role
  }),
  
  // Standard auth endpoints
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  
  // 🔧 FIXED: Use dedicated admin profile endpoint
  getProfile: () => api.get('/admin/profile'), // Changed from /auth/profile
  
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // Password reset endpoints
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetData) => api.post('/auth/reset-password', resetData),

  // 🆕 NEW: Admin session verification endpoint
  verifyAdminSession: () => api.get('/admin/profile'), // Dedicated endpoint for admin verification
}

// Admin-specific API endpoints
export const adminAPI = {
  // System health and monitoring
  getSystemHealth: () => api.get('/admin/system/health'),
  getSystemStats: () => api.get('/admin/system/stats'),
  
  // Cache management
  clearCache: () => api.delete('/admin/cache'),
  getCacheStatus: () => api.get('/admin/cache/status'),
  
  // User management
  getAllUsers: (filters = {}) => api.get('/admin/users', { params: filters }),
  getUserById: (userId) => api.get(`/admin/users/${userId}`),
  getUserStats: () => api.get('/admin/users/stats'),
  syncUserEarnings: () => api.post('/admin/users/sync-earnings'), // 🆕 NEW: Sync earnings method
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  suspendUser: (userId, reason) => api.post(`/admin/users/${userId}/suspend`, { reason }),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/unsuspend`),
  
  // Task management
  getAllTasks: (filters = {}) => api.get('/admin/tasks', { params: filters }),
  getTaskStats: () => api.get('/admin/tasks/stats'),
  updateTask: (taskId, taskData) => api.put(`/admin/tasks/${taskId}`, taskData),
  deleteTask: (taskId) => api.delete(`/admin/tasks/${taskId}`),
  forceCompleteTask: (taskId, userId, reason) => api.post(`/admin/tasks/${taskId}/force-complete`, { userId, reason }),
  
  // Content moderation
  getPendingPosts: (filters = {}) => api.get('/admin/content/posts/pending', { params: filters }),
  approvePost: (postId) => api.post(`/admin/content/posts/${postId}/approve`),
  rejectPost: (postId, reason) => api.post(`/admin/content/posts/${postId}/reject`, { reason }),
  getContentReports: (filters = {}) => api.get('/admin/content/reports', { params: filters }),
  
  // Analytics
   getUserAnalytics: (timeframe = '7d', includeAdmins = false) => {
    console.log(`📞 API: getUserAnalytics/${timeframe}?includeAdmins=${includeAdmins}`)
    return api.get(`/admin/analytics/users/${timeframe}?includeAdmins=${includeAdmins}`)
  },
  
  getEngagementAnalytics: (timeframe = '7d', includeAdmins = false) => {
    console.log(`📞 API: getEngagementAnalytics?timeframe=${timeframe}&includeAdmins=${includeAdmins}`)
    return api.get(`/admin/analytics/engagement?timeframe=${timeframe}&includeAdmins=${includeAdmins}`)
  },
  
  getRevenueAnalytics: (timeframe = '7d', includeAdmins = false) => {
    console.log(`📞 API: getRevenueAnalytics?timeframe=${timeframe}&includeAdmins=${includeAdmins}`)
    return api.get(`/admin/analytics/revenue?timeframe=${timeframe}&includeAdmins=${includeAdmins}`)
  },
  
  // Communities
  getAllCommunities: (filters = {}) => api.get('/admin/communities', { params: filters }),
  updateCommunity: (communityId, data) => api.put(`/admin/communities/${communityId}`, data),
  deleteCommunity: (communityId) => api.delete(`/admin/communities/${communityId}`),
  
  // Audit logs
  getAdminActionLogs: (filters = {}) => api.get('/admin/logs/actions', { params: filters }),
  logAdminAction: (action, targetType, targetId, details) => api.post('/admin/logs/action', {
    action, targetType, targetId, details
  })
}

// Enhanced Tasks API for admin dashboard
export const tasksAPI = {
  // Get all tasks (admin view)
  getAllTasks: (filters = {}) => api.get('/admin/tasks', { params: filters }),
  
  // User tasks with detailed info
  getAvailableTasks: (filters = {}) => api.get('/tasks/filtered', { params: filters }),
  getUserTasks: (userId, filters = {}) => api.get(`/tasks/user/${userId}`, { params: filters }),
  getTaskById: (taskId) => api.get(`/tasks/${taskId}`),
  
  // Task management
  createTask: (taskData) => api.post('/tasks/create', taskData),
  updateTask: (taskId, taskData) => api.put(`/tasks/${taskId}`, taskData),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
  toggleTaskStatus: (taskId) => api.patch(`/tasks/${taskId}/toggle-status`),
  
  // Task verification and completion
  getTaskStatus: (taskId) => api.get(`/tasks/${taskId}/status`),
  startTask: (taskId) => api.post(`/tasks/${taskId}/start`),
  verifyTask: (taskId, submissionData = {}) => api.post(`/tasks/${taskId}/verify`, { submissionData }),
  forceCompleteTask: (taskId, userId) => api.post(`/admin/tasks/${taskId}/force-complete`, { userId }),
  
  // Statistics and analytics
  getTaskStats: async () => {
    try {
      const response = await api.get('/admin/tasks/stats')
      return response.data
    } catch (error) {
      console.error('Failed to get task stats:', error)
      return {
        total: 0,
        active: 0,
        completed: 0,
        pending: 0,
        totalRewards: 0,
        completionRate: 0
      }
    }
  },
  
  getAvailablePlatforms: async () => {
    try {
      const response = await api.get('/tasks/platforms')
      return response.data.platforms || []
    } catch (error) {
      console.error('Failed to get platforms:', error)
      return []
    }
  },
  
  // System health
  checkHealth: () => api.get('/tasks/health'),
}

// Upload API endpoints for admin
export const uploadAPI = {
  uploadMedia: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('media', file))
    return api.post('/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// Communities API for admin management
export const communitiesAPI = {
  getAllCommunities: (filters = {}) => api.get('/admin/communities', { params: filters }),
  getCommunityById: (communityId) => api.get(`/admin/communities/${communityId}`),
  updateCommunity: (communityId, data) => api.put(`/admin/communities/${communityId}`, data),
  deleteCommunity: (communityId) => api.delete(`/admin/communities/${communityId}`),
  getCommunityMembers: (communityId) => api.get(`/admin/communities/${communityId}/members`),
}

// Error logging for admin dashboard
export const logError = (error, context = '') => {
  console.error(`[Admin Dashboard Error] ${context}:`, error)
  
  // Could send to logging service
  if (import.meta.env.PROD) {
    api.post('/admin/logs/error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }).catch(err => console.error('Failed to log error:', err))
  }
}

export default api