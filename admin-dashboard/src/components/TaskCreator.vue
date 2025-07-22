<template>
  <!-- Modal Overlay -->
  <div class="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

      <!-- This element is to trick the browser into centering the modal contents. -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-gray-800 rounded-lg border border-gray-700 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <!-- Modal header -->
        <div class="bg-gray-700/50 px-6 py-4 border-b border-gray-600">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-white">
              Create New Task
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Show errors if any -->
        <div v-if="createError" class="bg-red-900/20 border border-red-500/30 p-4 m-6 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-red-400 text-sm">{{ createError }}</p>
          </div>
        </div>

        <!-- Show success message -->
        <div v-if="createSuccess" class="bg-green-900/20 border border-green-500/30 p-4 m-6 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <p class="text-green-400 text-sm">{{ createSuccess }}</p>
          </div>
        </div>

        <!-- Modal content -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <!-- Platform Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Platform *
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="platform in platforms"
                :key="platform.id"
                type="button"
                :disabled="platform.name !== 'Twitter'"
                @click="selectPlatform(platform.id)"
                :class="[
                  'p-3 border rounded-lg transition-all duration-200 flex flex-col disabled:opacity-50 disabled:cursor-not-allowed items-center space-y-2',
                  form.platform === platform.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-600 bg-gray-700/30 text-gray-300 hover:border-gray-500'
                ]"
              >
                <img :src="platform.icon" :alt="platform.name" class="w-8 h-8 rounded-full" />
                <span class="text-sm font-medium">{{ platform.name }}</span>
              </button>
            </div>
            <p v-if="errors.platform" class="mt-1 text-sm text-red-400">{{ errors.platform }}</p>
          </div>

          <!-- Task Type -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Task Type *
            </label>
            <select 
              v-model="form.type"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="!form.platform"
            >
              <option value="">{{ form.platform ? 'Select task type' : 'Select platform first' }}</option>
              <option v-for="type in getTaskTypes()" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
            <p v-if="errors.type" class="mt-1 text-sm text-red-400">{{ errors.type }}</p>
          </div>

          <!-- Target Username -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Target Username *
            </label>
            <div class="relative">
              <input
                v-model="form.targetUsername"
                type="text"
                placeholder="Enter username (without @)"
                class="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-400">@</span>
              </div>
            </div>
            <p v-if="errors.targetUsername" class="mt-1 text-sm text-red-400">{{ errors.targetUsername }}</p>
            <p v-if="form.type" class="mt-1 text-xs text-gray-500">
              The username users need to {{ getTaskAction() }}
            </p>
          </div>

          <!-- Task Title -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Task Title
            </label>
            <input
              v-model="form.title"
              type="text"
              :placeholder="generateTitle()"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="mt-1 text-xs text-gray-500">
              Leave empty to auto-generate based on task type and username
            </p>
          </div>

          <!-- Task Description -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              :placeholder="generateDescription()"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">
              Leave empty to auto-generate based on task details
            </p>
          </div>

          <!-- Reward and Difficulty Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Reward -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Reward (Gumballs) *
              </label>
              <input
                v-model.number="form.reward"
                type="number"
                min="1000"
                max="100000"
                step="100"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p v-if="errors.reward" class="mt-1 text-sm text-red-400">{{ errors.reward }}</p>
              <p class="mt-1 text-xs text-gray-500">Recommended: {{ getRecommendedReward() }}</p>
            </div>

            <!-- Difficulty -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Difficulty *
              </label>
              <div class="flex items-center space-x-2">
                <button
                  v-for="level in 5"
                  :key="level"
                  type="button"
                  @click="form.difficulty = level"
                  :class="[
                    'w-8 h-8 rounded-full transition-all duration-200',
                    form.difficulty >= level
                      ? 'bg-yellow-400 text-gray-900'
                      : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
                  ]"
                >
                  <svg class="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </button>
              </div>
              <p v-if="errors.difficulty" class="mt-1 text-sm text-red-400">{{ errors.difficulty }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ getDifficultyDescription() }}</p>
            </div>
          </div>

          <!-- Task Status -->
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">
                Task Status
              </label>
              <p class="text-xs text-gray-500">
                Active tasks are visible to users immediately
              </p>
            </div>
            <div class="flex items-center">
              <button
                type="button"
                @click="form.isActive = !form.isActive"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  form.isActive ? 'bg-blue-600' : 'bg-gray-600'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    form.isActive ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
              <span :class="['ml-3 text-sm', form.isActive ? 'text-green-400' : 'text-gray-400']">
                {{ form.isActive ? 'Active' : 'Paused' }}
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-600">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 border border-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              :disabled="createLoading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || createLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <svg v-if="createLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ createLoading ? 'Creating...' : 'Create Task' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { tasksAPI } from '@/services/api'

