<template>
  <div class="p-6 space-y-6">
    <!-- Welcome Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Welcome back, {{ authStore.userName }}!</h1>
        <p class="text-gray-400 mt-1">Here's what's happening with your platform today.</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="refreshDashboard"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg 
            :class="['w-4 h-4', loading ? 'animate-spin' : '']" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>Refresh</span>
        </button>
        <router-link
          to="/users"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Quick Actions
        </router-link>
      </div>
    </div>

    <!-- System Status Banner -->
    <div v-if="systemStatus !== 'healthy'" :class="[
      'p-4 rounded-lg border-l-4 flex items-center space-x-3',
      systemStatus === 'warning' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200' : 'bg-red-900/20 border-red-500 text-red-200'
    ]">
      <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
      </svg>
      <div>
        <h3 class="font-medium">System Alert</h3>
        <p class="text-sm opacity-90">{{ systemStatusMessage }}</p>
      </div>
      <router-link to="/system" class="ml-auto text-sm underline hover:no-underline">
        View Details
      </router-link>
    </div>

    <!-- Key Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Users -->
      <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-200 text-sm font-medium">Total Users</p>
            <p class="text-3xl font-bold mt-2">{{ formatNumber(stats.totalUsers) }}</p>
            <div class="flex items-center mt-2 text-sm">
              <svg :class="['w-4 h-4 mr-1', stats.userGrowth >= 0 ? 'text-green-300' : 'text-red-300']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="stats.userGrowth >= 0 ? 'M7 17l9.2-9.2M17 17V7m0 10h-10' : 'M17 7l-9.2 9.2M7 7v10m0-10h10'"/>
              </svg>
              <span :class="stats.userGrowth >= 0 ? 'text-green-300' : 'text-red-300'">
                {{ Math.abs(stats.userGrowth) }}% vs last week
              </span>
            </div>
          </div>
          <div class="p-3 bg-blue-500/30 rounded-lg">
            <img src="@/components/icons/users-lined.svg" class="size-6">
          </div>
        </div>
      </div>

      <!-- Active Tasks -->
      <div class="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-200 text-sm font-medium">Active Tasks</p>
            <p class="text-3xl font-bold mt-2">{{ stats.activeTasks }}</p>
            <div class="flex items-center mt-2 text-sm">
              <span class="text-green-300">{{ stats.taskCompletionRate }}% completion rate</span>
            </div>
          </div>
          <div class="p-3 bg-green-500/30 rounded-lg">
            <img src="@/components/icons/check-fat.svg" class="size-6">
          </div>
        </div>
      </div>

      <!-- Revenue Today -->
      <div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-purple-200 text-sm font-medium">Rewards Distributed</p>
            <p class="text-3xl font-bold mt-2">{{ formatNumber(stats.rewardsToday) }}</p>
            <div class="flex items-center mt-2 text-sm">
              <span class="text-purple-300">Gumballs today</span>
            </div>
          </div>
          <div class="p-3 bg-purple-500/30 rounded-lg">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-orange-200 text-sm font-medium">System Health</p>
            <p class="text-3xl font-bold mt-2 capitalize">{{ systemStatus }}</p>
            <div class="flex items-center mt-2 text-sm">
              <div :class="['w-2 h-2 rounded-full mr-2', getStatusColor()]"></div>
              <span class="text-orange-300">{{ stats.uptime }} uptime</span>
            </div>
          </div>
          <div class="p-3 bg-orange-500/30 rounded-lg">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- User Activity Chart -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">User Activity</h3>
          <select 
            v-model="chartTimeframe"
            @change="updateCharts"
            class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        
        <div class="h-64 flex items-center justify-center">
          <div v-if="chartsLoading" class="text-gray-400">
            <div class="animate-spin w-8 h-8 border-2 border-gray-400 border-t-blue-500 rounded-full mx-auto mb-2"></div>
            Loading chart data...
          </div>
          <div v-else class="w-full h-full bg-gray-700/30 rounded-lg flex items-center justify-center text-gray-400">
            <!-- Placeholder for actual chart component -->
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p>Chart Component</p>
              <p class="text-sm">{{ chartTimeframe }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity Feed -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Recent Activity</h3>
          <router-link to="/analytics" class="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            View All
          </router-link>
        </div>
        
        <div class="space-y-4 max-h-64 overflow-y-auto">
          <div 
            v-for="activity in recentActivities" 
            :key="activity.id"
            class="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', getActivityColor(activity.type)]">
              <component :is="getActivityIcon(activity.type)" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium">{{ activity.title }}</p>
              <p class="text-gray-400 text-sm mt-1">{{ activity.description }}</p>
              <p class="text-gray-500 text-xs mt-2">{{ formatTimeAgo(activity.timestamp) }}</p>
            </div>
          </div>
          
          <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <p>No recent activity</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 grid-cols-3 gap-4">
      <router-link 
        to="/tasks"
        class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
      >
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          </div>
          <div>
            <h4 class="text-white font-medium">Create Task</h4>
            <p class="text-gray-400 text-sm">Add new task</p>
          </div>
        </div>
      </router-link>

      <router-link 
        to="/users"
        class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
      >
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition-colors">
            <img src="@/components/icons/users-lined.svg" class="size-6">
          </div>
          <div>
            <h4 class="text-white font-medium">Manage Users</h4>
            <p class="text-gray-400 text-sm">User administration</p>
          </div>
        </div>
      </router-link>

      <!-- <router-link 
        to="/content"
        class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
      >
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-yellow-600/20 rounded-lg group-hover:bg-yellow-600/30 transition-colors">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <h4 class="text-white font-medium">Review Content</h4>
            <p class="text-gray-400 text-sm">Content moderation</p>
          </div>
        </div>
      </router-link> -->

      <router-link 
        to="/analytics"
        class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group"
      >
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h4 class="text-white font-medium">View Analytics</h4>
            <p class="text-gray-400 text-sm">Platform insights</p>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { adminAPI } from '@/services/api'

const authStore = useAuthStore()

// Component state
const loading = ref(false)
const chartsLoading = ref(false)
const chartTimeframe = ref('7d')
const systemStatus = ref('healthy')
const systemStatusMessage = ref('')

// Dashboard stats
const stats = ref({
  totalUsers: 0,
  userGrowth: 0,
  activeTasks: 0,
  taskCompletionRate: 0,
  rewardsToday: 0,
  uptime: '99.9%'
})

// Recent activities
const recentActivities = ref([
  {
    id: 1,
    type: 'user',
    title: 'New User Registration',
    description: 'John Doe joined the platform',
    timestamp: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 2,
    type: 'task',
    title: 'Task Completed',
    description: 'Twitter follow task completed by @user123',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: 3,
    type: 'system',
    title: 'System Update',
    description: 'Database optimization completed',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
])

// Icon components
const UserIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>` }
const TaskIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>` }
const SystemIcon = { template: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>` }

// Methods
const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const formatTimeAgo = (timestamp) => {
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

const getStatusColor = () => {
  switch (systemStatus.value) {
    case 'healthy': return 'bg-green-400'
    case 'warning': return 'bg-yellow-400'
    case 'error': return 'bg-red-400'
    default: return 'bg-gray-400'
  }
}

const getActivityColor = (type) => {
  switch (type) {
    case 'user': return 'bg-blue-500'
    case 'task': return 'bg-green-500'
    case 'system': return 'bg-purple-500'
    default: return 'bg-gray-500'
  }
}

const getActivityIcon = (type) => {
  switch (type) {
    case 'user': return UserIcon
    case 'task': return TaskIcon
    case 'system': return SystemIcon
    default: return SystemIcon
  }
}

const loadDashboardData = async () => {
  loading.value = true
  try {
    // Load system health
    const healthResponse = await adminAPI.getSystemHealth()
    systemStatus.value = healthResponse.data.status

    // Load system stats
    const statsResponse = await adminAPI.getSystemStats()
    stats.value = {
      totalUsers: statsResponse.data.users.total,
      userGrowth: ((statsResponse.data.users.new7d / statsResponse.data.users.total) * 100).toFixed(1),
      activeTasks: statsResponse.data.tasks.active,
      taskCompletionRate: ((statsResponse.data.tasks.completedLast24h / statsResponse.data.tasks.total) * 100).toFixed(1),
      rewardsToday: statsResponse.data.tasks.totalRewardsDistributed,
      uptime: '99.9%' // Would be calculated from actual uptime
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    systemStatus.value = 'error'
    systemStatusMessage.value = 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

const updateCharts = async () => {
  chartsLoading.value = true
  try {
    // Simulate API call for chart data
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In real implementation, load chart data based on timeframe
    console.log('Loading chart data for timeframe:', chartTimeframe.value)
  } catch (error) {
    console.error('Failed to load chart data:', error)
  } finally {
    chartsLoading.value = false
  }
}

const refreshDashboard = async () => {
  await Promise.all([
    loadDashboardData(),
    updateCharts()
  ])
}

// Lifecycle
onMounted(() => {
  loadDashboardData()
  updateCharts()
  
  // Auto-refresh every 5 minutes
  const refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000)
  
  // Cleanup interval on unmount
  return () => clearInterval(refreshInterval)
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Card hover effects */
.group:hover {
  transform: translateY(-1px);
}

/* Gradient animations */
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.bg-gradient-to-br {
  background-size: 200% 200%;
  animation: gradient 6s ease infinite;
}

/* Loading spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>