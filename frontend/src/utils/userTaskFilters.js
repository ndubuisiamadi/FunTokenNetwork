// User Task Filter Utilities
// Provides reusable functions for filtering and formatting user tasks

export const USER_TASK_STATUSES = {
  ALL: 'all',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

export const USER_TASK_SORT_OPTIONS = {
  CREATED_ASC: 'createdAt-asc',
  CREATED_DESC: 'createdAt-desc',
  COMPLETED_ASC: 'completedAt-asc',
  COMPLETED_DESC: 'completedAt-desc',
  STARTED_ASC: 'startedAt-asc',
  STARTED_DESC: 'startedAt-desc',
  TITLE_ASC: 'taskTitle-asc',
  TITLE_DESC: 'taskTitle-desc',
  REWARD_ASC: 'taskReward-asc',
  REWARD_DESC: 'taskReward-desc',
  DIFFICULTY_ASC: 'taskDifficulty-asc',
  DIFFICULTY_DESC: 'taskDifficulty-desc',
  STATUS_ASC: 'status-asc',
  STATUS_DESC: 'status-desc'
}

export const QUICK_DATE_FILTERS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  CUSTOM: 'custom'
}

// Generate date ranges for quick filters
export const getDateRange = (filterType) => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  switch (filterType) {
    case QUICK_DATE_FILTERS.TODAY:
      return { dateFrom: todayStr, dateTo: todayStr }
      
    case QUICK_DATE_FILTERS.YESTERDAY:
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      return { dateFrom: yesterdayStr, dateTo: yesterdayStr }
      
    case QUICK_DATE_FILTERS.THIS_WEEK:
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return { 
        dateFrom: startOfWeek.toISOString().split('T')[0], 
        dateTo: todayStr 
      }
      
    case QUICK_DATE_FILTERS.LAST_WEEK:
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
      return { 
        dateFrom: startOfLastWeek.toISOString().split('T')[0], 
        dateTo: endOfLastWeek.toISOString().split('T')[0] 
      }
      
    case QUICK_DATE_FILTERS.THIS_MONTH:
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return { 
        dateFrom: startOfMonth.toISOString().split('T')[0], 
        dateTo: todayStr 
      }
      
    case QUICK_DATE_FILTERS.LAST_MONTH:
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      return { 
        dateFrom: startOfLastMonth.toISOString().split('T')[0], 
        dateTo: endOfLastMonth.toISOString().split('T')[0] 
      }
      
    default:
      return { dateFrom: null, dateTo: null }
  }
}

// Status formatting utilities
export const getStatusBadgeClass = (status) => {
  const baseClasses = 'text-xs px-2 py-1 rounded-full font-medium'
  
  switch (status) {
    case USER_TASK_STATUSES.COMPLETED:
      return `${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`
    case USER_TASK_STATUSES.IN_PROGRESS:
      return `${baseClasses} bg-blue-500/20 text-blue-400 border border-blue-500/30`
    case USER_TASK_STATUSES.FAILED:
      return `${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`
    case USER_TASK_STATUSES.AVAILABLE:
      return `${baseClasses} bg-gray-500/20 text-gray-400 border border-gray-500/30`
    default:
      return `${baseClasses} bg-gray-500/20 text-gray-400 border border-gray-500/30`
  }
}

export const getStatusLabel = (status) => {
  switch (status) {
    case USER_TASK_STATUSES.COMPLETED:
      return 'Completed'
    case USER_TASK_STATUSES.IN_PROGRESS:
      return 'In Progress'
    case USER_TASK_STATUSES.FAILED:
      return 'Failed'
    case USER_TASK_STATUSES.AVAILABLE:
      return 'Available'
    default:
      return 'Unknown'
  }
}

// Difficulty formatting utilities
export const getDifficultyColor = (difficulty) => {
  const baseClasses = 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'
  
  switch (difficulty) {
    case 1:
      return `${baseClasses} bg-green-500 text-white`
    case 2:
      return `${baseClasses} bg-yellow-500 text-white`
    case 3:
      return `${baseClasses} bg-orange-500 text-white`
    case 4:
      return `${baseClasses} bg-red-500 text-white`
    case 5:
      return `${baseClasses} bg-purple-500 text-white`
    default:
      return `${baseClasses} bg-gray-500 text-white`
  }
}

export const getDifficultyLabel = (difficulty) => {
  switch (difficulty) {
    case 1:
      return 'Very Easy'
    case 2:
      return 'Easy'
    case 3:
      return 'Medium'
    case 4:
      return 'Hard'
    case 5:
      return 'Very Hard'
    default:
      return 'Unknown'
  }
}

// Formatting utilities
export const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '-'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return new Date(dateString).toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

