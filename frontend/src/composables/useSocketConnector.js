// src/composables/useSocketConnector.js - FIXED VERSION FOR REAL-TIME UPDATES
import { onUnmounted } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

export function useSocketConnector() {
  const messagesStore = useMessagesStore()
  const authStore = useAuthStore()

  const connectSocket = async () => {
    if (!authStore.isLoggedIn) {
      console.log('🚫 Not logged in, skipping socket connection')
      return false
    }

    console.log('🔗 Connecting socket and linking to messages store')
    
    try {
      // 🔥 CRITICAL: Link socket to messages store BEFORE connecting
      socketService.setMessagesStore(messagesStore)
      
      // Connect socket
      const connected = await socketService.connect()
      
      if (connected) {
        console.log('✅ Socket connected successfully')
        
        // 🔥 FORCE: Setup event handlers after connection
        setupSocketEventHandlers()
        
        // Initialize messages store if needed
        if (!messagesStore.isInitialized()) {
          await messagesStore.fetchConversations()
        }
        
        return true
      } else {
        console.error('❌ Socket connection failed')
        return false
      }
    } catch (error) {
      console.error('❌ Socket connection error:', error)
      return false
    }
  }

  // 🔥 CRITICAL: Manually setup event handlers to ensure they work
  const setupSocketEventHandlers = () => {
    console.log('🔧 Setting up manual socket event handlers')

    // Remove any existing listeners to prevent duplicates
    if (socketService.socket) {
      socketService.socket.removeAllListeners('message:new')
      socketService.socket.removeAllListeners('message:sent_confirmation')
      socketService.socket.removeAllListeners('message:status_updated')
      socketService.socket.removeAllListeners('messages:read')
      socketService.socket.removeAllListeners('user:online')
      socketService.socket.removeAllListeners('user:offline')
      socketService.socket.removeAllListeners('users:online_list')
    }

    // 🔥 NEW MESSAGE EVENT
    socketService.socket.on('message:new', (data) => {
      console.log('📨 CONNECTOR: Received message:new', data.id)
      
      // Directly call the store method
      if (messagesStore.handleNewMessage) {
        console.log('📨 CONNECTOR: Calling handleNewMessage')
        messagesStore.handleNewMessage(data)
        console.log('✅ CONNECTOR: handleNewMessage completed')
      } else {
        console.error('❌ CONNECTOR: handleNewMessage method not found!')
      }
    })

    // 🔥 MESSAGE SENT CONFIRMATION
    socketService.socket.on('message:sent_confirmation', (data) => {
      console.log('📤 CONNECTOR: Received sent confirmation', data.tempId, '→', data.messageId)
      
      if (messagesStore.handleSentConfirmation) {
        messagesStore.handleSentConfirmation(data)
      }
    })

    // 🔥 MESSAGE STATUS UPDATES
    socketService.socket.on('message:status_updated', (data) => {
      console.log('📱 CONNECTOR: Received status update', data.messageId, '→', data.status)
      
      if (messagesStore.handleMessageStatusUpdate) {
        messagesStore.handleMessageStatusUpdate(data)
      }
    })

    // 🔥 MESSAGES READ EVENT
    socketService.socket.on('messages:read', (data) => {
      console.log('📖 CONNECTOR: Received messages read', data.conversationId)
      
      if (messagesStore.handleMessagesRead) {
        messagesStore.handleMessagesRead(data)
      }
    })

    // 🔥 AUTO DELIVERY EVENT
    socketService.socket.on('messages:auto_delivered', (data) => {
      console.log('📦 CONNECTOR: Received auto delivered', data.conversationId, data.count)
      
      if (messagesStore.handleMessagesAutoDelivered) {
        messagesStore.handleMessagesAutoDelivered(data)
      }
    })

    // 🔥 USER ONLINE/OFFLINE EVENTS
    socketService.socket.on('user:online', (data) => {
      console.log('🟢 CONNECTOR: User came online', data.userId)
      
      if (messagesStore.handleUserOnline) {
        messagesStore.handleUserOnline(data)
      }
    })

    socketService.socket.on('user:offline', (data) => {
      console.log('🔴 CONNECTOR: User went offline', data.userId)
      
      if (messagesStore.handleUserOffline) {
        messagesStore.handleUserOffline(data)
      }
    })

    socketService.socket.on('users:online_list', (data) => {
      console.log('👥 CONNECTOR: Received online users list', data.users.length)
      
      if (messagesStore.handleOnlineUsersList) {
        messagesStore.handleOnlineUsersList(data)
      }
    })

    // 🔥 CONNECTION STATE EVENTS
    socketService.socket.on('connect', () => {
      console.log('✅ CONNECTOR: Socket connected')
      if (messagesStore.handleConnectionStateChange) {
        messagesStore.handleConnectionStateChange({
          oldState: 'connecting',
          newState: 'online'
        })
      }
    })

    socketService.socket.on('disconnect', () => {
      console.log('❌ CONNECTOR: Socket disconnected')
      if (messagesStore.handleConnectionStateChange) {
        messagesStore.handleConnectionStateChange({
          oldState: 'online',
          newState: 'disconnected'
        })
      }
    })

    console.log('✅ CONNECTOR: All manual event handlers setup complete')
  }

  const disconnectSocket = () => {
    console.log('🔌 Disconnecting socket')
    socketService.disconnect()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't disconnect on unmount - let the app handle it
  })

  return {
    connectSocket,
    disconnectSocket,
    setupSocketEventHandlers // Export for manual setup if needed
  }
}