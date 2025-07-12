<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-white">Task Management</h2>
        <p class="text-white/60 text-sm">Create, manage, and monitor your tasks</p>
      </div>
      <button
        @click="showCreateForm = !showCreateForm"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create Task
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-500/20 rounded-lg">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ taskStats.total }}</p>
            <p class="text-xs text-white/60">Total Tasks</p>
          </div>
        </div>
      </div>

      <div class="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-500/20 rounded-lg">
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ taskStats.active }}</p>
            <p class="text-xs text-white/60">Active Tasks</p>
          </div>
        </div>
      </div>

      <div class="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-yellow-500/20 rounded-lg">
            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ taskStats.pending }}</p>
            <p class="text-xs text-white/60">In Progress</p>
          </div>
        </div>
      </div>

      <div class="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-500/20 rounded-lg">
            <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-white">{{ formatNumber(taskStats.totalRewards) }}</p>
            <p class="text-xs text-white/60">Total Rewards</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Form -->
    <div v-if="showCreateForm" class="bg-[#1a1a1a] rounded-xl p-6 border border-white/10">
      <h3 class="text-lg font-bold mb-4">Create New Task</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Platform -->
        <div>
          <label class="block text-sm font-medium mb-2">Platform</label>
          <select 
            v-model="taskForm.platform"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="Twitter">Twitter</option>
            <option value="YouTube">YouTube</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>

        <!-- Task Type -->
        <div>
          <label class="block text-sm font-medium mb-2">Task Type</label>
          <select 
            v-model="taskForm.type"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="follow">Follow</option>
            <option value="like">Like</option>
            <option value="retweet">Retweet</option>
            <option value="comment">Comment</option>
            <option value="subscribe">Subscribe</option>
            <option value="watch">Watch</option>
            <option value="join">Join</option>
          </select>
        </div>

        <!-- Target Username -->
        <div>
          <label class="block text-sm font-medium mb-2">Target Username</label>
          <input
            v-model="taskForm.targetUsername"
            type="text"
            placeholder="username (without @)"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <!-- Reward -->
        <div>
          <label class="block text-sm font-medium mb-2">Reward (Gumballs)</label>
          <input
            v-model.number="taskForm.reward"
            type="number"
            min="1000"
            max="100000"
            step="1000"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <!-- Difficulty -->
        <div>
          <label class="block text-sm font-medium mb-2">Difficulty</label>
          <select 
            v-model.number="taskForm.difficulty"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option :value="1">1 - Easy</option>
            <option :value="2">2 - Medium</option>
            <option :value="3">3 - Hard</option>
            <option :value="4">4 - Expert</option>
            <option :value="5">5 - Legendary</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Description</label>
        <textarea
          v-model="taskForm.description"
          placeholder="Task description..."
          rows="3"
          class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
        ></textarea>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="createError" class="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
        <p class="text-red-400 text-sm">{{ createError }}</p>
      </div>

      <div v-if="createSuccess" class="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
        <p class="text-green-400 text-sm">{{ createSuccess }}</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="createTask"
          :disabled="createLoading || !isFormValid"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {{ createLoading ? 'Creating...' : 'Create Task' }}
        </button>
        
        <button
          @click="clearForm"
          class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Clear
        </button>
        
        <button
          @click="showCreateForm = false"
          class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-[#1a1a1a] rounded-xl p-4 border border-white/10">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tasks..."
              class="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Platform Filter -->
        <div class="lg:w-48">
          <select 
            v-model="selectedPlatform"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Platforms</option>
            <option value="Twitter">Twitter</option>
            <option value="YouTube">YouTube</option>
            <option value="Telegram">Telegram</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div class="lg:w-48">
          <select 
            v-model="selectedStatus"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <!-- Sort -->
        <div class="lg:w-48">
          <select 
            v-model="sortBy"
            class="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="reward-desc">Highest Reward</option>
            <option value="reward-asc">Lowest Reward</option>
            <option value="difficulty-desc">Hardest First</option>
            <option value="difficulty-asc">Easiest First</option>
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tasks List -->
    <div class="bg-[#1a1a1a] rounded-xl border border-white/10">
      <!-- Header -->
      <div class="p-4 border-b border-white/10">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Created Tasks ({{ filteredTasks.length }})</h3>
          <button
            @click="loadTasks"
            :disabled="loading"
            class="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
          >
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading tasks...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center">
        <div class="text-red-400 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-lg font-semibold">Error Loading Tasks</p>
          <p class="text-sm text-white/60 mt-1">{{ error }}</p>
        </div>
        <button
          @click="loadTasks"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTasks.length === 0" class="p-8 text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 class="text-lg font-semibold mb-2">No Tasks Found</h3>
        <p class="text-white/60 mb-4">
          {{ hasFilters ? 'No tasks match your current filters.' : 'You haven\'t created any tasks yet.' }}
        </p>
        <button
          v-if="hasFilters"
          @click="clearFilters"
          class="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors mr-2"
        >
          Clear Filters
        </button>
        <button
          @click="showCreateForm = true"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          Create First Task
        </button>
      </div>

      <!-- Tasks Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-black/20">
            <tr>
              <th class="text-left p-4 text-sm font-medium text-white/80">Task</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Platform</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Type</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Reward</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Difficulty</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Status</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Created</th>
              <th class="text-left p-4 text-sm font-medium text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr 
              v-for="task in filteredTasks" 
              :key="task.id"
              class="hover:bg-white/5 transition-colors"
            >
              <!-- Task Info -->
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <img 
                    :src="getPlatformIcon(task.platform)"
                    :alt="task.platform"
                    class="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p class="font-medium text-white">{{ task.title }}</p>
                    <p class="text-sm text-white/60">@{{ task.targetUsername || task.target?.username }}</p>
                  </div>
                </div>
              </td>

              <!-- Platform -->
              <td class="p-4">
                <span class="text-sm text-white/80">{{ task.platform?.name || task.platform }}</span>
              </td>

              <!-- Type -->
              <td class="p-4">
                <span 
                  :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getTaskTypeBadge(task.type)
                  ]"
                >
                  {{ task.type.toUpperCase() }}
                </span>
              </td>

              <!-- Reward -->
              <td class="p-4">
                <span class="font-bold text-[#FFCF00]">{{ formatNumber(task.reward) }}</span>
                <span class="text-xs text-white/60 ml-1">Gs</span>
              </td>

              <!-- Difficulty -->
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <div 
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      getDifficultyColor(task.difficulty)
                    ]"
                  >
                    {{ task.difficulty }}
                  </div>
                  <span class="text-sm text-white/60">{{ getDifficultyLabel(task.difficulty) }}</span>
                </div>
              </td>

              <!-- Status -->
              <td class="p-4">
                <span 
                  :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getStatusBadge(task.isActive !== false ? 'active' : 'paused')
                  ]"
                >
                  {{ task.isActive !== false ? 'ACTIVE' : 'PAUSED' }}
                </span>
              </td>

              <!-- Created Date -->
              <td class="p-4">
                <span class="text-sm text-white/60">{{ formatDate(task.createdAt) }}</span>
              </td>

              <!-- Actions -->
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <button
                    @click="toggleTaskStatus(task)"
                    :class="[
                      'p-1 rounded transition-colors',
                      task.isActive !== false 
                        ? 'text-yellow-400 hover:bg-yellow-500/20' 
                        : 'text-green-400 hover:bg-green-500/20'
                    ]"
                    :title="task.isActive !== false ? 'Pause Task' : 'Activate Task'"
                  >
                    <svg v-if="task.isActive !== false" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 4h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </button>

                  <button
                    @click="editTask(task)"
                    class="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                    title="Edit Task"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>

                  <button
                    @click="deleteTask(task)"
                    class="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete Task"
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { tasksAPI } from '@/services/api'

