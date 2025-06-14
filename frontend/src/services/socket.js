// src/services/socket.js - Frontend Socket.io client
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.typingTimers = new Map()
    this.pingInterval = null
  }

  // Initialize socket connection
  connect() {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn || this.socket?.connected) {
      console.log('Socket: Skipping connection - not logged in or already connected')
      return
    }

    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const token = localStorage.getItem('authToken')

    console.log('Socket: Connecting to', serverUrl)

    this.socket = io(serverUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      forceNew: false
    })

    this.setupEventListeners()
    this.startPingInterval()
  }

  // Set up all socket event listeners
  setupEventListeners() {
    if (!this.socket) return

    const messagesStore = useMessagesStore()

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket: Connected with ID:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // Join all current conversations
      if (messagesStore.conversations.length > 0) {
        messagesStore.conversations.forEach(conv => {
          this.joinConversation(conv.id)
        })
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket: Disconnected -', reason)
      this.isConnected = false
      this.stopPingInterval()
      
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        this.socket.connect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket: Connection error -', error.message)
      this.reconnectAttempts++
      this.isConnected = false
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Socket: Max reconnection attempts reached')
        this.disconnect()
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket: Reconnected after', attemptNumber, 'attempts')
      this.reconnectAttempts = 0
    })

    // Message events
    this.socket.on('message:new', (data) => {
      console.log('Socket: New message received', data)
      messagesStore.handleNewMessage(data)
      
      // Show notification if not in current conversation
      this.showMessageNotification(data)
    })

    this.socket.on('message:delivered', (data) => {
      console.log('Socket: Message delivered', data)
      this.updateMessageStatus(data.messageId, data.conversationId, 'delivered')
    })

    this.socket.on('message:read', (data) => {
      console.log('Socket: Message read', data)
      this.updateMessageStatus(data.messageId, data.conversationId, 'read')
    })

    // Conversation events
    this.socket.on('conversation:created', (data) => {
      console.log('Socket: New conversation created', data)
      messagesStore.conversations.unshift(data)
    })

    this.socket.on('conversation:updated', (data) => {
      console.log('Socket: Conversation updated', data)
      const index = messagesStore.conversations.findIndex(c => c.id === data.id)
      if (index !== -1) {
        messagesStore.conversations[index] = { 
          ...messagesStore.conversations[index], 
          ...data 
        }
      }
    })

    // Typing events
    this.socket.on('typing:start', (data) => {
      console.log('Socket: User started typing', data)
      messagesStore.handleTypingStart(data)
    })

    this.socket.on('typing:stop', (data) => {
      console.log('Socket: User stopped typing', data)
      messagesStore.handleTypingStop(data)
    })

    // User status events
    this.socket.on('user:online', (data) => {
      console.log('Socket: User came online', data.userId)
      messagesStore.handleUserOnline(data.userId)
    })

    this.socket.on('user:offline', (data) => {
      console.log('Socket: User went offline', data.userId)
      messagesStore.handleUserOffline(data.userId)
    })

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket: Error -', error)
    })

    this.socket.on('message:status_updated', (data) => {
  console.log('Socket: Message status updated', data)
  messagesStore.updateMessageStatus(data.messageId, data.conversationId, data.status)
})

this.socket.on('conversation:status_updated', (data) => {
  console.log('Socket: Conversation status updated', data)
  // Refresh conversation messages to get updated status
  if (messagesStore.currentConversation?.id === data.conversationId) {
    messagesStore.fetchMessages(data.conversationId, 1)
  }
})
  }

  // Update message status in store
  updateMessageStatus(messageId, conversationId, status) {
    const messagesStore = useMessagesStore()
    messagesStore.updateMessageStatus(messageId, conversationId, status)
  }

  // Show browser notification for new messages
  showMessageNotification(messageData) {
    const messagesStore = useMessagesStore()
    const authStore = useAuthStore()
    
    // Don't show notification for own messages or if in current conversation
    if (messageData.senderId === authStore.currentUser?.id ||
        messagesStore.currentConversation?.id === messageData.conversationId) {
      return
    }

    // Check if notifications are permitted
    if (Notification.permission === 'granted') {
      const sender = messageData.sender
      const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username
      
      new Notification(`New message from ${senderName}`, {
        body: messageData.content || 'Sent a file',
        icon: sender.avatarUrl || '/default-avatar.png',
        tag: `message-${messageData.conversationId}`, // Prevent duplicate notifications
        silent: false
      })
    }
  }

  // Socket emission methods
  joinConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('Socket: Joining conversation', conversationId)
      this.socket.emit('conversation:join', { conversationId })
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('Socket: Leaving conversation', conversationId)
      this.socket.emit('conversation:leave', { conversationId })
    }
  }

  startTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { conversationId })
      
      // Clear existing timer
      if (this.typingTimers.has(conversationId)) {
        clearTimeout(this.typingTimers.get(conversationId))
      }
      
      // Auto-stop typing after 3 seconds
      const timer = setTimeout(() => {
        this.stopTyping(conversationId)
      }, 3000)
      
      this.typingTimers.set(conversationId, timer)
    }
  }

  stopTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { conversationId })
    }
    
    // Clear timer
    if (this.typingTimers.has(conversationId)) {
      clearTimeout(this.typingTimers.get(conversationId))
      this.typingTimers.delete(conversationId)
    }
  }

  markMessageAsRead(messageId, conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('message:read', { messageId, conversationId })
    }
  }

  markMessageAsDelivered(messageId, conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('message:delivered', { messageId, conversationId })
    }
  }

  // Ping interval to keep connection alive
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000) // Ping every 30 seconds
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // Disconnect socket
  disconnect() {
    console.log('Socket: Disconnecting...')
    
    // Clear all timers
    this.stopPingInterval()
    this.typingTimers.forEach((timer, conversationId) => {
      this.stopTyping(conversationId)
    })
    this.typingTimers.clear()
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this.isConnected = false
    this.reconnectAttempts = 0
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Create and export singleton instance
const socketService = new SocketService()

export { socketService }
export default socketService