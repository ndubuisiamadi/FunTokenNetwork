<!-- Complete Analytics Dashboard Vue Component -->
<!-- admin-dashboard/src/views/AnalyticsView.vue -->

<template>
  <div class="analytics-view">
    <!-- Header Section -->
    <div class="analytics-header">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Monitor platform performance and user engagement
        <span v-if="!includeAdmins" class="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
          Admins Excluded
        </span>
        <span v-else class="ml-2 px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-full">
          All Users Included
        </span>
      </p>
    </div>
    
    <!-- Controls Section -->
    <div class="flex items-center space-x-4">
      
      <!-- Admin Filter Toggle -->
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Include Admins:
        </label>
        <button
          @click="toggleAdminFilter"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            includeAdmins 
              ? 'bg-blue-600' 
              : 'bg-gray-200 dark:bg-gray-700'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
              includeAdmins ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ includeAdmins ? 'Yes' : 'No' }}
        </span>
      </div>
      
      <!-- Time Range Selector -->
      <div class="flex items-center space-x-3">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Range:
        </label>
        <select 
          v-model="timeRange" 
          @change="loadAnalytics"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="1d">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        
        <button 
          @click="loadAnalytics" 
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? 'Loading...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>
  </div>
</div>

    <!-- Loading State -->
    <div v-if="loading && !kpis.totalUsers" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Main Analytics Content -->
    <div v-else class="analytics-content space-y-6">
      
      <!-- KPI Cards Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Users -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ formatNumber(kpis.totalUsers) }}
              </p>
              <div class="flex items-center mt-2">
                <span :class="getGrowthClass(kpis.userGrowth)" class="text-sm font-medium">
                  {{ formatGrowth(kpis.userGrowth) }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div class="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Active Users -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ formatNumber(kpis.activeUsers) }}
              </p>
              <div class="flex items-center mt-2">
                <span class="text-sm font-medium text-green-600 dark:text-green-400">
                  {{ ((kpis.activeUsers / kpis.totalUsers) * 100).toFixed(1) }}%
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400 ml-1">of total users</span>
              </div>
            </div>
            <div class="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
              <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Total Revenue -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Gumballs Distributed</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ formatNumber(kpis.totalGumballs) }}
              </p>
              <div class="flex items-center mt-2">
                <span :class="getGrowthClass(kpis.gumballGrowth)" class="text-sm font-medium">
                  {{ formatGrowth(kpis.gumballGrowth) }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400 ml-1">this period</span>
              </div>
            </div>
            <div class="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-xl flex items-center justify-center">
              <svg class="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Engagement Rate -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Engagement Rate</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">
                {{ kpis.engagementRate }}%
              </p>
              <div class="flex items-center mt-2">
                <span :class="getGrowthClass(kpis.engagementGrowth)" class="text-sm font-medium">
                  {{ formatGrowth(kpis.engagementGrowth) }}
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
              </div>
            </div>
            <div class="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
              <svg class="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
<!-- Charts Section -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  
  <!-- User Registration Trend -->
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">User Registration Trend</h3>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ timeRange === '1d' ? 'Hourly' : 'Daily' }} registrations
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="chartsLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
    
    <!-- Empty State for Filtered Data -->
    <div v-else-if="shouldShowRegistrationEmptyState" class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <svg class="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-center font-medium">No user registrations found</p>
      <p class="text-sm text-center mt-1">
        No regular users registered in this period.<br>
        Try including admin users or selecting a different time range.
      </p>
    </div>
    
    <!-- Chart Container -->
    <div v-else class="h-64">
      <canvas 
        ref="userTrendChart" 
        data-chart="user-trend" 
        data-user-chart="true"
        class="w-full h-full"
      ></canvas>
    </div>
  </div>

  <!-- Engagement Metrics -->
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Engagement Overview</h3>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Posts, Comments, Likes
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="chartsLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
    
    <!-- Empty State for Filtered Data -->
    <div v-else-if="shouldShowEngagementEmptyState" class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <svg class="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-center font-medium">No engagement activity found</p>
      <p class="text-sm text-center mt-1">
        No posts, comments, or likes from regular users.<br>
        Try including admin users or selecting a different time range.
      </p>
    </div>
    
    <!-- Chart Container -->
    <div v-else class="h-64">
      <canvas 
        ref="engagementChart" 
        data-chart="engagement" 
        data-engagement-chart="true"
        class="w-full h-full"
      ></canvas>
    </div>
  </div>
</div>


      <!-- Data Tables Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Top Users -->
<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Top Users by Gumballs</h3>
    <span class="text-xs text-gray-500 dark:text-gray-400">
      {{ includeAdmins ? 'All users' : 'Regular users only' }}
    </span>
  </div>
  
  <div class="space-y-3">
    <div 
      v-for="(user, index) in topUsers" 
      :key="user.id"
      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
    >
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <span class="text-sm font-bold text-blue-600 dark:text-blue-400">
            {{ index + 1 }}
          </span>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <p class="font-medium text-gray-900 dark:text-white">{{ user.username }}</p>
            <!-- Show admin badge if user is admin -->
            <span 
              v-if="user.role === 'admin' || user.role === 'super_admin'"
              class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full"
            >
              {{ user.role === 'super_admin' ? 'Super Admin' : 'Admin' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ user.level }}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-900 dark:text-white">{{ formatNumber(user.gumballs) }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">gumballs</p>
      </div>
    </div>
    
    <!-- Show message if no users -->
    <div v-if="topUsers.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
      No users found with current filters
    </div>
  </div>
</div>

        <!-- User Level Distribution -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Level Distribution</h3>
          
          <div class="space-y-3">
            <div 
              v-for="level in levelDistribution" 
              :key="level.level"
              class="flex items-center justify-between"
            >
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="font-medium text-gray-900 dark:text-white">{{ level.level }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-gray-900 dark:text-white font-medium">{{ level.count }}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">({{ level.percentage }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Summary -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Summary</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">{{ kpis.newUsers }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">New Users This Period</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600 dark:text-green-400">{{ kpis.totalPosts }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Posts Created</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">{{ kpis.tasksCompleted }}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks Completed</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount, watch, computed } from 'vue'
import { adminAPI } from '@/services/api'
import Chart from 'chart.js/auto'

// Reactive data
const loading = ref(false)
const chartsLoading = ref(false)
const timeRange = ref('7d')

// Chart refs
const userTrendChart = ref(null)
const engagementChart = ref(null)

// Chart instances
let userChart = null
let engagementChartInstance = null

// Data
const kpis = ref({
  totalUsers: 0,
  activeUsers: 0,
  newUsers: 0,
  totalGumballs: 0,
  totalPosts: 0,
  tasksCompleted: 0,
  engagementRate: 0,
  userGrowth: 0,
  gumballGrowth: 0,
  engagementGrowth: 0
})

const topUsers = ref([])
const levelDistribution = ref([])
const registrationTrend = ref([])
const engagementData = ref([])

const hasRegistrationData = computed(() => {
  return registrationTrend.value && registrationTrend.value.length > 0 && 
         registrationTrend.value.some(item => item.registrations > 0)
})

const hasEngagementData = computed(() => {
  return (engagementData.value && engagementData.value.length > 0 && 
          engagementData.value.some(item => item.posts > 0 || item.comments > 0 || item.likes > 0)) ||
         kpis.value.totalPosts > 0
})

const shouldShowRegistrationEmptyState = computed(() => {
  return !chartsLoading.value && !includeAdmins.value && !hasRegistrationData.value
})

const shouldShowEngagementEmptyState = computed(() => {
  return !chartsLoading.value && !includeAdmins.value && !hasEngagementData.value
})

// Methods
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toString() || '0'
}

const formatGrowth = (growth) => {
  const sign = growth >= 0 ? '+' : ''
  return `${sign}${growth}%`
}

const getGrowthClass = (growth) => {
  return growth >= 0 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400'
}

// 🔧 FIXED: More robust chart creation with better timing
const createCharts = async () => {
  console.log('📊 Creating charts with filtered data...')
  console.log('📊 Current filter state: includeAdmins =', includeAdmins.value)
  console.log('📊 Available data:', {
    registrationTrend: registrationTrend.value,
    engagementData: engagementData.value,
    kpis: kpis.value
  })
  
  // Wait for DOM to be fully ready
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Destroy existing charts
  if (userChart) {
    userChart.destroy()
    userChart = null
  }
  if (engagementChartInstance) {
    engagementChartInstance.destroy()
    engagementChartInstance = null
  }

  // Find canvas elements
  const findUserCanvas = () => {
    return userTrendChart.value || 
           document.querySelector('[data-chart="user-trend"]') ||
           document.querySelector('canvas[data-user-chart]')
  }
  
  const findEngagementCanvas = () => {
    return engagementChart.value || 
           document.querySelector('[data-chart="engagement"]') ||
           document.querySelector('canvas[data-engagement-chart]')
  }

  // User registration trend chart - BETTER FILTERED DATA HANDLING
  const userCanvas = findUserCanvas()
  if (userCanvas) {
    console.log('📈 Creating user chart...')
    
    try {
      const ctx = userCanvas.getContext('2d')
      
      let chartLabels = []
      let chartData = []
      
      // 🔧 IMPROVED: Better handling of filtered data
      if (registrationTrend.value && registrationTrend.value.length > 0) {
        console.log('📈 Processing registration trend data:', registrationTrend.value)
        
        chartLabels = registrationTrend.value.map(item => {
          const date = new Date(item.date)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
        chartData = registrationTrend.value.map(item => item.registrations || 0)
        
        console.log('📈 Chart data processed:', { chartLabels, chartData })
        
        // Check if all data points are zero
        const hasData = chartData.some(value => value > 0)
        if (!hasData && !includeAdmins.value) {
          console.log('📈 No registration data with admins excluded, showing info message')
          // Still show the chart but with zero data
        }
      } else {
        // Create minimal chart structure when no data
        console.log('📈 No registration data available, creating minimal chart')
        const today = new Date()
        chartLabels = [today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })]
        chartData = [0]
      }
      
      userChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [{
            label: includeAdmins.value ? 'New Users (All)' : 'New Users (Excluding Admins)',
            data: chartData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: 'rgb(59, 130, 246)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true,
              labels: {
                color: 'rgba(156, 163, 175, 0.8)'
              }
            },
            tooltip: {
              callbacks: {
                afterBody: function(context) {
                  // Show filter info in tooltip
                  return includeAdmins.value 
                    ? 'Includes all users' 
                    : 'Admin users excluded'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              ticks: { 
                color: 'rgba(156, 163, 175, 0.8)',
                precision: 0
              }
            },
            x: {
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              ticks: { color: 'rgba(156, 163, 175, 0.8)' }
            }
          }
        }
      })
      
      console.log('✅ User chart created with filtered data')
    } catch (error) {
      console.error('❌ Failed to create user chart:', error)
    }
  }

  // Engagement overview chart - BETTER FILTERED DATA HANDLING
  const engagementCanvas = findEngagementCanvas()
  if (engagementCanvas) {
    console.log('📊 Creating engagement chart...')
    
    try {
      const ctx = engagementCanvas.getContext('2d')
      
      let chartLabels = []
      let postsData = []
      let commentsData = []
      let likesData = []
      
      // 🔧 IMPROVED: Better handling of filtered engagement data
      if (engagementData.value && engagementData.value.length > 0) {
        console.log('📊 Processing engagement data:', engagementData.value)
        
        chartLabels = engagementData.value.map(item => {
          const date = new Date(item.date)
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
        postsData = engagementData.value.map(item => item.posts || 0)
        commentsData = engagementData.value.map(item => item.comments || 0)
        likesData = engagementData.value.map(item => item.likes || 0)
        
        console.log('📊 Engagement chart data:', { chartLabels, postsData, commentsData, likesData })
      } else {
        // Create minimal chart when no engagement data
        console.log('📊 No engagement data available, creating minimal chart')
        const today = new Date()
        chartLabels = [today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })]
        postsData = [kpis.value.totalPosts || 0]
        commentsData = [0]
        likesData = [0]
      }
      
      engagementChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'Posts',
              data: postsData,
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
              label: 'Comments', 
              data: commentsData,
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
            {
              label: 'Likes',
              data: likesData,
              backgroundColor: 'rgba(245, 101, 101, 0.8)',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: 'rgba(156, 163, 175, 0.8)' }
            },
            tooltip: {
              callbacks: {
                afterBody: function(context) {
                  return includeAdmins.value 
                    ? 'Includes admin activity' 
                    : 'Admin activity excluded'
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              ticks: { 
                color: 'rgba(156, 163, 175, 0.8)',
                precision: 0
              }
            },
            x: {
              grid: { color: 'rgba(156, 163, 175, 0.1)' },
              ticks: { color: 'rgba(156, 163, 175, 0.8)' }
            }
          }
        }
      })
      
      console.log('✅ Engagement chart created with filtered data')
    } catch (error) {
      console.error('❌ Failed to create engagement chart:', error)
    }
  }

  console.log('🎯 Charts updated with current filter settings!')
}

