<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  userProgress: {
    type: Object,
    default: null
  },
  starting: {
    type: Boolean,
    default: false
  },
  completing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['start', 'complete', 'verify'])

// Computed properties
const isLoading = computed(() => {
  return (props.starting || props.completing) && 
         (props.task.status === 'available' || props.task.status === 'in-progress')
})

const isDisabled = computed(() => {
  return isLoading.value || 
         props.task.status === 'completed' ||
         props.task.status === 'pending-verification' ||
         !props.task.isActive ||
         (props.task.requirements && props.task.requirements.some(req => !req.met))
})

// Methods
const handleAction = () => {
  if (isDisabled.value) return

  switch (props.task.status) {
    case 'available':
      emit('start', props.task)
      break
    case 'in-progress':
      emit('complete', props.task)
      break
    case 'pending-verification':
      emit('verify', props.task)
      break
  }
}

const getButtonText = () => {
  if (isLoading.value) {
    return props.starting ? 'Starting...' : 'Completing...'
  }
  
  switch (props.task.status) {
    case 'available':
      return 'Start'
    case 'in-progress':
      return 'Complete'
    case 'completed':
      return 'Done'
    case 'pending-verification':
      return 'Pending'
    default:
      return 'Start'
  }
}

const getButtonStyle = () => {
  const baseClasses = 'size-8 sm:size-10 rounded-full font-medium text-xs sm:text-sm transition-all duration-200'
  
  if (isDisabled.value) {
    return `${baseClasses} bg-gray-600 text-gray-400 cursor-not-allowed`
  }
  
  switch (props.task.status) {
    case 'available':
      return `${baseClasses} bg-[#12BE32] text-white hover:bg-[#0ea025] hover:scale-105`
    case 'in-progress':
      return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 hover:scale-105`
    case 'pending-verification':
      return `${baseClasses} bg-orange-600 text-white cursor-not-allowed`
    case 'completed':
      return `${baseClasses} bg-green-600 text-white cursor-not-allowed`
    default:
      return `${baseClasses} bg-gray-600 text-gray-400`
  }
}

const getTaskTypeBadge = (type) => {
  const badges = {
    follow: 'bg-blue-500/20 text-blue-400',
    like: 'bg-red-500/20 text-red-400',
    comment: 'bg-green-500/20 text-green-400',
    share: 'bg-purple-500/20 text-purple-400',
    retweet: 'bg-purple-500/20 text-purple-400',
    subscribe: 'bg-orange-500/20 text-orange-400',
    watch: 'bg-red-500/20 text-red-400',
    join: 'bg-blue-500/20 text-blue-400'
  }
  return badges[type] || 'bg-gray-500/20 text-gray-400'
}

const getDifficultyColor = (difficulty) => {
  const colors = {
    1: 'bg-green-500 text-white',
    2: 'bg-yellow-500 text-black',
    3: 'bg-red-500 text-white'
  }
  return colors[difficulty] || 'bg-gray-500 text-white'
}

const formatNumber = (num) => {
  if (!num) return '0'
  return new Intl.NumberFormat().format(num)
}

const getTimeRemaining = (expiresAt) => {
  if (!expiresAt) return ''
  
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry - now
  
  if (diff <= 0) return 'Expired'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
</script>

<template>
  <div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#2a2a2a] rounded-xl transition-all duration-200 hover:bg-[#333] group">
    <!-- Task Platform Icon with Difficulty -->
    <div class="relative flex-shrink-0">
      <img 
        :src="task.platform.iconUrl" 
        :alt="task.platform.name"
        class="size-8 sm:size-10 rounded-full object-cover"
      />
      <div 
        v-if="task.difficulty"
        :class="[
          'absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full text-xs flex items-center justify-center font-bold',
          getDifficultyColor(task.difficulty)
        ]"
      >
        {{ task.difficulty }}
      </div>
    </div>

    <!-- Task Info -->
    <div class="flex-1 min-w-0">
      <div class="flex flex-row sm:items-center gap-1 sm:gap-2 mb-1">
        <p class="text-lg sm:text-2xl font-bold text-[#FFCF00] leading-none">
          +{{ formatNumber(task.reward) }}
        </p>
        <span class="text-xs text-white/60">{{ task.currency || 'Gs' }}</span>
        
        <!-- Task Type Badge -->
        <span 
          :class="[
            'text-xs px-2 py-1 rounded-full font-medium self-start sm:self-auto',
            getTaskTypeBadge(task.type)
          ]"
        >
          {{ task.type.toUpperCase() }}
        </span>
      </div>

      <div class="space-y-1">
        <p class="text-sm sm:text-lg font-medium truncate">{{ task.target.handle }}</p>
        <p class="text-xs sm:text-sm text-white/80 line-clamp-2">{{ task.description }}</p>
        
        <!-- Requirements -->
        <div v-if="task.requirements && task.requirements.length > 0" class="flex flex-wrap gap-1 sm:gap-2 mt-2">
          <span 
            v-for="req in task.requirements"
            :key="req.id"
            :class="[
              'text-xs px-2 py-1 rounded-full border',
              req.met 
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-orange-500 text-orange-400 bg-orange-500/10'
            ]"
          >
            {{ req.description }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div v-if="userProgress && task.status === 'in-progress'" class="mt-2">
          <div class="flex justify-between text-xs text-white/60 mb-1">
            <span>Progress</span>
            <span>{{ userProgress.progress }}%</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-1">
            <div 
              class="bg-[#12BE32] h-1 rounded-full transition-all duration-300"
              :style="{ width: `${userProgress.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <!-- Timer -->
      <div v-if="task.expiresAt" class="text-xs text-orange-400 text-center sm:mr-2">
        <div class="flex flex-col sm:flex-row items-center gap-1">
          <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-xs">{{ getTimeRemaining(task.expiresAt) }}</span>
        </div>
      </div>
      
      <!-- ICON-BASED ACTION BUTTON -->
      <button
        @click.stop="handleAction"
        :disabled="isDisabled"
        :class="getButtonStyle()"
        :title="getButtonText()"
      >
        <!-- Loading Spinner -->
        <div v-if="isLoading" class="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        
        <!-- Status Icons -->
        <template v-else>
          <!-- Available: Play icon -->
          <svg v-if="task.status === 'available'" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          
          <!-- In Progress: Check icon -->
          <svg v-else-if="task.status === 'in-progress'" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          
          <!-- Completed: Double check -->
          <svg v-else-if="task.status === 'completed'" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          
          <!-- Pending: Clock icon -->
          <svg v-else-if="task.status === 'pending-verification'" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          
          <!-- Default: Arrow -->
          <svg v-else class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </template>
      </button>
    </div>
  </div>
</template>