// Add task type badge utility function
export const getTaskTypeBadge = (type) => {
  const baseClasses = 'text-xs px-2 py-1 rounded-full font-medium'
  
  switch (type) {
    case 'follow':
      return `${baseClasses} bg-blue-500/20 text-blue-400 border border-blue-500/30`
    case 'like':
      return `${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`
    case 'retweet':
      return `${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`
    case 'comment':
      return `${baseClasses} bg-purple-500/20 text-purple-400 border border-purple-500/30`
    case 'subscribe':
      return `${baseClasses} bg-orange-500/20 text-orange-400 border border-orange-500/30`
    case 'join':
      return `${baseClasses} bg-teal-500/20 text-teal-400 border border-teal-500/30`
    default:
      return `${baseClasses} bg-gray-500/20 text-gray-400 border border-gray-500/30`
  }
}

// Add platform icon utility function
export const getPlatformIcon = (platform) => {
  const platformName = platform?.name || platform
  switch (platformName) {
    case 'Twitter':
      return '/src/assets/twitter-logo.png'
    case 'YouTube':
      return '/src/assets/youtube-logo.png'
    case 'Telegram':
      return '/src/assets/telegram-logo.png'
    default:
      return '/src/assets/default-platform.png'
  }
}

export const formatRelativeDate = (dateString) => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return formatDate(dateString, { month: 'short', day: 'numeric' })
  }
}

export const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '-'
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h`
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`
  } else {
    return `${diffMins}m`
  }
}

// Validation utilities
export const validateUserTaskFilters = (filters) => {
  const errors = []
  
  // Validate status
  if (filters.status && !Object.values(USER_TASK_STATUSES).includes(filters.status)) {
    errors.push('Invalid status filter')
  }
  
  // Validate date range
  if (filters.dateFrom && filters.dateTo) {
    const fromDate = new Date(filters.dateFrom)
    const toDate = new Date(filters.dateTo)
    if (fromDate > toDate) {
      errors.push('Start date must be before or equal to end date')
    }
  }
  
  // Validate difficulty
  if (filters.difficulty && filters.difficulty !== 'all') {
    const diff = parseInt(filters.difficulty)
    if (isNaN(diff) || diff < 1 || diff > 5) {
      errors.push('Difficulty must be between 1 and 5')
    }
  }
  
  // Validate pagination
  if (filters.page && (parseInt(filters.page) < 1 || parseInt(filters.page) > 10000)) {
    errors.push('Page must be between 1 and 10,000')
  }
  
  if (filters.limit && (parseInt(filters.limit) < 1 || parseInt(filters.limit) > 100)) {
    errors.push('Limit must be between 1 and 100')
  }
  
  return errors
}

// Filter preset utilities
export const getFilterPresets = () => {
  return [
    {
      name: 'All Tasks',
      key: 'all',
      filters: { status: 'all' }
    },
    {
      name: 'Completed Today',
      key: 'completed_today',
      filters: { 
        status: 'completed',
        ...getDateRange(QUICK_DATE_FILTERS.TODAY)
      }
    },
    {
      name: 'In Progress',
      key: 'in_progress',
      filters: { status: 'in_progress' }
    },
    {
      name: 'This Week',
      key: 'this_week',
      filters: getDateRange(QUICK_DATE_FILTERS.THIS_WEEK)
    },
    {
      name: 'Easy Tasks',
      key: 'easy',
      filters: { difficulty: '1' }
    },
    {
      name: 'Failed Tasks',
      key: 'failed',
      filters: { status: 'failed' }
    }
  ]
}

// Analytics utilities for user tasks
export const calculateUserTaskAnalytics = (userTasks) => {
  const total = userTasks.length
  const completed = userTasks.filter(t => t.status === 'completed')
  const failed = userTasks.filter(t => t.status === 'failed')
  const inProgress = userTasks.filter(t => t.status === 'in_progress')
  
  const totalEarnings = completed.reduce((sum, t) => sum + (t.task?.reward || 0), 0)
  const avgReward = completed.length > 0 ? Math.round(totalEarnings / completed.length) : 0
  const successRate = (completed.length + failed.length) > 0 
    ? Math.round((completed.length / (completed.length + failed.length)) * 100) 
    : 0
    
  // Platform breakdown
  const platformStats = {}
  userTasks.forEach(task => {
    const platform = task.task?.platform?.name || 'Unknown'
    if (!platformStats[platform]) {
      platformStats[platform] = { total: 0, completed: 0, earnings: 0 }
    }
    platformStats[platform].total++
    if (task.status === 'completed') {
      platformStats[platform].completed++
      platformStats[platform].earnings += task.task?.reward || 0
    }
  })
  
  // Difficulty breakdown
  const difficultyStats = {}
  userTasks.forEach(task => {
    const difficulty = task.task?.difficulty || 0
    if (!difficultyStats[difficulty]) {
      difficultyStats[difficulty] = { total: 0, completed: 0, earnings: 0 }
    }
    difficultyStats[difficulty].total++
    if (task.status === 'completed') {
      difficultyStats[difficulty].completed++
      difficultyStats[difficulty].earnings += task.task?.reward || 0
    }
  })
  
  return {
    overview: {
      total,
      completed: completed.length,
      failed: failed.length,
      inProgress: inProgress.length,
      totalEarnings,
      avgReward,
      successRate
    },
    platforms: platformStats,
    difficulties: difficultyStats
  }
}