const emit = defineEmits(['task-created', 'task-updated', 'task-deleted'])

// State
const tasks = ref([])
const loading = ref(false)
const error = ref(null)

// Create form state
const showCreateForm = ref(false)
const createLoading = ref(false)
const createError = ref(null)
const createSuccess = ref(null)

// Filters
const searchQuery = ref('')
const selectedPlatform = ref('')
const selectedStatus = ref('')
const sortBy = ref('createdAt-desc')

// Task form
const taskForm = ref({
  platform: 'Twitter',
  type: 'follow',
  targetUsername: '',
  reward: 15000,
  difficulty: 2,
  description: ''
})

// Computed properties
const isFormValid = computed(() => {
  return taskForm.value.targetUsername.trim() && 
         taskForm.value.reward >= 1000 && 
         taskForm.value.reward <= 100000
})

const filteredTasks = computed(() => {
  let filtered = [...tasks.value]

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(task => 
      task.title?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.targetUsername?.toLowerCase().includes(query) ||
      task.target?.username?.toLowerCase().includes(query)
    )
  }

  // Platform filter
  if (selectedPlatform.value) {
    filtered = filtered.filter(task => 
      (task.platform?.name || task.platform) === selectedPlatform.value
    )
  }

  // Status filter
  if (selectedStatus.value) {
    filtered = filtered.filter(task => {
      if (selectedStatus.value === 'active') return task.isActive !== false
      if (selectedStatus.value === 'paused') return task.isActive === false
      return true
    })
  }

  // Sort
  const [sortField, sortOrder] = sortBy.value.split('-')
  filtered.sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (sortField === 'title') {
      aVal = (aVal || '').toLowerCase()
      bVal = (bVal || '').toLowerCase()
    }

    if (sortField === 'createdAt') {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }

    if (sortOrder === 'desc') {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    } else {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }
  })

  return filtered
})

