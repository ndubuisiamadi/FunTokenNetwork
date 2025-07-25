<script setup>
import NavBar from '@/components/NavigationBar.vue'
import Header from '@/components/Header.vue'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { useSocketConnector } from '@/composables/useSocketConnector'
import { CONNECTION_STATE } from '@/utils/messageStatus'

const route = useRoute()
const authStore = useAuthStore()
const messagesStore = useMessagesStore()
const { connectSocket, disconnectSocket } = useSocketConnector()

const isMobile = ref(false)
const bottomNav = ref(null)

// 🔥 RELIABILITY FEATURES
const connectionState = computed(() => messagesStore.connectionState)
const isOnline = computed(() => messagesStore.isOnline)
const failedMessagesCount = computed(() => messagesStore.failedMessagesCount)
const showGlobalConnectionAlert = ref(false)
const connectionAlertDismissed = ref(false)

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // CRITICAL: Connect socket when app starts if user is logged in
  if (authStore.isLoggedIn) {
    console.log('🚀 App: User is logged in, connecting socket')
    connectSocket()
  }

  // 🔥 REQUEST NOTIFICATION PERMISSION
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Notification permission:', permission)
    })
  }

  // 🔥 HANDLE PAGE VISIBILITY CHANGES (for connection management)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 🔥 HANDLE PAGE VISIBILITY FOR BETTER CONNECTION MANAGEMENT
const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log('📱 App: Page hidden, maintaining socket connection')
    // Keep connection alive but reduce activity
  } else {
    console.log('📱 App: Page visible, ensuring socket connection')
    // Ensure socket is connected when page becomes visible
    if (authStore.isLoggedIn && !messagesStore.isOnline) {
      console.log('🔄 App: Reconnecting socket on page focus')
      connectSocket()
    }
  }
}

// CRITICAL: Watch for auth changes to connect/disconnect socket
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    console.log('🔐 App: User logged in, connecting socket')
    connectSocket()
  } else {
    console.log('🔓 App: User logged out, disconnecting socket')
    disconnectSocket()
    
    // 🔥 CLEANUP: Reset connection state when logging out
    connectionAlertDismissed.value = false
  }
})

// 🔥 WATCH CONNECTION STATE FOR GLOBAL ALERTS
watch(connectionState, (newState, oldState) => {
  console.log(`🔌 App: Connection state changed: ${oldState} → ${newState}`)
  
  // Show global alert for connection issues
  if (newState === CONNECTION_STATE.DISCONNECTED && oldState === CONNECTION_STATE.ONLINE) {
    if (!connectionAlertDismissed.value) {
      showGlobalConnectionAlert.value = true
    }
  } else if (newState === CONNECTION_STATE.ONLINE && oldState === CONNECTION_STATE.DISCONNECTED) {
    // Hide alert when reconnected
    showGlobalConnectionAlert.value = false
    connectionAlertDismissed.value = false
    
    // Show brief success notification
    showSuccessNotification('Connection restored')
  }
})

// 🔥 WATCH FAILED MESSAGES FOR NOTIFICATIONS
watch(failedMessagesCount, (newCount, oldCount) => {
  if (newCount > oldCount && newCount > 0) {
    console.log(`📨 App: Failed messages count increased to ${newCount}`)
    
    // Show notification for failed messages
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Message failed to send', {
        body: `${newCount} message${newCount === 1 ? '' : 's'} failed to send. Tap to retry.`,
        icon: '/favicon.png',
        tag: 'failed-messages' // Prevent spam
      })
    }
  }
})

// 🔥 NOTIFICATION HELPERS
const showSuccessNotification = (message) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('✅ ' + message, {
      icon: '/favicon.png',
      tag: 'success-notification'
    })
  }
}

const dismissConnectionAlert = () => {
  showGlobalConnectionAlert.value = false
  connectionAlertDismissed.value = true
}

const retryConnection = async () => {
  console.log('🔄 App: Manual connection retry requested')
  await disconnectSocket()
  await new Promise(resolve => setTimeout(resolve, 1000))
  await connectSocket()
}

// Layout computed properties (existing)
const hideNavbar = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

const hideHeader = computed(() => ['/signup', '/login', '/create-account', '/verify-email', '/forgot-password', '/messages'].includes(route.path) || route.name === 'chat')

const removeAllPadding = computed(() => ['/login', '/signup', '/create-account', '/verify-email', '/forgot-password'].includes(route.path) || route.name === 'chat')

// New computed to check if both navbar and header are hidden
const isFullscreenLayout = computed(() => hideNavbar.value && hideHeader.value)

// 🔥 SHOW CONNECTION STATUS IN CERTAIN VIEWS
const shouldShowConnectionStatus = computed(() => {
  // Show connection status in messages and other real-time views
  return ['/messages', '/chat'].some(path => route.path.includes(path)) ||
         (!isOnline.value || failedMessagesCount.value > 0)
})

// 🔥 CONNECTION STATUS COLOR FOR UI
const connectionStatusColor = computed(() => {
  switch (connectionState.value) {
    case CONNECTION_STATE.ONLINE:
      return 'bg-green-500'
    case CONNECTION_STATE.CONNECTING:
    case CONNECTION_STATE.RECONNECTING:
      return 'bg-yellow-500'
    case CONNECTION_STATE.DISCONNECTED:
    case CONNECTION_STATE.OFFLINE:
    default:
      return 'bg-red-500'
  }
})
</script>

<!-- App.vue -->
<template>
  <div class="bg-[#262624] sm:flex sm:w-full sm:h-full">

    <NavBar v-if="!hideNavbar && !isMobile" class=""/>
  
  <!-- Conditional layout based on fullscreen mode -->
  <template v-if="isFullscreenLayout">
    <!-- Fullscreen layout for chat/auth pages -->
    <div class="w-full h-full">
      <RouterView/>
    </div>
  </template>
    
  <!-- 100svh = viewport minus any visible browser UI -->
   <template v-else>
    <div class="flex flex-col flex-1" :style="{ height: '100svh' }">

    <!-- HEADER -->
    <Header v-if="!hideHeader" class="px-3 pt-3" />

    <!-- MAIN: flex‑1 so it fills all leftover space, scrollable if overflow -->
    <RouterView class="flex-1 overflow-y-auto px-3 pt-3" :style="isMobile ? { paddingBottom: 'var(--nav-height)' } : {paddingBottom: '10px'}" />

    <NavBar  v-if="isMobile" class="" />
  </div>
   </template>
  

  </div>

</template>


<style>
/* Ensure html/body use the same 100svh sizing */
html, body {
  margin: 0;
  padding: 0;
  height: 100svh;
}
</style>

