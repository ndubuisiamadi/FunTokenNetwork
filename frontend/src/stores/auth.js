// src/stores/auth.js - FIXED VERSION (restore original structure)

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
    currentUser: (state) => state.user, // Keep this getter for compatibility
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
      const userData = localStorage.getItem('authUser')
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          this.token = token
          this.user = parsedUser  // Use 'user' not 'currentUser'
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

    // FIXED LOGIN - Use original property names
    async login(credentials) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authAPI.login(credentials)
        const { user, accessToken } = response.data // Use accessToken as in original
        
        // Store auth data using ORIGINAL property names
        this.user = user  // NOT this.currentUser
        this.token = accessToken  // NOT just token
        this.isAuthenticated = true
        
        // Persist to localStorage
        localStorage.setItem('authToken', accessToken)
        localStorage.setItem('authUser', JSON.stringify(user))
        
        // Set current user in users store
        const usersStore = useUsersStore()
        usersStore.setCurrentUser(this.user)
        
        // Initialize socket connection (async, don't await to avoid blocking)
        this.initializeSocketConnection().catch(console.error)
        
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

    // Separate method for socket initialization (non-blocking)
    async initializeSocketConnection() {
      try {
        console.log('🔌 Auth Store: Initializing socket connection...')
        
        // Import socket service dynamically to avoid circular imports
        const { socketService } = await import('@/services/socket')
        await socketService.connect()
        
        console.log('✅ Auth Store: Socket initialized successfully')
      } catch (error) {
        console.error('❌ Auth Store: Socket initialization failed:', error)
        // Don't fail login for socket errors
      }
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
          // Direct registration (if verification disabled)
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

    // FIXED LOGOUT - Add socket cleanup
    async logout() {
      try {
        // Disconnect socket first
        try {
          const { socketService } = await import('@/services/socket')
          socketService.disconnect()
          console.log('✅ Auth Store: Socket disconnected on logout')
        } catch (socketError) {
          console.error('Socket disconnect error:', socketError)
        }

        // Call logout API
        await authAPI.logout()
      } catch (error) {
        console.error('Logout API error:', error)
      } finally {
        // Clean up auth state using ORIGINAL structure
        this.user = null
        this.token = null
        this.isAuthenticated = false
        
        // Clean up storage
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        
        // Clear users store
        const usersStore = useUsersStore()
        usersStore.clearCurrentUser()
        
        // Clear any other stores if needed
        try {
          const { useMessagesStore } = await import('@/stores/messages')
          const messagesStore = useMessagesStore()
          messagesStore.$reset()
        } catch (error) {
          console.error('Error clearing messages store:', error)
        }
      }
    },

    // Rest of your existing methods remain the same...
    async updateProfile(profileData) {
      console.log('=== AUTH STORE: UPDATE PROFILE START ===')
      console.log('Profile data received:', profileData)
      
      this.loading = true
      this.error = null
      
      try {
        const response = await authAPI.updateProfile(profileData)
        console.log('API response received:', response.data)
        
        // Update user in state
        this.user = response.data.user
        
        // Update localStorage
        localStorage.setItem('authUser', JSON.stringify(response.data.user))
        
        // Update users store
        const usersStore = useUsersStore()
        usersStore.setCurrentUser(response.data.user)
        
        console.log('User updated successfully')
        console.log('=== AUTH STORE: UPDATE PROFILE SUCCESS ===')
        
        return { 
          success: true, 
          user: response.data.user,
          message: response.data.message || 'Profile updated successfully'
        }
        
      } catch (error) {
        console.log('=== AUTH STORE: UPDATE PROFILE ERROR START ===')
        console.error('Update profile error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        })
        
        let errorMessage = 'Failed to update profile'
        
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message === 'Network Error') {
          errorMessage = 'Unable to connect to server. Please check if the server is running.'
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
      } finally {
        this.loading = false
      }
    },

    // Refresh user data from server
    async refreshUser() {
      try {
        const response = await authAPI.getProfile()
        this.user = response.data.user
        localStorage.setItem('authUser', JSON.stringify(response.data.user))
        
        const usersStore = useUsersStore()
        usersStore.setCurrentUser(response.data.user)
        
        return { success: true, user: response.data.user }
      } catch (error) {
        console.error('Refresh user error:', error)
        return { success: false, error: error.message }
      }
    },

    // Clear error
    clearError() {
      this.error = null
    }
  }
})