// Props and emits
const emit = defineEmits(['close', 'task-created'])

// Component state
const createLoading = ref(false)
const createError = ref(null)
const createSuccess = ref(null)

// Form data
const form = ref({
  platform: '',
  type: '',
  targetUsername: '',
  title: '',
  description: '',
  reward: 1000,
  difficulty: 1,
  isActive: true,
  maxCompletions: null
})

// Form validation
const errors = ref({})

// Platform configurations
const platforms = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: '/src/assets/x-logo.png'
  },
  {
    id: 'youtube',
    name: 'YouTube', 
    icon: '/src/assets/youtube-logo.png'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '/src/assets/telegram-logo.png'
  }
]

// Task types based on platform
const taskTypes = {
  twitter: [
    { value: 'follow', label: 'Follow Account' },
    { value: 'like', label: 'Like Tweet' },
    { value: 'retweet', label: 'Retweet' },
    { value: 'comment', label: 'Comment on Tweet' }
  ],
  youtube: [
    { value: 'subscribe', label: 'Subscribe to Channel' },
    { value: 'like', label: 'Like Video' },
    { value: 'comment', label: 'Comment on Video' }
  ],
  telegram: [
    { value: 'join', label: 'Join Channel/Group' },
    { value: 'follow', label: 'Follow Channel' }
  ]
}

// Computed properties
const isFormValid = computed(() => {
  return form.value.platform &&
         form.value.type &&
         form.value.targetUsername &&
         form.value.reward >= 1000 &&
         form.value.reward <= 100000 &&
         form.value.difficulty >= 1 &&
         form.value.difficulty <= 5
})

// Methods
const selectPlatform = (platformId) => {
  form.value.platform = platformId
  form.value.type = '' // Reset task type when platform changes
  errors.value.platform = null
}

const getTaskTypes = () => {
  return taskTypes[form.value.platform] || []
}

const getTaskAction = () => {
  const actions = {
    follow: 'follow',
    like: 'like',
    retweet: 'retweet',
    comment: 'comment on',
    subscribe: 'subscribe to',
    join: 'join'
  }
  return actions[form.value.type] || 'interact with'
}

const generateTitle = () => {
  if (!form.value.type || !form.value.targetUsername) return ''
  
  const titles = {
    follow: `Follow @${form.value.targetUsername}`,
    like: `Like @${form.value.targetUsername}'s post`,
    retweet: `Retweet @${form.value.targetUsername}'s tweet`,
    comment: `Comment on @${form.value.targetUsername}'s post`,
    subscribe: `Subscribe to @${form.value.targetUsername}`,
    join: `Join @${form.value.targetUsername}`
  }
  
  return titles[form.value.type] || `${form.value.type} @${form.value.targetUsername}`
}

