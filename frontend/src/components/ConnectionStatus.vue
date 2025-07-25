<script setup>
// src/components/ConnectionStatus.vue - CONNECTION STATUS INDICATOR WITH RELIABILITY
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { socketService } from '@/services/socket'
import { CONNECTION_STATE } from '@/utils/messageStatus'

const props = defineProps({
  showDetails: {
    type: Boolean,
    default: false
  },
  compact: {
    type: Boolean,
    default: false
  },
  position: {
    type: String,
    default: 'bottom-right' // 'bottom-right', 'top-center', 'inline'
  }
})

const messagesStore = useMessagesStore()
const showRetryPanel = ref(false)
const isRetrying = ref(false)

// Computed properties
const connectionStatus = computed(() => messagesStore.connectionStatus)
const isOnline = computed(() => messagesStore.isOnline)
const isConnecting = computed(() => messagesStore.isConnecting)
const isOffline = computed(() => messagesStore.isOffline)
const failedMessagesCount = computed(() => messagesStore.failedMessagesCount)
const queuedMessagesCount = computed(() => messagesStore.queuedMessagesCount)

// Connection stats for detailed view
const connectionStats = computed(() => {
  const stats = socketService.getReliabilityStats()
  return {
    ...stats,
    ...connectionStatus.value
  }
})

// Should show the status indicator
const shouldShow = computed(() => {
  // Always show if there are issues
  if (!isOnline.value || failedMessagesCount.value > 0 || queuedMessagesCount.value > 0) {
    return true
  }
  
  // Show if explicitly requested
  return props.showDetails
})

// Status icon and styling
const statusIcon = computed(() => {
  if (isOnline.value) {
    return {
      icon: '🟢',
      class: 'text-green-500',
      bgClass: 'bg-green-500/10 border-green-500/20'
    }
  } else if (isConnecting.value) {
    return {
      icon: '🟡',
      class: 'text-yellow-500 animate-pulse',
      bgClass: 'bg-yellow-500/10 border-yellow-500/20'
    }
  } else {
    return {
      icon: '🔴',
      class: 'text-red-500',
      bgClass: 'bg-red-500/10 border-red-500/20'
    }
  }
})

// Position classes
const positionClasses = computed(() => {
  switch (props.position) {
    case 'top-center':
      return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50'
    case 'bottom-right':
      return 'fixed bottom-20 right-4 z-50'
    case 'inline':
      return 'relative'
    default:
      return 'fixed bottom-20 right-4 z-50'
  }
})

// Methods
const handleRetryConnection = async () => {
  if (isRetrying.value) return
  
  isRetrying.value = true
  
  try {
    console.log('🔄 Manual connection retry requested')
    
    // Disconnect and reconnect
    socketService.disconnect()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const success = await socketService.connect()
    
    if (success) {
      console.log('✅ Manual reconnection successful')
    } else {
      console.error('❌ Manual reconnection failed')
    }
  } catch (error) {
    console.error('❌ Manual retry error:', error)
  } finally {
    isRetrying.value = false
  }
}

const handleRetryFailedMessages = async () => {
  if (isRetrying.value) return
  
  isRetrying.value = true
  
  try {
    console.log('🔄 Retrying all failed messages')
    
    const failedMessages = messagesStore.currentConversationFailedMessages
    
    for (const message of failedMessages) {
      const tempId = message.tempId || message.id
      await messagesStore.retryFailedMessage(tempId)
      
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('✅ Failed message retry completed')
  } catch (error) {
    console.error('❌ Failed message retry error:', error)
  } finally {
    isRetrying.value = false
  }
}

const clearFailedMessages = () => {
  messagesStore.clearFailedMessages()
  showRetryPanel.value = false
}

const toggleRetryPanel = () => {
  showRetryPanel.value = !showRetryPanel.value
}

// Auto-hide retry panel when all issues are resolved
const autoHideTimer = ref(null)

const scheduleAutoHide = () => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }
  
  autoHideTimer.value = setTimeout(() => {
    if (isOnline.value && failedMessagesCount.value === 0 && queuedMessagesCount.value === 0) {
      showRetryPanel.value = false
    }
  }, 3000)
}

// Watch for connection recovery
const unwatchConnection = computed(() => {
  if (isOnline.value && failedMessagesCount.value === 0 && queuedMessagesCount.value === 0) {
    scheduleAutoHide()
  }
  return null
})

onMounted(() => {
  // Watch for connection changes
  unwatchConnection.value
})

onUnmounted(() => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value)
  }
})
</script>

