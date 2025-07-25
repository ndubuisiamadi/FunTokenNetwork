// src/services/socket.js - ENHANCED WITH RELIABILITY FEATURES
import { io } from 'socket.io-client'
import { 
  MESSAGE_STATUS, 
  MESSAGE_RELIABILITY_CONFIG, 
  CONNECTION_STATE,
  messageQueue,
  scheduleMessageRetry,
  shouldRetryMessage
} from '@/utils/messageStatus'

class MessagingSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.connectionState = CONNECTION_STATE.DISCONNECTED
    this.messagesStore = null
    
    // Reliability features
    this.retryTimeouts = new Map() // tempId -> timeoutId
    this.pendingMessages = new Map() // tempId -> message data
    this.connectionCheckInterval = null
    this.isReconnecting = false
    this.retryQueue = []
    
    // Message sending timeouts
    this.sendTimeouts = new Map() // tempId -> timeoutId
    
    // Start connection monitoring
    this.startConnectionMonitoring()
  }

  setMessagesStore(store) {
    this.messagesStore = store
    console.log('🔗 Socket linked to messages store')
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT WITH RELIABILITY
  // ═══════════════════════════════════════════════════════════════

  async connect() {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    if (!authStore.isLoggedIn) {
      console.log('🚫 Not logged in')
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
      return false
    }

    if (this.socket?.connected) {
      console.log('✅ Already connected')
      this.updateConnectionState(CONNECTION_STATE.ONLINE)
      return true
    }

    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const token = localStorage.getItem('authToken')

    if (!token) {
      console.error('❌ No auth token')
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
      return false
    }

    try {
      this.updateConnectionState(CONNECTION_STATE.CONNECTING)
      
      this.socket = io(serverUrl, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        timeout: 10000,
        transports: ['websocket', 'polling']
      })

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000)

        this.socket.once('connect', () => {
          clearTimeout(timeout)
          this.isConnected = true
          this.updateConnectionState(CONNECTION_STATE.ONLINE)
          resolve()
        })

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout)
          this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
          reject(error)
        })
      })

      this.setupEventListeners()
      await this.processQueuedMessages()
      console.log('✅ Socket connected')
      return true

    } catch (error) {
      console.error('❌ Socket connection failed:', error)
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
      return false
    }
  }

  setupEventListeners() {
    if (!this.socket) return

    console.log('🔧 Setting up enhanced socket event listeners')

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id)
      this.isConnected = true
      this.updateConnectionState(CONNECTION_STATE.ONLINE)
      this.processQueuedMessages()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason)
      this.isConnected = false
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts')
      this.updateConnectionState(CONNECTION_STATE.ONLINE)
      this.processQueuedMessages()
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber)
      this.updateConnectionState(CONNECTION_STATE.RECONNECTING)
    })

    this.socket.on('reconnect_failed', () => {
      console.log('❌ Reconnection failed')
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
    })

    // Enhanced message events
    this.socket.on('message:new', (data) => {
      console.log('📨 RECEIVED: message:new', {
        messageId: data.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        status: data.status
      })
      
      this.messagesStore?.handleNewMessage?.(data)
    })

    this.socket.on('message:sent_confirmation', (data) => {
      console.log('📤 RECEIVED: message:sent_confirmation', data)
      this.handleSentConfirmation(data)
    })

    this.socket.on('message:status_updated', (data) => {
      console.log('📱 RECEIVED: message:status_updated', data)
      this.messagesStore?.handleMessageStatusUpdate?.(data)
    })

    this.socket.on('messages:read', (data) => {
      console.log('📖 RECEIVED: messages:read', data)
      this.messagesStore?.handleMessagesRead?.(data)
    })

    this.socket.on('messages:auto_delivered', (data) => {
      console.log('📦 RECEIVED: messages:auto_delivered', data)
      this.messagesStore?.handleMessagesAutoDelivered?.(data)
    })

    // Enhanced error handling
    this.socket.on('message:error', (data) => {
      console.error('📨 RECEIVED: message:error', data)
      this.handleMessageError(data)
    })

    this.socket.on('message:retry_success', (data) => {
      console.log('🔄 RECEIVED: message:retry_success', data)
      this.handleRetrySuccess(data)
    })

    this.socket.on('message:retry_failed', (data) => {
      console.error('🔄 RECEIVED: message:retry_failed', data)
      this.handleRetryFailed(data)
    })

    // Online status events
    this.socket.on('user:online', (data) => {
      console.log('🟢 RECEIVED: user:online', data.userId)
      this.messagesStore?.handleUserOnline?.(data)
    })

    this.socket.on('user:offline', (data) => {
      console.log('🔴 RECEIVED: user:offline', data.userId)
      this.messagesStore?.handleUserOffline?.(data)
    })

    this.socket.on('users:online_list', (data) => {
      console.log('👥 RECEIVED: users:online_list', data.users.length, 'users')
      this.messagesStore?.handleOnlineUsersList?.(data)
    })

    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error)
      this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
    })

    console.log('✅ Enhanced socket event listeners configured')
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED MESSAGE SENDING WITH RELIABILITY
  // ═══════════════════════════════════════════════════════════════

  sendMessage(conversationId, messageData) {
    const tempId = messageData.tempId || `temp_${Date.now()}_${Math.random()}`
    messageData.tempId = tempId

    console.log('📤 Sending message:', tempId, 'to conversation:', conversationId)

    // Store message data for potential retry
    this.pendingMessages.set(tempId, {
      conversationId,
      ...messageData,
      attempts: 0,
      firstAttempt: Date.now()
    })

    // Try to send immediately
    const success = this.attemptSendMessage(conversationId, messageData)
    
    if (success) {
      // Set timeout for failure detection
      this.setSendTimeout(tempId)
    } else {
      // If can't send now, queue for later
      this.queueMessage(conversationId, messageData)
    }

    return success
  }

  attemptSendMessage(conversationId, messageData) {
    if (!this.socket?.connected) {
      console.log('❌ Socket not connected, cannot send message')
      return false
    }

    try {
      this.socket.emit('message:send', {
        conversationId,
        ...messageData
      })
      return true
    } catch (error) {
      console.error('❌ Failed to emit message:', error)
      return false
    }
  }

  setSendTimeout(tempId) {
    // Clear any existing timeout
    if (this.sendTimeouts.has(tempId)) {
      clearTimeout(this.sendTimeouts.get(tempId))
    }

    // Set new timeout for failure detection
    const timeoutId = setTimeout(() => {
      console.log('⏰ Message send timeout:', tempId)
      this.handleSendTimeout(tempId)
    }, MESSAGE_RELIABILITY_CONFIG.SEND_TIMEOUT)

    this.sendTimeouts.set(tempId, timeoutId)
  }

  handleSendTimeout(tempId) {
    console.log('🚨 Handling send timeout for:', tempId)
    
    const messageData = this.pendingMessages.get(tempId)
    if (!messageData) return

    // Mark as failed and schedule retry
    this.handleMessageError({
      tempId,
      error: 'Send timeout',
      code: 'TIMEOUT'
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE RETRY LOGIC WITH EXPONENTIAL BACKOFF
  // ═══════════════════════════════════════════════════════════════

  scheduleRetry(tempId, messageData, error) {
    if (!shouldRetryMessage({ status: MESSAGE_STATUS.FAILED, retryCount: messageData.attempts })) {
      console.log('❌ Max retry attempts reached for:', tempId)
      this.handlePermanentFailure(tempId, messageData)
      return
    }

    const retryInfo = scheduleMessageRetry({ 
      retryCount: messageData.attempts,
      reliability: messageData.reliability || {}
    })

    if (!retryInfo.success) {
      this.handlePermanentFailure(tempId, messageData)
      return
    }

    console.log(`🔄 Scheduling retry ${retryInfo.retryCount} for ${tempId} in ${retryInfo.delay}ms`)

    // Update message data
    messageData.attempts = retryInfo.retryCount
    messageData.lastError = error
    messageData.nextRetry = Date.now() + retryInfo.delay

    // Schedule the retry
    const retryTimeoutId = setTimeout(() => {
      this.retryMessage(tempId)
    }, retryInfo.delay)

    this.retryTimeouts.set(tempId, retryTimeoutId)

    // Notify store about retry scheduling
    this.messagesStore?.handleMessageRetryScheduled?.({
      tempId,
      retryCount: retryInfo.retryCount,
      delay: retryInfo.delay,
      nextRetry: messageData.nextRetry
    })
  }

  retryMessage(tempId) {
    console.log('🔄 Retrying message:', tempId)

    const messageData = this.pendingMessages.get(tempId)
    if (!messageData) {
      console.warn('⚠️ No message data found for retry:', tempId)
      return
    }

    // Clean up retry timeout
    this.retryTimeouts.delete(tempId)

    // Try to send again
    const success = this.attemptSendMessage(messageData.conversationId, {
      ...messageData,
      tempId: `retry_${tempId}_${messageData.attempts}` // New temp ID for retry
    })

    if (success) {
      // Set new timeout for this retry attempt
      this.setSendTimeout(tempId)
      
      // Update status to sending
      this.messagesStore?.handleMessageRetryAttempt?.({
        tempId,
        attempt: messageData.attempts,
        status: MESSAGE_STATUS.SENDING
      })
    } else {
      // If still can't send, schedule another retry
      this.scheduleRetry(tempId, messageData, 'Retry attempt failed')
    }
  }

  handlePermanentFailure(tempId, messageData) {
    console.error('💀 Permanent failure for message:', tempId)
    
    // Clean up
    this.pendingMessages.delete(tempId)
    this.retryTimeouts.delete(tempId)
    this.sendTimeouts.delete(tempId)

    // Notify store about permanent failure
    this.messagesStore?.handleMessagePermanentFailure?.({
      tempId,
      error: 'Max retry attempts exceeded',
      attempts: messageData.attempts
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFLINE MESSAGE QUEUING
  // ═══════════════════════════════════════════════════════════════

  queueMessage(conversationId, messageData) {
    console.log('📥 Queuing message for offline delivery:', messageData.tempId)
    
    const success = messageQueue.enqueue({
      conversationId,
      ...messageData,
      status: MESSAGE_STATUS.QUEUED,
      queuedAt: new Date().toISOString()
    })

    if (success) {
      // Notify store about queuing
      this.messagesStore?.handleMessageQueued?.({
        tempId: messageData.tempId,
        queueSize: messageQueue.size()
      })
    }

    return success
  }

  async processQueuedMessages() {
    if (!this.socket?.connected) return

    const queuedMessages = messageQueue.getQueue()
    if (queuedMessages.length === 0) return

    console.log(`📤 Processing ${queuedMessages.length} queued messages`)

    for (const message of queuedMessages) {
      try {
        const success = this.attemptSendMessage(message.conversationId, {
          content: message.content,
          mediaUrls: message.mediaUrls,
          messageType: message.messageType,
          tempId: message.tempId
        })

        if (success) {
          // Remove from queue and set timeout
          messageQueue.dequeue(message.tempId)
          this.setSendTimeout(message.tempId)
          
          // Store for potential retry
          this.pendingMessages.set(message.tempId, {
            ...message,
            attempts: 0,
            firstAttempt: Date.now()
          })

          console.log('✅ Queued message sent:', message.tempId)
        }
      } catch (error) {
        console.error('❌ Failed to process queued message:', message.tempId, error)
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  handleSentConfirmation(data) {
    const { tempId, messageId, status } = data
    
    console.log('✅ Message confirmed:', tempId, '→', messageId)

    // Clear timeout and pending data
    if (this.sendTimeouts.has(tempId)) {
      clearTimeout(this.sendTimeouts.get(tempId))
      this.sendTimeouts.delete(tempId)
    }
    
    this.pendingMessages.delete(tempId)
    messageQueue.dequeue(tempId)

    // Notify store
    this.messagesStore?.handleSentConfirmation?.(data)
  }

  handleMessageError(data) {
    const { tempId, error, code } = data
    
    console.error('❌ Message error:', tempId, error, code)

    // Clear send timeout
    if (this.sendTimeouts.has(tempId)) {
      clearTimeout(this.sendTimeouts.get(tempId))
      this.sendTimeouts.delete(tempId)
    }

    const messageData = this.pendingMessages.get(tempId)
    if (messageData) {
      // Schedule retry for retriable errors
      if (code !== 'ACCESS_DENIED' && code !== 'EMPTY_MESSAGE') {
        this.scheduleRetry(tempId, messageData, error)
      } else {
        // Permanent errors
        this.handlePermanentFailure(tempId, messageData)
      }
    }

    // Notify store about error
    this.messagesStore?.handleMessageError?.(data)
  }

  handleRetrySuccess(data) {
    const { messageId, status } = data
    console.log('✅ Retry successful:', messageId, status)
    
    // Clean up any pending retry data
    // Note: messageId might not match tempId, need better tracking
    
    this.messagesStore?.handleRetrySuccess?.(data)
  }

  handleRetryFailed(data) {
    const { messageId } = data
    console.error('❌ Retry failed:', messageId)
    
    this.messagesStore?.handleRetryFailed?.(data)
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  updateConnectionState(newState) {
    if (this.connectionState !== newState) {
      const oldState = this.connectionState
      this.connectionState = newState
      
      console.log(`🔌 Connection state: ${oldState} → ${newState}`)
      
      // Notify store about connection state change
      this.messagesStore?.handleConnectionStateChange?.({
        oldState,
        newState,
        timestamp: new Date()
      })
    }
  }

  startConnectionMonitoring() {
    if (this.connectionCheckInterval) return

    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection()
    }, MESSAGE_RELIABILITY_CONFIG.CONNECTION_CHECK_INTERVAL)
  }

  checkConnection() {
    if (!this.socket) return

    const isActuallyConnected = this.socket.connected
    const reportedConnected = this.isConnected

    if (isActuallyConnected !== reportedConnected) {
      console.warn('🔍 Connection state mismatch detected')
      this.isConnected = isActuallyConnected
      this.updateConnectionState(
        isActuallyConnected ? CONNECTION_STATE.ONLINE : CONNECTION_STATE.DISCONNECTED
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OTHER METHODS (Enhanced)
  // ═══════════════════════════════════════════════════════════════

  markConversationAsRead(conversationId) {
    if (!this.socket?.connected) {
      console.error('❌ Cannot mark as read - socket not connected')
      return false
    }

    console.log('📖 Marking as read:', conversationId)
    
    try {
      this.socket.emit('conversation:mark_read', { conversationId })
      return true
    } catch (error) {
      console.error('❌ Failed to mark as read:', error)
      return false
    }
  }

  joinConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('📥 JOINING conversation room:', `conversation:${conversationId}`)
      this.socket.emit('conversation:join', { conversationId })
    } else {
      console.error('❌ Cannot join conversation - socket not connected')
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      console.log('📤 LEAVING conversation room:', `conversation:${conversationId}`)
      this.socket.emit('conversation:leave', { conversationId })
    }
  }

  // Manual retry for failed messages
  retryFailedMessage(tempId) {
    const messageData = this.pendingMessages.get(tempId)
    if (messageData) {
      this.retryMessage(tempId)
      return true
    }
    return false
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP AND UTILITIES
  // ═══════════════════════════════════════════════════════════════

  disconnect() {
    console.log('🔌 Disconnecting socket service...')
    
    // Clear all timeouts
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.sendTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.retryTimeouts.clear()
    this.sendTimeouts.clear()
    
    // Clear connection monitoring
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }
    
    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    // Update state
    this.isConnected = false
    this.updateConnectionState(CONNECTION_STATE.DISCONNECTED)
    
    // Clear data
    this.pendingMessages.clear()
    
    console.log('✅ Socket service disconnected')
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected
  }

  getConnectionState() {
    return this.connectionState
  }

  getSocketId() {
    return this.socket?.id || null
  }

  // Get reliability stats for debugging
  getReliabilityStats() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected,
      pendingMessages: this.pendingMessages.size,
      retryTimeouts: this.retryTimeouts.size,
      sendTimeouts: this.sendTimeouts.size,
      queuedMessages: messageQueue.size(),
      socketId: this.getSocketId()
    }
  }

  // Force clear all pending operations (emergency cleanup)
  clearAllPending() {
    console.log('🧹 Clearing all pending operations')
    
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.sendTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    
    this.retryTimeouts.clear()
    this.sendTimeouts.clear()
    this.pendingMessages.clear()
    
    messageQueue.clear()
  }
}

// Export singleton instance
const socketService = new MessagingSocketService()
export { socketService }
export default socketService