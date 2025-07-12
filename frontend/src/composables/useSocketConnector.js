// src/composables/useSocketConnector.js - CRITICAL CONNECTOR
import { onMounted, onUnmounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

export function useSocketConnector() {
  const messagesStore = useMessagesStore()
  const authStore = useAuthStore()

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

  return {
    connectSocket,
    disconnectSocket
  }
}