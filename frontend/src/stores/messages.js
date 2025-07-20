// src/stores/messages.js - FIXED IMMEDIATE STATUS UPDATES VERSION
import { defineStore } from 'pinia'
import { messagesAPI } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

// Convert status string to database fields
const statusToDbFields = (status) => {
  switch (status) {
    case 'read':
      return { isRead: true, isDelivered: true }
    case 'delivered':
      return { isDelivered: true, isRead: false }
    case 'sent':
      return { isDelivered: false, isRead: false }
    default:
      return { isDelivered: false, isRead: false }
  }
}

const getMessageStatus = (message, currentUserId) => {
  // Only show status for messages sent by current user
  if (message.senderId !== currentUserId) {
    return null // Don't show status for received messages
  }

  // Handle optimistic messages (still being sent)
  if (message.isOptimistic || message.status === 'sending') {
    return 'sending'
  }

  // Handle failed messages
  if (message.status === 'failed' || message.error) {
    return 'failed'
  }

  // Determine status based on flags
  if (message.isRead) {
    return 'read'
  } else if (message.isDelivered) {
    return 'delivered'
  } else {
    return 'sent'
  }
}

// Helper function to create message preview data
const createMessagePreviewData = (message) => {
  return {
    id: message.id,
    content: message.content || '',
    mediaUrls: message.mediaUrls || [],
    senderId: message.senderId,
    createdAt: message.createdAt,
    status: message.status || 'sent',
    isRead: message.isRead || false,
    isDelivered: message.isDelivered || false
  }
}

