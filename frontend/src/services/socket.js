// src/services/socket.js - FIXED FRONTEND SOCKET SERVICE
import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.typingTimers = new Map()
    this.pingInterval = null
    this.taskCompletedCallback = null
    this.taskFailedCallback = null
    this.connectionPromise = null
    this.messagesStore = null
  }

  // CRITICAL: Set messages store reference
  setMessagesStore(store) {
    this.messagesStore = store
    console.log('🔗 Socket service linked to messages store')
  }

  // Enhanced connection with better error handling
  async connect() {
    // Import auth store dynamically to avoid circular dependencies
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.isLoggedIn) {
      console.log('🚫 Socket: Skipping connection - not logged in')
      return false
    }

    if (this.socket?.connected) {
      console.log('✅ Socket: Already connected')
      return true
    }

    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this._performConnection()
    return this.connectionPromise
  }

  async _performConnection() {
    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const token = localStorage.getItem('authToken')

    if (!token) {
      console.error('❌ Socket: No auth token found')
      return false
    }

    console.log(`🔌 Socket: Connecting to ${serverUrl}`)

    try {
      this.socket = io(serverUrl, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
        forceNew: false,
        transports: ['websocket', 'polling']
      })

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 10000)

        this.socket.once('connect', () => {
          clearTimeout(timeout)
          resolve()
        })

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })

      this.setupEventListeners()
      this.startPingInterval()
      
      console.log('✅ Socket connected successfully')
      return true

    } catch (error) {
      console.error('❌ Socket connection failed:', error)
      this.connectionPromise = null
      return false
    }
  }

  // CRITICAL: Enhanced event listeners with messages store integration
  setupEventListeners() {
    if (!this.socket) return

    console.log('🎧 Setting up socket event listeners')

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket: Connected with ID:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      this.connectionPromise = null
      
      // Re-join all current conversations
      this._rejoinConversations()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket: Disconnected -', reason)
      this.isConnected = false
      this.stopPingInterval()
      
      if (reason === 'io server disconnect') {
        setTimeout(() => this.connect(), 1000)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket: Connection error -', error.message)
      this.reconnectAttempts++
      this.isConnected = false
      this.connectionPromise = null
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Socket: Max reconnection attempts reached')
        this.disconnect()
      }
    })

    // CRITICAL: Enhanced message events with store integration
    this.socket.on('message:new', (data) => {
      console.log('📨 Socket: New message received:', {
        id: data.id,
        conversationId: data.conversationId,
        content: data.content?.substring(0, 50) + '...',
        sender: data.sender?.username
      })
      
      try {
        // CRITICAL: Forward to messages store
        if (this.messagesStore && this.messagesStore.handleIncomingMessage) {
          console.log('📤 Forwarding message to store')
          this.messagesStore.handleIncomingMessage(data)
        } else {
          console.error('❌ Messages store not available or missing handler')
          
          // Fallback: try to get store dynamically
          this._tryGetMessagesStore().then(store => {
            if (store && store.handleIncomingMessage) {
              console.log('📤 Using fallback store reference')
              store.handleIncomingMessage(data)
            }
          })
        }
        
        // Show notification for other users' messages
        this._showMessageNotification(data)
        
      } catch (error) {
        console.error('❌ Error processing new message:', error)
      }
    })

    this.socket.on('message:status_updated', (data) => {
      console.log('📱 Socket: Message status update received:', data)
      
      try {
        if (this.messagesStore && this.messagesStore.handleMessageStatusUpdate) {
          this.messagesStore.handleMessageStatusUpdate(data)
        } else {
          this._tryGetMessagesStore().then(store => {
            if (store && store.handleMessageStatusUpdate) {
              store.handleMessageStatusUpdate(data)
            }
          })
        }
      } catch (error) {
        console.error('❌ Error handling status update:', error)
      }
    })

    // Conversation events
    this.socket.on('conversation:created', (data) => {
      console.log('💬 Socket: New conversation created', data.id)
      
      try {
        if (this.messagesStore && this.messagesStore.conversations) {
          this.messagesStore.conversations.unshift(data)
          this.messagesStore.triggerUpdate()
          this.joinConversation(data.id)
        }
      } catch (error) {
        console.error('❌ Error handling conversation creation:', error)
      }
    })

    this.socket.on('conversation:updated', (data) => {
      console.log('🔄 Socket: Conversation updated', data.id)
      
      try {
        if (this.messagesStore && this.messagesStore.conversations) {
          const index = this.messagesStore.conversations.findIndex(c => c.id === data.id)
          if (index !== -1) {
            this.messagesStore.conversations[index] = { 
              ...this.messagesStore.conversations[index], 
              ...data 
            }
            this.messagesStore.triggerUpdate()
          }
        }
      } catch (error) {
        console.error('❌ Error handling conversation update:', error)
      }
    })

    // Conversation status updates
    this.socket.on('conversation:status_updated', (data) => {
      console.log('💬 Socket: Conversation status updated', data)
      
      try {
        if (this.messagesStore && this.messagesStore.conversations) {
          const { conversationId, status, count } = data
          const conversation = this.messagesStore.conversations.find(c => c.id === conversationId)
          
          if (conversation && status === 'read') {
            conversation.unreadCount = Math.max(0, (conversation.unreadCount || 0) - (count || 1))
            this.messagesStore.triggerUpdate()
          }
        }
      } catch (error) {
        console.error('❌ Error handling conversation status update:', error)
      }
    })

    // Conversation room events
    this.socket.on('conversation:joined', ({ conversationId }) => {
      console.log(`✅ Successfully joined conversation room: ${conversationId}`)
    })

    this.socket.on('conversation:left', ({ conversationId }) => {
      console.log(`👋 Successfully left conversation room: ${conversationId}`)
    })

    // Typing events
    this.socket.on('typing:start', (data) => {
      console.log('⌨️ Socket: User started typing', data.user?.username)
      
      try {
        if (this.messagesStore && this.messagesStore.handleTypingStart) {
          this.messagesStore.handleTypingStart(data)
        }
      } catch (error) {
        console.error('❌ Error handling typing start:', error)
      }
    })

    this.socket.on('typing:stop', (data) => {
      console.log('⌨️ Socket: User stopped typing', data.user?.username)
      
      try {
        if (this.messagesStore && this.messagesStore.handleTypingStop) {
          this.messagesStore.handleTypingStop(data)
        }
      } catch (error) {
        console.error('❌ Error handling typing stop:', error)
      }
    })

    // User status events
    this.socket.on('user:online', (data) => {
      console.log('🟢 Socket: User came online', data.userId)
      
      try {
        if (this.messagesStore && this.messagesStore.handleUserOnline) {
          this.messagesStore.handleUserOnline(data.userId)
        }
      } catch (error) {
        console.error('❌ Error handling user online:', error)
      }
    })

    this.socket.on('user:offline', (data) => {
      console.log('🔴 Socket: User went offline', data.userId)
      
      try {
        if (this.messagesStore && this.messagesStore.handleUserOffline) {
          this.messagesStore.handleUserOffline(data.userId)
        }
      } catch (error) {
        console.error('❌ Error handling user offline:', error)
      }
    })

    // Task events
    this.socket.on('task_completed', (data) => {
      console.log('🎉 Socket: Task completed event received:', data)
      if (this.taskCompletedCallback) {
        this.taskCompletedCallback(data)
      }
    })

    this.socket.on('task_failed', (data) => {
      console.log('❌ Socket: Task failed event received:', data)
      if (this.taskFailedCallback) {
        this.taskFailedCallback(data)
      }
    })

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('❌ Socket: Error -', error)
    })

    console.log('✅ All socket event listeners set up')
  }

  // Fallback method to get messages store
  async _tryGetMessagesStore() {
    try {
      const { useMessagesStore } = await import('@/stores/messages')
      return useMessagesStore()
    } catch (error) {
      console.error('❌ Failed to get messages store:', error)
      return null
    }
  }

  // Helper method to rejoin conversations after reconnection
  _rejoinConversations() {
    if (this.messagesStore && this.messagesStore.conversations?.length > 0) {
      console.log('🔄 Socket: Rejoining conversations after reconnect')
      this.messagesStore.conversations.forEach(conv => {
        this.joinConversation(conv.id)
      })
    }
  }

  // Enhanced conversation joining
  joinConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('📥 Socket: Joining conversation', conversationId)
      this.socket.emit('conversation:join', { conversationId })
    } else {
      console.warn('⚠️ Socket: Cannot join conversation - not connected')
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('📤 Socket: Leaving conversation', conversationId)
      this.socket.emit('conversation:leave', { conversationId })
    }
  }

  // Typing functionality
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

  // Message status updates
  markMessageAsRead(messageId, conversationId) {
    if (this.socket?.connected) {
      console.log(`📖 Marking message ${messageId} as read`)
      this.socket.emit('message:read', { messageId, conversationId })
    }
  }

  markMessageAsDelivered(messageId, conversationId) {
    if (this.socket?.connected) {
      console.log(`✅ Marking message ${messageId} as delivered`)
      this.socket.emit('message:delivered', { messageId, conversationId })
    }
  }

  // Enhanced notification system
  async _showMessageNotification(messageData) {
    try {
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      
      // Don't show notification for own messages
      if (messageData.senderId === authStore.currentUser?.id) {
        return
      }

      // Don't show if user is in the conversation
      if (this.messagesStore?.currentConversation?.id === messageData.conversationId) {
        return
      }

      // Check if notifications are permitted
      if (Notification.permission === 'granted') {
        const sender = messageData.sender
        const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username
        
        new Notification(`New message from ${senderName}`, {
          body: messageData.content || 'Sent a file',
          icon: sender.avatarUrl || '/default-avatar.png',
          tag: `message-${messageData.conversationId}`,
          silent: false
        })
      }
    } catch (error) {
      console.error('❌ Error showing notification:', error)
    }
  }

  // Ping system
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000)
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // Task callbacks
  setTaskCompletedCallback(callback) {
    this.taskCompletedCallback = callback
  }

  setTaskFailedCallback(callback) {
    this.taskFailedCallback = callback
  }

  clearTaskCallbacks() {
    this.taskCompletedCallback = null
    this.taskFailedCallback = null
  }

  // Connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  // Enhanced disconnect
  disconnect() {
    console.log('🔌 Socket: Disconnecting...')
    
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
    this.connectionPromise = null
  }
}

// Create and export singleton instance
const socketService = new SocketService()

export { socketService }
export default socketService