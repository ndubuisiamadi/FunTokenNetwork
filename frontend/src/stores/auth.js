// src/stores/auth.js
import { useMessagesStore } from './messages'
import { defineStore } from 'pinia'
import { authAPI } from '@/services/api'
import { useUsersStore } from './users'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('authToken'),
    isAuthenticated: false,
    loading: false,
    error: null
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    currentUser: (state) => state.user,
    userFullName: (state) => {
      if (!state.user) return ''
      return `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim()
    },
    // Check if user has incomplete profile (missing firstName or lastName)
    hasIncompleteProfile: (state) => {
      if (!state.user) return false
      return !state.user.firstName || !state.user.lastName
    }
  },

  actions: {
    // Initialize auth state from localStorage
    initializeAuth() {
      const token = localStorage.getItem('authToken')
      const user = localStorage.getItem('authUser')
      
      if (token && user) {
        try {
          const parsedUser = JSON.parse(user)
          this.token = token
          this.user = parsedUser
          this.isAuthenticated = true
          
          // Set current user in users store
          const usersStore = useUsersStore()
          usersStore.setCurrentUser(parsedUser)
          
          // Verify token is still valid by making a quick API call
          this.verifyToken()
        } catch (error) {
          console.error('Error parsing user from localStorage:', error)
          this.clearAuthData()
        }
      }
    },

    // Verify if the stored token is still valid
    async verifyToken() {
      try {
        await authAPI.getProfile()
        // Token is valid, keep current state
      } catch (error) {
        console.error('Token verification failed:', error)
        // Token is invalid, clear auth data
        this.clearAuthData()
      }
    },

    // Clear all auth data
    clearAuthData() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      this.error = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
    },

    // Register new user
    async register(userData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authAPI.register(userData)
        
        if (response.data.requiresVerification) {
          // User needs to verify email
          return { 
            success: true, 
            requiresVerification: true,
            message: response.data.message 
          }
        } else {
          // Old flow (shouldn't happen with new implementation)
          const { user, accessToken } = response.data
          this.user = user
          this.token = accessToken
          this.isAuthenticated = true
          
          localStorage.setItem('authToken', accessToken)
          localStorage.setItem('authUser', JSON.stringify(user))
          
          return { success: true, user }
        }
      } catch (error) {
        console.error('Registration error:', error)
        this.error = error.response?.data?.message || 'Registration failed'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Login user
    async login(credentials) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authAPI.login(credentials)
        const { user, accessToken } = response.data
        
        // Store auth data FIRST
        this.user = user
        this.token = accessToken
        this.isAuthenticated = true
        
        // Persist to localStorage
        localStorage.setItem('authToken', accessToken)
        localStorage.setItem('authUser', JSON.stringify(user))
        
        // Set current user in users store
        const usersStore = useUsersStore()
        usersStore.setCurrentUser(this.user)
        
        // Initialize user data (but don't await it to avoid blocking navigation)
        this.initializeUserData().catch(console.error)
        
        return { success: true, user }
      } catch (error) {
        console.error('Login error:', error)
        
        // Check if this is an email verification error
        if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
          return { 
            success: false, 
            requiresVerification: true,
            email: error.response.data.email,
            error: error.response.data.message
          }
        }
        
        // Regular login error
        this.error = error.response?.data?.message || 'Login failed'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async initializeUserData() {
      try {
        console.log('Initializing user data after login...')
        
        // Initialize messages store
        const messagesStore = useMessagesStore()
        
        // Initialize socket connection
        messagesStore.initializeSocket()
        
        // Fetch conversations for the counter
        await messagesStore.fetchConversations()
        
        console.log('User data initialization complete')
      } catch (error) {
        console.error('Error initializing user data:', error)
        // Don't throw error as login was successful
      }
    },

    // Logout user
    async logout() {
      try {
        await authAPI.logout()
      } catch (error) {
        console.error('Logout API error:', error)
      } finally {
        // Clean up auth state
        this.user = null
        this.token = null
        this.isAuthenticated = false
        
        // Clean up storage
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        
        // Clean up messages store
        const messagesStore = useMessagesStore()
        messagesStore.cleanup()
        
        console.log('Logged out successfully')
      }
    },

    // Fetch current user profile
    async fetchProfile() {
      if (!this.token) {
        return { success: false, error: 'No token available' }
      }

      try {
        const response = await authAPI.getProfile()
        this.user = response.data.user
        
        // Update localStorage
        localStorage.setItem('authUser', JSON.stringify(this.user))
        
        return { success: true, user: this.user }
      } catch (error) {
        console.error('Fetch profile error:', error)
        
        // If token is invalid, clear all auth data
        if (error.response?.status === 401) {
          this.clearAuthData()
        }
        
        return { success: false, error: error.response?.data?.message || 'Failed to fetch profile' }
      }
    },

    // NEW: Refresh user data (for when gumballs are earned)
    async refreshUser() {
      if (!this.token) {
        console.log('No token available for refresh')
        return { success: false, error: 'No token available' }
      }

      try {
        console.log('Refreshing user data...')
        const response = await authAPI.getProfile()
        
        // Update user data in store
        this.user = response.data.user
        
        // Update localStorage
        localStorage.setItem('authUser', JSON.stringify(this.user))
        
        // Update users store if needed
        const usersStore = useUsersStore()
        if (usersStore.setCurrentUser) {
          usersStore.setCurrentUser(this.user)
        }
        
        console.log('User data refreshed successfully. New gumballs:', this.user.gumballs)
        return { success: true, user: this.user }
      } catch (error) {
        console.error('Refresh user error:', error)
        return { success: false, error: error.response?.data?.message || 'Failed to refresh user data' }
      }
    },

    // Update user profile
    async updateProfile(profileData) {
      if (!this.token) {
        return { success: false, error: 'Not authenticated' }
      }

      try {
        console.log('=== AUTH STORE: UPDATE PROFILE START ===')
        console.log('Profile data being sent:', profileData)
        console.log('Current user before update:', this.user)
        console.log('Token exists:', !!this.token)
        
        const response = await authAPI.updateProfile(profileData)
        console.log('API Response:', response.data)
        
        // Update the stored user data
        this.user = { ...this.user, ...response.data.user }
        console.log('Updated user data:', this.user)
        
        // Update localStorage
        localStorage.setItem('authUser', JSON.stringify(this.user))
        
        console.log('=== AUTH STORE: UPDATE PROFILE SUCCESS ===')
        return { success: true, user: this.user }
      } catch (error) {
        console.error('=== AUTH STORE: UPDATE PROFILE ERROR ===')
        console.error('Error object:', error)
        console.error('Error response:', error.response)
        console.error('Error response data:', error.response?.data)
        console.error('Error status:', error.response?.status)
        console.error('Error config:', error.config)
        
        let errorMessage = 'Failed to update profile'
        
        if (error.response?.data?.errors) {
          // Validation errors
          errorMessage = error.response.data.errors.map(err => err.msg || err.message).join(', ')
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check if the server is running.'
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your connection and server status.'
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please check the backend logs.'
        } else if (error.response?.status === 400) {
          errorMessage = 'Bad request. Check the data being sent.'
        }
        
        console.error('Final error message:', errorMessage)
        console.error('=== AUTH STORE: UPDATE PROFILE ERROR END ===')
        
        return { 
          success: false, 
          error: errorMessage
        }
      }
    },

    async restoreSession() {
      try {
        const token = localStorage.getItem('authToken')
        const userJson = localStorage.getItem('authUser')
        
        if (!token || !userJson) {
          return false
        }
        
        // Restore auth state
        this.token = token
        this.user = JSON.parse(userJson)
        this.isAuthenticated = true
        
        // Verify token is still valid by fetching profile
        const response = await authAPI.getProfile()
        this.user = response.data.user
        
        // Initialize user data
        await this.initializeUserData()
        
        return true
      } catch (error) {
        console.error('Session restore error:', error)
        // Clear invalid session
        this.logout()
        return false
      }
    },

    // Clear error
    clearError() {
      this.error = null
    }
  }
})