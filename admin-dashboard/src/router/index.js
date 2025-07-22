// admin-dashboard/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Import views
import LoginView from '@/views/LoginView.vue'
import HomeView from '@/views/HomeView.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
// import NotFoundView from '@/views/NotFoundView.vue'

// Lazy load admin views for better performance
const UserManagementView = () => import('@/views/UserManagementView.vue')
const AnalyticsView = () => import('@/views/AnalyticsView.vue')
const ContentModerationView = () => import('@/views/ContentModerationView.vue')
const SystemMonitoringView = () => import('@/views/SystemMonitoringView.vue')
const TasksManagementView = () => import('@/views/TasksManagementView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes (no authentication required)
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { 
        requiresAuth: false,
        title: 'Admin Login',
        description: 'Secure access to admin dashboard'
      }
    },
    {
      path: '/access-denied',
      name: 'access-denied',
      component: AccessDeniedView,
      meta: { 
        requiresAuth: false,
        title: 'Access Denied'
      }
    },

    // Protected admin routes (require authentication and admin role)
    {
      path: '/',
      name: 'dashboard',
      component: HomeView,
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Dashboard',
        description: 'Admin dashboard overview',
        icon: 'home'
      }
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksManagementView,
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Task Management',
        description: 'Create and manage platform tasks',
        icon: 'tasks'
      }
    },
    {
      path: '/users',
      name: 'users',
      component: UserManagementView,
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'User Management',
        description: 'Manage platform users',
        icon: 'users'
      }
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: AnalyticsView,
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Analytics',
        description: 'Platform analytics and insights',
        icon: 'analytics'
      }
    },
    {
      path: '/content',
      name: 'content',
      component: ContentModerationView,
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Content Moderation',
        description: 'Review and moderate user content',
        icon: 'shield'
      }
    },
    {
      path: '/system',
      name: 'system',
      component: SystemMonitoringView,
      meta: { 
        requiresAuth: true,
        requiresSuperAdmin: true, // Only super admins can access
        title: 'System Monitoring',
        description: 'System health and monitoring',
        icon: 'monitor'
      }
    },

    // Catch-all route for 404s
    // {
    //   path: '/:pathMatch(.*)*',
    //   name: 'not-found',
    //   component: NotFoundView,
    //   meta: { 
    //     title: 'Page Not Found'
    //   }
    // }
  ],
})

// Global navigation guard for authentication and authorization
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Set page title
  document.title = to.meta.title ? `${to.meta.title} - Admin Dashboard` : 'Admin Dashboard'
  
  // Initialize auth if not already done
  if (!authStore.isAuthenticated && localStorage.getItem('adminAuthToken')) {
    authStore.initializeAuth()
    
    // If still not authenticated after init, verify session
    if (!authStore.isAuthenticated) {
      const isValid = await authStore.verifySession()
      if (!isValid && to.meta.requiresAuth) {
        return next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
      }
    }
  }

  // Handle routes that don't require authentication
  if (!to.meta.requiresAuth) {
    // If user is already logged in and trying to access login, redirect to dashboard
    if (to.name === 'login' && authStore.isLoggedIn) {
      return next('/')
    }
    return next()
  }

  // Check if user is authenticated
  if (!authStore.isLoggedIn) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  // Check admin role requirements
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    console.warn('Access denied: Admin role required')
    return next('/access-denied')
  }

  // Check super admin role requirements
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    console.warn('Access denied: Super admin role required')
    return next('/access-denied')
  }

  // All checks passed, proceed to route
  next()
})

// Global after guard for logging and analytics
router.afterEach((to, from) => {
  // Log navigation for audit trail
  if (import.meta.env.PROD) {
    const authStore = useAuthStore()
    if (authStore.isLoggedIn) {
      console.log(`[Admin Navigation] ${authStore.userName} navigated to ${to.path}`)
      
      // Could send to analytics service
      // analyticsAPI.trackNavigation({
      //   userId: authStore.user.id,
      //   from: from.path,
      //   to: to.path,
      //   timestamp: new Date().toISOString()
      // })
    }
  }
})

// Error handling for router
router.onError((error) => {
  console.error('Router error:', error)
  
  // Could redirect to error page or show notification
  if (error.message.includes('Loading chunk')) {
    // Handle chunk loading errors (common in production with code splitting)
    window.location.reload()
  }
})

export default router

// Export route configurations for use in navigation components
export const adminRoutes = [
  {
    name: 'dashboard',
    path: '/',
    title: 'Dashboard',
    icon: 'home',
    description: 'Overview and statistics'
  },
  {
    name: 'tasks',
    path: '/tasks',
    title: 'Tasks',
    icon: 'tasks',
    description: 'Manage platform tasks'
  },
  {
    name: 'users',
    path: '/users',
    title: 'Users',
    icon: 'users',
    description: 'User management'
  },
  {
    name: 'analytics',
    path: '/analytics',
    title: 'Analytics',
    icon: 'analytics',
    description: 'Platform insights'
  },
  {
    name: 'content',
    path: '/content',
    title: 'Content',
    icon: 'shield',
    description: 'Content moderation'
  }
]

// Helper function to check if route requires super admin
export const requiresSuperAdmin = (routeName) => {
  const route = router.getRoutes().find(r => r.name === routeName)
  return route?.meta?.requiresSuperAdmin || false
}