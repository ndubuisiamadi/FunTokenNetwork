<template>
  <teleport to="body">
    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-gray-800 rounded-lg border border-gray-700 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <!-- Modal header -->
          <div class="bg-yellow-900/20 px-6 py-4 border-b border-yellow-500/30">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-lg leading-6 font-medium text-white">
                  Session Expiring Soon
                </h3>
              </div>
            </div>
          </div>

          <!-- Modal content -->
          <div class="bg-gray-800 px-6 py-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div class="mt-2">
                  <p class="text-sm text-gray-300 mb-4">
                    Your admin session will expire in <span class="font-semibold text-yellow-400">{{ formatTime(timeRemaining) }}</span> due to inactivity. 
                    Would you like to extend your session?
                  </p>

                  <!-- Countdown Progress Bar -->
                  <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-xs text-gray-400">Time Remaining</span>
                      <span class="text-xs text-gray-400">{{ Math.round(progressPercentage) }}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        class="h-2 rounded-full transition-all duration-1000 ease-linear"
                        :class="progressPercentage > 50 ? 'bg-yellow-400' : progressPercentage > 20 ? 'bg-orange-400' : 'bg-red-400'"
                        :style="{ width: progressPercentage + '%' }"
                      ></div>
                    </div>
                  </div>

                  <!-- Security Information -->
                  <div class="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <div class="flex">
                      <svg class="flex-shrink-0 h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <div class="ml-3">
                        <h4 class="text-sm font-medium text-white">Security Notice</h4>
                        <p class="text-xs text-gray-400 mt-1">
                          Admin sessions automatically expire for security purposes. Extending your session will keep you logged in for another 
                          {{ sessionDuration }} minutes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Current Session Info -->
                  <div class="text-xs text-gray-500 space-y-1">
                    <div class="flex justify-between">
                      <span>Session Started:</span>
                      <span>{{ formatDateTime(sessionStartTime) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Last Activity:</span>
                      <span>{{ formatDateTime(lastActivity) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>IP Address:</span>
                      <span>{{ userIP }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal actions -->
          <div class="bg-gray-700/30 px-6 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="extendSession"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Extend Session
            </button>
            <button
              @click="logout"
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign Out Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  timeRemaining: {
    type: Number,
    default: 300000 // 5 minutes in milliseconds
  },
  sessionDuration: {
    type: Number,
    default: 60 // 60 minutes
  },
  sessionStartTime: {
    type: Date,
    default: () => new Date()
  },
  lastActivity: {
    type: Date,
    default: () => new Date()
  },
  userIP: {
    type: String,
    default: '192.168.1.1'
  }
})

// Emits
const emit = defineEmits(['extend', 'logout'])

// State
const currentTimeRemaining = ref(props.timeRemaining)
let countdownInterval = null

// Computed
const progressPercentage = computed(() => {
  return (currentTimeRemaining.value / props.timeRemaining) * 100
})

// Methods
const formatTime = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return `${seconds} seconds`
}

const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

const extendSession = () => {
  emit('extend')
}

const logout = () => {
  emit('logout')
}

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    currentTimeRemaining.value -= 1000
    
    if (currentTimeRemaining.value <= 0) {
      clearInterval(countdownInterval)
      logout()
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// Lifecycle
onMounted(() => {
  startCountdown()
  
  // Prevent accidental page close during session warning
  const handleBeforeUnload = (event) => {
    event.preventDefault()
    event.returnValue = 'Your admin session is about to expire. Are you sure you want to leave?'
    return event.returnValue
  }
  
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Cleanup function
  onUnmounted(() => {
    stopCountdown()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})

onUnmounted(() => {
  stopCountdown()
})

// Keyboard shortcuts
const handleKeydown = (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    extendSession()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    logout()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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

/* Progress bar animations */
.transition-all {
  transition-property: width, background-color;
}

/* Pulsing effect for critical time */
@keyframes pulse-critical {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.bg-red-400 {
  animation: pulse-critical 1s ease-in-out infinite;
}

/* Button hover effects */
button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Focus styles for accessibility */
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .sm\:max-w-lg {
    max-width: 95vw;
  }
  
  .px-6 {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>