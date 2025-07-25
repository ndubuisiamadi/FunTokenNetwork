<template>
  <div class="flex flex-col h-full bg-gray-800 border-r border-gray-700">
    <!-- Logo Section -->
    <div class="flex items-center justify-center h-16 px-4 border-b border-gray-700">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div v-if="!collapsed">
          <h1 class="text-white font-bold text-lg">Admin</h1>
          <p class="text-gray-400 text-xs">Dashboard</p>
        </div>
      </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
      <!-- Main Navigation -->
      <div class="space-y-1">
        <router-link
          v-for="item in mainNavItems"
          :key="item.name"
          :to="item.path"
          :class="[
            'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            isActiveRoute(item.path)
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          ]"
          :title="collapsed ? item.title : ''"
        >
          <component 
            :is="item.icon" 
            :class="[
              'w-5 h-5 transition-colors',
              collapsed ? 'mx-auto' : 'mr-3',
              isActiveRoute(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-white'
            ]" 

          />
          <span v-if="!collapsed" class="truncate text-xs">{{ item.title }}</span>
          <span 
            v-if="!collapsed && item.badge" 
            class="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <!-- Management Section -->
      <div v-if="!collapsed" class="pt-4">
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Management
        </h3>
        <div class="mt-2 space-y-1">
          <router-link
            v-for="item in managementNavItems"
            :key="item.name"
            :to="item.path"
            :class="[
              'group flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200',
              isActiveRoute(item.path)
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                item.title == 'Content' ? 'hidden' : ''
            ]"
          >
            <component 
              :is="item.icon" 
              :class="[
                'w-5 h-5 mr-3 transition-colors',
                isActiveRoute(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-white'
              ]" 
            />
            <span class="truncate">{{ item.title }}</span>
            <span 
              v-if="item.badge" 
              class="ml-auto bg-yellow-500 text-white text-xs rounded-full px-2 py-1"
            >
              {{ item.badge }}
            </span>
          </router-link>
        </div>
      </div>

      <!-- System Section (Super Admin Only) -->
      <div v-if="!collapsed && authStore.isSuperAdmin" class="pt-4">
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          System
        </h3>
        <div class="mt-2 space-y-1">
          <router-link
            v-for="item in systemNavItems"
            :key="item.name"
            :to="item.path"
            :class="[
              'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              isActiveRoute(item.path)
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            ]"
          >
            <component 
              :is="item.icon" 
              :class="[
                'w-5 h-5 mr-3 transition-colors',
                isActiveRoute(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-white'
              ]" 
            />
            <span class="truncate text-xs">{{ item.title }}</span>
            <span 
              v-if="item.status === 'warning'" 
              class="ml-auto w-2 h-2 bg-yellow-400 rounded-full"
            ></span>
            <span 
              v-if="item.status === 'error'" 
              class="ml-auto w-2 h-2 bg-red-400 rounded-full animate-pulse"
            ></span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Collapse Toggle -->
    <div class="px-3 py-4 border-t border-gray-700">
      <button
        @click="toggleCollapse"
        class="w-full flex items-center justify-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <svg 
          :class="[
            'w-5 h-5 transition-transform duration-200',
            collapsed ? 'rotate-180' : ''
          ]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        <span v-if="!collapsed" class="ml-2 text-sm">Collapse</span>
      </button>
    </div>

    <!-- User Info Footer -->
    <div v-if="!collapsed" class="px-3 py-4 border-t border-gray-700">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ authStore.userName }}
          </p>
          <p class="text-xs text-gray-400 truncate">
            {{ authStore.user?.role === 'super_admin' ? 'Super Admin' : 'Admin' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Icons (we'll use simple SVG components for now)
const DashboardIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"/></svg>`
}

const TasksIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`
}

const UsersIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
}

const AnalyticsIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`
}

const ContentIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`
}

const SystemIcon = {
  template: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
}

const route = useRoute()
const authStore = useAuthStore()
const collapsed = ref(false)

// Navigation items
const mainNavItems = [
  {
    name: 'dashboard',
    path: '/',
    title: 'Dashboard',
    icon: DashboardIcon
  },
  {
    name: 'tasks',
    path: '/tasks',
    title: 'Tasks',
    icon: TasksIcon,
    badge: null // Could show pending tasks count
  },
  {
    name: 'analytics',
    path: '/analytics',
    title: 'Analytics',
    icon: AnalyticsIcon
  }
]

const managementNavItems = [
  {
    name: 'users',
    path: '/users',
    title: 'Users',
    icon: UsersIcon,
    badge: null // Could show new users count
  },
  {
    name: 'content',
    path: '/content',
    title: 'Content',
    icon: ContentIcon,
    badge: null // Could show pending content count
  }
]

const systemNavItems = [
  {
    name: 'system',
    path: '/system',
    title: 'System Monitor',
    icon: SystemIcon,
    status: 'healthy' // healthy, warning, error
  }
]

// Methods
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

const isActiveRoute = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
/* Custom scrollbar for navigation */
nav::-webkit-scrollbar {
  width: 4px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Smooth transitions */
/* .router-link-active {
  @apply bg-blue-600 text-white;
} */

/* Badge animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>