// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Import your views
import SignUpView from '../views/SignUpView.vue'
import HomeView from '../views/HomeView.vue'
import TasksView from '../views/TasksView.vue'
import MessagesView from '../views/MessagesView.vue'
import ChatView from '../views/ChatView.vue'
import FriendsView from '@/views/FriendsView.vue'
import CommunitiesView from '@/views/CommunitiesView.vue'
import UserProfileView from '@/views/UserProfileView.vue'
import CommunityView from '@/views/CommunityView.vue'
import CreateAccountView from '@/views/CreateAccountView.vue'
import LogInView from '@/views/LogInView.vue'
import ProfileView from '@/views/ProfileView.vue'
import LeaderboardView from '@/views/LeaderboardView.vue'
import EditProfileView from '@/views/EditProfileView.vue'
import SearchView from '@/views/SearchView.vue'
import EmailVerificationView from '@/views/EmailVerificationView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes (guest only - when not logged in)
    {
      path: '/login',
      name: 'login',
      component: LogInView,
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignUpView,
      meta: { requiresGuest: true }
    },
    {
  path: '/verify-email',
  name: 'email-verification',
  component: EmailVerificationView,
  meta: { requiresGuest: true }
},
    
    // Profile completion route (for newly registered users)
    {
      path: '/create-account',
      name: 'create-account',
      component: CreateAccountView,
      meta: { requiresAuth: true, allowIncompleteProfile: true }
    },
    
    // Protected routes (require authentication AND complete profile)
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: TasksView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/messages',
      name: 'messages',
      component: MessagesView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    // {
    //   path: '/chat/:id',
    //   name: 'chat',
    //   component: ChatView,
    //   meta: { requiresAuth: true, requiresCompleteProfile: true }
    // },
    {
      path: '/communities',
      name: 'communities',
      component: CommunitiesView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/friends',
      name: 'friends',
      component: FriendsView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/community',
      name: 'community',
      component: CommunityView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/community/:id',
      name: 'community',
      component: CommunityView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: LeaderboardView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
      path: '/user-profile',
      name: 'user-profile',
      component: UserProfileView,
      meta: { requiresAuth: true, requiresCompleteProfile: true }
    },
    {
  path: '/user-profile/:userId',  // Add parameter
  name: 'user-profile', 
  component: UserProfileView,
  meta: { requiresAuth: true, requiresCompleteProfile: true }
},
// Add a route for current user's own profile
{
  path: '/profile',
  name: 'my-profile',
  component: UserProfileView,  // Same component, will detect it's own profile
  meta: { requiresAuth: true, requiresCompleteProfile: true }
},
{
  path: '/profile/edit',
  name: 'edit-profile',
  component: EditProfileView,
  meta: { requiresAuth: true, requiresCompleteProfile: true }
},
{
  path: '/search',
  name: 'search',
  component: SearchView,
  meta: { requiresAuth: true, requiresCompleteProfile: true }
}
  ],
})

// Enhanced navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth state from localStorage if not already done
  if (!authStore.isAuthenticated && localStorage.getItem('authToken')) {
    authStore.initializeAuth()
    
    // Wait a bit for the auth verification to complete
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresCompleteProfile = to.matched.some(record => record.meta.requiresCompleteProfile)
  const allowIncompleteProfile = to.matched.some(record => record.meta.allowIncompleteProfile)

  // If not authenticated and trying to access protected route
  if (requiresAuth && !authStore.isLoggedIn) {
    return next('/login')
  }
  
  // If authenticated and trying to access guest-only routes
  if (requiresGuest && authStore.isLoggedIn) {
    if (authStore.hasIncompleteProfile) {
      return next('/create-account')
    } else {
      return next('/')
    }
  }

  // Check profile completion for authenticated users on protected routes
  if (authStore.isLoggedIn && requiresCompleteProfile && authStore.hasIncompleteProfile) {
    return next('/create-account')
  }

  // If user has complete profile but trying to access create-account
  if (authStore.isLoggedIn && to.path === '/create-account' && !authStore.hasIncompleteProfile && !allowIncompleteProfile) {
    return next('/')
  }

  next()
})

export default router