const generateDescription = () => {
  if (!form.value.type || !form.value.targetUsername) return ''
  
  const descriptions = {
    follow: `Follow @${form.value.targetUsername} on ${form.value.platform} to complete this task and earn ${form.value.reward} Gumballs.`,
    like: `Like the specified post from @${form.value.targetUsername} to earn ${form.value.reward} Gumballs.`,
    retweet: `Retweet the specified tweet from @${form.value.targetUsername} to earn ${form.value.reward} Gumballs.`,
    comment: `Leave a meaningful comment on @${form.value.targetUsername}'s post to earn ${form.value.reward} Gumballs.`,
    subscribe: `Subscribe to @${form.value.targetUsername}'s channel to earn ${form.value.reward} Gumballs.`,
    join: `Join @${form.value.targetUsername}'s channel or group to earn ${form.value.reward} Gumballs.`
  }
  
  return descriptions[form.value.type] || `Complete the ${form.value.type} action for @${form.value.targetUsername} to earn ${form.value.reward} Gumballs.`
}

const getRecommendedReward = () => {
  const baseRewards = {
    1: 1000,  // Very Easy
    2: 1500, // Easy
    3: 2500, // Medium
    4: 4000, // Hard
    5: 6000  // Very Hard
  }
  return baseRewards[form.value.difficulty] || 1000
}

const getDifficultyDescription = () => {
  const descriptions = {
    1: 'Very Easy - Simple one-click actions',
    2: 'Easy - Basic interactions',
    3: 'Medium - Requires some effort',
    4: 'Hard - Complex or time-consuming',
    5: 'Very Hard - Challenging tasks'
  }
  return descriptions[form.value.difficulty] || 'Select difficulty level'
}

const validateForm = () => {
  errors.value = {}
  
  if (!form.value.platform) {
    errors.value.platform = 'Platform is required'
  }
  
  if (!form.value.type) {
    errors.value.type = 'Task type is required'
  }
  
  if (!form.value.targetUsername) {
    errors.value.targetUsername = 'Target username is required'
  } else if (form.value.targetUsername.includes('@')) {
    errors.value.targetUsername = 'Username should not include @ symbol'
  }
  
  if (!form.value.reward || form.value.reward < 1000 || form.value.reward > 100000) {
    errors.value.reward = 'Reward must be between 1,000 and 100,000 Gumballs'
  }
  
  if (!form.value.difficulty || form.value.difficulty < 1 || form.value.difficulty > 5) {
    errors.value.difficulty = 'Difficulty must be between 1 and 5'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  console.log('🚀 Form submitted')
  
  // Clear previous states
  createError.value = null
  createSuccess.value = null
  
  if (!validateForm()) {
    console.error('❌ Form validation failed:', errors.value)
    return
  }
  
  createLoading.value = true
  
  try {
    const taskData = {
      platform: form.value.platform,
      type: form.value.type,
      targetUsername: form.value.targetUsername.replace('@', ''), // Remove @ if present
      title: form.value.title || generateTitle(),
      description: form.value.description || generateDescription(),
      reward: form.value.reward,
      difficulty: form.value.difficulty,
      isActive: form.value.isActive,
      maxCompletions: form.value.maxCompletions || undefined
    }
    
    console.log('📤 Sending task data:', taskData)
    
    const response = await tasksAPI.createTask(taskData)
    
    console.log('✅ Task created successfully:', response.data)
    
    createSuccess.value = 'Task created successfully!'
    
    // Wait a moment to show success message, then close modal and refresh list
    setTimeout(() => {
      emit('task-created', response.data)
      closeModal()
    }, 1500)
    
  } catch (error) {
    console.error('❌ Failed to create task:', error)
    
    // Extract error message
    let errorMessage = 'Failed to create task'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.errors?.length > 0) {
      errorMessage = error.response.data.errors[0].msg || error.response.data.errors[0].message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    createError.value = errorMessage
  } finally {
    createLoading.value = false
  }
}

const closeModal = () => {
  if (!createLoading.value) {
    emit('close')
  }
}

// Watch for platform changes to reset task type
watch(() => form.value.platform, () => {
  form.value.type = ''
})

// Watch for difficulty changes to update recommended reward
watch(() => form.value.difficulty, () => {
  if (!form.value.reward || form.value.reward === getRecommendedReward()) {
    form.value.reward = getRecommendedReward()
  }
})
</script>

<style scoped>
/* Modal entrance animation */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.inline-block {
  animation: modalSlideIn 0.3s ease-out;
}

/* Loading spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
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