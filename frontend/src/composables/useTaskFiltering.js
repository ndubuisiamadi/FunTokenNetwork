// frontend/src/composables/useTaskFiltering.js
// Reactive Task Filtering Composable

import { ref, computed, watch, nextTick } from 'vue'
import { debounce } from 'lodash'
import { tasksAPI } from '@/services/api'

export function useTaskFiltering(options = {}) {
  const {
    initialFilters = {},
    autoLoad = true,
    debounceMs = 300,
    defaultLimit = 20
  } = options

  // Filter state
  const filters = ref({
    platform: 'all',
    status: 'all',
    difficulty: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'reward',
    sortOrder: 'desc',
    page: 1,
    limit: defaultLimit,
    ...initialFilters
  })

  // Results state
  const tasks = ref([])
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
  const meta = ref({})

  // Computed properties
  const hasFilters = computed(() => {
    return filters.value.platform !== 'all' ||
           filters.value.status !== 'all' ||
           filters.value.difficulty !== 'all' ||
           filters.value.search.trim() !== '' ||
           filters.value.dateFrom !== '' ||
           filters.value.dateTo !== ''
  })

  const isEmpty = computed(() => {
    return !loading.value && tasks.value.length === 0
  })

  const isFiltered = computed(() => {
    return hasFilters.value && isEmpty.value
  })

  // Debounced search function
  const debouncedFetch = debounce(async () => {
    await fetchTasks()
  }, debounceMs)

  // Watch for filter changes (except page) and trigger search
  watch(
    () => ({
      platform: filters.value.platform,
      status: filters.value.status,
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
      fetchTasks(true) // Append mode for pagination
    }
  )

  // Fetch tasks with current filters
  const fetchTasks = async (append = false) => {
    if (loading.value && !append) return

    loading.value = true
    error.value = null

    try {
      const response = await tasksAPI.getFilteredTasks(filters.value)
      const { tasks: newTasks, pagination: newPagination, meta: newMeta } = response.data

      if (append && filters.value.page > 1) {
        // Append to existing tasks (infinite scroll)
        tasks.value.push(...newTasks)
      } else {
        // Replace tasks (new search)
        tasks.value = newTasks
      }

      pagination.value = newPagination
      meta.value = newMeta

      return { success: true, tasks: tasks.value }
    } catch (err) {
      console.error('Fetch tasks error:', err)
      error.value = err.response?.data?.message || err.message || 'Failed to fetch tasks'
      
      if (!append) {
        tasks.value = []
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
    return await fetchTasks(true)
  }

  // Load previous page
  const loadPrevious = async () => {
    if (!pagination.value.hasPrev || loading.value || filters.value.page <= 1) return

    filters.value.page -= 1
    return await fetchTasks()
  }

  // Update a specific filter
  const updateFilter = async (key, value) => {
    if (filters.value[key] === value) return

    filters.value[key] = value
    
    // For immediate updates (non-search filters)
    if (key !== 'search') {
      filters.value.page = 1
      await fetchTasks()
    }
  }

  // Update multiple filters at once
  const updateFilters = async (newFilters) => {
    Object.assign(filters.value, newFilters)
    filters.value.page = 1
    await fetchTasks()
  }

  // Reset all filters
  const resetFilters = async () => {
    filters.value = {
      platform: 'all',
      status: 'all',
      difficulty: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'reward',
      sortOrder: 'desc',
      page: 1,
      limit: defaultLimit
    }
    await fetchTasks()
  }

  // Clear search only
  const clearSearch = async () => {
    if (filters.value.search) {
      filters.value.search = ''
      filters.value.page = 1
      await fetchTasks()
    }
  }

  // Refresh current results
  const refresh = async () => {
    filters.value.page = 1
    return await fetchTasks()
  }

  // Update a task in the local state (for real-time updates)
  const updateTask = (taskId, updates) => {
    const taskIndex = tasks.value.findIndex(t => t.id === taskId)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = { ...tasks.value[taskIndex], ...updates }
    }
  }

  // Remove a task from local state
  const removeTask = (taskId) => {
    const taskIndex = tasks.value.findIndex(t => t.id === taskId)
    if (taskIndex !== -1) {
      tasks.value.splice(taskIndex, 1)
    }
  }

  // Add a task to local state
  const addTask = (task) => {
    tasks.value.unshift(task)
  }

  // Initialize
  if (autoLoad) {
    nextTick(() => {
      fetchTasks()
    })
  }

  return {
    // State
    filters,
    tasks,
    loading,
    error,
    pagination,
    meta,

    // Computed
    hasFilters,
    isEmpty,
    isFiltered,

    // Methods
    fetchTasks,
    loadMore,
    loadPrevious,
    updateFilter,
    updateFilters,
    resetFilters,
    clearSearch,
    refresh,

    // Task management
    updateTask,
    removeTask,
    addTask
  }
}