// admin-dashboard/src/stores/auth.js - FIXED VERSION
import { defineStore } from 'pinia'
import { authAPI } from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    loginAttempts: 0,
    lastLoginAttempt: null,
    sessionCheckInProgress: false
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && !!state.user,
    isAdmin: (state) => {
      return state.user?.role === 'admin' || state.user?.role === 'super_admin'
    },
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    userName: (state) => state.user?.username || state.user?.email || 'Unknown',
    userProfile: (state) => state.user,
    hasValidSession: (state) => {
      const token = localStorage.getItem('adminAuthToken')
      return state.isAuthenticated && !!token && !!state.user
    }
  },

  actions: {
    // Initialize auth state from localStorage
    initializeAuth() {
      const token = localStorage.getItem('adminAuthToken')
      const userData = localStorage.getItem('adminAuthUser')
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData)
          // Verify user has admin role
          if (user.role === 'admin' || user.role === 'super_admin') {
            this.user = user
            this.isAuthenticated = true
            this.error = null
            console.log('✅ Admin session initialized from localStorage')
          } else {
            // Not an admin, clear session
            console.warn('❌ Stored user is not an admin, clearing session')
            this.clearSession()
          }
        } catch (error) {
          console.error('Failed to parse stored user data:', error)
          this.clearSession()
        }
      } else {
        console.log('ℹ️ No stored admin session found')
      }
    },

    // Admin login
    async login(credentials) {
      this.isLoading = true
      this.error = null

      // Rate limiting check
      if (this.isRateLimited()) {
        this.error = 'Too many login attempts. Please try again later.'
        this.isLoading = false
        return { success: false, error: this.error }
      }

      try {
        // Send login request
        const loginData = {
          username: credentials.email || credentials.username, // Admin form sends 'email' field
          password: credentials.password,
          adminRequest: true // Flag for backend to verify admin role
        }

        const response = await authAPI.adminLogin(loginData)
        
        if (response.data.user && (response.data.user.role === 'admin' || response.data.user.role === 'super_admin')) {
          // Store auth data
          localStorage.setItem('adminAuthToken', response.data.token)
          localStorage.setItem('adminAuthUser', JSON.stringify(response.data.user))
          
          // Update state
          this.user = response.data.user
          this.isAuthenticated = true
          this.error = null
          this.loginAttempts = 0
          this.lastLoginAttempt = null

          console.log('✅ Admin login successful:', this.user.username, `(${this.user.role})`)
          return { success: true, user: this.user }
        } else {
          throw new Error('Insufficient privileges. Admin access required.')
        }
      } catch (error) {
        this.recordFailedAttempt()
        this.error = error.response?.data?.message || error.message || 'Login failed'
        this.isAuthenticated = false
        this.user = null
        
        console.error('❌ Admin login failed:', this.error)
        return { success: false, error: this.error }
      } finally {
        this.isLoading = false
      }
    },

    // Admin logout
    async logout() {
      this.isLoading = true
      
      try {
        // Call logout endpoint if available
        await authAPI.logout()
        console.log('✅ Admin logout API call successful')
      } catch (error) {
        console.warn('⚠️ Logout API call failed (continuing anyway):', error.message)
      } finally {
        this.clearSession()
        this.isLoading = false
        console.log('✅ Admin session cleared')
      }
    },

    // 🔧 FIXED: More resilient session verification
    async verifySession() {
      // Prevent multiple simultaneous session checks
      if (this.sessionCheckInProgress) {
        console.log('🔄 Session check already in progress, skipping...')
        return this.isAuthenticated
      }

      const token = localStorage.getItem('adminAuthToken')
      if (!token) {
        console.log('❌ No admin token found, clearing session')
        this.clearSession()
        return false
      }

      // Quick check: if we have valid local data and it's recent, skip verification
      const userData = localStorage.getItem('adminAuthUser')
      if (userData && this.isAuthenticated) {
        try {
          const user = JSON.parse(userData)
          const tokenAge = Date.now() - (this.user?.lastVerified || 0)
          
          // If we verified recently (within 5 minutes), skip server check
          if (tokenAge < 5 * 60 * 1000 && (user.role === 'admin' || user.role === 'super_admin')) {
            console.log('✅ Using cached session verification (age:', Math.round(tokenAge / 60000), 'minutes)')
            return true
          }
        } catch (error) {
          console.warn('⚠️ Error parsing cached user data:', error)
        }
      }

      this.sessionCheckInProgress = true

      try {
        console.log('🔍 Verifying admin session with server...')
        
        // Use dedicated admin profile endpoint with timeout
        const response = await Promise.race([
          authAPI.verifyAdminSession(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session verification timeout')), 10000)
          )
        ])
        
        const userData = response.data.user || response.data
        
        if (userData && (userData.role === 'admin' || userData.role === 'super_admin')) {
          // Update user data with verification timestamp
          const updatedUser = {
            ...userData,
            lastVerified: Date.now()
          }
          
          this.user = updatedUser
          this.isAuthenticated = true
          this.error = null
          localStorage.setItem('adminAuthUser', JSON.stringify(updatedUser))
          
          console.log('✅ Admin session verified successfully')
          return true
        } else {
          console.warn('❌ Session verification failed: User is not admin')
          throw new Error('Admin session invalid - insufficient privileges')
        }
      } catch (error) {
        console.error('❌ Session verification failed:', error.message)
        
        // Only clear session on specific errors
        if (error.response?.status === 401 || error.message.includes('Admin session invalid')) {
          console.log('🧹 Clearing session due to auth failure')
          this.clearSession()
          return false
        } else {
          // For network errors, etc., keep session but log warning
          console.warn('⚠️ Network error during session check, keeping current session')
          return this.isAuthenticated
        }
      } finally {
        this.sessionCheckInProgress = false
      }
    },

    // Clear all session data
    clearSession() {
      localStorage.removeItem('adminAuthToken')
      localStorage.removeItem('adminAuthUser')
      this.user = null
      this.isAuthenticated = false
      this.error = null
      this.sessionCheckInProgress = false
      console.log('🧹 Admin session cleared')
    },

    // Record failed login attempt
    recordFailedAttempt() {
      this.loginAttempts++
      this.lastLoginAttempt = Date.now()
    },

    // Check if rate limited
    isRateLimited() {
      if (this.loginAttempts >= 5) {
        const timeSinceLastAttempt = Date.now() - this.lastLoginAttempt
        const cooldownPeriod = 15 * 60 * 1000 // 15 minutes
        
        if (timeSinceLastAttempt < cooldownPeriod) {
          return true
        } else {
          // Reset after cooldown
          this.loginAttempts = 0
          this.lastLoginAttempt = null
          return false
        }
      }
      return false
    },

    // Reset error state
    clearError() {
      this.error = null
    },

    // 🆕 NEW: Force refresh session (for manual cache clear, etc.)
    async forceRefreshSession() {
      console.log('🔄 Force refreshing admin session...')
      // Clear verification timestamp to force server check
      if (this.user) {
        this.user.lastVerified = 0
      }
      return await this.verifySession()
    }
  }
})