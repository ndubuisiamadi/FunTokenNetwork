<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTaskFiltering } from '@/composables/useTaskFiltering'
import { tasksAPI } from '@/services/api'
import TaskItem from '@/components/TaskItem.vue'
import TaskCreator from '@/components/TaskCreator.vue'

const emit = defineEmits(['earnings-updated'])

// 🚀 Use the new filtering composable
const {
  filters,
  tasks,
  loading,
  error,
  pagination,
  meta,
  hasFilters,
  isEmpty,
  isFiltered,
  loadMore,
  updateFilter,
  resetFilters,
  refresh,
  updateTask
} = useTaskFiltering({
  initialFilters: {
    status: 'available', // Only show available tasks by default
    sortBy: 'reward',
    sortOrder: 'desc'
  }
})

// Local state
const recentSuccess = ref(null)
const notifications = ref([])
const notificationId = ref(0)
const showTaskCreator = ref(false)
const showFilters = ref(false)

// Stats state - we'll get this from API
const stats = ref({
  available: 0,
  completed: 0,
  earned: 0,
  inProgress: 0
})

// Development mode
const isDevelopment = computed(() => import.meta.env.DEV)

// Platform data
const platforms = ref([
  { name: 'Twitter', iconUrl: '/src/assets/x-logo.png' },
  { name: 'YouTube', iconUrl: '/src/assets/youtube-logo.png' },
  { name: 'Telegram', iconUrl: '/src/assets/telegram-logo.png' }
])

// Toggle filters
const toggleFilter = async () => {
  showFilters.value = !showFilters.value
}

