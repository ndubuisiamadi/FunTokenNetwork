// admin-dashboard/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Import stores to ensure they're registered
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'

const app = createApp(App)
const pinia = createPinia()

// Setup Pinia first
app.use(pinia)

// Initialize auth store after Pinia is setup
const authStore = useAuthStore()

// Initialize authentication state from localStorage if available
authStore.initializeAuth()

// Setup router
app.use(router)

// Global error handler for unhandled Vue errors
app.config.errorHandler = (err, instance, info) => {
  console.error('Global Vue Error:', err)
  console.error('Component Info:', info)
  
  // Could send to error reporting service in production
  if (import.meta.env.PROD) {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(err, { context: info })
  }
}

// Global warning handler for development
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('Vue Warning:', msg)
    console.warn('Component Trace:', trace)
  }
}

// Add global properties for common utilities
app.config.globalProperties.$formatDate = (date) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

app.config.globalProperties.$formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

app.config.globalProperties.$truncateText = (text, length = 50) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Development tools
if (import.meta.env.DEV) {
  // Make stores available globally for debugging
  window.__ADMIN_STORES__ = {
    auth: authStore,
    tasks: useTasksStore()
  }
  
  console.log('🔧 Admin Dashboard - Development Mode')
  console.log('📊 Available stores:', Object.keys(window.__ADMIN_STORES__))
  console.log('🔑 Auth status:', authStore.isLoggedIn ? 'Authenticated' : 'Not authenticated')
}

// Security measures
if (import.meta.env.PROD) {
  // Disable Vue devtools in production
  app.config.devtools = false
  
  // Console warning for production
  console.log('%c⚠️ ADMIN DASHBOARD', 'color: red; font-size: 20px; font-weight: bold;')
  console.log('%cThis is a secure administrative interface. Unauthorized access is prohibited.', 'color: red; font-size: 14px;')
  console.log('%cAll activities are logged and monitored.', 'color: red; font-size: 14px;')
}

// Mount the app
app.mount('#app')

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason)
  
  // Prevent the default browser behavior (console error)
  event.preventDefault()
  
  // Could show user-friendly error message
  if (event.reason?.message?.includes('Network Error')) {
    // Handle network errors gracefully
    console.warn('Network error detected, check connection')
  }
})

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error)
  
  // Could send to error reporting service
  if (import.meta.env.PROD) {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(event.error)
  }
})

// Performance monitoring (development only)
if (import.meta.env.DEV) {
  // Log performance metrics
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0]
    console.log('🚀 App Load Performance:', {
      domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
      loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
      totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
    })
  })
}

export default app