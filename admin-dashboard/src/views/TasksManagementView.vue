<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white">Task Management</h1>
        <p class="text-gray-400 mt-1">Create, manage, and monitor platform tasks</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>Create Task</span>
        </button>
        <button
          @click="exportTasks"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Export</span>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm font-medium">Total Tasks</p>
            <p class="text-2xl font-bold text-white mt-2">{{ taskStats.total }}</p>
          </div>
          <div class="p-3 bg-blue-600/20 rounded-lg">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm font-medium">Active Tasks</p>
            <p class="text-2xl font-bold text-green-400 mt-2">{{ taskStats.active }}</p>
          </div>
          <div class="p-3 bg-green-600/20 rounded-lg">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm font-medium">Completion Rate</p>
            <p class="text-2xl font-bold text-purple-400 mt-2">{{ taskStats.completionRate }}%</p>
          </div>
          <div class="p-3 bg-purple-600/20 rounded-lg">
            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm font-medium">Total Rewards</p>
            <p class="text-2xl font-bold text-yellow-400 mt-2">{{ formatNumber(taskStats.totalRewards) }}</p>
          </div>
          <div class="p-3 bg-yellow-600/20 rounded-lg">
            <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <!-- Search -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-300 mb-2">Search Tasks</label>
          <div class="relative">
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by title, username..."
              class="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Platform Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Platform</label>
          <select 
            v-model="filters.platform"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Platforms</option>
            <option value="twitter">Twitter</option>
            <option value="youtube">YouTube</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select 
            v-model="filters.status"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <!-- Type Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select 
            v-model="filters.type"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="follow">Follow</option>
            <option value="like">Like</option>
            <option value="retweet">Retweet</option>
            <option value="comment">Comment</option>
            <option value="subscribe">Subscribe</option>
            <option value="join">Join</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex items-end space-x-2">
          <button
            @click="applyFilters"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Apply
          </button>
          <button
            @click="clearFilters"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Tasks Table -->
    <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-700/50">
            <tr>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Task</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Platform</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Type</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Reward</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Difficulty</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Status</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Completions</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Created</th>
              <th class="text-left p-4 text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-if="loading" class="text-center">
              <td colspan="9" class="p-8 text-gray-400">
                <div class="flex items-center justify-center space-x-2">
                  <div class="animate-spin w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full"></div>
                  <span>Loading tasks...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="tasks.length === 0" class="text-center">
              <td colspan="9" class="p-8 text-gray-400">
                <div class="text-center">
                  <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <p>No tasks found</p>
                  <button
                    @click="showCreateModal = true"
                    class="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Create your first task
                  </button>
                </div>
              </td>
            </tr>
            <tr 
              v-else
              v-for="task in tasks" 
              :key="task.id"
              class="hover:bg-gray-700/30 transition-colors"
            >
              <!-- Task Info -->
              <td class="p-4">
                <div class="flex items-center space-x-3">
                  <img 
                    :src="getPlatformIcon(task.platform)"
                    :alt="task.platform"
                    class="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p class="font-medium text-white">{{ task.title }}</p>
                    <p class="text-sm text-gray-400">@{{ task.targetUsername }}</p>
                  </div>
                </div>
              </td>

              <!-- Platform -->
              <td class="p-4">
                <span class="text-sm text-gray-300 capitalize">{{ task.platform }}</span>
              </td>

              <!-- Type -->
              <td class="p-4">
                <span 
                  :class="[
                    'text-xs px-2 py-1 rounded-full font-medium uppercase',
                    getTaskTypeBadge(task.type)
                  ]"
                >
                  {{ task.type }}
                </span>
              </td>

              <!-- Reward -->
              <td class="p-4">
                <span class="font-bold text-yellow-400">{{ formatNumber(task.reward) }}</span>
                <span class="text-xs text-gray-400 ml-1">Gs</span>
              </td>

              <!-- Difficulty -->
              <td class="p-4">
                <div class="flex items-center space-x-1">
                  <div 
                    v-for="i in 5"
                    :key="i"
                    :class="[
                      'w-3 h-3 rounded-full',
                      i <= task.difficulty ? 'bg-yellow-400' : 'bg-gray-600'
                    ]"
                  ></div>
                </div>
              </td>

              <!-- Status -->
              <td class="p-4">
                <span 
                  :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    task.isActive ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-gray-900/20 text-gray-400 border border-gray-500/30'
                  ]"
                >
                  {{ task.isActive ? 'ACTIVE' : 'PAUSED' }}
                </span>
              </td>

              <!-- Completions -->
              <td class="p-4">
                <span class="text-sm text-gray-300">{{ task._count?.userTasks || 0 }}</span>
              </td>

              <!-- Created Date -->
              <td class="p-4">
                <span class="text-sm text-gray-400">{{ formatDate(task.createdAt) }}</span>
              </td>

              <!-- Actions -->
              <td class="p-4">
                <div class="flex items-center space-x-2">
                  <button
                    @click="toggleTaskStatus(task)"
                    :class="[
                      'p-1 rounded transition-colors',
                      task.isActive 
                        ? 'text-yellow-400 hover:bg-yellow-500/20' 
                        : 'text-green-400 hover:bg-green-500/20'
                    ]"
                    :title="task.isActive ? 'Pause task' : 'Activate task'"
                  >
                    <svg v-if="task.isActive" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                  
                  <button
                    @click="editTask(task)"
                    class="p-1 rounded text-blue-400 hover:bg-blue-500/20 transition-colors"
                    title="Edit task"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  
                  <button
                    @click="deleteTask(task)"
                    class="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Delete task"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="px-6 py-4 border-t border-gray-700">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-400">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
            {{ pagination.total }} tasks
          </p>
          <div class="flex items-center space-x-2">
            <button
              @click="goToPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
            >
              Previous
            </button>
            <span class="px-3 py-1 bg-blue-600 text-white rounded">
              {{ pagination.page }}
            </span>
            <button
              @click="goToPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <TaskCreator 
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @task-created="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { adminAPI } from '@/services/api'
import TaskCreator from '@/components/TaskCreator.vue'

