<template>
  <div id="app" class="min-h-screen bg-gray-900 text-white">
    <!-- Loading Screen -->
    <div v-if="authStore.isLoading && !authStore.isAuthenticated" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-400">Initializing Admin Dashboard...</p>
      </div>
    </div>

    <!-- Main Application -->
    <div v-else class="flex h-screen">
      <!-- Navigation Sidebar -->
      <AdminSidebar v-if="showSidebar" />
      
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Top Navigation -->
        <AdminTopbar v-if="showTopbar" />
        
        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <!-- Router View with Transitions -->
          <router-view v-slot="{ Component, route }">
            <transition 
              :name="getTransitionName(route)" 
              mode="out-in"
              appear
            >
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </main>
      </div>
    </div>

    <!-- Global Notifications -->
    <AdminNotifications />

    <!-- Session Warning Modal -->
    <SessionWarningModal v-if="showSessionWarning" @extend="extendSession" @logout="forceLogout" />

    <!-- Development Tools -->
    <DevTools v-if="isDevelopment" />
  </div>
</template>

<script setup>
// In your admin-dashboard/src/App.vue <script setup> section:

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Import layout components
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminTopbar from '@/components/layout/AdminTopbar.vue'
import AdminNotifications from '@/components/layout/AdminNotifications.vue'
import SessionWarningModal from '@/components/layout/SessionWarningModal.vue'
import DevTools from '@/components/dev/DevTools.vue'

const route = useRoute()
const authStore = useAuthStore()

// Component state
const isDevelopment = import.meta.env.DEV
const showSessionWarning = ref(false)
const sessionTimer = ref(null)
const lastVisibilityCheck = ref(Date.now())

// Computed properties
const showSidebar = computed(() => {
  return authStore.isLoggedIn && !isPublicRoute.value
})

const showTopbar = computed(() => {
  return authStore.isLoggedIn && !isPublicRoute.value
})

const isPublicRoute = computed(() => {
  const publicRoutes = ['login', 'access-denied', 'not-found']
  return publicRoutes.includes(route.name)
})

// Route transition logic
const getTransitionName = (route) => {
  if (route.meta?.transition) {
    return route.meta.transition
  }
  
  // Default transitions based on route type
  if (route.name === 'login') return 'fade'
  if (route.name === 'access-denied') return 'slide-up'
  if (route.name === 'not-found') return 'slide-up'
  
  return 'slide-right'
}

// 🔧 FIXED: Less aggressive session management
const startSessionTimer = () => {
  if (sessionTimer.value) {
    clearInterval(sessionTimer.value)
  }
  
  // Check session every 10 minutes (less frequent)
  sessionTimer.value = setInterval(async () => {
    if (authStore.isLoggedIn && !authStore.sessionCheckInProgress) {
      console.log('⏰ Scheduled session verification...')
      const isValid = await authStore.verifySession()
      if (!isValid) {
        console.warn('⚠️ Scheduled session check failed')
        showSessionWarning.value = true
      }
    }
  }, 10 * 60 * 1000) // 10 minutes instead of 5
}

const extendSession = async () => {
  try {
    const isValid = await authStore.forceRefreshSession()
    if (isValid) {
      showSessionWarning.value = false
      console.log('✅ Session extended successfully')
    } else {
      console.warn('❌ Failed to extend session')
      // Will be redirected by auth store
    }
  } catch (error) {
    console.error('Session extension failed:', error)
    showSessionWarning.value = false
  }
}

const dismissSessionWarning = () => {
  showSessionWarning.value = false
}

// 🔧 FIXED: Smarter visibility change handling
const handleVisibilityChange = async () => {
  const now = Date.now()
  const timeSinceLastCheck = now - lastVisibilityCheck.value
  
  // Only check session if:
  // 1. Tab became visible (not hidden)
  // 2. It's been more than 2 minutes since last check
  // 3. User is logged in
  // 4. No session check currently in progress
  if (
    !document.hidden && 
    timeSinceLastCheck > 2 * 60 * 1000 && 
    authStore.isLoggedIn && 
    !authStore.sessionCheckInProgress
  ) {
    console.log('👁️ Tab visible after', Math.round(timeSinceLastCheck / 60000), 'minutes, checking session...')
    lastVisibilityCheck.value = now
    
    try {
      const isValid = await authStore.verifySession()
      if (!isValid) {
        console.warn('⚠️ Visibility change session check failed')
        showSessionWarning.value = true
      } else {
        console.log('✅ Visibility change session check passed')
      }
    } catch (error) {
      console.warn('⚠️ Session check error on visibility change:', error.message)
      // Don't show warning for network errors
      if (!error.message.includes('timeout') && !error.message.includes('Network Error')) {
        showSessionWarning.value = true
      }
    }
  }
}

// Global error handler for admin dashboard
const handleGlobalError = (error) => {
  console.error('Global admin dashboard error:', error)
  
  // Handle specific error types
  if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
    console.warn('🔒 Unauthorized error detected, checking session...')
    authStore.verifySession()
  }
}

// Lifecycle hooks
onMounted(() => {
  // Initialize auth state
  authStore.initializeAuth()
  
  // Start session management
  if (authStore.isLoggedIn) {
    startSessionTimer()
  }
  
  // Add event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason)
  })
  
  console.log('🚀 Admin dashboard initialized')
})

onUnmounted(() => {
  // Cleanup
  if (sessionTimer.value) {
    clearInterval(sessionTimer.value)
  }
  
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleGlobalError)
  
  console.log('🧹 Admin dashboard cleanup completed')
})

// Watch for login state changes
authStore.$subscribe((mutation, state) => {
  if (state.isAuthenticated && !sessionTimer.value) {
    startSessionTimer()
  } else if (!state.isAuthenticated && sessionTimer.value) {
    clearInterval(sessionTimer.value)
    sessionTimer.value = null
  }
})

// Expose for debugging in development
if (isDevelopment) {
  window.__adminAuth = authStore
  window.__forceSessionCheck = () => authStore.forceRefreshSession()
}
</script>

<style scoped>
/* Route Transition Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Custom scrollbar for webkit browsers */
:deep(::-webkit-scrollbar) {
  width: 6px;
}

:deep(::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.1);
}

:deep(::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

:deep(::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.3);
}

/* Dark mode utilities */
.dark {
  color-scheme: dark;
}

/* Focus styles for accessibility */
:deep(*:focus) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

:deep(button:focus),
:deep(a:focus),
:deep(input:focus),
:deep(select:focus),
:deep(textarea:focus) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>