// Notification system
const showNotification = ({ type, title, message, duration = 5000 }) => {
  const id = ++notificationId.value
  const notification = { id, type, title, message }
  
  notifications.value.push(notification)
  
  setTimeout(() => {
    removeNotification(id)
  }, duration)
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// Load stats
const loadStats = async () => {
  try {
    const statsData = await tasksAPI.getTaskStats()
    stats.value = {
      available: statsData.available,
      completed: statsData.completed,
      earned: statsData.totalEarnings,
      inProgress: statsData.inProgress
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// Task event handlers
const handleTaskUpdated = (taskData) => {
  const { taskId, status, message } = taskData
  
  // Update task status in UI
  updateTask(taskId, { userStatus: status })
  
  if (message) {
    showNotification({
      type: 'info',
      title: 'Task Update',
      message,
      duration: 4000
    })
  }
}

const handleTaskCompleted = (taskData) => {
  const { taskId, verified, reward, autoVerified, message } = taskData
  
  // Update task status
  updateTask(taskId, { 
    userStatus: 'completed',
    userCompletedAt: new Date().toISOString(),
    autoVerified
  })
  
  if (verified) {
    // Update stats
    stats.value.completed++
    stats.value.earned += reward || 0
    stats.value.inProgress = Math.max(0, stats.value.inProgress - 1)
    
    // Show success notification
    showNotification({
      type: 'success',
      title: autoVerified ? 'Task Auto-Completed!' : 'Task Completed!',
      message: message || `You earned ${reward} gumballs!`,
      duration: 6000
    })
    
    // Show success banner
    recentSuccess.value = {
      title: autoVerified ? 'Task Auto-Completed!' : 'Task Completed!',
      message: message || `You earned ${reward} gumballs!`,
      timestamp: Date.now()
    }
    
    // Auto-hide success banner after 8 seconds
    setTimeout(() => {
      recentSuccess.value = null
    }, 8000)
    
    // Emit earnings update
    emit('earnings-updated', reward)
  }
}

const handleTaskFailed = (taskData) => {
  const { taskId, message } = taskData
  
  // Update task status
  updateTask(taskId, { userStatus: 'failed' })
  
  // Update stats
  stats.value.inProgress = Math.max(0, stats.value.inProgress - 1)
  
  showNotification({
    type: 'error',
    title: 'Task Failed',
    message: message || 'Task verification failed. You can retry this task.',
    duration: 5000
  })
}

// Development tools
const handleTaskCreated = async () => {
  console.log('Task created, refreshing tasks...')
  await refresh()
  showNotification({
    type: 'success',
    title: 'Task Created',
    message: 'Development task created successfully!',
    duration: 3000
  })
}

// Utility functions
const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const getDifficultyLabel = (difficulty) => {
  const labels = {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard',
    4: 'Very Hard'
  }
  return labels[difficulty] || `${difficulty} Stars`
}

const toggleSortOrder = () => {
  filters.value.sortOrder = filters.value.sortOrder === 'desc' ? 'asc' : 'desc'
}

// Lifecycle
onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success Banner -->
    <div v-if="recentSuccess" class="bg-green-900/20 border border-green-500/30 rounded-lg p-4 animate-pulse">
      <div class="flex items-center gap-3">
        <div class="text-green-400 text-2xl">🎉</div>
        <div>
          <h4 class="font-bold text-green-400">{{ recentSuccess.title }}</h4>
          <p class="text-sm text-white/80">{{ recentSuccess.message }}</p>
        </div>
        <button 
          @click="recentSuccess = null" 
          class="ml-auto text-white/60 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Dashboard Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-[#030712]/20 rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-400">{{ stats.available }}</p>
          <p class="text-sm text-white/60">Available</p>
        </div>
      </div>
      
      <div class="bg-[#030712]/20 rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-400">{{ stats.completed }}</p>
          <p class="text-sm text-white/60">Completed Today</p>
        </div>
      </div>
      
      <div class="bg-[#030712]/20 rounded-lg p-4 border border-white/10">
        <div class="text-center flex flex-col items-center">
          <p class="text-2xl font-bold text-yellow-400 flex items-center">
            {{ formatNumber(stats.earned) }} 
            <img src="@/components/icons/gumball.png" class="inline size-8">
          </p>
          <p class="text-sm text-white/60">Earned Today</p>
        </div>
      </div>
      
      <div class="bg-[#030712]/20 rounded-lg p-4 border border-white/10">
        <div class="text-center">
          <p class="text-2xl font-bold text-purple-400">{{ stats.inProgress }}</p>
          <p class="text-sm text-white/60">In Progress</p>
        </div>
      </div>
    </div>

    <!-- Tasks Section -->
    <div class="bg-[#030712]/20 rounded-xl p-6 border border-white/10">
      <h2 class="text-xl font-bold mb-4">Your Tasks</h2>
      
      <div class="flex justify-between">
    <!-- Platform Toggle -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              @click="updateFilter('platform', 'all')"
              :class="[
                'px-4 py-2 rounded-lg transition-all duration-200 flex items-center text-sm',
                filters.platform === 'all' 
                  ? 'bg-gradient-to-r from-[#00B043] to-[#195E00] text-white' 
                  : 'bg-white/5 text-white/80 hover:bg-white/10'
              ]"
            >
              All Platforms
            </button>
            
            <button
              v-for="platform in platforms"
              :key="platform.name"
              @click="updateFilter('platform', platform.name)"
              :class="[
                'p-1 rounded-full transition-all duration-200 flex items-center',
                filters.platform === platform.name 
                  ? filters.platform == 'Twitter' ? 'bg-[#ffffff]/40' : 
                  filters.platform == 'YouTube' ? 'bg-[#ff0000]/30' : 'bg-[#055DFF]/30' 
                  : 'bg-white/5 hover:bg-white/10',
              ]"
            >
              <img 
                :src="platform.iconUrl" 
                :alt="platform.name"
                class="size-8 rounded-full"
              />
            </button>
          </div>

          
      </div>
      

      <!-- Filter Controls -->
      <div v-if="showFilters" class="flex flex-wrap gap-4 mb-4 rounded-lg">
        <!-- Status Filter -->
        <div>
          <label class="block text-xs font-medium text-white/60 mb-2">Status</label>
          <div class="grid w-3/4 md:w-fit shrink-0 grid-cols-1 focus-within:relative">
            <select 
                v-model="filters.status"
                class="col-start-1 row-start-1 w-full appearance-none rounded-md py-2.5 md:py-1 pr-7 pl-3 text-xs text-white placeholder:text-gray-400 
                sm:text-xs/6 bg-white/5 border border-white/10"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            <svg class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-white sm:size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </div>
          
        </div>

        <!-- Difficulty Filter -->
        <div>
          <label class="block text-xs font-medium text-white/60 mb-2">Difficulty</label>
          <div class="grid w-3/4 md:w-fit shrink-0 grid-cols-1 focus-within:relative">
            <select 
                v-model="filters.difficulty"
                class="col-start-1 row-start-1 w-full appearance-none rounded-md py-2.5 md:py-1 pr-7 pl-3 text-xs text-white placeholder:text-gray-400 
                sm:text-xs/6 bg-white/5 border border-white/10"
              >
                <option value="all">All Levels</option>
                <option value="1">Easy</option>
                <option value="2">Medium</option>
                <option value="3">Hard</option>
              </select>
            <svg class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-white sm:size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- Search -->
        <!-- <div>
          <label class="block text-sm font-medium text-white/60 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search tasks..."
            class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div> -->

        <!-- Date From -->
        <!-- <div>
          <label class="block text-sm font-medium text-white/60 mb-2">From Date</label>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div> -->

        <!-- Date To -->
        <!-- <div>
          <label class="block text-sm font-medium text-white/60 mb-2">To Date</label>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div> -->

        <!-- Clear Filters -->
        <div class="flex w-full md:w-fit items-end">
          <button
            @click="resetFilters"
            class="w-full px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 text-xs transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      

      <!-- Sort Controls -->
      <div class="flex flex-col md:flex-row items-start md:items-end justify-between mb-4 gap-2">
        <!-- Active Filters Display -->
        <div v-if="hasFilters" class="flex flex-wrap gap-2 ">
          <span v-if="filters.platform !== 'all'" class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
            Platform: {{ filters.platform }}
          </span>
          <span v-if="filters.status !== 'all'" class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
            Status: {{ filters.status.replace('_', ' ') }}
          </span>
          <span v-if="filters.difficulty !== 'all'" class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
            Difficulty: {{ getDifficultyLabel(parseInt(filters.difficulty)) }}
          </span>
          <span v-if="filters.search" class="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
            Search: "{{ filters.search }}"
          </span>
          <span v-if="filters.dateFrom" class="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">
            From: {{ new Date(filters.dateFrom).toLocaleDateString() }}
          </span>
          <span v-if="filters.dateTo" class="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">
            To: {{ new Date(filters.dateTo).toLocaleDateString() }}
          </span>
        </div>

        <div class="flex w-full md:w-fit items-center gap-2">
          <div class="grid w-3/4 md:w-fit shrink-0 grid-cols-1 focus-within:relative">
            <select 
                v-model="filters.sortBy"
                class="col-start-1 row-start-1 w-full appearance-none rounded-md py-2.5 md:py-1 pr-7 pl-3 text-xs text-white placeholder:text-gray-400 
                sm:text-xs/6 bg-white/5 border border-white/10"
              >
                <option value="reward">Reward</option>
                <option value="difficulty">Difficulty</option>
                <option value="created">Date Created</option>
                <option value="title">Title</option>
              </select>
            <svg class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-white sm:size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon">
              <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </div>
          
          <button
            @click="toggleSortOrder"
            class="size-9 p-2 bg-white/5 rounded-full border border-white/10"
            :title="filters.sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'"
          >
            <!-- {{ filters.sortOrder === 'desc' ? '↓' : '↑' }} -->
            <img v-if="filters.sortOrder === 'desc'" src="@/components/icons/sort-down.svg">
            <img v-else src="@/components/icons/sort-up.svg">
          </button>

          <!-- Filter Toogle -->
          <button 
          @click="toggleFilter"
          class="size-9 p-2 bg-white/5 rounded-full border border-white/10">
            <img src="@/components/icons/filter-lined.svg">
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && tasks.length === 0" class="text-center py-8">
        <div class="animate-spin size-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading tasks...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3">
          <div class="text-red-400 text-xl">⚠️</div>
          <div>
            <h4 class="font-bold text-red-400 mb-1">Failed to Load Tasks</h4>
            <p class="text-sm text-white/80">{{ error }}</p>
            <button 
              @click="refresh"
              class="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <!-- Tasks List -->
      <div v-else-if="tasks.length > 0" class="space-y-3">
        <TaskItem
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          @task-updated="handleTaskUpdated"
          @task-completed="handleTaskCompleted"
          @task-failed="handleTaskFailed"
        />
        
        <!-- Load More Button -->
        <div v-if="pagination.hasMore" class="text-center pt-4">
          <button
            @click="loadMore"
            :disabled="loading"
            class="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {{ loading ? 'Loading...' : 'Load More Tasks' }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-lg font-bold mb-2">
          {{ isFiltered ? 'No tasks match your filters' : 'No tasks available' }}
        </h3>
        <p class="text-white/60 mb-4">
          {{ isFiltered 
            ? 'Try adjusting your filters or check back later' 
            : 'Check back soon for new opportunities!' 
          }}
        </p>
        <div class="flex gap-2 justify-center">
          <button 
            v-if="hasFilters"
            @click="resetFilters"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
          <button 
            @click="refresh"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Refresh Tasks
          </button>
        </div>
      </div>
    </div>

    <!-- Development Task Creator -->
    <!-- <div v-if="isDevelopment" class="space-y-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold">Development Tools</h3>
        <button
          @click="showTaskCreator = !showTaskCreator"
          class="px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded text-sm transition-colors"
        >
          {{ showTaskCreator ? 'Hide' : 'Show' }} Task Creator
        </button>
      </div>
      
      <div v-if="showTaskCreator">
        <TaskCreator @task-created="handleTaskCreated" />
      </div>
    </div> -->

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'p-4 rounded-lg shadow-lg transition-all duration-300 max-w-sm',
          'transform translate-x-0',
          {
            'bg-green-900 border border-green-500': notification.type === 'success',
            'bg-red-900 border border-red-500': notification.type === 'error',
            'bg-blue-900 border border-blue-500': notification.type === 'info',
            'bg-yellow-900 border border-yellow-500': notification.type === 'warning'
          }
        ]"
      >
        <div class="flex items-start gap-3">
          <div class="text-xl">
            {{ notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'warning' ? '⚠️' : 'ℹ️' }}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm">{{ notification.title }}</h4>
            <p class="text-sm text-white/80">{{ notification.message }}</p>
          </div>
          <button
            @click="removeNotification(notification.id)"
            class="text-white/60 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
option{
  color: black;
}
</style>