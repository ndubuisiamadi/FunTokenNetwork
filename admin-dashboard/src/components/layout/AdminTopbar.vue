<template>
  <header class="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
    <!-- Left Section: Breadcrumbs & Page Title -->
    <div class="flex items-center space-x-4">
      <!-- Mobile menu toggle -->
      <button
        @click="toggleMobileMenu"
        class="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center space-x-2 text-xs">
        <router-link to="/" class="text-gray-400 hover:text-white transition-colors">
          Admin
        </router-link>
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="text-white font-medium">{{ currentPageTitle }}</span>
      </nav>
    </div>

    <!-- Right Section: Search, Notifications, User Menu -->
    <div class="flex items-center space-x-4">
      <!-- Quick Search -->
      <div class="hidden sm:block relative">
        <div class="relative">
          <input
            v-model="searchQuery"
            @keydown.enter="performSearch"
            @focus="showSearchResults = true"
            @blur="hideSearchResults"
            type="text"
            placeholder="Quick search..."
            class="w-64 pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-xs rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Search Results Dropdown -->
        <div
          v-if="showSearchResults && searchQuery"
          class="absolute top-full mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          <div v-if="searchLoading" class="p-4 text-center text-gray-400">
            <div class="animate-spin w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full mx-auto"></div>
          </div>
          <div v-else-if="searchResults.length === 0" class="p-4 text-center text-gray-400">
            No results found
          </div>
          <div v-else class="py-2">
            <div
              v-for="result in searchResults"
              :key="`${result.type}-${result.id}`"
              @click="navigateToResult(result)"
              class="px-4 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <component :is="getResultIcon(result.type)" class="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <p class="text-white text-sm font-medium">{{ result.title }}</p>
                  <p class="text-gray-400 text-xs">{{ result.subtitle }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Status Indicator -->
      <div class="flex items-center space-x-2">
        <div
          :class="[
            'w-3 h-3 rounded-full',
            systemStatus === 'healthy' ? 'bg-green-400' : 
            systemStatus === 'warning' ? 'bg-yellow-400' : 
            'bg-red-400'
          ]"
          :title="`System status: ${systemStatus}`"
        ></div>
        <span class="hidden sm:inline text-sm text-gray-400">
          {{ systemStatusText }}
        </span>
      </div>

      <!-- Notifications -->
      <div class="relative">
        <button
          @click="toggleNotifications"
          class="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          :title="notifications.length > 0 ? `${notifications.length} notifications` : 'No notifications'"
        >
          <img src="@/components/icons/bell-lined.svg" class="size-6">
          <span
            v-if="notifications.length > 0"
            class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {{ notifications.length > 9 ? '9+' : notifications.length }}
          </span>
        </button>

        <!-- Notifications Dropdown -->
        <div
          v-if="showNotifications"
          class="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
        >
          <div class="p-4 border-b border-gray-600">
            <div class="flex items-center justify-between">
              <h3 class="text-white font-medium">Notifications</h3>
              <button
                @click="markAllAsRead"
                class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Mark all read
              </button>
            </div>
          </div>
          
          <div v-if="notifications.length === 0" class="p-8 text-center text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <p>No new notifications</p>
          </div>
          
          <div v-else class="divide-y divide-gray-600">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              @click="handleNotificationClick(notification)"
              :class="[
                'p-4 hover:bg-gray-700 cursor-pointer transition-colors',
                !notification.read ? 'bg-gray-700/50' : ''
              ]"
            >
              <div class="flex items-start space-x-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    notification.type === 'error' ? 'bg-red-500' :
                    notification.type === 'warning' ? 'bg-yellow-500' :
                    notification.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                  ]"
                >
                  <component :is="getNotificationIcon(notification.type)" class="w-4 h-4 text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-white text-sm font-medium">{{ notification.title }}</p>
                  <p class="text-gray-400 text-sm mt-1">{{ notification.message }}</p>
                  <p class="text-gray-500 text-xs mt-2">{{ formatTime(notification.timestamp) }}</p>
                </div>
                <div v-if="!notification.read" class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- User Menu -->
      <div class="relative">
        <button
          @click="toggleUserMenu"
          class="flex items-center space-x-3 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="hidden sm:block text-left">
            <p class="text-sm font-medium">{{ authStore.userName }}</p>
            <p class="text-xs text-gray-400">{{ authStore.user?.role === 'super_admin' ? 'Super Admin' : 'Admin' }}</p>
          </div>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- User Dropdown Menu -->
        <div
          v-if="showUserMenu"
          class="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50"
        >
          <div class="p-3 border-b border-gray-600">
            <p class="text-white font-medium">{{ authStore.userName }}</p>
            <p class="text-gray-400 text-sm">{{ authStore.user?.email }}</p>
          </div>
          
          <div class="py-2">
            <a
              href="#"
              @click.prevent="viewProfile"
              class="flex items-center px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              View Profile
            </a>
            <a
              href="#"
              @click.prevent="viewSettings"
              class="flex items-center px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Settings
            </a>
          </div>
          
          <div class="border-t border-gray-600">
            <button
              @click="logout"
              class="w-full flex items-center px-3 py-2 text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Component state
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const showSearchResults = ref(false)
const showNotifications = ref(false)
const showUserMenu = ref(false)
const systemStatus = ref('healthy') // healthy, warning, error
const notifications = ref([
  // Sample notifications - would come from API
  {
    id: 1,
    type: 'warning',
    title: 'High Server Load',
    message: 'CPU usage is above 80%',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false
  },
  {
    id: 2,
    type: 'info',
    title: 'New User Registration',
    message: '5 new users registered in the last hour',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false
  }
])

