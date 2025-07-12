// frontend/src/composables/useUserTaskFiltering.js
// Reactive User Task History Filtering Composable

import { ref, computed, watch, nextTick } from 'vue'
import { debounce } from 'lodash'
import { tasksAPI } from '@/services/api'

export function useUserTaskFiltering(options = {}) {
  const {
    initialFilters = {},
    autoLoad = true,
    debounceMs = 300,
    defaultLimit = 20
  } = options

  // Filter state for user tasks
  const filters = ref({
    status: 'all',
    platform: 'all',
    difficulty: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created',
    sortOrder: 'desc',
    page: 1,
    limit: defaultLimit,
    ...initialFilters
  })

  // Results state
  const userTasks = ref([])
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: defaultLimit,
    total: 0,
    totalPages: 0,
    hasMore: false,
    hasPrev: false
  })
  const stats = ref({
    total: 0,
    completed: 0,
    inProgress: 0,
    failed: 0,
    totalEarnings: 0
  })

  // Computed properties
  const hasFilters = computed(() => {
    return filters.value.status !== 'all' ||
           filters.value.platform !== 'all' ||
           filters.value.difficulty !== 'all' ||
           filters.value.search.trim() !== '' ||
           filters.value.dateFrom !== '' ||
           filters.value.dateTo !== ''
  })

  const isEmpty = computed(() => {
    return !loading.value && userTasks.value.length === 0
  })

  const isFiltered = computed(() => {
    return hasFilters.value && isEmpty.value
  })

  // Status distribution for charts/stats
  const statusDistribution = computed(() => {
    const dist = {
      completed: 0,
      in_progress: 0,
      failed: 0,
      available: 0
    }
    
    userTasks.value.forEach(ut => {
      if (dist.hasOwnProperty(ut.status)) {
        dist[ut.status]++
      }
    })
    
    return dist
  })

  // Platform distribution
  const platformDistribution = computed(() => {
    const dist = {}
    
    userTasks.value.forEach(ut => {
      const platform = ut.task?.platform?.name || 'Unknown'
      dist[platform] = (dist[platform] || 0) + 1
    })
    
    return dist
  })

  // Recent activity (last 7 days)
  const recentActivity = computed(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    return userTasks.value.filter(ut => {
      const completedAt = ut.completedAt ? new Date(ut.completedAt) : null
      return completedAt && completedAt >= sevenDaysAgo
    })
  })

  // Debounced search function
  const debouncedFetch = debounce(async () => {
    await fetchUserTasks()
  }, debounceMs)

  // Watch for filter changes (except page) and trigger search
  watch(
    () => ({
      status: filters.value.status,
      platform: filters.value.platform,
      difficulty: filters.value.difficulty,
      search: filters.value.search,
      dateFrom: filters.value.dateFrom,
      dateTo: filters.value.dateTo,
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder,
      limit: filters.value.limit
    }),
    () => {
      filters.value.page = 1 // Reset to first page
      debouncedFetch()
    },
    { deep: true }
  )

  // Watch for page changes and fetch immediately
  watch(
    () => filters.value.page,
    () => {
      fetchUserTasks(true) // Append mode for pagination
    }
  )

  // Fetch user tasks with current filters
  const fetchUserTasks = async (append = false) => {
    if (loading.value && !append) return

    loading.value = true
    error.value = null

    try {
      const response = await tasksAPI.getUserTasksFiltered(filters.value)
      const { 
        userTasks: newUserTasks, 
        pagination: newPagination, 
        stats: newStats 
      } = response.data

      if (append && filters.value.page > 1) {
        // Append to existing tasks (infinite scroll)
        userTasks.value.push(...newUserTasks)
      } else {
        // Replace tasks (new search)
        userTasks.value = newUserTasks
      }

      pagination.value = newPagination
      stats.value = newStats

      return { success: true, userTasks: userTasks.value }
    } catch (err) {
      console.error('Fetch user tasks error:', err)
      error.value = err.response?.data?.message || err.message || 'Failed to fetch user tasks'
      
      if (!append) {
        userTasks.value = []
      }
      
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Load more tasks (for infinite scroll or pagination)
  const loadMore = async () => {
    if (!pagination.value.hasMore || loading.value) return

    filters.value.page += 1
    return await fetchUserTasks(true)
  }

  // Load previous page
  const loadPrevious = async () => {
    if (!pagination.value.hasPrev || loading.value || filters.value.page <= 1) return

    filters.value.page -= 1
    return await fetchUserTasks()
  }

  // Update a specific filter
  const updateFilter = async (key, value) => {
    if (filters.value[key] === value) return

    filters.value[key] = value
    
    // For immediate updates (non-search filters)
    if (key !== 'search') {
      filters.value.page = 1
      await fetchUserTasks()
    }
  }

  // Update multiple filters at once
  const updateFilters = async (newFilters) => {
    Object.assign(filters.value, newFilters)
    filters.value.page = 1
    await fetchUserTasks()
  }

  // Reset all filters
  const resetFilters = async () => {
    filters.value = {
      status: 'all',
      platform: 'all',
      difficulty: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'created',
      sortOrder: 'desc',
      page: 1,
      limit: defaultLimit
    }
    await fetchUserTasks()
  }

  // Clear search only
  const clearSearch = async () => {
    if (filters.value.search) {
      filters.value.search = ''
      filters.value.page = 1
      await fetchUserTasks()
    }
  }

  // Refresh current results
  const refresh = async () => {
    filters.value.page = 1
    return await fetchUserTasks()
  }

  // Update a user task in the local state (for real-time updates)
  const updateUserTask = (taskId, updates) => {
    const taskIndex = userTasks.value.findIndex(ut => ut.taskId === taskId)
    if (taskIndex !== -1) {
      userTasks.value[taskIndex] = { ...userTasks.value[taskIndex], ...updates }
      
      // Update stats if status changed
      if (updates.status) {
        updateLocalStats()
      }
    }
  }

  // Remove a user task from local state
  const removeUserTask = (taskId) => {
    const taskIndex = userTasks.value.findIndex(ut => ut.taskId === taskId)
    if (taskIndex !== -1) {
      userTasks.value.splice(taskIndex, 1)
      updateLocalStats()
    }
  }

  // Add a user task to local state
  const addUserTask = (userTask) => {
    userTasks.value.unshift(userTask)
    updateLocalStats()
  }

  // Update local stats based on current data
  const updateLocalStats = () => {
    stats.value = {
      total: userTasks.value.length,
      completed: userTasks.value.filter(ut => ut.status === 'completed').length,
      inProgress: userTasks.value.filter(ut => ut.status === 'in_progress').length,
      failed: userTasks.value.filter(ut => ut.status === 'failed').length,
      totalEarnings: userTasks.value
        .filter(ut => ut.status === 'completed')
        .reduce((sum, ut) => sum + (ut.task?.reward || 0), 0)
    }
  }

  // Export user tasks data (for reports)
  const exportData = (format = 'json') => {
    const exportData = userTasks.value.map(ut => ({
      taskTitle: ut.task?.title,
      platform: ut.task?.platform?.name,
      status: ut.status,
      reward: ut.task?.reward,
      difficulty: ut.task?.difficulty,
      startedAt: ut.startedAt,
      completedAt: ut.completedAt,
      autoVerified: ut.verificationData?.autoVerified
    }))

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => row[h] || '').join(','))
      ].join('\n')
      
      return csvContent
    }

    return exportData
  }

  // Initialize
  if (autoLoad) {
    nextTick(() => {
      fetchUserTasks()
    })
  }

  return {
    // State
    filters,
    userTasks,
    loading,
    error,
    pagination,
    stats,

    // Computed
    hasFilters,
    isEmpty,
    isFiltered,
    statusDistribution,
    platformDistribution,
    recentActivity,

    // Methods
    fetchUserTasks,
    loadMore,
    loadPrevious,
    updateFilter,
    updateFilters,
    resetFilters,
    clearSearch,
    refresh,

    // User task management
    updateUserTask,
    removeUserTask,
    addUserTask,

    // Utilities
    exportData
  }
}