<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white">System Monitoring</h1>
        <p class="text-gray-400 mt-1">Real-time system health and performance metrics</p>
      </div>
      <div class="flex items-center space-x-3">
        <!-- Auto Refresh Toggle -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-400">Auto-refresh:</span>
          <button
            @click="toggleAutoRefresh"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              autoRefresh ? 'bg-green-600' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                autoRefresh ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
          <span v-if="autoRefresh" class="text-sm text-green-400">{{ refreshInterval }}s</span>
        </div>
        
        <!-- Manual Refresh -->
        <button
          @click="refreshMetrics"
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
      </div>
    </div>

    <!-- System Status Banner -->
    <div :class="[
      'p-4 rounded-lg border-l-4 flex items-center justify-between',
      getSystemStatusClass()
    ]">
      <div class="flex items-center space-x-3">
        <div :class="['w-3 h-3 rounded-full', getStatusIndicatorClass()]"></div>
        <div>
          <h3 class="font-medium">System Status: {{ systemHealth.status.toUpperCase() }}</h3>
          <p class="text-sm opacity-90">{{ getStatusMessage() }}</p>
        </div>
      </div>
      <div class="text-sm opacity-75">
        Last updated: {{ formatTime(lastUpdated) }}
      </div>
    </div>

    <!-- Core System Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Server Health -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Server Health</h3>
          <div :class="['w-3 h-3 rounded-full', systemHealth.server.status === 'healthy' ? 'bg-green-400' : 'bg-red-400']"></div>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Uptime</span>
            <span class="text-white font-medium">{{ systemHealth.server.uptime }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">CPU Usage</span>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-2">
                <div 
                  :class="[
                    'h-2 rounded-full transition-all duration-300',
                    systemHealth.server.cpu > 80 ? 'bg-red-500' :
                    systemHealth.server.cpu > 60 ? 'bg-yellow-500' :
                    'bg-green-500'
                  ]"
                  :style="{ width: systemHealth.server.cpu + '%' }"
                ></div>
              </div>
              <span class="text-white text-sm">{{ systemHealth.server.cpu }}%</span>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Memory</span>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-2">
                <div 
                  :class="[
                    'h-2 rounded-full transition-all duration-300',
                    systemHealth.server.memory > 85 ? 'bg-red-500' :
                    systemHealth.server.memory > 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  ]"
                  :style="{ width: systemHealth.server.memory + '%' }"
                ></div>
              </div>
              <span class="text-white text-sm">{{ systemHealth.server.memory }}%</span>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Disk Usage</span>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: systemHealth.server.disk + '%' }"
                ></div>
              </div>
              <span class="text-white text-sm">{{ systemHealth.server.disk }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Health -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Database</h3>
          <div :class="['w-3 h-3 rounded-full', systemHealth.database.status === 'healthy' ? 'bg-green-400' : 'bg-red-400']"></div>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Response Time</span>
            <span class="text-white font-medium">{{ systemHealth.database.responseTime }}ms</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Connections</span>
            <span class="text-white font-medium">{{ systemHealth.database.connections }}/{{ systemHealth.database.maxConnections }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Queries/sec</span>
            <span class="text-blue-400 font-medium">{{ systemHealth.database.queriesPerSecond }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Cache Hit Rate</span>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-green-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: systemHealth.database.cacheHitRate + '%' }"
                ></div>
              </div>
              <span class="text-white text-sm">{{ systemHealth.database.cacheHitRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- API Performance -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">API Performance</h3>
          <div :class="['w-3 h-3 rounded-full', systemHealth.api.status === 'healthy' ? 'bg-green-400' : 'bg-red-400']"></div>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Avg Response Time</span>
            <span class="text-white font-medium">{{ systemHealth.api.avgResponseTime }}ms</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Requests/min</span>
            <span class="text-blue-400 font-medium">{{ systemHealth.api.requestsPerMinute }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Error Rate</span>
            <span :class="[
              'font-medium',
              systemHealth.api.errorRate > 5 ? 'text-red-400' :
              systemHealth.api.errorRate > 2 ? 'text-yellow-400' :
              'text-green-400'
            ]">{{ systemHealth.api.errorRate }}%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Success Rate</span>
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-green-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: (100 - systemHealth.api.errorRate) + '%' }"
                ></div>
              </div>
              <span class="text-white text-sm">{{ (100 - systemHealth.api.errorRate).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Stats -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Live Stats</h3>
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Active Users</span>
            <span class="text-white font-medium">{{ systemHealth.realtime.activeUsers }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">WebSocket Connections</span>
            <span class="text-blue-400 font-medium">{{ systemHealth.realtime.websocketConnections }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Tasks Running</span>
            <span class="text-purple-400 font-medium">{{ systemHealth.realtime.runningTasks }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 text-sm">Queue Size</span>
            <span class="text-yellow-400 font-medium">{{ systemHealth.realtime.queueSize }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- CPU & Memory Chart -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Resource Usage (24h)</h3>
          <div class="flex items-center space-x-4 text-sm">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span class="text-gray-400">CPU</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-gray-400">Memory</span>
            </div>
          </div>
        </div>
        
        <div class="h-64 flex items-center justify-center">
          <div v-if="chartsLoading" class="text-gray-400">
            <div class="animate-spin w-8 h-8 border-2 border-gray-400 border-t-blue-500 rounded-full mx-auto mb-2"></div>
            Loading performance data...
          </div>
          <div v-else class="w-full h-full bg-gray-700/30 rounded-lg flex items-center justify-center text-gray-400">
            <!-- Placeholder for actual chart component -->
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p>Resource Usage Chart</p>
              <p class="text-sm">CPU: {{ systemHealth.server.cpu }}% | Memory: {{ systemHealth.server.memory }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- API Response Times -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">API Response Times (1h)</h3>
          <div class="text-sm text-gray-400">
            Avg: {{ systemHealth.api.avgResponseTime }}ms
          </div>
        </div>
        
        <div class="h-64 flex items-center justify-center">
          <div v-if="chartsLoading" class="text-gray-400">
            <div class="animate-spin w-8 h-8 border-2 border-gray-400 border-t-green-500 rounded-full mx-auto mb-2"></div>
            Loading response time data...
          </div>
          <div v-else class="w-full h-full bg-gray-700/30 rounded-lg flex items-center justify-center text-gray-400">
            <!-- Placeholder for response time chart -->
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <p>Response Time Chart</p>
              <p class="text-sm">Current: {{ systemHealth.api.avgResponseTime }}ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Logs and Alerts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Alerts -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Recent Alerts</h3>
          <button
            @click="clearAlerts"
            class="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear All
          </button>
        </div>
        
        <div class="space-y-3 max-h-64 overflow-y-auto">
          <div v-if="alerts.length === 0" class="text-center py-8 text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>No recent alerts</p>
          </div>
          
          <div
            v-for="alert in alerts"
            :key="alert.id"
            :class="[
              'p-3 rounded-lg border-l-4 flex items-start space-x-3',
              getAlertClass(alert.severity)
            ]"
          >
            <div :class="['w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', getAlertIconClass(alert.severity)]">
              <component :is="getAlertIcon(alert.severity)" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium text-sm">{{ alert.title }}</p>
              <p class="text-gray-400 text-sm mt-1">{{ alert.message }}</p>
              <p class="text-gray-500 text-xs mt-2">{{ formatTimeAgo(alert.timestamp) }}</p>
            </div>
            <button
              @click="dismissAlert(alert.id)"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- System Logs -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">System Logs</h3>
          <select 
            v-model="logLevel"
            @change="loadLogs"
            class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
        
        <div class="bg-black rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
          <div v-if="logs.length === 0" class="text-gray-500 text-center py-8">
            No logs available
          </div>
          
          <div
            v-for="log in logs"
            :key="log.id"
            :class="[
              'mb-1 flex',
              getLogLevelClass(log.level)
            ]"
          >
            <span class="text-gray-500 mr-2">{{ formatLogTime(log.timestamp) }}</span>
            <span :class="getLogLevelColor(log.level)" class="mr-2 w-12">{{ log.level.toUpperCase() }}</span>
            <span class="text-gray-300">{{ log.message }}</span>
          </div>
        </div>
        
        <div class="mt-4 flex justify-between items-center text-sm text-gray-400">
          <span>{{ logs.length }} entries</span>
          <button
            @click="loadLogs"
            class="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh Logs
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { adminAPI } from '@/services/api'

// Component state
const loading = ref(false)
const chartsLoading = ref(false)
const autoRefresh = ref(true)
const refreshInterval = ref(30)
const lastUpdated = ref(new Date())
const logLevel = ref('all')

// Auto-refresh timer
let refreshTimer = null

// System health data
const systemHealth = ref({
  status: 'healthy',
  server: {
    status: 'healthy',
    uptime: '15d 7h 32m',
    cpu: 45,
    memory: 67,
    disk: 34
  },
  database: {
    status: 'healthy',
    responseTime: 23,
    connections: 45,
    maxConnections: 100,
    queriesPerSecond: 127,
    cacheHitRate: 94
  },
  api: {
    status: 'healthy',
    avgResponseTime: 145,
    requestsPerMinute: 1247,
    errorRate: 0.8
  },
  realtime: {
    activeUsers: 1456,
    websocketConnections: 892,
    runningTasks: 23,
    queueSize: 7
  }
})

// Alerts and logs
const alerts = ref([
  {
    id: 1,
    severity: 'warning',
    title: 'High CPU Usage',
    message: 'Server CPU usage is above 80% for the last 10 minutes',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: 2,
    severity: 'info',
    title: 'Database Optimization',
    message: 'Automatic database optimization completed successfully',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
])

const logs = ref([
  {
    id: 1,
    level: 'info',
    message: 'Server started successfully on port 3000',
    timestamp: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: 2,
    level: 'warning',
    message: 'High memory usage detected: 85%',
    timestamp: new Date(Date.now() - 25 * 60 * 1000)
  },
  {
    id: 3,
    level: 'error',
    message: 'Database connection timeout in user authentication',
    timestamp: new Date(Date.now() - 20 * 60 * 1000)
  },
  {
    id: 4,
    level: 'info',
    message: 'Cache cleared and rebuilt successfully',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  }
])

// Icon components
const ErrorIcon = { template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>` }
const WarningIcon = { template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>` }
const InfoIcon = { template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>` }

// Methods
const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
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

const formatLogTime = (timestamp) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp)
}

const getSystemStatusClass = () => {
  switch (systemHealth.value.status) {
    case 'healthy': return 'bg-green-900/20 border-green-500 text-green-200'
    case 'warning': return 'bg-yellow-900/20 border-yellow-500 text-yellow-200'
    case 'critical': return 'bg-red-900/20 border-red-500 text-red-200'
    default: return 'bg-gray-900/20 border-gray-500 text-gray-200'
  }
}

const getStatusIndicatorClass = () => {
  switch (systemHealth.value.status) {
    case 'healthy': return 'bg-green-400 animate-pulse'
    case 'warning': return 'bg-yellow-400 animate-pulse'
    case 'critical': return 'bg-red-400 animate-pulse'
    default: return 'bg-gray-400'
  }
}

const getStatusMessage = () => {
  switch (systemHealth.value.status) {
    case 'healthy': return 'All systems operational'
    case 'warning': return 'Some issues detected, monitoring closely'
    case 'critical': return 'Critical issues require immediate attention'
    default: return 'Status unknown'
  }
}

const getAlertClass = (severity) => {
  switch (severity) {
    case 'error': return 'bg-red-900/20 border-red-500'
    case 'warning': return 'bg-yellow-900/20 border-yellow-500'
    case 'info': return 'bg-blue-900/20 border-blue-500'
    default: return 'bg-gray-900/20 border-gray-500'
  }
}

const getAlertIconClass = (severity) => {
  switch (severity) {
    case 'error': return 'bg-red-500 text-white'
    case 'warning': return 'bg-yellow-500 text-white'
    case 'info': return 'bg-blue-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const getAlertIcon = (severity) => {
  switch (severity) {
    case 'error': return ErrorIcon
    case 'warning': return WarningIcon
    case 'info': return InfoIcon
    default: return InfoIcon
  }
}

const getLogLevelClass = (level) => {
  return 'text-left'
}

const getLogLevelColor = (level) => {
  switch (level) {
    case 'error': return 'text-red-400'
    case 'warning': return 'text-yellow-400'
    case 'info': return 'text-blue-400'
    default: return 'text-gray-400'
  }
}

const loadSystemHealth = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getSystemHealth()
    
    // Update system health with real data
    systemHealth.value = {
      status: response.data.status,
      server: {
        status: response.data.status,
        uptime: response.data.uptime ? formatUptime(response.data.uptime) : '0d 0h 0m',
        cpu: Math.round(Math.random() * 100), // Mock data
        memory: Math.round(Math.random() * 100),
        disk: Math.round(Math.random() * 100)
      },
      database: {
        status: response.data.database?.status || 'healthy',
        responseTime: response.data.database?.responseTime || 23,
        connections: Math.round(Math.random() * 50 + 20),
        maxConnections: 100,
        queriesPerSecond: Math.round(Math.random() * 200 + 50),
        cacheHitRate: Math.round(Math.random() * 20 + 80)
      },
      api: {
        status: 'healthy',
        avgResponseTime: Math.round(Math.random() * 100 + 100),
        requestsPerMinute: Math.round(Math.random() * 1000 + 500),
        errorRate: parseFloat((Math.random() * 5).toFixed(1))
      },
      realtime: {
        activeUsers: Math.round(Math.random() * 1000 + 500),
        websocketConnections: Math.round(Math.random() * 500 + 200),
        runningTasks: Math.round(Math.random() * 50 + 10),
        queueSize: Math.round(Math.random() * 20)
      }
    }
    
    lastUpdated.value = new Date()
  } catch (error) {
    console.error('Failed to load system health:', error)
    systemHealth.value.status = 'critical'
  } finally {
    loading.value = false
  }
}

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

const loadLogs = async () => {
  try {
    // In real implementation, load logs from API
    console.log('Loading logs with level:', logLevel.value)
  } catch (error) {
    console.error('Failed to load logs:', error)
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)
  
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) {
      loadSystemHealth()
    }
  }, refreshInterval.value * 1000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const refreshMetrics = () => {
  loadSystemHealth()
  chartsLoading.value = true
  
  // Simulate chart loading
  setTimeout(() => {
    chartsLoading.value = false
  }, 1000)
}

const clearAlerts = () => {
  alerts.value = []
}

const dismissAlert = (alertId) => {
  const index = alerts.value.findIndex(alert => alert.id === alertId)
  if (index > -1) {
    alerts.value.splice(index, 1)
  }
}

// Lifecycle
onMounted(() => {
  loadSystemHealth()
  loadLogs()
  
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
/* Progress bar animations */
.transition-all {
  transition: width 0.5s ease, background-color 0.3s ease;
}

/* Auto-refresh toggle */
.translate-x-5 {
  transform: translateX(1.25rem);
}

.translate-x-0 {
  transform: translateX(0);
}

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

/* Loading animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

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

/* Card hover effects */
.bg-gray-800:hover {
  background-color: rgb(31 41 55);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

/* Log console styling */
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Status indicator pulsing */
.bg-green-400.animate-pulse,
.bg-yellow-400.animate-pulse,
.bg-red-400.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Button hover effects */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button:disabled {
  transform: none;
}
</style>