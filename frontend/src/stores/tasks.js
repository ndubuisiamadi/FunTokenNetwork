// src/stores/tasks.js
import { defineStore } from 'pinia'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    availableTasks: [],
    completedTasks: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    
    // Mock data for development
    mockTasks: [
      {
        id: 1,
        platform: { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
        type: 'follow',
        target: { handle: '@thatdude' },
        description: 'Follow @thatdude',
        reward: 15000,
        currency: 'Gumballs',
        status: 'available',
        isActive: true
      },
      {
        id: 2,
        platform: { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
        type: 'like',
        target: { handle: '@thatdude' },
        description: 'Like the video',
        reward: 25000,
        currency: 'Gumballs',
        status: 'available',
        isActive: true
      }
    ]
  }),

  getters: {
    filteredTasks: (state) => state.mockTasks,
    availablePlatforms: (state) => [],
    taskStats: (state) => ({
      total: state.mockTasks.length,
      completed: 0,
      inProgress: 0,
      available: state.mockTasks.length,
      completionRate: 0
    })
  },

  actions: {
    // Mock fetch function that doesn't call API
    async fetchTasks(page = 1, limit = 20, filters = {}) {
      this.loading = true
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      this.availableTasks = this.mockTasks
      this.loading = false
      this.hasMore = false
      
      return { success: true, tasks: this.mockTasks }
    },

    async startTask(taskId) {
      console.log('Mock: Starting task', taskId)
      return { success: true, task: { id: taskId }, userTask: {} }
    },

    async completeTask(taskId, submissionData = {}) {
      console.log('Mock: Completing task', taskId, submissionData)
      return { success: true, task: { id: taskId }, userTask: {}, reward: { amount: 15000 } }
    },

    setFilter(key, value) {
      this[key] = value
    },

    resetFilters() {
      // Reset any filters when implemented
    },

    clearError() {
      this.error = null
    }
  }
})