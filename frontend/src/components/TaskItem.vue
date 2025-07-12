<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { tasksAPI } from '@/services/api'

import doneIcon from '@/components/icons/done-filled.svg'
import playIcon from '@/components/icons/play-filled.svg'
import progressIcon from '@/components/icons/clock-filled.svg'
import retryIcon from '@/components/icons/retry-filled.svg'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['task-updated', 'task-completed', 'task-failed'])

// State
const isStarting = ref(false)
const isRetrying = ref(false)
const isPolling = ref(false)
const taskProgress = ref(null)
const pollingInterval = ref(null)

// Start polling when task is in progress
watch(() => props.task.userStatus, (newStatus, oldStatus) => {
  if (newStatus === 'in_progress') {
    startPolling()
  } else {
    stopPolling()
  }
})

// Polling management
const startPolling = () => {
  if (isPolling.value) return // Already polling
  
  console.log(`🔄 Starting polling for task ${props.task.id}`)
  isPolling.value = true
  
  // Poll every 3 seconds
  pollingInterval.value = setInterval(async () => {
    await checkTaskStatus()
  }, 3000)
  
  // Stop polling after 70 seconds (safety measure)
  setTimeout(() => {
    if (isPolling.value) {
      stopPolling()
    }
  }, 70000)
}

const stopPolling = () => {
  if (!isPolling.value) return
  
  console.log(`🛑 Stopping polling for task ${props.task.id}`)
  isPolling.value = false
  taskProgress.value = null
  
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

// Check task status via API
const checkTaskStatus = async () => {
  try {
    const response = await tasksAPI.getTaskStatus(props.task.id)
    
    if (response.data.success) {
      const { status, progress, reward, autoVerified } = response.data
      
      // Update progress
      if (progress) {
        taskProgress.value = progress
      }
      
      // Check if status changed
      if (status !== props.task.userStatus) {
        console.log(`📊 Task ${props.task.id} status changed: ${props.task.userStatus} → ${status}`)
        
        if (status === 'completed') {
          stopPolling()
          emit('task-completed', {
            taskId: props.task.id,
            verified: true,
            reward,
            autoVerified,
            message: `🎉 Task completed! You earned ${reward} gumballs! ${autoVerified ? '(Auto-verified)' : ''}`
          })
        } else if (status === 'failed') {
          stopPolling()
          emit('task-failed', {
            taskId: props.task.id,
            verified: false,
            canRetry: true,
            message: 'Task verification failed. You can retry this task.'
          })
        }
        
        // Emit status update
        emit('task-updated', {
          taskId: props.task.id,
          status,
          progress,
          autoVerified
        })
      }
    }
  } catch (error) {
    console.error('Error checking task status:', error)
  }
}

// Task actions
const startTask = async () => {
isStarting.value = true
  
  try {
    console.log('Starting task:', props.task.id)
    const response = await tasksAPI.startTask(props.task.id)
    
    if (response.data.success) {
      // ✨ AUTOMATICALLY OPEN TWITTER
      openTwitterForTask()

      // Task started successfully, polling will begin automatically
      emit('task-updated', {
        taskId: props.task.id,
        status: 'in_progress',
        message: 'Task started! Complete the action on Twitter - we\'ll check automatically.'
      })
    } else {
      console.error('Failed to start task:', response.data.message)
    }
  } catch (error) {
    console.error('Error starting task:', error)
  } finally {
    isStarting.value = false
  }
  
}

const retryTask = async () => {
  isRetrying.value = true
  
  try {
    console.log('Retrying task:', props.task.id)
    const response = await tasksAPI.startTask(props.task.id)
    
    if (response.data.success) {
      // ✨ AUTOMATICALLY OPEN TWITTER
      openTwitterForTask()

      // Task retry started, polling will begin automatically
      emit('task-updated', {
        taskId: props.task.id,
        status: 'in_progress',
        message: 'Task retry started! Complete the action on Twitter.',
        isRetry: true
      })
    } else {
      console.error('Failed to retry task:', response.data.message)
    }
  } catch (error) {
    console.error('Error retrying task:', error)
  } finally {
    isRetrying.value = false
  }
}

// 🔗 Open Twitter automatically based on task type
const openTwitterForTask = () => {
  const task = props.task
  let twitterUrl = 'https://x.com'
  
  try {
    switch (task.type) {
      case 'follow':
        twitterUrl = `https://x.com/${task.target.username}`
        break
        
      case 'like':
      case 'retweet':
      case 'comment':
        if (task.target.tweetId) {
          twitterUrl = `https://x.com/${task.target.username}/status/${task.target.tweetId}`
        } else {
          twitterUrl = `https://x.com/${task.target.username}`
        }
        break
        
      default:
        twitterUrl = `https://x.com/${task.target.username}`
    }
    
    console.log('🔗 Opening X:', twitterUrl)
    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
    
  } catch (error) {
    console.error('Error opening Twitter:', error)
    window.open('https://x.com', '_blank', 'noopener,noreferrer')
  }
}

// Helper functions
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
    available: 'bg-gray-500/20 text-gray-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400'
  }
  return badges[status] || 'bg-gray-500/20 text-gray-400'
}