// Component state
const loading = ref(false)
const showCreateModal = ref(false)
const tasks = ref([])
const taskStats = ref({
  total: 0,
  active: 0,
  completionRate: 0,
  totalRewards: 0
})

// Filters
const filters = ref({
  search: '',
  platform: '',
  status: '',
  type: ''
})

// Pagination
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// Methods
const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

const getPlatformIcon = (platform) => {
  const icons = {
    twitter: '/src/assets/x-logo.png',
    youtube: '/src/assets/youtube-logo.png',
    telegram: '/src/assets/telegram-logo.png'
  }
  return icons[platform] || '/src/assets/logo.png'
}

const getTaskTypeBadge = (type) => {
  const badges = {
    follow: 'bg-blue-900/20 text-blue-400 border border-blue-500/30',
    like: 'bg-red-900/20 text-red-400 border border-red-500/30',
    retweet: 'bg-green-900/20 text-green-400 border border-green-500/30',
    comment: 'bg-purple-900/20 text-purple-400 border border-purple-500/30',
    subscribe: 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30',
    join: 'bg-indigo-900/20 text-indigo-400 border border-indigo-500/30'
  }
  return badges[type] || 'bg-gray-900/20 text-gray-400 border border-gray-500/30'
}

const loadTasks = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    }
    
    const response = await adminAPI.getAllTasks(params)
    tasks.value = response.data.tasks
    pagination.value = response.data.pagination
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
}

const loadTaskStats = async () => {
  try {
    const response = await adminAPI.getTaskStats()
    taskStats.value = response.data
  } catch (error) {
    console.error('Failed to load task stats:', error)
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  loadTasks()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    platform: '',
    status: '',
    type: ''
  }
  pagination.value.page = 1
  loadTasks()
}

const goToPage = (page) => {
  pagination.value.page = page
  loadTasks()
}

const toggleTaskStatus = async (task) => {
  try {
    await adminAPI.updateTask(task.id, { isActive: !task.isActive })
    task.isActive = !task.isActive
    
    // Show notification
    if (window.__adminNotifications) {
      window.__adminNotifications.success(
        `Task ${task.isActive ? 'activated' : 'paused'} successfully`
      )
    }
  } catch (error) {
    console.error('Failed to toggle task status:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to update task status')
    }
  }
}

const editTask = (task) => {
  // In a real implementation, this would open an edit modal
  console.log('Edit task:', task)
}

const deleteTask = async (task) => {
  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
    return
  }
  
  try {
    await adminAPI.deleteTask(task.id)
    tasks.value = tasks.value.filter(t => t.id !== task.id)
    
    if (window.__adminNotifications) {
      window.__adminNotifications.success('Task deleted successfully')
    }
  } catch (error) {
    console.error('Failed to delete task:', error)
    if (window.__adminNotifications) {
      window.__adminNotifications.error('Failed to delete task')
    }
  }
}

const handleTaskCreated = () => {
  showCreateModal.value = false
  loadTasks()
  loadTaskStats()
  
  if (window.__adminNotifications) {
    window.__adminNotifications.success('Task created successfully')
  }
}

const exportTasks = () => {
  // In a real implementation, this would export tasks to CSV/Excel
  console.log('Export tasks')
}

// Watch for filter changes
watch(filters, () => {
  // Optional: Auto-apply filters on change
  // applyFilters()
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadTasks()
  loadTaskStats()
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Table hover effects */
tbody tr:hover {
  background-color: rgba(55, 65, 81, 0.3);
}

/* Button animations */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Loading animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>