const taskStats = computed(() => {
  const total = tasks.value.length
  const active = tasks.value.filter(t => t.isActive !== false).length
  const pending = tasks.value.filter(t => t.userStatus === 'in_progress').length
  const totalRewards = tasks.value.reduce((sum, t) => sum + (t.reward || 0), 0)

  return { total, active, pending, totalRewards }
})

const hasFilters = computed(() => {
  return searchQuery.value.trim() || selectedPlatform.value || selectedStatus.value
})

// Methods
const loadTasks = async () => {
  loading.value = true
  error.value = null
  
  try {
    // For now, using the getAvailableTasks endpoint
    // TODO: Add getCreatedTasks endpoint to API
    const response = await tasksAPI.getAvailableTasks()
    
    if (response.data.tasks) {
      tasks.value = response.data.tasks
    } else {
      tasks.value = []
    }
  } catch (err) {
    console.error('Failed to load tasks:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

const createTask = async () => {
  if (!isFormValid.value) return
  
  createLoading.value = true
  createError.value = null
  createSuccess.value = null
  
  try {
    const taskData = {
      targetUsername: taskForm.value.targetUsername.trim().replace('@', ''),
      type: taskForm.value.type,
      title: generateTitle(),
      description: taskForm.value.description || generateDescription(),
      reward: taskForm.value.reward,
      difficulty: taskForm.value.difficulty
    }
    
    const response = await tasksAPI.createTask(taskData)
    
    createSuccess.value = 'Task created successfully!'
    emit('task-created', response.data)
    
    // Add to local list
    if (response.data.task) {
      tasks.value.unshift(response.data.task)
    }
    
    // Clear form after success
    setTimeout(() => {
      clearForm()
      createSuccess.value = null
      showCreateForm.value = false
    }, 2000)
    
  } catch (err) {
    console.error('Failed to create task:', err)
    createError.value = err.response?.data?.message || err.message || 'Failed to create task'
  } finally {
    createLoading.value = false
  }
}

const toggleTaskStatus = async (task) => {
  // TODO: Add API endpoint for updating task status
  console.log('Toggle task status:', task.id, !task.isActive)
  
  // Optimistic update
  task.isActive = !task.isActive
  
  // TODO: Make API call to update status
  // await tasksAPI.updateTask(task.id, { isActive: task.isActive })
}

const editTask = (task) => {
  // TODO: Implement edit functionality
  console.log('Edit task:', task.id)
}

const deleteTask = async (task) => {
  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return
  
  // TODO: Add API endpoint for deleting tasks
  console.log('Delete task:', task.id)
  
  // Optimistic update
  const index = tasks.value.findIndex(t => t.id === task.id)
  if (index !== -1) {
    tasks.value.splice(index, 1)
  }
  
  // TODO: Make API call to delete task
  // await tasksAPI.deleteTask(task.id)
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedPlatform.value = ''
  selectedStatus.value = ''
  sortBy.value = 'createdAt-desc'
}

const clearForm = () => {
  taskForm.value = {
    platform: 'Twitter',
    type: 'follow',
    targetUsername: '',
    reward: 15000,
    difficulty: 2,
    description: ''
  }
  createError.value = null
  createSuccess.value = null
}

// Helper functions
const generateTitle = () => {
  const platform = taskForm.value.platform
  const type = taskForm.value.type
  const username = taskForm.value.targetUsername
  
  const actionMap = {
    follow: 'Follow',
    like: 'Like post from',
    retweet: 'Retweet from',
    comment: 'Comment on',
    subscribe: 'Subscribe to',
    watch: 'Watch video from',
    join: 'Join channel'
  }
  
  return `${actionMap[type] || type} ${username} on ${platform}`
}

const generateDescription = () => {
  const platform = taskForm.value.platform
  const type = taskForm.value.type
  const username = taskForm.value.targetUsername
  
  const descriptions = {
    follow: `Follow @${username} on ${platform}`,
    like: `Like the latest post from @${username}`,
    retweet: `Retweet the pinned post from @${username}`,
    comment: `Comment on the latest post from @${username}`,
    subscribe: `Subscribe to ${username} channel`,
    watch: `Watch the latest video from ${username}`,
    join: `Join ${username} channel`
  }
  
  return descriptions[type] || `Complete ${type} action for ${username}`
}

const getPlatformIcon = (platform) => {
  const platformName = platform?.name || platform
  const iconMap = {
    'Twitter': '/src/assets/x-logo.png',
    'YouTube': '/src/assets/youtube-logo.png',
    'Telegram': '/src/assets/telegram-logo.png'
  }
  return iconMap[platformName] || '/src/assets/default-platform.png'
}

const getTaskTypeBadge = (type) => {
  const badges = {
    follow: 'bg-blue-500/20 text-blue-400',
    like: 'bg-pink-500/20 text-pink-400',
    retweet: 'bg-green-500/20 text-green-400',
    comment: 'bg-purple-500/20 text-purple-400',
    subscribe: 'bg-red-500/20 text-red-400',
    watch: 'bg-orange-500/20 text-orange-400',
    join: 'bg-indigo-500/20 text-indigo-400'
  }
  return badges[type] || 'bg-gray-500/20 text-gray-400'
}

const getStatusBadge = (status) => {
  const badges = {
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-blue-500/20 text-blue-400'
  }
  return badges[status] || 'bg-gray-500/20 text-gray-400'
}

const getDifficultyColor = (difficulty) => {
  const colors = {
    1: 'bg-green-500 text-white',
    2: 'bg-yellow-500 text-black',
    3: 'bg-orange-500 text-white',
    4: 'bg-red-500 text-white',
    5: 'bg-purple-500 text-white'
  }
  return colors[difficulty] || 'bg-gray-500 text-white'
}

const getDifficultyLabel = (difficulty) => {
  const labels = {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard',
    4: 'Expert',
    5: 'Legendary'
  }
  return labels[difficulty] || 'Unknown'
}

const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Load tasks on mount
onMounted(() => {
  loadTasks()
})
</script>