const getStatusText = (status) => {
  const texts = {
    available: 'Available',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed'
  }
  return texts[status] || status
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

const getStatusColor = (status) => {
  const colors = {
    available: 'bg-[linear-gradient(135deg,#055CFF_0%,#0066ff_50%,#00aaff_100%)] hover:shadow-[0_12px_35px_rgba(5,92,255,0.6),inset_0_2px_15px_rgba(255,255,255,0.4)]',
    in_progress: 'bg-[linear-gradient(135deg,#CF8217_0%,#F7A73E_50%,#B05E00_100%)] hover:shadow-[0_12px_35px_rgba(207,161,23,0.6),inset_0_2px_15px_rgba(255,255,255,0.4)]',
    completed: 'bg-[linear-gradient(135deg,#17CF45_0%,#3EF7A1_50%,#00B058_100%)] hover:shadow-[0_12px_35px_rgba(23,207,69,0.6),inset_0_2px_15px_rgba(255,255,255,0.4)]',
    failed: 'bg-[linear-gradient(135deg,#CF3F17_0%,#F7633E_50%,#B01500_100%)] hover:shadow-[0_12px_35px_rgba(207,48,23,0.6),inset_0_2px_15px_rgba(255,255,255,0.4)]'
  }
  if (status === 'in_progress') {
    return colors.in_progress
  }
  
  return colors[status] || colors.available
}

const getRewardColor = (reward) => {
  if (reward >= 15000) {
    return 'text-[#FFCF00]'  
  } else {
    return 'text-green-500'   
  }
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
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Initialize polling if task is already in progress
onMounted(() => {
  if (props.task.userStatus === 'in_progress') {
    startPolling()
  }
})

// Cleanup
onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#2a2a2a] rounded-xl transition-all duration-200 hover:bg-[#333] group relative overflow-hidden">
    <!-- Auto-verification progress bar -->
    <div 
      v-if="isPolling && taskProgress" 
      class="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 rounded-t-xl"
      :style="{ width: `${taskProgress.percent}%` }"
    >
      <div class="absolute top-0 right-0 w-2 h-1 bg-white/50 animate-pulse"></div>
    </div>

    <!-- Task Platform Icon with Difficulty -->
    <div class="relative flex-shrink-0">
      <img 
        :src="task.platform.iconUrl" 
        :alt="task.platform.name"
        :class="[
          'size-8 sm:size-10 rounded-full object-cover transition-all duration-300',
          isPolling ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#2a2a2a]' : ''
        ]"
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
      
      <!-- Auto-verification spinner overlay -->
      <div 
        v-if="isPolling"
        class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
      >
        <div class="size-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>

    <!-- Task Info -->
    <div class="flex-1 min-w-0">
      <div class="flex  md:flex-row items-center gap-2 mb-1">
        <p :class="['text-sm sm:text-2xl font-bold leading-none', getRewardColor(task.reward)]">
          +{{ formatNumber(task.reward) }}
        </p>
        <!-- <span class="text-xs text-white/60">{{ task.currency || 'Gs' }}</span> -->
        
        <!-- Task Type Badge -->
        <span 
          :class="[
            'text-[9px] px-2 py-1 rounded-full font-medium self-start sm:self-auto',
            getTaskTypeBadge(task.type)
          ]"
        >
          {{ task.type.toUpperCase() }}
        </span>

        <!-- Status Badge -->
        <!-- <span 
          v-if="task.userStatus"
          :class="[
            'text-xs px-2 py-1 rounded-full font-medium self-start sm:self-auto ml-auto',
            getStatusBadge(task.userStatus)
          ]"
        >
          {{ getStatusText(task.userStatus) }}
        </span> -->
      </div>

      <div class="space-y-1">
        <p class="text-xs sm:text-base font-medium truncate lowercase">
          {{ task.target?.handle || task.target?.username || 'Unknown target' }}
        </p>
        <!-- <p class="text-xs sm:text-sm text-white/80 line-clamp-2">{{ task.description }}</p> -->
        
        <!-- Auto-verification status with polling updates -->
               

        <!-- Expiry Warning -->
        <div v-if="task.expiresAt && getTimeRemaining(task.expiresAt)" class="flex items-center gap-1 text-xs text-orange-400">
          <!-- <span>⏰</span> -->
          <span>{{ getTimeRemaining(task.expiresAt) }} remaining</span>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex-shrink-0">
      <!-- Start Task Button -->
      <button
        @click="startTask"
        :disabled="isStarting"
        class=" shrink-0 cursor-pointer"
      >
      <div :class="['size-12 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] relative flex items-center justify-center transition-all duration-300 ease-in-out  hover:scale-110 animate-bulb-rotate hover:animate-bulb-rotate-reverse',
        getStatusColor(task.userStatus)
      ]">
    <img :src="[task.userStatus === 'in_progress' || isStarting ? progressIcon : 
    task.userStatus === 'completed' ? doneIcon : task.userStatus === 'failed' ? retryIcon : playIcon]" class="relative size-6 animate-stay-still" >
    </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Keyframes and animations that Tailwind can't handle */
@keyframes bulbRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow {
  from {
    opacity: 0.2;
    transform: scale(0.9);
  }
  to {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.animate-bulb-rotate {
  animation: bulbRotate 4s linear infinite;
}

.animate-bulb-rotate-reverse:hover {
  animation-direction: reverse;
}

.cta-button-bulb::before {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  /* background: linear-gradient(135deg, #00B043, #195E00); */
  border-radius: 45% 55% 60% 40% / 50% 45% 55% 50%;
  opacity: 0.3;
  animation: 
    bulbRotate 4s linear infinite,
    glow 2s ease-in-out infinite alternate;
  z-index: -1;
}

.animate-stay-still {
  animation: stayStill 4s linear infinite;
}

/* Keep play icon stationary while bulb rotates */
@keyframes stayStill {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

</style>