// Computed properties
const currentPageTitle = computed(() => {
  const routeMap = {
    '/': 'Dashboard',
    '/tasks': 'Task Management',
    '/users': 'User Management',
    '/analytics': 'Analytics',
    '/content': 'Content Moderation',
    '/system': 'System Monitoring'
  }
  return routeMap[route.path] || 'Unknown Page'
})

const systemStatusText = computed(() => {
  const statusMap = {
    healthy: 'All Systems Operational',
    warning: 'Some Issues Detected',
    error: 'Critical Issues'
  }
  return statusMap[systemStatus.value]
})

// Icon components
const UserIcon = { template: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>` }
const TaskIcon = { template: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>` }
const ErrorIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>` }
const WarningIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>` }
const SuccessIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>` }
const InfoIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>` }

// Methods
const toggleMobileMenu = () => {
  // Emit event to parent to toggle mobile menu
  console.log('Toggle mobile menu')
}

const performSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  searchLoading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    searchResults.value = [
      {
        id: 1,
        type: 'user',
        title: 'John Doe',
        subtitle: 'Active user - Level 5'
      },
      {
        id: 2,
        type: 'task',
        title: 'Follow @example',
        subtitle: 'Twitter task - 1000 Gs reward'
      }
    ]
  } catch (error) {
    console.error('Search failed:', error)
  } finally {
    searchLoading.value = false
  }
}

const hideSearchResults = () => {
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

const navigateToResult = (result) => {
  showSearchResults.value = false
  searchQuery.value = ''
  
  if (result.type === 'user') {
    router.push(`/users/${result.id}`)
  } else if (result.type === 'task') {
    router.push(`/tasks/${result.id}`)
  }
}

const getResultIcon = (type) => {
  const iconMap = {
    user: UserIcon,
    task: TaskIcon
  }
  return iconMap[type] || UserIcon
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
}

const markAllAsRead = () => {
  notifications.value.forEach(notification => {
    notification.read = true
  })
}

const handleNotificationClick = (notification) => {
  notification.read = true
  showNotifications.value = false
  
  // Navigate based on notification type
  if (notification.type === 'warning') {
    router.push('/system')
  }
}

const getNotificationIcon = (type) => {
  const iconMap = {
    error: ErrorIcon,
    warning: WarningIcon,
    success: SuccessIcon,
    info: InfoIcon
  }
  return iconMap[type] || InfoIcon
}

const formatTime = (timestamp) => {
  const now = new Date()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const viewProfile = () => {
  showUserMenu.value = false
  console.log('View profile')
}

const viewSettings = () => {
  showUserMenu.value = false
  console.log('View settings')
}

const logout = async () => {
  showUserMenu.value = false
  await authStore.logout()
  router.push('/login')
}

// Click outside to close dropdowns
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showNotifications.value = false
    showUserMenu.value = false
    showSearchResults.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // Load system status
  // loadSystemStatus()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>