// Helper function to sort conversations by last activity
const sortConversationsByActivity = (conversations) => {
  return conversations.sort((a, b) => {
    const aTime = new Date(a.lastActivity || a.createdAt)
    const bTime = new Date(b.lastActivity || b.createdAt)
    return bTime - aTime // Most recent first
  })
}

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    conversations: [],
    currentConversation: null,
    messages: {},
    loading: false,
    error: null,
    sendingMessage: false,
    hasMoreMessages: {},
    loadingMore: false,
    socket: null,
    typingUsers: {},
    userOnlineStatus: new Map(),
    onlineStatusInitialized: false,
    lastOnlineStatusSync: 0,
    selectedChatType: 'direct',
    searchQuery: '',
    newConversationModal: false,
    typingTimer: null,
    lastUpdate: 0,
    socketConnected: false,
    unreadCountUpdateTrigger: 0,
    currentConversationId: null,
    onlineStatusUpdateTrigger: 0,
    userOnlineStatus: new Map(),
    // 🔥 REMOVED: Complex queuing system that was causing delays
  }),

  getters: {
    // Enhanced getters with online status reactivity
    directChats: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger
      return state.conversations.filter(conv => !conv.isGroup)
    },

    groupChats: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger
      return state.conversations.filter(conv => conv.isGroup)
    },

    currentConversations: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger
      const conversations = state.selectedChatType === 'direct'
        ? state.conversations.filter(conv => !conv.isGroup)
        : state.conversations.filter(conv => conv.isGroup)

      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase()
        return conversations.filter(conv => {
          const name = conv.isGroup
            ? (conv.name || 'Group Chat')
            : `${conv.otherParticipant?.firstName || ''} ${conv.otherParticipant?.lastName || ''}`.trim() || conv.otherParticipant?.username
          return name?.toLowerCase().includes(query)
        })
      }

      return conversations
    },

    // Get real-time online status for a user
    getUserOnlineStatus: (state) => (userId) => {
      const _ = state.onlineStatusUpdateTrigger
      return state.userOnlineStatus.get(userId) || false
    },

    // Count of conversations with unread messages
    directChatsWithUnread: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger

      const count = state.conversations
        .filter(conv => !conv.isGroup && (conv.unreadCount || 0) > 0)
        .length

      console.log('📊 Store: Direct chats with unread count:', count)
      return count
    },

    groupChatsWithUnread: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger

      const count = state.conversations
        .filter(conv => conv.isGroup && (conv.unreadCount || 0) > 0)
        .length

      console.log('📊 Store: Group chats with unread count:', count)
      return count
    },

    totalChatsWithUnread: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger

      const count = state.conversations
        .filter(conv => (conv.unreadCount || 0) > 0)
        .length

      console.log('📊 Store: Total chats with unread count:', count)
      return count
    },

    // Simplified existing getters
    directUnreadCount: (state) => {
      const count = state.conversations
        .filter(conv => !conv.isGroup)
        .reduce((total, conv) => total + (conv.unreadCount || 0), 0)

      return count
    },

    groupUnreadCount: (state) => {
      const count = state.conversations
        .filter(conv => conv.isGroup)
        .reduce((total, conv) => total + (conv.unreadCount || 0), 0)

      return count
    },

    totalUnreadCount: (state) => {
      const count = state.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
      return count
    },

    currentMessages: (state) => {
      if (!state.currentConversation) return []
      return state.messages[state.currentConversation.id] || []
    },

    // Check if user is typing in current conversation
    isTypingInCurrent: (state) => {
      if (!state.currentConversation) return false
      const typing = state.typingUsers[state.currentConversation.id] || []
      return typing.length > 0
    },

    // Get typing users names
    typingUsersNames: (state) => {
      if (!state.currentConversation) return []
      return state.typingUsers[state.currentConversation.id] || []
    },

    // Unread count for a specific conversation
    getUnreadCount: (state) => (conversationId) => {
      const conversation = state.conversations.find(c => c.id === conversationId)
      return conversation?.unreadCount || 0
    },

    // Check if conversation has unread messages
    hasUnreadMessages: (state) => (conversationId) => {
      const conversation = state.conversations.find(c => c.id === conversationId)
      return (conversation?.unreadCount || 0) > 0
    },

    // Get conversations with unread messages
    conversationsWithUnread: (state) => {
      const _ = state.unreadCountUpdateTrigger
      return state.conversations.filter(conv => (conv.unreadCount || 0) > 0)
    }
  },

  actions: {
    // Trigger reactivity
    triggerUpdate(type = 'general') {
      this.lastUpdate = Date.now()

      if (type === 'unread' || type === 'general') {
        this.unreadCountUpdateTrigger = Date.now()
      }

      if (type === 'online' || type === 'general') {
        this.onlineStatusUpdateTrigger = Date.now()
      }

      console.log(`🔄 Triggered ${type} reactivity update:`, {
        lastUpdate: this.lastUpdate,
        unreadTrigger: this.unreadCountUpdateTrigger,
        onlineTrigger: this.onlineStatusUpdateTrigger
      })
    },

    // Online status management
    updateUserOnlineStatus(userId, isOnline, source = 'unknown', lastSeen = null) {
      if (!userId) {
        console.warn('⚠️ Cannot update online status - no userId provided')
        return
      }

      const currentStatus = this.userOnlineStatus.get(userId)
      const timestamp = new Date()
      
      const newStatus = {
        isOnline,
        lastSeen: lastSeen || (isOnline ? timestamp : currentStatus?.lastSeen || timestamp),
        source,
        updatedAt: timestamp
      }

      const shouldUpdate = !currentStatus || 
                          currentStatus.isOnline !== isOnline ||
                          this.isMoreAuthoritativeSource(source, currentStatus.source)

      if (shouldUpdate) {
        console.log(`👤 Online status update for ${userId}:`, {
          from: currentStatus?.isOnline || 'unknown',
          to: isOnline,
          source,
          lastSeen: newStatus.lastSeen
        })

        this.userOnlineStatus.set(userId, newStatus)
        this.updateOnlineStatusInConversations(userId, newStatus)
        this.onlineStatusUpdateTrigger = Date.now()
        this.triggerUpdate('online')
      }
    },

    isMoreAuthoritativeSource(newSource, currentSource) {
      const authorityOrder = {
        'socket_event': 5,
        'socket_reconnect': 4,
        'initial_sync': 3,
        'conversation_data': 2,
        'database': 1,
        'unknown': 0
      }

      return (authorityOrder[newSource] || 0) >= (authorityOrder[currentSource] || 0)
    },

    updateOnlineStatusInConversations(userId, statusInfo) {
      let conversationsUpdated = 0

      this.conversations.forEach(conversation => {
        if (!conversation.isGroup && conversation.otherParticipant?.id === userId) {
          conversation.otherParticipant.isOnline = statusInfo.isOnline
          conversation.otherParticipant.lastSeen = statusInfo.lastSeen
          conversationsUpdated++
        }

        if (conversation.participants) {
          conversation.participants.forEach(participant => {
            if (participant.user && participant.user.id === userId) {
              participant.user.isOnline = statusInfo.isOnline
              participant.user.lastSeen = statusInfo.lastSeen
              conversationsUpdated++
            }
          })
        }
      })

      if (conversationsUpdated > 0) {
        console.log(`✅ Updated online status in ${conversationsUpdated} conversations for user ${userId}`)
      }
    },

    updateUnreadCount(conversationId, count, source = 'unknown') {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) {
        console.warn(`⚠️ Conversation ${conversationId} not found for unread update`)
        return
      }

      const oldCount = conversation.unreadCount || 0
      const newCount = Math.max(0, count)

      if (oldCount !== newCount) {
        conversation.unreadCount = newCount

        console.log(`📊 Updated unread count for ${conversationId}:`, {
          from: oldCount,
          to: newCount,
          source
        })

        this.triggerUpdate('unread')
      }
    },

    incrementUnreadCount(conversationId, source = 'unknown') {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return

      if (this.currentConversationId === conversationId) {
        console.log(`🚫 Not incrementing unread count for ${conversationId} - currently viewing`)
        return
      }

      const oldCount = conversation.unreadCount || 0
      const newCount = oldCount + 1
      conversation.unreadCount = newCount

      console.log(`📈 Incremented unread count for ${conversationId}:`, {
        from: oldCount,
        to: newCount,
        source,
        currentlyViewing: this.currentConversationId
      })

      this.triggerUpdate('unread')
    },

    clearUnreadCount(conversationId, source = 'unknown') {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return

      const oldCount = conversation.unreadCount || 0
      if (oldCount > 0) {
        conversation.unreadCount = 0

        console.log(`🧹 Cleared unread count for ${conversationId}:`, {
          from: oldCount,
          to: 0,
          source
        })

        this.triggerUpdate('unread')
      }
    },

    // Socket initialization
    async initializeSocket() {
      try {
        const { socketService } = await import('@/services/socket')
        
        const connected = await socketService.connect()

        if (connected) {
          console.log('✅ Messages Store: Socket initialized successfully')
          this.socketConnected = true

          this.setupSocketListeners(socketService)
          await this.requestInitialOnlineSync(socketService)

          this.conversations.forEach(conv => {
            socketService.joinConversation(conv.id)
          })

          this.triggerUpdate()
        } else {
          console.error('❌ Messages Store: Failed to initialize socket')
          this.socketConnected = false
        }
      } catch (error) {
        console.error('❌ Messages Store: Socket initialization error:', error)
        this.socketConnected = false
      }
    },

    async requestInitialOnlineSync(socketService) {
      console.log('📡 Requesting initial online status sync...')
      
      try {
        socketService.socket.emit('get_online_users')
        
        const syncTimeout = setTimeout(() => {
          console.warn('⚠️ Online status sync timeout - proceeding with current data')
          this.lastOnlineStatusSync = Date.now()
        }, 3000)

        const originalHandler = socketService.socket._callbacks['online_users_list']
        socketService.socket.once('online_users_list', (data) => {
          clearTimeout(syncTimeout)
          this.lastOnlineStatusSync = Date.now()
          console.log('✅ Initial online status sync completed')
          
          if (originalHandler) {
            originalHandler.forEach(fn => fn(data))
          }
        })

      } catch (error) {
        console.error('❌ Failed to request online status sync:', error)
      }
    },

    setupSocketListeners(socketService) {
      if (!socketService.socket) {
        console.error('❌ No socket available for event listeners')
        return
      }

      console.log('🔧 Setting up socket event listeners in messages store')

      socketService.socket.on('user:online', (data) => {
        console.log('🟢 SOCKET EVENT: User online:', data.userId)
        this.updateUserOnlineStatus(data.userId, true, 'socket_event')
      })

      socketService.socket.on('user:offline', (data) => {
        console.log('🔴 SOCKET EVENT: User offline:', data.userId)
        this.updateUserOnlineStatus(data.userId, false, 'socket_event')
      })

      socketService.socket.on('online_users_list', (data) => {
        console.log('👥 SOCKET EVENT: Received online users list:', data.users?.length || 0)

        try {
          if (data.users && Array.isArray(data.users)) {
            data.users.forEach(userId => {
              this.updateUserOnlineStatus(userId, true, 'initial_sync')
            })

            this.userOnlineStatus.forEach((status, userId) => {
              if (!data.users.includes(userId) && status.source !== 'socket_event') {
                this.updateUserOnlineStatus(userId, false, 'initial_sync')
              }
            })
          }
        } catch (error) {
          console.error('❌ Error processing online users list:', error)
        }
      })

      socketService.socket.on('connect', () => {
        console.log('✅ Socket: Reconnected - refreshing online status')
        
        setTimeout(() => {
          this.requestOnlineStatusRefresh(socketService)
        }, 500)
      })

      socketService.socket.on('disconnect', (reason) => {
        console.log('❌ Socket: Disconnected -', reason)
        console.log('📊 Keeping online status during disconnect - will refresh on reconnect')
        this.socketConnected = false
      })

      console.log('✅ Socket event listeners set up in messages store')
    },

    requestOnlineStatusRefresh(socketService) {
      if (socketService && socketService.socket?.connected) {
        console.log('🔄 Requesting online status refresh after reconnection')
        socketService.socket.emit('get_online_users')
      }
    },

    // 🔥 FIXED: Immediate status updates instead of queuing
    async handleIncomingMessage(messageData) {
      try {
        console.log('📨 Processing incoming message:', {
          id: messageData.id,
          conversationId: messageData.conversationId,
          content: messageData.content?.substring(0, 50) + '...',
          sender: messageData.sender?.username
        })

        const conversationId = messageData.conversationId
        const authStore = useAuthStore()
        const currentUserId = authStore.currentUser?.id

        if (!conversationId) {
          console.error('❌ No conversation ID in message data')
          return
        }

        if (messageData.senderId === currentUserId) {
          console.log('🚫 Ignoring own message from socket to prevent duplicates')
          return
        }

        let conversation = this.conversations.find(c => c.id === conversationId)

        if (!conversation) {
          console.warn('⚠️ Conversation not found, will refresh conversations')
          this.fetchConversations()
          return
        }

        // Mark message as delivered immediately since we received it
        const processedMessage = {
          ...messageData,
          isDelivered: true,
          timestamp: new Date(messageData.createdAt),
          status: 'delivered'
        }

        this.updateConversationWithMessage(conversation, processedMessage, currentUserId)

        if (this.messages[conversationId]) {
          this.addMessageToConversation(conversationId, processedMessage, currentUserId)
        }

        const isCurrentlyViewing = this.currentConversationId === conversationId &&
          this.currentConversation?.id === conversationId

        if (!isCurrentlyViewing) {
          console.log(`📈 Incrementing unread count - not currently viewing ${conversationId}`)
          this.incrementUnreadCount(conversationId, 'incoming_message')
        } else {
          console.log(`📖 Auto-marking as read - currently viewing ${conversationId}`)
          this.autoMarkAsRead(conversationId)
        }

        // Auto-send delivery confirmation via socket
        const { socketService } = await import('@/services/socket')
        if (socketService.isSocketConnected()) {
          socketService.markMessageAsDelivered(messageData.id, conversationId)
        }

        this.triggerUpdate('unread')

        console.log('✅ Successfully processed incoming message')

      } catch (error) {
        console.error('❌ Error handling incoming message:', error)
      }
    },

    updateConversationWithMessage(conversation, messageData, currentUserId) {
      const isFromOtherUser = messageData.senderId !== currentUserId

      let previewContent = ''
      if (messageData.mediaUrls && messageData.mediaUrls.length > 0) {
        previewContent = messageData.content ? messageData.content.trim() : '📎 Media'
      } else {
        previewContent = messageData.content || ''
      }

      const messageStatus = getMessageStatus(messageData, currentUserId)

      conversation.lastMessage = previewContent
      conversation.lastActivity = messageData.createdAt || new Date().toISOString()
      conversation.lastMessageTime = new Date(messageData.createdAt || new Date())
      conversation.lastMessageData = {
        id: messageData.id,
        content: messageData.content || '',
        mediaUrls: messageData.mediaUrls || [],
        senderId: messageData.senderId,
        createdAt: messageData.createdAt,
        status: messageStatus || 'delivered',
        isRead: messageData.isRead || false,
        isDelivered: messageData.isDelivered || false
      }

      const currentIndex = this.conversations.findIndex(c => c.id === conversation.id)
      if (currentIndex > 0) {
        this.conversations.splice(currentIndex, 1)
        this.conversations.unshift(conversation)
      } else if (currentIndex === 0) {
        this.conversations[0] = { ...conversation }
      }
    },

    addMessageToConversation(conversationId, messageData, currentUserId) {
      const messages = this.messages[conversationId]

      const exists = messages.find(m => m.id === messageData.id)
      if (exists) {
        console.log('🔄 Message already exists, skipping')
        return
      }

      const processedMessage = {
        ...messageData,
        timestamp: new Date(messageData.createdAt),
        status: messageData.senderId === currentUserId ? 'sent' : 'delivered',
        isDelivered: true,
        isOptimistic: false
      }

      messages.push(processedMessage)
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

      console.log(`✅ Added message to conversation ${conversationId}`)
    },

    // 🔥 FIXED: Immediate status updates without debouncing
    handleMessageStatusUpdateImmediate(data) {
      try {
        const { messageId, conversationId, status, updatedBy } = data
        console.log(`📱 STORE: Applying immediate message status update:`, {
          messageId,
          conversationId,
          status,
          updatedBy
        })

        // Find the conversation
        const conversation = this.conversations.find(c => c.id === conversationId)
        if (!conversation) {
          console.warn(`⚠️ Conversation ${conversationId} not found for status update`)
          return
        }

        // Update message in conversation messages if loaded
        const messages = this.messages[conversationId]
        if (messages) {
          const messageIndex = messages.findIndex(m => m.id === messageId)
          if (messageIndex !== -1) {
            const message = messages[messageIndex]

            // Apply status update immediately
            if (status === 'delivered') {
              message.isDelivered = true
              message.status = 'delivered'
            } else if (status === 'read') {
              message.isRead = true
              message.isDelivered = true
              message.status = 'read'
            }

            console.log(`✅ Updated message ${messageId} status to ${status}`)
          }
        }

        // Update conversation preview status if this is the last message
        if (conversation.lastMessageData && conversation.lastMessageData.id === messageId) {
          const lastMsg = conversation.lastMessageData

          if (status === 'delivered') {
            lastMsg.isDelivered = true
            lastMsg.status = 'delivered'
          } else if (status === 'read') {
            lastMsg.isRead = true
            lastMsg.isDelivered = true
            lastMsg.status = 'read'
          }

          console.log(`✅ Updated conversation preview status for ${conversationId}`)
        }

        // Trigger immediate UI update
        this.triggerUpdate()

      } catch (error) {
        console.error('❌ Error applying immediate message status update:', error)
      }
    },

    // Legacy method for compatibility - now calls immediate version
    handleMessageStatusUpdate(data) {
      this.handleMessageStatusUpdateImmediate(data)
    },

    handleConversationStatusUpdate(data) {
      try {
        const { conversationId, status, count, updatedBy } = data
        console.log(`💬 STORE: Processing conversation status update:`, {
          conversationId,
          status,
          count,
          updatedBy
        })

        const conversation = this.conversations.find(c => c.id === conversationId)
        if (!conversation) {
          console.warn(`⚠️ Conversation ${conversationId} not found for status update`)
          return
        }

        if (status === 'read') {
          const currentUnread = conversation.unreadCount || 0
          const messagesToReduce = count || 1
          const newUnreadCount = Math.max(0, currentUnread - messagesToReduce)

          console.log(`📖 Reducing unread count for ${conversationId}: ${currentUnread} → ${newUnreadCount}`)

          this.updateUnreadCount(conversationId, newUnreadCount, 'conversation_status_update')

          const messages = this.messages[conversationId]
          if (messages) {
            let markedCount = 0
            for (let i = messages.length - 1; i >= 0 && markedCount < messagesToReduce; i--) {
              const message = messages[i]
              if (message.senderId !== updatedBy && !message.isRead) {
                message.isRead = true
                message.isDelivered = true
                message.status = this.getMessageStatus(message, updatedBy)
                markedCount++
              }
            }

            console.log(`✅ Marked ${markedCount} messages as read in conversation ${conversationId}`)
          }
        }

        this.triggerUpdate('unread')

        console.log(`✅ Handled conversation status update: ${conversationId} → ${status}`)

      } catch (error) {
        console.error('❌ Error handling conversation status update:', error)
      }
    },

    // 🔥 FIXED: Immediate status updates in sendMessage
    async sendMessage(content, mediaUrls = [], messageType = 'text') {
      if (!this.currentConversation || (!content.trim() && mediaUrls.length === 0)) {
        return { success: false, error: 'Invalid message content' }
      }

      this.sendingMessage = true
      this.error = null

      const conversationId = this.currentConversation.id
      const authStore = useAuthStore()

      // Create optimistic message
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const optimisticMessage = {
        id: tempId,
        content: content.trim(),
        mediaUrls,
        messageType,
        senderId: authStore.currentUser.id,
        sender: authStore.currentUser,
        conversationId,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
        status: 'sending',
        isRead: false,
        isDelivered: false,
        isEdited: false,
        isOptimistic: true,
        tempId: tempId
      }

      // Add optimistic message
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = []
      }
      this.messages[conversationId].push(optimisticMessage)

      this.updateConversationWithMessage(
        this.currentConversation,
        optimisticMessage,
        authStore.currentUser.id
      )

      this.triggerUpdate()

      try {
        const response = await messagesAPI.sendMessage(conversationId, {
          content: content.trim(),
          mediaUrls,
          messageType
        })

        const realMessage = response.data.message

        // 🔥 FIXED: Immediate replacement without debouncing
        const messages = this.messages[conversationId]
        const tempIndex = messages.findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          console.log(`🔄 Replacing optimistic message ${tempId} with real message ${realMessage.id}`)
          messages[tempIndex] = {
            ...realMessage,
            timestamp: new Date(realMessage.createdAt),
            status: 'sent', // Start with "sent" status
            isDelivered: false, // Will be updated via socket
            isRead: false, // Will be updated via socket
            isOptimistic: false,
            realMessageId: realMessage.id
          }
        }

        const updatedMessage = messages[tempIndex]
        this.updateConversationWithMessage(
          this.currentConversation,
          updatedMessage,
          authStore.currentUser.id
        )

        // Immediate UI update
        this.triggerUpdate()

        console.log('✅ Message sent successfully:', realMessage.id)
        return { success: true, message: realMessage }

      } catch (error) {
        console.error('❌ Send message error:', error)

        // Mark optimistic message as failed immediately
        const messages = this.messages[conversationId]
        const tempIndex = messages.findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          messages[tempIndex].status = 'failed'
          messages[tempIndex].error = true
        }

        this.triggerUpdate()
        this.error = error.response?.data?.message || 'Failed to send message'
        return { success: false, error: this.error }
      } finally {
        this.sendingMessage = false
      }
    },

    // Select conversation
    async selectConversation(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return { success: false, error: 'Conversation not found' }

      console.log(`🎯 Selecting conversation ${conversationId}`, {
        hasMessages: !!this.messages[conversationId],
        messageCount: this.messages[conversationId]?.length || 0,
        unreadCount: conversation.unreadCount || 0
      })

      // Leave previous conversation
      if (this.currentConversation) {
        const { socketService } = await import('@/services/socket')
        socketService.leaveConversation(this.currentConversation.id)
      }

      this.currentConversationId = conversationId
      this.currentConversation = conversation

      // Join new conversation
      const { socketService } = await import('@/services/socket')
      socketService.joinConversation(conversationId)

      let messagesLoaded = false
      if (!this.messages[conversationId]) {
        console.log(`📨 Loading messages for conversation ${conversationId}`)
        const result = await this.fetchMessages(conversationId)
        messagesLoaded = result.success

        if (!messagesLoaded) {
          console.error(`❌ Failed to load messages for ${conversationId}`)
          return result
        }
      } else {
        messagesLoaded = true
        console.log(`📨 Messages already loaded for ${conversationId}`)
      }

      console.log(`✅ Conversation selected: ${conversationId}`)

      this.triggerUpdate()

      return { success: true, messagesLoaded }
    },

    // Fetch messages
    async fetchMessages(conversationId, page = 1) {
      const isFirstPage = page === 1

      if (!isFirstPage) {
        this.loadingMore = true
      } else {
        this.loading = true
      }

      try {
        console.log(`📨 Fetching messages for conversation ${conversationId}, page ${page}`)

        const response = await messagesAPI.getMessages(conversationId, page)
        const { messages: rawMessages, pagination } = response.data
        const authStore = useAuthStore()
        const currentUserId = authStore.currentUser?.id

        const processedMessages = rawMessages.map(message => {
          let timestamp
          try {
            timestamp = new Date(message.createdAt)
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date()
            }
          } catch (error) {
            timestamp = new Date()
          }

          return {
            ...message,
            timestamp,
            status: this.getMessageStatus(message, currentUserId)
          }
        })

        if (isFirstPage) {
          this.messages[conversationId] = processedMessages.reverse()
          console.log(`✅ Loaded ${processedMessages.length} messages for ${conversationId}`)
        } else {
          const existing = this.messages[conversationId] || []
          this.messages[conversationId] = [...processedMessages.reverse(), ...existing]
          console.log(`✅ Loaded ${processedMessages.length} more messages for ${conversationId}`)
        }

        this.hasMoreMessages[conversationId] = pagination.hasMore

        this.triggerUpdate()

        return { success: true, messages: processedMessages }
      } catch (error) {
        console.error('Fetch messages error:', error)
        this.error = error.response?.data?.message || 'Failed to load messages'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },

    // Typing handlers
    handleTypingStart(data) {
      try {
        const { conversationId, user } = data
        const authStore = useAuthStore()

        if (user?.id === authStore.currentUser?.id) return

        if (!this.typingUsers[conversationId]) {
          this.typingUsers[conversationId] = new Set()
        }

        this.typingUsers[conversationId].add(user?.id || data.userId)
        console.log(`⌨️ User ${user?.username || data.userId} started typing in ${conversationId}`)

      } catch (error) {
        console.error('❌ Error handling typing start:', error)
      }
    },

    handleTypingStop(data) {
      try {
        const { conversationId, user } = data

        if (this.typingUsers[conversationId]) {
          this.typingUsers[conversationId].delete(user?.id || data.userId)

          if (this.typingUsers[conversationId].size === 0) {
            delete this.typingUsers[conversationId]
          }
        }

        console.log(`⌨️ User ${user?.username || data.userId} stopped typing in ${conversationId}`)

      } catch (error) {
        console.error('❌ Error handling typing stop:', error)
      }
    },

    // Online status getters
    isUserOnline: (state) => (userId) => {
      if (!userId) return false
      
      const userStatus = state.userOnlineStatus.get(userId)
      return userStatus?.isOnline || false
    },

    getUserOnlineInfo: (state) => (userId) => {
      return state.userOnlineStatus.get(userId) || {
        isOnline: false,
        lastSeen: null,
        source: 'unknown'
      }
    },

    getAllOnlineUsers: (state) => {
      const onlineUsers = []
      state.userOnlineStatus.forEach((status, userId) => {
        if (status.isOnline) {
          onlineUsers.push({ userId, ...status })
        }
      })
      return onlineUsers
    },

    // Initialize online status from conversation data
    initializeOnlineStatusFromConversations() {
      console.log('🔄 Initializing online status from conversation data...')
      
      if (this.conversations.length === 0) {
        console.log('⚠️ No conversations loaded yet - skipping online status initialization')
        return
      }

      let initializedUsers = 0

      this.conversations.forEach(conversation => {
        if (!conversation.isGroup && conversation.otherParticipant) {
          const userId = conversation.otherParticipant.id
          const isOnline = conversation.otherParticipant.isOnline || false
          const lastSeen = conversation.otherParticipant.lastSeen || null

          this.userOnlineStatus.set(userId, {
            isOnline,
            lastSeen: lastSeen ? new Date(lastSeen) : null,
            source: 'conversation_data',
            updatedAt: new Date()
          })
          initializedUsers++
        }

        if (conversation.participants) {
          conversation.participants.forEach(participant => {
            if (participant.user) {
              const userId = participant.user.id
              const isOnline = participant.user.isOnline || false
              const lastSeen = participant.user.lastSeen || null

              if (!this.userOnlineStatus.has(userId)) {
                this.userOnlineStatus.set(userId, {
                  isOnline,
                  lastSeen: lastSeen ? new Date(lastSeen) : null,
                  source: 'conversation_data',
                  updatedAt: new Date()
                })
                initializedUsers++
              }
            }
          })
        }
      })

      this.onlineStatusInitialized = true
      console.log(`✅ Initialized online status for ${initializedUsers} users from conversation data`)
      
      this.triggerUpdate('online')
    },

    // Fetch conversations
    async fetchConversations() {
      this.loading = true
      this.error = null

      try {
        const response = await messagesAPI.getConversations()
        this.conversations = response.data.conversations.map(conv => ({
          ...conv,
          lastMessageTime: conv.lastMessageTime
            ? new Date(conv.lastMessageTime)
            : new Date(conv.createdAt),
          lastMessageData: conv.lastMessageData || null,
          unreadCount: conv.unreadCount || 0
        }))

        console.log(`✅ Loaded ${this.conversations.length} conversations`)

        this.initializeOnlineStatusFromConversations()

        if (!this.socketConnected) {
          await this.initializeSocket()
        }

        this.triggerUpdate('general')
        return { success: true }

      } catch (error) {
        console.error('❌ Fetch conversations error:', error)
        this.error = error.response?.data?.message || 'Failed to load conversations'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Create conversation
    createConversation: async function (participantIds, isGroup = false, name = null, avatarUrl = null) {
      this.loading = true
      this.error = null

      try {
        const response = await messagesAPI.createConversation({
          participantIds,
          isGroup,
          name,
          avatarUrl
        })

        const newConversation = response.data.conversation
        const processedConversation = {
          ...newConversation,
          lastMessageTime: newConversation.lastMessageTime
            ? new Date(newConversation.lastMessageTime)
            : new Date(newConversation.createdAt),
          lastMessageData: newConversation.lastMessageData || null,
          unreadCount: 0
        }

        this.conversations.unshift(processedConversation)
        await this.selectConversation(processedConversation.id)

        this.triggerUpdate('unread')

        return { success: true, conversation: processedConversation }
      } catch (error) {
        console.error('Create conversation error:', error)
        this.error = error.response?.data?.message || 'Failed to create conversation'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Mark conversation as read
    async markConversationAsRead(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation || conversation.unreadCount === 0) return

      try {
        await messagesAPI.markAsRead(conversationId)

        this.clearUnreadCount(conversationId, 'mark_as_read')

        const messages = this.messages[conversationId] || []
        const authStore = useAuthStore()
        const currentUserId = authStore.currentUser?.id

        messages.forEach(msg => {
          if (msg.senderId !== currentUserId) {
            msg.isRead = true
            msg.status = 'read'
          }
        })

        if (conversation.lastMessageData && conversation.lastMessageData.senderId !== currentUserId) {
          conversation.lastMessageData.isRead = true
          conversation.lastMessageData.status = 'read'
        }

        console.log(`✅ Marked conversation ${conversationId} as read`)

      } catch (error) {
        console.error('❌ Mark as read error:', error)
      }
    },

    // Auto-mark as read
    async autoMarkAsRead(conversationId) {
      const messages = this.messages[conversationId] || []
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      const unreadMessages = messages.filter(msg =>
        msg.senderId !== currentUserId &&
        !msg.isRead
      )

      if (unreadMessages.length === 0) return

      console.log(`📖 Auto-marking ${unreadMessages.length} messages as read`)

      this.clearUnreadCount(conversationId, 'auto_mark_read')

      unreadMessages.forEach(msg => {
        msg.isRead = true
        msg.status = 'read'
      })

      try {
        const messageIds = unreadMessages.map(msg => msg.id)

        messagesAPI.updateConversationMessageStatus(conversationId, 'read', messageIds).catch(error => {
          console.error('❌ Failed to mark messages as read on server:', error)
        })

        const { socketService } = await import('@/services/socket')
        if (socketService.isSocketConnected()) {
          unreadMessages.forEach(msg => {
            socketService.markMessageAsRead(msg.id, conversationId)
          })

          messagesAPI.markAsRead(conversationId).catch(error => {
            console.error('❌ Failed to mark conversation as read on server:', error)
          })
        }

        console.log(`✅ Successfully marked ${unreadMessages.length} messages as read`)

      } catch (error) {
        console.error('❌ Failed to process auto mark as read:', error)
      }
    },

    // Load more messages
    async loadMoreMessages() {
      if (!this.currentConversation || this.loadingMore || !this.hasMoreMessages[this.currentConversation.id]) {
        return
      }

      const messages = this.messages[this.currentConversation.id] || []
      const currentPage = Math.ceil(messages.length / 50) + 1

      return await this.fetchMessages(this.currentConversation.id, currentPage)
    },

    // Search functionality
    setSearchQuery(query) {
      this.searchQuery = query
      this.triggerUpdate()
    },

    setChatType(type) {
      this.selectedChatType = type
      this.currentConversation = null
      this.currentConversationId = null
      this.triggerUpdate()
    },

    // Upload media
    async uploadMessageMedia(files) {
      try {
        const formData = new FormData()
        files.forEach(file => formData.append('media', file))

        const response = await messagesAPI.uploadMedia(formData)
        return { success: true, urls: response.data.urls }
      } catch (error) {
        console.error('Upload media error:', error)
        return { success: false, error: error.response?.data?.message || 'Upload failed' }
      }
    },

    // Conversation updates
    handleConversationUpdate(conversationData) {
      try {
        console.log('💬 Handling conversation update:', conversationData.id)

        const index = this.conversations.findIndex(c => c.id === conversationData.id)
        if (index !== -1) {
          this.conversations[index] = {
            ...this.conversations[index],
            ...conversationData,
            lastMessageTime: conversationData.lastMessageTime
              ? new Date(conversationData.lastMessageTime)
              : this.conversations[index].lastMessageTime
          }

          this.triggerUpdate()
          console.log('✅ Conversation updated in list')
        }
      } catch (error) {
        console.error('❌ Error handling conversation update:', error)
      }
    },

    // Typing functionality
    startTyping(conversationId = null) {
      const targetConversation = conversationId || this.currentConversation?.id
      if (!targetConversation) return

      import('@/services/socket').then(({ socketService }) => {
        socketService.startTyping(targetConversation)
      })
    },

    stopTyping(conversationId = null) {
      const targetConversation = conversationId || this.currentConversation?.id
      if (!targetConversation) return

      import('@/services/socket').then(({ socketService }) => {
        socketService.stopTyping(targetConversation)
      })
    },

    handleTypingInput() {
      if (!this.currentConversation) return

      const conversationId = this.currentConversation.id

      this.startTyping(conversationId)

      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
      }

      this.typingTimer = setTimeout(() => {
        this.stopTyping(conversationId)
      }, 1000)
    },

    // Helper methods
    getMessageStatus(message, currentUserId) {
      if (message.senderId === currentUserId) {
        if (message.isRead) return 'read'
        if (message.isDelivered) return 'delivered'
        return 'sent'
      }
      return 'delivered'
    },

    clearCurrentConversation() {
      console.log('🧹 Clearing current conversation')

      if (this.currentConversation && socketService.isSocketConnected()) {
        socketService.leaveConversation(this.currentConversation.id)
      }

      this.currentConversation = null
      this.currentConversationId = null

      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
        this.typingTimer = null
      }

      console.log('✅ Current conversation cleared')
    },

    clearError() {
      this.error = null
    },

    isInitialized() {
      return this.conversations.length > 0 || this.loading
    },

    cleanup() {
      console.log('🧹 Cleaning up messages store...')

      if (this.socketService) {
        this.socketService.disconnect()
      }

      this.conversations = []
      this.messages = {}
      this.currentConversation = null
      this.currentConversationId = null
      this.socketConnected = false
      this.typingUsers = {}
      this.searchQuery = ''
      this.loading = false
      this.sendingMessage = false
      this.error = null
      this.hasMoreMessages = {}
      this.lastUpdate = 0
      this.unreadCountUpdateTrigger = 0

      this.onlineStatusInitialized = false
      this.lastOnlineStatusSync = 0

      this.triggerUpdate('general')

      console.log('✅ Messages store cleanup complete')
    }
  }
})