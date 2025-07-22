<template>
  <div v-if="isDevelopment" class="fixed bottom-4 left-4 z-40">
    <!-- DevTools Toggle Button -->
    <button
      @click="toggleDevTools"
      :class="[
        'w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200',
        'flex items-center justify-center border-2 border-purple-500',
        showDevTools ? 'rotate-180' : ''
      ]"
      title="Toggle DevTools"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    </button>

    <!-- DevTools Panel -->
    <transition
      name="devtools"
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 transform translate-y-8"
      leave-to-class="opacity-0 transform translate-y-8"
    >
      <div
        v-if="showDevTools"
        class="mb-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
      >
        <!-- Header -->
        <div class="bg-purple-600 px-4 py-2 flex items-center justify-between">
          <h3 class="text-white font-medium text-sm">Admin DevTools</h3>
          <div class="flex items-center space-x-2">
            <span class="text-purple-200 text-xs">v{{ version }}</span>
            <button
              @click="showDevTools = false"
              class="text-purple-200 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-700">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            ]"
          >
            {{ tab.name }}
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-4 max-h-80 overflow-y-auto">
          <!-- State Tab -->
          <div v-if="activeTab === 'state'" class="space-y-3">
            <div>
              <h4 class="text-white font-medium text-sm mb-2">Auth Store</h4>
              <div class="bg-gray-800 rounded p-2 text-xs">
                <pre class="text-green-400 whitespace-pre-wrap">{{ JSON.stringify(authStoreState, null, 2) }}</pre>
              </div>
            </div>
            
            <div>
              <h4 class="text-white font-medium text-sm mb-2">Route Info</h4>
              <div class="bg-gray-800 rounded p-2 text-xs">
                <pre class="text-blue-400 whitespace-pre-wrap">{{ JSON.stringify(routeInfo, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <!-- Actions Tab -->
          <div v-if="activeTab === 'actions'" class="space-y-3">
            <div>
              <h4 class="text-white font-medium text-sm mb-2">Quick Actions</h4>
              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="testNotification('success')"
                  class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  Success Toast
                </button>
                <button
                  @click="testNotification('error')"
                  class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Error Toast
                </button>
                <button
                  @click="testNotification('warning')"
                  class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                >
                  Warning Toast
                </button>
                <button
                  @click="testNotification('info')"
                  class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Info Toast
                </button>
              </div>
            </div>

            <div>
              <h4 class="text-white font-medium text-sm mb-2">Test Data</h4>
              <div class="space-y-2">
                <button
                  @click="generateTestUsers"
                  class="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  Generate Test Users
                </button>
                <button
                  @click="generateTestTasks"
                  class="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  Generate Test Tasks
                </button>
                <button
                  @click="clearTestData"
                  class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Clear Test Data
                </button>
              </div>
            </div>
          </div>

          <!-- Performance Tab -->
          <div v-if="activeTab === 'performance'" class="space-y-3">
            <div>
              <h4 class="text-white font-medium text-sm mb-2">Performance Metrics</h4>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between text-gray-300">
                  <span>Memory Usage:</span>
                  <span class="text-yellow-400">{{ formatBytes(memoryUsage) }}</span>
                </div>
                <div class="flex justify-between text-gray-300">
                  <span>Components:</span>
                  <span class="text-blue-400">{{ componentCount }}</span>
                </div>
                <div class="flex justify-between text-gray-300">
                  <span>API Calls:</span>
                  <span class="text-green-400">{{ apiCallCount }}</span>
                </div>
                <div class="flex justify-between text-gray-300">
                  <span>Render Time:</span>
                  <span class="text-purple-400">{{ renderTime }}ms</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-white font-medium text-sm mb-2">Actions</h4>
              <div class="space-y-2">
                <button
                  @click="triggerGarbageCollection"
                  class="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                >
                  Force Garbage Collection
                </button>
                <button
                  @click="measurePerformance"
                  class="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                >
                  Measure Performance
                </button>
              </div>
            </div>
          </div>

          <!-- Console Tab -->
          <div v-if="activeTab === 'console'" class="space-y-3">
            <div>
              <h4 class="text-white font-medium text-sm mb-2">Console Logs</h4>
              <div class="bg-black rounded p-2 text-xs h-32 overflow-y-auto">
                <div
                  v-for="log in consoleLogs"
                  :key="log.id"
                  :class="[
                    'mb-1',
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'info' ? 'text-blue-400' :
                    'text-gray-300'
                  ]"
                >
                  <span class="text-gray-500 text-xs">{{ formatTime(log.timestamp) }}</span>
                  <span class="ml-2">{{ log.message }}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-white font-medium text-sm mb-2">Quick Commands</h4>
              <div class="flex space-x-2">
                <input
                  v-model="consoleCommand"
                  @keydown.enter="executeCommand"
                  placeholder="Enter command..."
                  class="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  @click="executeCommand"
                  class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  Run
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// DevTools state
const isDevelopment = import.meta.env.DEV
const version = ref('1.0.0')
const showDevTools = ref(false)
const activeTab = ref('state')
const consoleCommand = ref('')
const consoleLogs = ref([])
const memoryUsage = ref(0)
const componentCount = ref(0)
const apiCallCount = ref(0)
const renderTime = ref(0)

// Tabs configuration
const tabs = [
  { id: 'state', name: 'State' },
  { id: 'actions', name: 'Actions' },
  { id: 'performance', name: 'Perf' },
  { id: 'console', name: 'Console' }
]

// Computed properties
const authStoreState = computed(() => ({
  isLoggedIn: authStore.isLoggedIn,
  isAdmin: authStore.isAdmin,
  userName: authStore.userName,
  sessionValid: authStore.hasValidSession
}))

const routeInfo = computed(() => ({
  path: route.path,
  name: route.name,
  params: route.params,
  query: route.query
}))

// Methods
const toggleDevTools = () => {
  showDevTools.value = !showDevTools.value
}

const testNotification = (type) => {
  const messages = {
    success: 'Test success notification',
    error: 'Test error notification',
    warning: 'Test warning notification',
    info: 'Test info notification'
  }
  
  if (window.__adminNotifications) {
    window.__adminNotifications[type](messages[type])
  } else {
    console.log(`${type.toUpperCase()}: ${messages[type]}`)
  }
}

const generateTestUsers = () => {
  console.log('Generating test users...')
  addConsoleLog('info', 'Generated 10 test users')
  // In a real implementation, this would call an API
}

const generateTestTasks = () => {
  console.log('Generating test tasks...')
  addConsoleLog('info', 'Generated 5 test tasks')
  // In a real implementation, this would call an API
}

const clearTestData = () => {
  console.log('Clearing test data...')
  addConsoleLog('warn', 'Test data cleared')
  // In a real implementation, this would call an API
}

const triggerGarbageCollection = () => {
  if (window.gc) {
    window.gc()
    addConsoleLog('info', 'Garbage collection triggered')
  } else {
    addConsoleLog('warn', 'Garbage collection not available')
  }
  updatePerformanceMetrics()
}

const measurePerformance = () => {
  const start = performance.now()
  
  // Simulate some work
  setTimeout(() => {
    const end = performance.now()
    renderTime.value = Math.round(end - start)
    addConsoleLog('info', `Performance measured: ${renderTime.value}ms`)
  }, 100)
  
  updatePerformanceMetrics()
}

const executeCommand = () => {
  if (!consoleCommand.value.trim()) return
  
  addConsoleLog('log', `> ${consoleCommand.value}`)
  
  try {
    // Basic command evaluation (be careful in production!)
    if (consoleCommand.value.startsWith('authStore.')) {
      const result = eval(`authStore.${consoleCommand.value.slice(10)}`)
      addConsoleLog('info', JSON.stringify(result))
    } else if (consoleCommand.value === 'clear') {
      consoleLogs.value = []
    } else if (consoleCommand.value === 'help') {
      addConsoleLog('info', 'Available commands: authStore.*, clear, help')
    } else {
      addConsoleLog('warn', 'Unknown command')
    }
  } catch (error) {
    addConsoleLog('error', error.message)
  }
  
  consoleCommand.value = ''
}

const addConsoleLog = (level, message) => {
  consoleLogs.value.push({
    id: Date.now() + Math.random(),
    level,
    message,
    timestamp: new Date()
  })
  
  // Keep only last 50 logs
  if (consoleLogs.value.length > 50) {
    consoleLogs.value = consoleLogs.value.slice(-50)
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const updatePerformanceMetrics = () => {
  // Update memory usage
  if (performance.memory) {
    memoryUsage.value = performance.memory.usedJSHeapSize
  }
  
  // Count components (approximate)
  componentCount.value = document.querySelectorAll('[data-v-]').length
  
  // API call count would be tracked by the API service
  apiCallCount.value = window.__apiCallCount || 0
}

// Keyboard shortcuts
const handleKeydown = (event) => {
  // Ctrl/Cmd + Shift + D to toggle DevTools
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    toggleDevTools()
  }
  
  // Escape to close DevTools
  if (event.key === 'Escape' && showDevTools.value) {
    showDevTools.value = false
  }
}

// Intercept console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
}

const interceptConsole = () => {
  ['log', 'warn', 'error', 'info'].forEach(method => {
    console[method] = (...args) => {
      originalConsole[method](...args)
      addConsoleLog(method, args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '))
    }
  })
}

const restoreConsole = () => {
  Object.assign(console, originalConsole)
}

// Lifecycle
onMounted(() => {
  if (isDevelopment) {
    document.addEventListener('keydown', handleKeydown)
    interceptConsole()
    updatePerformanceMetrics()
    
    // Update performance metrics every 5 seconds
    const perfInterval = setInterval(updatePerformanceMetrics, 5000)
    
    onUnmounted(() => {
      clearInterval(perfInterval)
    })
    
    // Add initial welcome message
    addConsoleLog('info', 'DevTools initialized')
  }
})

onUnmounted(() => {
  if (isDevelopment) {
    document.removeEventListener('keydown', handleKeydown)
    restoreConsole()
  }
})
</script>

<style scoped>
/* Custom scrollbar for console */
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

/* Animation classes */
.devtools-enter-active,
.devtools-leave-active {
  transition: all 0.3s ease;
}

.devtools-enter-from,
.devtools-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Button hover effects */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Console styling */
pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
}

/* Tab active state */
.border-b-2 {
  border-bottom-width: 2px;
}
</style>