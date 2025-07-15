// src/composables/useSocketConnector.js - SIMPLIFIED VERSION
import { onUnmounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

export function useSocketConnector() {
  const messagesStore = useMessagesStore()
  const authStore = useAuthStore()

  // 🔥 SIMPLIFIED: Remove complex unread count handling
  const connectSocket = async () => {
    if (!authStore.isLoggedIn) {
      console.log('🚫 Socket connector: User not logged in, skipping socket connection')
      return
    }

    console.log('🔗 Socket connector: Connecting socket to messages store')
    
    try {
      // CRITICAL: Link socket service to messages store
      socketService.setMessagesStore(messagesStore)
      
      // Connect socket
      const connected = await socketService.connect()
      
      if (connected) {
        console.log('✅ Socket connector: Successfully connected')
        
        // Initialize messages store with socket
        if (!messagesStore.isInitialized()) {
          await messagesStore.fetchConversations()
        }
        
      } else {
        console.error('❌ Socket connector: Failed to connect')
      }
    } catch (error) {
      console.error('❌ Socket connector: Connection error:', error)
    }
  }

  const disconnectSocket = () => {
    console.log('🔌 Socket connector: Disconnecting socket')
    socketService.disconnect()
  }

  // 🔥 SIMPLIFIED: Basic refresh method
  const refreshUnreadCounts = () => {
    console.log('📊 Socket connector: Refreshing unread counts')
    messagesStore.refreshUnreadCounts?.()
  }

  // Clean up on unmount
  onUnmounted(() => {
    // Basic cleanup only
  })

  return {
    connectSocket,
    disconnectSocket,
    refreshUnreadCounts
  }
}