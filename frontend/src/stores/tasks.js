// frontend/src/stores/tasks.js
// Updated Tasks Store with Real API Integration

import { defineStore } from 'pinia'
import { tasksAPI } from '@/services/api'

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    userTasks: [],
    loading: false,
    error: null,
    
    // Task filtering
    selectedPlatform: null,
    selectedDifficulty: null,
    
    // Task status tracking
    startingTaskId: null,
    verifyingTaskId: null,
    
    // API health status
    apiHealth: null,
    lastHealthCheck: null
  }),

  getters: {
    availableTasks: (state) => {
      return state.tasks.filter(task => 
        task.userStatus === 'available' && task.isActive
      )
    },
    
    inProgressTasks: (state) => {
      return state.tasks.filter(task => task.userStatus === 'in_progress')
    },
    
    completedTasks: (state) => {
      return state.tasks.filter(task => task.userStatus === 'completed')
    },
    
    filteredTasks: (state) => {
      let filtered = state.tasks
      
      if (state.selectedPlatform) {
        filtered = filtered.filter(task => 
          task.platform.name === state.selectedPlatform
        )
      }
      
      if (state.selectedDifficulty) {
        filtered = filtered.filter(task => 
          task.difficulty === state.selectedDifficulty
        )
      }
      
      return filtered
    },
    
    taskStats: (state) => {
      const total = state.tasks.length
      const completed = state.tasks.filter(t => t.userStatus === 'completed').length
      const inProgress = state.tasks.filter(t => t.userStatus === 'in_progress').length
      const available = state.tasks.filter(t => t.userStatus === 'available').length
      
      return {
        total,
        completed,
        inProgress,
        available,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    },
    
    availablePlatforms: (state) => {
      const platforms = new Set()
      state.tasks.forEach(task => {
        if (task.platform?.name) {
          platforms.add(task.platform.name)
        }
      })
      return Array.from(platforms)
    }
  },

  actions: {
    async fetchTasks(filters = {}) {
      this.loading = true
      this.error = null
      
      try {
        const response = await tasksAPI.getAvailableTasks(filters)
        
        if (response.data.success !== false) {
          this.tasks = response.data.tasks || []
        } else {
          throw new Error(response.data.message || 'Failed to fetch tasks')
        }
        
        return { success: true, tasks: this.tasks }
        
      } catch (error) {
        console.error('Fetch tasks error:', error)
        this.error = error.response?.data?.message || error.message || 'Failed to fetch tasks'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async fetchUserTasks(filters = {}) {
      try {
        const response = await tasksAPI.getUserTasks(filters)
        
        if (response.data.userTasks) {
          this.userTasks = response.data.userTasks
          
          // Update task statuses in main tasks array
          this.userTasks.forEach(userTask => {
            const taskIndex = this.tasks.findIndex(t => t.id === userTask.taskId)
            if (taskIndex !== -1) {
              this.tasks[taskIndex].userStatus = userTask.status
              this.tasks[taskIndex].userCompletedAt = userTask.completedAt
            }
          })
        }
        
        return { success: true, userTasks: this.userTasks }
        
      } catch (error) {
        console.error('Fetch user tasks error:', error)
        this.error = error.response?.data?.message || error.message
        return { success: false, error: this.error }
      }
    },

    async startTask(taskId) {
      this.startingTaskId = taskId
      this.error = null
      
      try {
        const response = await tasksAPI.startTask(taskId)
        
        if (response.data.userTask) {
          // Update task status
          const taskIndex = this.tasks.findIndex(t => t.id === taskId)
          if (taskIndex !== -1) {
            this.tasks[taskIndex].userStatus = 'in_progress'
          }
          
          // Add to user tasks
          const existingIndex = this.userTasks.findIndex(ut => ut.taskId === taskId)
          if (existingIndex !== -1) {
            this.userTasks[existingIndex] = response.data.userTask
          } else {
            this.userTasks.push(response.data.userTask)
          }
        }
        
        return { 
          success: true, 
          task: response.data.task,
          userTask: response.data.userTask 
        }
        
      } catch (error) {
        console.error('Start task error:', error)
        this.error = error.response?.data?.message || error.message
        return { success: false, error: this.error }
      } finally {
        this.startingTaskId = null
      }
    },

    async completeTask(taskId, submissionData) {
      this.verifyingTaskId = taskId
      this.error = null
      
      try {
        const response = await tasksAPI.verifyTask(taskId, submissionData)
        
        if (response.data.verified) {
          // Task was successfully verified
          const taskIndex = this.tasks.findIndex(t => t.id === taskId)
          if (taskIndex !== -1) {
            this.tasks[taskIndex].userStatus = 'completed'
            this.tasks[taskIndex].userCompletedAt = new Date().toISOString()
          }
          
          // Update user tasks
          const userTaskIndex = this.userTasks.findIndex(ut => ut.taskId === taskId)
          if (userTaskIndex !== -1) {
            this.userTasks[userTaskIndex] = response.data.userTask
          }
        } else {
          // Verification failed
          const taskIndex = this.tasks.findIndex(t => t.id === taskId)
          if (taskIndex !== -1) {
            this.tasks[taskIndex].userStatus = 'failed'
          }
        }
        
        return {
          success: true,
          verified: response.data.verified,
          verificationResult: response.data.verificationResult,
          reward: response.data.reward,
          message: response.data.message
        }
        
      } catch (error) {
        console.error('Complete task error:', error)
        this.error = error.response?.data?.message || error.message
        return { success: false, error: this.error }
      } finally {
        this.verifyingTaskId = null
      }
    },

    async checkAPIHealth() {
      try {
        const response = await tasksAPI.checkHealth()
        this.apiHealth = response.data
        this.lastHealthCheck = new Date().toISOString()
        
        return { success: true, health: this.apiHealth }
        
      } catch (error) {
        console.error('API health check error:', error)
        this.apiHealth = { status: 'error', error: error.message }
        return { success: false, error: error.message }
      }
    },

    // Filter methods
    setSelectedPlatform(platform) {
      this.selectedPlatform = platform
    },

    setSelectedDifficulty(difficulty) {
      this.selectedDifficulty = difficulty
    },

    clearFilters() {
      this.selectedPlatform = null
      this.selectedDifficulty = null
    },

    // Utility methods
    getTaskById(taskId) {
      return this.tasks.find(task => task.id === taskId)
    },

    getUserTaskByTaskId(taskId) {
      return this.userTasks.find(userTask => userTask.taskId === taskId)
    },

    clearError() {
      this.error = null
    },

    // Reset store
    reset() {
      this.tasks = []
      this.userTasks = []
      this.loading = false
      this.error = null
      this.selectedPlatform = null
      this.selectedDifficulty = null
      this.startingTaskId = null
      this.verifyingTaskId = null
      this.apiHealth = null
      this.lastHealthCheck = null
    }
  }
})