<template>
  <!-- Main Status Indicator -->
  <div 
    v-if="shouldShow"
    :class="[
      positionClasses,
      'transition-all duration-300 ease-in-out'
    ]"
  >
    
    <!-- Compact Status -->
    <div 
      v-if="compact"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-sm',
        statusIcon.bgClass,
        'cursor-pointer hover:scale-105 transition-transform'
      ]"
      @click="toggleRetryPanel"
    >
      <span :class="statusIcon.class">{{ statusIcon.icon }}</span>
      <span :class="[statusIcon.class, 'text-xs font-medium']">
        {{ connectionStatus.message }}
      </span>
      
      <!-- Issue indicators -->
      <div v-if="failedMessagesCount > 0 || queuedMessagesCount > 0" class="flex items-center gap-1">
        <span v-if="failedMessagesCount > 0" class="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
          {{ failedMessagesCount }}
        </span>
        <span v-if="queuedMessagesCount > 0" class="text-xs bg-yellow-500 text-white rounded-full px-1.5 py-0.5">
          {{ queuedMessagesCount }}
        </span>
      </div>
    </div>

    <!-- Detailed Status Panel -->
    <div 
      v-else
      :class="[
        'bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl backdrop-blur-sm',
        'min-w-64 max-w-80'
      ]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span :class="statusIcon.class">{{ statusIcon.icon }}</span>
          <span :class="[statusIcon.class, 'font-medium']">
            {{ connectionStatus.message }}
          </span>
        </div>
        
        <button 
          @click="showRetryPanel = false"
          class="text-white/50 hover:text-white text-lg"
        >
          ×
        </button>
      </div>

      <!-- Status Details -->
      <div class="p-3 space-y-3">
        
        <!-- Connection Issues -->
        <div v-if="!isOnline" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-white/70">Connection</span>
            <span class="text-red-400">{{ connectionStatus.message }}</span>
          </div>
          
          <button 
            @click="handleRetryConnection"
            :disabled="isRetrying"
            :class="[
              'w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors',
              isRetrying 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-[#055CFF] hover:bg-[#0550e5] text-white'
            ]"
          >
            {{ isRetrying ? 'Reconnecting...' : 'Retry Connection' }}
          </button>
        </div>

        <!-- Message Issues -->
        <div v-if="failedMessagesCount > 0 || queuedMessagesCount > 0" class="space-y-2">
          
          <!-- Failed Messages -->
          <div v-if="failedMessagesCount > 0" class="flex items-center justify-between text-sm">
            <span class="text-white/70">Failed Messages</span>
            <span class="text-red-400">{{ failedMessagesCount }}</span>
          </div>
          
          <!-- Queued Messages -->
          <div v-if="queuedMessagesCount > 0" class="flex items-center justify-between text-sm">
            <span class="text-white/70">Queued Messages</span>
            <span class="text-yellow-400">{{ queuedMessagesCount }}</span>
          </div>

          <!-- Retry Actions -->
          <div class="flex gap-2">
            <button 
              v-if="failedMessagesCount > 0"
              @click="handleRetryFailedMessages"
              :disabled="isRetrying"
              :class="[
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                isRetrying 
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              ]"
            >
              {{ isRetrying ? 'Retrying...' : 'Retry Failed' }}
            </button>
            
            <button 
              v-if="failedMessagesCount > 0"
              @click="clearFailedMessages"
              class="px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Success State -->
        <div v-if="isOnline && failedMessagesCount === 0 && queuedMessagesCount === 0" class="text-center py-2">
          <span class="text-green-400 text-sm">✅ All messages delivered</span>
        </div>

        <!-- Debug Info (Development) -->
        <div v-if="showDetails && $env?.NODE_ENV === 'development'" class="pt-2 border-t border-white/10">
          <details class="text-xs text-white/50">
            <summary class="cursor-pointer hover:text-white/70">Debug Info</summary>
            <div class="mt-2 space-y-1">
              <div>Socket ID: {{ connectionStats.socketId || 'None' }}</div>
              <div>Pending: {{ connectionStats.pendingMessages }}</div>
              <div>Retrying: {{ connectionStats.retryTimeouts }}</div>
              <div>Send Timeouts: {{ connectionStats.sendTimeouts }}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>

  <!-- Retry Panel (Mobile-friendly overlay) -->
  <div 
    v-if="showRetryPanel && compact"
    class="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4"
    @click="showRetryPanel = false"
  >
    <div 
      @click.stop
      class="bg-[#1A1A1A] border border-white/10 rounded-t-2xl w-full max-w-md"
    >
      <!-- Handle -->
      <div class="flex justify-center py-2">
        <div class="w-8 h-1 bg-white/30 rounded-full"></div>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4">
        <h3 class="text-lg font-semibold text-white text-center">Connection Status</h3>
        
        <!-- Status Info -->
        <div class="flex items-center justify-center gap-2">
          <span :class="statusIcon.class">{{ statusIcon.icon }}</span>
          <span :class="[statusIcon.class, 'font-medium']">
            {{ connectionStatus.message }}
          </span>
        </div>

        <!-- Issues Summary -->
        <div v-if="failedMessagesCount > 0 || queuedMessagesCount > 0" class="space-y-2">
          <div v-if="failedMessagesCount > 0" class="flex items-center justify-between text-sm">
            <span class="text-white/70">Failed Messages</span>
            <span class="text-red-400">{{ failedMessagesCount }}</span>
          </div>
          
          <div v-if="queuedMessagesCount > 0" class="flex items-center justify-between text-sm">
            <span class="text-white/70">Queued Messages</span>
            <span class="text-yellow-400">{{ queuedMessagesCount }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-2">
          <button 
            v-if="!isOnline"
            @click="handleRetryConnection"
            :disabled="isRetrying"
            :class="[
              'w-full py-3 px-4 rounded-lg font-medium transition-colors',
              isRetrying 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-[#055CFF] hover:bg-[#0550e5] text-white'
            ]"
          >
            {{ isRetrying ? 'Reconnecting...' : 'Retry Connection' }}
          </button>
          
          <button 
            v-if="failedMessagesCount > 0"
            @click="handleRetryFailedMessages"
            :disabled="isRetrying"
            :class="[
              'w-full py-3 px-4 rounded-lg font-medium transition-colors',
              isRetrying 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            ]"
          >
            {{ isRetrying ? 'Retrying Messages...' : 'Retry Failed Messages' }}
          </button>

          <div class="flex gap-2">
            <button 
              @click="showRetryPanel = false"
              class="flex-1 py-3 px-4 rounded-lg font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            
            <button 
              v-if="failedMessagesCount > 0"
              @click="clearFailedMessages"
              class="flex-1 py-3 px-4 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Clear Failed
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>