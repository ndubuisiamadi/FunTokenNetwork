// src/stores/messages.js - ENHANCED WITH RELIABILITY FEATURES

import { defineStore } from 'pinia'
import { messagesAPI } from '@/services/api'
import { socketService } from '@/services/socket'
import { useAuthStore } from '@/stores/auth'
import { 
  MESSAGE_STATUS, 
  MESSAGE_RELIABILITY_CONFIG,
  CONNECTION_STATE,
  createMessage,
  updateMessageStatus,
  shouldRetryMessage,
  isMessagePending,
  isMessageError,
  messageQueue
} from '@/utils/messageStatus'

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    // Core data
    conversations: [],
    currentConversation: null,
    messages: {}, // conversationId -> messages[]
    
    // UI state
    loading: false,
    error: null,
    sendingMessage: false,
    
    // 🔥 RELIABILITY FEATURES
    connectionState: CONNECTION_STATE.DISCONNECTED,
    retryingMessages: new Set(), // tempIds of messages being retried
    failedMessages: new Map(), // tempId -> failure info
    queuedMessagesCount: 0,
    
    // Real-time features
    typingUsers: {},
    onlineUsers: new Set(),
    
    // Search & filters
    searchQuery: '',
    selectedChatType: 'direct',
    currentConversationId: null,

    // 🔥 MESSAGE PAGINATION
    messagesPagination: {}, // conversationId -> { page, hasMore, loading }
    
    // 🔥 UNREAD TRACKING
    lastReadTimestamps: {}, // conversationId -> timestamp
    unreadDividerPositions: {} // conversationId -> messageId
  }),

  getters: {
    // Current conversation messages in correct order
    currentMessages: (state) => {
      if (!state.currentConversation) return []
      const messages = state.messages[state.currentConversation.id] || []
      
      // Sort by sequence number, then by createdAt as fallback
      return messages.sort((a, b) => {
        const seqA = a.sequenceNumber || 0
        const seqB = b.sequenceNumber || 0
        
        if (seqA === seqB) {
          return new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
        }
        
        return seqA - seqB
      })
    },

    // Filtered conversations by type
    currentConversations: (state) => {
      let filtered = state.selectedChatType === 'direct' 
        ? state.conversations.filter(c => !c.isGroup)
        : state.conversations.filter(c => c.isGroup)

      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase()
        filtered = filtered.filter(conv => {
          const name = conv.isGroup 
            ? (conv.name || 'Group Chat')
            : `${conv.otherParticipant?.firstName || ''} ${conv.otherParticipant?.lastName || ''}`.trim() || conv.otherParticipant?.username
          return name?.toLowerCase().includes(query)
        })
      }
      return filtered
    },

    // Enhanced unread counts
    totalUnreadCount: (state) => {
      return state.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    },

    directChatsWithUnread: (state) => {
      return state.conversations.filter(c => !c.isGroup && (c.unreadCount || 0) > 0).length
    },

    groupChatsWithUnread: (state) => {
      return state.conversations.filter(c => c.isGroup && (c.unreadCount || 0) > 0).length
    },

    // 🔥 RELIABILITY GETTERS
    isOnline: (state) => state.connectionState === CONNECTION_STATE.ONLINE,
    isConnecting: (state) => [CONNECTION_STATE.CONNECTING, CONNECTION_STATE.RECONNECTING].includes(state.connectionState),
    isOffline: (state) => state.connectionState === CONNECTION_STATE.DISCONNECTED,

    // Connection status for UI
    connectionStatus: (state) => {
      switch (state.connectionState) {
        case CONNECTION_STATE.ONLINE:
          return { status: 'online', message: 'Connected', color: 'text-green-500' }
        case CONNECTION_STATE.CONNECTING:
          return { status: 'connecting', message: 'Connecting...', color: 'text-yellow-500' }
        case CONNECTION_STATE.RECONNECTING:
          return { status: 'reconnecting', message: 'Reconnecting...', color: 'text-yellow-500' }
        case CONNECTION_STATE.OFFLINE:
        case CONNECTION_STATE.DISCONNECTED:
        default:
          return { status: 'offline', message: 'Disconnected', color: 'text-red-500' }
      }
    },

    // Count of messages that need retry
    failedMessagesCount: (state) => state.failedMessages.size,

    // Get failed messages for current conversation
    currentConversationFailedMessages: (state) => {
      if (!state.currentConversation) return []
      
      const conversationId = state.currentConversation.id
      const messages = state.messages[conversationId] || []
      
      return messages.filter(msg => 
        msg.status === MESSAGE_STATUS.FAILED && 
        state.failedMessages.has(msg.tempId || msg.id)
      )
    },

    // Online status checker
    isUserOnline: (state) => (userId) => {
      return state.onlineUsers.has(userId)
    },

    // Check if conversation has more messages to load
    canLoadMoreMessages: (state) => (conversationId) => {
      const pagination = state.messagesPagination[conversationId]
      return pagination && pagination.hasMore && !pagination.loading
    }
  },

  actions: {
    // ═══════════════════════════════════════════════════════════════
    // RELIABILITY ACTIONS
    // ═══════════════════════════════════════════════════════════════

    // Handle connection state changes
    handleConnectionStateChange(data) {
      const { newState, oldState } = data
      
      console.log(`🔌 STORE: Connection state changed: ${oldState} → ${newState}`)
      this.connectionState = newState

      // Update queued messages count
      this.queuedMessagesCount = messageQueue.size()

      // Show user-friendly notifications
      if (newState === CONNECTION_STATE.ONLINE && oldState === CONNECTION_STATE.DISCONNECTED) {
        this.showConnectionNotification('🟢 Connected to server', 'success')
      } else if (newState === CONNECTION_STATE.DISCONNECTED && oldState === CONNECTION_STATE.ONLINE) {
        this.showConnectionNotification('🔴 Connection lost. Messages will be queued.', 'warning')
      } else if (newState === CONNECTION_STATE.RECONNECTING) {
        this.showConnectionNotification('🔄 Reconnecting...', 'info')
      }
    },

    // Handle message queuing
    handleMessageQueued(data) {
      const { tempId, queueSize } = data
      
      console.log(`📥 STORE: Message queued: ${tempId}, queue size: ${queueSize}`)
      this.queuedMessagesCount = queueSize

      // Update message status in UI
      this.updateMessageInConversation(this.currentConversation?.id, tempId, {
        status: MESSAGE_STATUS.QUEUED
      })
    },

    // Handle retry scheduling
    handleMessageRetryScheduled(data) {
      const { tempId, retryCount, delay, nextRetry } = data
      
      console.log(`🔄 STORE: Retry scheduled for ${tempId}, attempt ${retryCount}`)
      
      this.retryingMessages.add(tempId)
      this.failedMessages.set(tempId, {
        retryCount,
        nextRetry,
        lastError: 'Send timeout',
        canRetry: true
      })

      // Update UI to show retry status
      this.updateMessageInConversation(this.currentConversation?.id, tempId, {
        status: MESSAGE_STATUS.FAILED,
        retryCount,
        nextRetry
      })
    },

    // Handle retry attempts
    handleMessageRetryAttempt(data) {
      const { tempId, attempt, status } = data
      
      console.log(`🔄 STORE: Retry attempt ${attempt} for ${tempId}`)
      
      this.updateMessageInConversation(this.currentConversation?.id, tempId, {
        status,
        retryCount: attempt
      })
    },

    // Handle permanent failures
    handleMessagePermanentFailure(data) {
      const { tempId, error, attempts } = data
      
      console.error(`💀 STORE: Permanent failure for ${tempId}:`, error)
      
      this.retryingMessages.delete(tempId)
      this.failedMessages.set(tempId, {
        error,
        attempts,
        canRetry: false,
        permanentFailure: true
      })

      this.updateMessageInConversation(this.currentConversation?.id, tempId, {
        status: MESSAGE_STATUS.FAILED,
        error,
        retryCount: attempts
      })
    },

    // Manual retry for failed messages
    async retryFailedMessage(tempId) {
      console.log(`🔄 STORE: Manual retry requested for ${tempId}`)
      
      const failure = this.failedMessages.get(tempId)
      if (!failure || !failure.canRetry) {
        console.warn('⚠️ Cannot retry message:', tempId)
        return { success: false, error: 'Message cannot be retried' }
      }

      // Try socket retry first
      const socketRetrySuccess = socketService.retryFailedMessage(tempId)
      
      if (socketRetrySuccess) {
        this.retryingMessages.add(tempId)
        this.updateMessageInConversation(this.currentConversation?.id, tempId, {
          status: MESSAGE_STATUS.SENDING
        })
        return { success: true }
      }

      return { success: false, error: 'Socket retry failed' }
    },

    // Clear all failed messages for conversation
    clearFailedMessages(conversationId = null) {
      const targetConversationId = conversationId || this.currentConversation?.id
      if (!targetConversationId) return

      const messages = this.messages[targetConversationId] || []
      
      messages.forEach(message => {
        if (message.status === MESSAGE_STATUS.FAILED) {
          const messageId = message.tempId || message.id
          this.failedMessages.delete(messageId)
          this.retryingMessages.delete(messageId)
        }
      })

      // Remove failed messages from conversation
      this.messages[targetConversationId] = messages.filter(
        msg => msg.status !== MESSAGE_STATUS.FAILED
      )
    },

    // ═══════════════════════════════════════════════════════════════
    // ENHANCED MESSAGE SENDING
    // ═══════════════════════════════════════════════════════════════

    async sendMessage(content, mediaUrls = [], messageType = 'text') {
      if (!this.currentConversation) {
        return { success: false, error: 'No conversation selected' }
      }

      const conversationId = this.currentConversation.id
      const authStore = useAuthStore()
      const tempId = `temp_${Date.now()}_${Math.random()}`

      this.sendingMessage = true

      try {
        // Create optimistic message with enhanced reliability data
        const optimisticMessage = createMessage({
          id: tempId,
          tempId,
          content: content.trim(),
          mediaUrls,
          messageType,
          conversationId,
          sender: authStore.currentUser,
          sequenceNumber: Date.now() // Temporary sequence number
        }, authStore.currentUser.id)

        // Add to UI immediately
        if (!this.messages[conversationId]) {
          this.messages[conversationId] = []
        }
        this.messages[conversationId].push(optimisticMessage)

        // Update conversation preview
        this.updateConversationPreview(this.currentConversation, optimisticMessage)

        // Send via socket with reliability features
        const success = socketService.sendMessage(conversationId, {
          content: content.trim(),
          mediaUrls,
          messageType,
          tempId
        })

        if (!success) {
          // If immediate send fails, message will be queued automatically
          console.log('📥 Message will be queued for later delivery')
        }

        return { success: true, tempId }

      } catch (error) {
        console.error('❌ Send message error:', error)
        
        // Mark optimistic message as failed
        this.updateMessageInConversation(conversationId, tempId, {
          status: MESSAGE_STATUS.FAILED,
          error: error.message
        })

        return { success: false, error: error.message }
      } finally {
        this.sendingMessage = false
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENHANCED MESSAGE HANDLING
    // ═══════════════════════════════════════════════════════════════

    // Handle new message from socket
    handleNewMessage(messageData) {
      const { conversationId, senderId } = messageData
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      console.log('📨 STORE: Handling new message:', messageData.id)

      // Don't process own messages (they come via sent confirmation)
      if (senderId === currentUserId) {
        console.log('📨 STORE: Ignoring own message')
        return
      }

      // Initialize messages array if needed
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = []
      }

      // Check for duplicates
      const exists = this.messages[conversationId].find(m => m.id === messageData.id)
      if (exists) {
        console.log('📨 STORE: Message already exists, skipping')
        return
      }

      // Add message
      this.messages[conversationId].push({
        ...messageData,
        status: messageData.status || MESSAGE_STATUS.DELIVERED
      })

      // Update conversation list
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        this.updateConversationPreview(conversation, messageData)
        
        // Update unread count if not in current conversation
        if (this.currentConversation?.id !== conversationId) {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1
          
          // Set unread divider position
          this.setUnreadDividerPosition(conversationId, messageData.id)
        }
      }

      // Play notification sound/vibration if not in current conversation
      if (this.currentConversation?.id !== conversationId) {
        this.showMessageNotification(messageData)
      }
    },

    // Enhanced sent confirmation handler
    handleSentConfirmation(data) {
      const { messageId, tempId, conversationId, sequenceNumber, status } = data
      
      console.log('✅ STORE: Handling sent confirmation:', tempId, '→', messageId)

      if (tempId) {
        const messages = this.messages[conversationId]
        if (messages) {
          const tempIndex = messages.findIndex(m => m.tempId === tempId)
          if (tempIndex !== -1) {
            // Replace optimistic message with confirmed one
            const confirmedMessage = {
              ...messages[tempIndex],
              id: messageId,
              tempId: null,
              sequenceNumber,
              status: status || MESSAGE_STATUS.SENT,
              confirmedAt: new Date().toISOString()
            }
            
            messages[tempIndex] = confirmedMessage

            // Clean up retry data
            this.retryingMessages.delete(tempId)
            this.failedMessages.delete(tempId)

            console.log('✅ STORE: Message confirmed and updated')
          }
        }
      }
    },

    // Handle message status updates
    handleMessageStatusUpdate(data) {
      const { messageId, conversationId, status, readBy } = data
      
      console.log('📱 STORE: Handling status update:', messageId, '→', status)

      // Find conversation
      let targetConversationId = conversationId || this.currentConversation?.id
      if (!targetConversationId) return
      
      // Find and update message
      const messages = this.messages[targetConversationId]
      if (messages) {
        const message = messages.find(m => m.id === messageId)
        
        if (message) {
          // Use safe status update
          const updated = updateMessageStatus(message, status)
          
          if (updated) {
            console.log(`📱 STORE: Updated message status: ${messageId} → ${status}`)
            
            // Update conversation preview if this is the last message
            const conversation = this.conversations.find(c => c.id === targetConversationId)
            if (conversation?.lastMessageData?.id === messageId) {
              conversation.lastMessageData.status = status
            }
          }
        }
      }
    },

    // Handle bulk read event
    handleMessagesRead(data) {
      const { conversationId, readBy, count } = data
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id
      
      console.log('📖 STORE: Handling messages read:', conversationId, count, 'messages')
      
      // Don't process own read events
      if (readBy === currentUserId) return
      
      // Update all messages sent by current user to 'read' status
      const messages = this.messages[conversationId]
      if (messages) {
        let updatedCount = 0
        
        messages.forEach(message => {
          if (message.senderId === currentUserId && message.status !== MESSAGE_STATUS.READ) {
            const updated = updateMessageStatus(message, MESSAGE_STATUS.READ)
            if (updated) updatedCount++
          }
        })
        
        console.log(`📖 STORE: Updated ${updatedCount} messages to read status`)
        
        // Update conversation preview
        const conversation = this.conversations.find(c => c.id === conversationId)
        if (conversation?.lastMessageData?.senderId === currentUserId) {
          conversation.lastMessageData.status = MESSAGE_STATUS.READ
        }
      }
    },

    // Handle auto-delivery when users come online
    handleMessagesAutoDelivered(data) {
      const { conversationId, userId, count } = data
      
      console.log('📦 STORE: Handling auto-delivery:', conversationId, count, 'messages')
      
      const messages = this.messages[conversationId]
      if (messages) {
        let updatedCount = 0
        
        messages.forEach(message => {
          if (message.status === MESSAGE_STATUS.SENT) {
            const updated = updateMessageStatus(message, MESSAGE_STATUS.DELIVERED)
            if (updated) updatedCount++
          }
        })
        
        console.log(`📦 STORE: Auto-delivered ${updatedCount} messages`)
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE PAGINATION
    // ═══════════════════════════════════════════════════════════════

    async loadMoreMessages(conversationId, page = 1) {
      if (!conversationId) return { success: false, error: 'No conversation ID' }

      // Initialize pagination if needed
      if (!this.messagesPagination[conversationId]) {
        this.messagesPagination[conversationId] = {
          page: 0,
          hasMore: true,
          loading: false
        }
      }

      const pagination = this.messagesPagination[conversationId]
      
      if (pagination.loading || !pagination.hasMore) {
        return { success: false, error: 'Already loading or no more messages' }
      }

      pagination.loading = true
      const nextPage = page || pagination.page + 1

      try {
        const response = await messagesAPI.getMessages(conversationId, nextPage, 50)
        const newMessages = response.data.messages

        console.log(`📋 STORE: Loaded ${newMessages.length} more messages for page ${nextPage}`)

        if (newMessages.length > 0) {
          // Prepend messages (they come in reverse chronological order)
          if (!this.messages[conversationId]) {
            this.messages[conversationId] = []
          }
          
          // Avoid duplicates
          const existingIds = new Set(this.messages[conversationId].map(m => m.id))
          const uniqueMessages = newMessages.filter(m => !existingIds.has(m.id))
          
          this.messages[conversationId].unshift(...uniqueMessages.reverse())
          
          pagination.page = nextPage
          pagination.hasMore = response.data.pagination.hasMore
        } else {
          pagination.hasMore = false
        }

        return { success: true, messagesLoaded: newMessages.length }

      } catch (error) {
        console.error('❌ Load more messages error:', error)
        return { success: false, error: error.message }
      } finally {
        pagination.loading = false
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // UNREAD TRACKING & DIVIDERS
    // ═══════════════════════════════════════════════════════════════

    setUnreadDividerPosition(conversationId, messageId) {
      this.unreadDividerPositions[conversationId] = messageId
    },

    clearUnreadDivider(conversationId) {
      delete this.unreadDividerPositions[conversationId]
    },

    markAsRead(conversationId = null) {
      const targetId = conversationId || this.currentConversation?.id
      if (!targetId) return

      console.log('📖 STORE: Marking conversation as read:', targetId)

      // Optimistic update
      const conversation = this.conversations.find(c => c.id === targetId)
      if (conversation) {
        conversation.unreadCount = 0
      }

      // Clear unread divider
      this.clearUnreadDivider(targetId)

      // Update last read timestamp
      this.lastReadTimestamps[targetId] = new Date().toISOString()

      // Send to backend via socket
      socketService.markConversationAsRead(targetId)
    },

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    updateMessageInConversation(conversationId, messageId, updates) {
      if (!conversationId || !messageId) return

      const messages = this.messages[conversationId]
      if (!messages) return

      const messageIndex = messages.findIndex(m => 
        m.id === messageId || m.tempId === messageId
      )

      if (messageIndex !== -1) {
        Object.assign(messages[messageIndex], updates)
      }
    },

    updateConversationPreview(conversation, message) {
      conversation.lastMessage = message.content || '📎 Media'
      conversation.lastMessageTime = message.createdAt || message.timestamp
      conversation.lastActivity = message.createdAt || message.timestamp
      conversation.lastMessageData = {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        status: message.status || MESSAGE_STATUS.SENT
      }

      // Move to top of list
      const index = this.conversations.findIndex(c => c.id === conversation.id)
      if (index > 0) {
        this.conversations.splice(index, 1)
        this.conversations.unshift(conversation)
      }
    },

    showConnectionNotification(message, type = 'info') {
      // Simple console notification - can be enhanced with toast library
      console.log(`🔔 CONNECTION: ${message}`)
      
      // Store in error for UI display
      if (type === 'warning' || type === 'error') {
        this.error = message
        setTimeout(() => {
          if (this.error === message) this.error = null
        }, 5000)
      }
    },

    showMessageNotification(messageData) {
      // Simple notification - can be enhanced
      console.log(`🔔 NEW MESSAGE: ${messageData.sender?.firstName} sent a message`)
      
      // Could trigger browser notification here
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New message from ${messageData.sender?.firstName}`, {
          body: messageData.content || 'Sent media',
          icon: messageData.sender?.avatarUrl
        })
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // EXISTING METHODS (Enhanced)
    // ═══════════════════════════════════════════════════════════════

    async fetchConversations() {
      this.loading = true
      try {
        const response = await messagesAPI.getConversations()
        this.conversations = response.data.conversations || []
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false }
      } finally {
        this.loading = false
      }
    },

    async fetchMessages(conversationId, page = 1) {
      try {
        // Use the pagination-aware method
        const result = await this.loadMoreMessages(conversationId, page)
        
        if (result.success && page === 1) {
          // If this is the first page, we're initializing the conversation
          return { success: true }
        }
        
        return result
      } catch (error) {
        this.error = error.message
        return { success: false }
      }
    },

    async selectConversation(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return { success: false, error: 'Conversation not found' }

      console.log('📂 STORE: Selecting conversation:', conversationId)

      // Leave previous conversation
      if (this.currentConversation) {
        socketService.leaveConversation(this.currentConversation.id)
      }

      this.currentConversationId = conversationId
      this.currentConversation = conversation

      // Join new conversation
      socketService.joinConversation(conversationId)

      // Load messages if needed (first page)
      let messagesLoaded = false
      if (!this.messages[conversationId] || this.messages[conversationId].length === 0) {
        const result = await this.fetchMessages(conversationId, 1)
        messagesLoaded = result.success
      } else {
        messagesLoaded = true
      }

      // Mark as read
      this.markAsRead(conversationId)

      return { success: true, messagesLoaded }
    },

    async createConversation(participantIds, isGroup = false, name = null, avatarUrl = null) {
      try {
        const response = await messagesAPI.createConversation({
          participantIds,
          isGroup,
          name,
          avatarUrl
        })

        if (response.data.success) {
          const newConversation = response.data.conversation
          
          // Add to conversations list if not exists
          const exists = this.conversations.find(c => c.id === newConversation.id)
          if (!exists) {
            this.conversations.unshift(newConversation)
          }

          return { success: true, conversation: newConversation }
        }

        return { success: false, error: response.data.message }
      } catch (error) {
        console.error('❌ Create conversation error:', error)
        return { success: false, error: error.message }
      }
    },

    // Online status handlers
    handleUserOnline(data) {
      console.log('🟢 STORE: User came online:', data.userId)
      this.onlineUsers.add(data.userId)
      this.updateUserOnlineStatus(data.userId, true)
    },

    handleUserOffline(data) {
      console.log('🔴 STORE: User went offline:', data.userId)
      this.onlineUsers.delete(data.userId)
      this.updateUserOnlineStatus(data.userId, false)
    },

    handleOnlineUsersList(data) {
      console.log('👥 STORE: Received online users list:', data.users.length)
      this.onlineUsers = new Set(data.users)
      this.updateAllUserOnlineStatus(data.users)
    },

    updateUserOnlineStatus(userId, isOnline) {
      console.log(`📱 STORE: Updating ${userId} online status to:`, isOnline)
      
      // Update in conversations list
      this.conversations.forEach(conversation => {
        if (!conversation.isGroup && conversation.otherParticipant?.id === userId) {
          conversation.otherParticipant.isOnline = isOnline
          conversation.otherParticipant.lastSeen = new Date()
        }
        
        if (conversation.participants) {
          conversation.participants.forEach(participant => {
            if (participant.user?.id === userId) {
              participant.user.isOnline = isOnline
              participant.user.lastSeen = new Date()
            }
          })
        }
      })
    },

    updateAllUserOnlineStatus(onlineUserIds) {
      console.log(`👥 STORE: Updating all user online status. ${onlineUserIds.length} users online`)
      
      this.conversations.forEach(conversation => {
        if (!conversation.isGroup && conversation.otherParticipant) {
          conversation.otherParticipant.isOnline = onlineUserIds.includes(conversation.otherParticipant.id)
        }
        
        if (conversation.participants) {
          conversation.participants.forEach(participant => {
            if (participant.user) {
              participant.user.isOnline = onlineUserIds.includes(participant.user.id)
            }
          })
        }
      })
    },

    // UI helpers
    setSearchQuery(query) {
      this.searchQuery = query
    },

    clearCurrentConversation() {
      if (this.currentConversation) {
        socketService.leaveConversation(this.currentConversation.id)
      }
      this.currentConversation = null
      this.currentConversationId = null
    },

    clearError() {
      this.error = null
    },

    // Check if store is initialized
    isInitialized() {
      return this.conversations.length > 0 || this.loading
    }
  }
})

export { MESSAGE_STATUS }