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