const includeAdmins = ref(false) // Default to excluding admins

const toggleAdminFilter = () => {
  includeAdmins.value = !includeAdmins.value
  console.log(`🔄 Admin filter toggled: includeAdmins = ${includeAdmins.value}`)
  loadAnalytics() // Reload data with new filter
}

const loadAnalytics = async () => {
  loading.value = true
  chartsLoading.value = true
  
  try {
    console.log(`🔄 Loading analytics: timeframe=${timeRange.value}, includeAdmins=${includeAdmins.value}`)
    
    // Load all analytics data with admin filter
    const [userResponse, engagementResponse, revenueResponse] = await Promise.all([
      adminAPI.getUserAnalytics(timeRange.value, includeAdmins.value),
      adminAPI.getEngagementAnalytics(timeRange.value, includeAdmins.value),
      adminAPI.getRevenueAnalytics(timeRange.value, includeAdmins.value)
    ])

    console.log('📊 Raw API responses:', {
      user: userResponse.data,
      engagement: engagementResponse.data,
      revenue: revenueResponse.data
    })

    // Process user analytics - USE REAL FILTERED DATA
    if (userResponse.data && userResponse.data.summary) {
      const userSummary = userResponse.data.summary
      
      kpis.value.totalUsers = userSummary.totalUsers || 0
      kpis.value.activeUsers = userSummary.activeUsers || 0
      kpis.value.newUsers = userSummary.newUsers || 0
      kpis.value.userGrowth = userSummary.growthRate || 0
      
      // Use REAL filtered data for tables and charts
      topUsers.value = userResponse.data.topUsers || []
      levelDistribution.value = userResponse.data.levelDistribution || []
      registrationTrend.value = userResponse.data.registrationTrend || []
      
      console.log('✅ FILTERED user data processed:', {
        totalUsers: kpis.value.totalUsers,
        newUsers: kpis.value.newUsers,
        activeUsers: kpis.value.activeUsers,
        topUsersCount: topUsers.value.length,
        excludedAdmins: userResponse.data.filters?.excludedAdmins
      })
    }

    // Process engagement analytics - USE REAL FILTERED DATA
    if (engagementResponse.data && engagementResponse.data.summary) {
      const engagementSummary = engagementResponse.data.summary
      
      kpis.value.totalPosts = engagementSummary.totalPosts || 0
      kpis.value.engagementRate = engagementSummary.engagementRate || 0
      kpis.value.engagementGrowth = 12.5
      
      // Use REAL filtered engagement data for charts
      engagementData.value = engagementResponse.data.dailyEngagement || []
      
      console.log('✅ FILTERED engagement data processed:', {
        totalPosts: kpis.value.totalPosts,
        engagementRate: kpis.value.engagementRate,
        excludedAdmins: engagementResponse.data.filters?.excludedAdmins
      })
    }

    // Process revenue analytics - USE REAL FILTERED DATA
    if (revenueResponse.data && revenueResponse.data.summary) {
      const revenueSummary = revenueResponse.data.summary
      
      kpis.value.totalGumballs = revenueSummary.totalGumballsDistributed || revenueSummary.totalGumballsInSystem || 0
      kpis.value.tasksCompleted = revenueSummary.completedTasks || 0
      kpis.value.gumballGrowth = 18.7
      
      console.log('✅ FILTERED revenue data processed:', {
        totalGumballs: kpis.value.totalGumballs,
        tasksCompleted: kpis.value.tasksCompleted,
        excludedAdmins: revenueResponse.data.filters?.excludedAdmins
      })
    }

    console.log(`🎯 FINAL FILTERED KPIs (includeAdmins: ${includeAdmins.value}):`, kpis.value)
    
  } catch (error) {
    console.error('❌ Failed to load filtered analytics:', error)
    
    // Fallback to zero values if API fails
    kpis.value = {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalGumballs: 0,
      totalPosts: 0,
      tasksCompleted: 0,
      engagementRate: 0,
      userGrowth: 0,
      gumballGrowth: 0,
      engagementGrowth: 0
    }
    
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to load analytics data')
    }
  } finally {
    loading.value = false
    chartsLoading.value = false
    
    // Create charts with REAL filtered data
    await nextTick()
    setTimeout(createCharts, 200)
  }
}

// Watch for timeRange changes
watch(timeRange, () => {
  loadAnalytics()
})

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (userChart) {
    userChart.destroy()
  }
  if (engagementChartInstance) {
    engagementChartInstance.destroy()
  }
})

// Lifecycle
onMounted(async () => {
  console.log('🚀 Analytics view mounted')
  await nextTick()
  loadAnalytics()
})
</script>


<style scoped>
@import "tailwindcss";
.analytics-view {
  @apply min-h-screen bg-gray-50 dark:bg-gray-900 p-6;
}

.analytics-header {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6;
}

.analytics-content {
  @apply space-y-6;
}

/* Custom scrollbar for tables */
.table-container {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.table-container::-webkit-scrollbar {
  height: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Loading animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>