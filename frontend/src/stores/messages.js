// src/stores/messages.js - FIXED RACE CONDITION VERSION
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

// 🔥 NEW: Standardized conversation preview status
const getConversationPreviewStatus = (conversation, currentUserId) => {
  const lastMessage = conversation.lastMessageData

  if (!lastMessage || lastMessage.senderId !== currentUserId) {
    return null // Don't show status for received messages or no messages
  }

  // Use the same logic as individual messages
  return getMessageStatus(lastMessage, currentUserId)
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
    onlineUsers: new Set(),
    selectedChatType: 'direct',
    searchQuery: '',
    newConversationModal: false,
    typingTimer: null,
    lastUpdate: 0, // 🔥 ENHANCED: Reactivity trigger
    socketConnected: false,
    unreadCountUpdateTrigger: 0, // 🔥 NEW: Specific trigger for unread counts
    messageProcessingQueue: new Map(), // 🔥 NEW: Prevent duplicate processing
    currentConversationId: null, // 🔥 NEW: More reliable current conversation tracking
    onlineStatusUpdateTrigger: 0,
    userOnlineStatus: new Map(),
  }),

  getters: {
    // 🔥 ENHANCED: All getters now include online status reactivity
    directChats: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger // 🔥 NEW: Online status reactivity
      return state.conversations.filter(conv => !conv.isGroup)
    },

    groupChats: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger // 🔥 NEW: Online status reactivity
      return state.conversations.filter(conv => conv.isGroup)
    },

    currentConversations: (state) => {
      const _ = state.lastUpdate
      const __ = state.unreadCountUpdateTrigger
      const ___ = state.onlineStatusUpdateTrigger // 🔥 NEW: Online status reactivity
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

    // 🔥 NEW: Get real-time online status for a user
    getUserOnlineStatus: (state) => (userId) => {
      const _ = state.onlineStatusUpdateTrigger // Force reactivity
      return state.userOnlineStatus.get(userId) || false
    },

    // 🔥 NEW: Count of conversations with unread messages (not total messages)
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

    // 🔥 OPTIMIZED: Simplified existing getters to reduce reactivity noise
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
      const _ = state.unreadCountUpdateTrigger // Force reactivity for unread counts
      return state.conversations.filter(conv => (conv.unreadCount || 0) > 0)
    }
  },

  actions: {
    // 🔥 ENHANCED: Trigger reactivity with online status support
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

    // 🔥 NEW: Update user online status with reactivity
    updateUserOnlineStatus(userId, isOnline, source = 'unknown') {
      console.log(`👤 Updating online status for ${userId}:`, { isOnline, source })

      // Update the central online status map
      this.userOnlineStatus.set(userId, isOnline)

      // Update in onlineUsers set for compatibility
      if (isOnline) {
        this.onlineUsers.add(userId)
      } else {
        this.onlineUsers.delete(userId)
      }

      // 🔥 CRITICAL: Update all conversations that include this user
      let conversationsUpdated = 0
      this.conversations.forEach(conversation => {
        // For direct chats, check if this user is the other participant
        if (!conversation.isGroup && conversation.otherParticipant?.id === userId) {
          conversation.otherParticipant.isOnline = isOnline
          conversationsUpdated++
        }

        // For group chats, update participant status
        if (conversation.participants) {
          const participant = conversation.participants.find(p => p.userId === userId)
          if (participant && participant.user) {
            participant.user.isOnline = isOnline
            conversationsUpdated++
          }
        }
      })

      console.log(`✅ Updated online status in ${conversationsUpdated} conversations`)

      // 🔥 CRITICAL: Trigger online status reactivity
      this.triggerUpdate('online')
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

    // Initialize socket connection when store loads
    async initializeSocket() {
      try {
        const { socketService } = await import('@/services/socket')
        const connected = await socketService.connect()

        if (connected) {
          console.log('✅ Messages Store: Socket initialized successfully')
          this.socketConnected = true

          this.setupSocketListeners(socketService)

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

    setupSocketListeners(socketService) {
      if (!socketService.socket) {
        console.error('❌ No socket available for event listeners')
        return
      }

      console.log('🔧 Setting up socket event listeners in messages store')

      socketService.socket.on('message:new', (messageData) => {
        console.log('📨 SOCKET EVENT: New message received in store:', messageData)
        this.handleIncomingMessage(messageData)
      })

      socketService.socket.on('message:status_updated', (data) => {
        console.log('📱 SOCKET EVENT: Message status update:', data)
        this.handleMessageStatusUpdate(data)
      })

      socketService.socket.on('conversation:updated', (data) => {
        console.log('💬 SOCKET EVENT: Conversation update:', data)
        this.handleConversationUpdate(data)
      })

      socketService.socket.on('conversation:status_updated', (data) => {
        console.log('💬 SOCKET EVENT: Conversation status update:', data)
        this.handleConversationStatusUpdate(data)
      })

      // 🔥 ENHANCED: Online status socket events with proper handling
      socketService.socket.on('user:online', (data) => {
        console.log('🟢 SOCKET EVENT: User online:', data.userId)
        this.handleUserOnline(data.userId)
      })

      socketService.socket.on('user:offline', (data) => {
        console.log('🔴 SOCKET EVENT: User offline:', data.userId)
        this.handleUserOffline(data.userId)
      })

      console.log('✅ Socket event listeners set up in messages store')
    },


    // 🔥 FIXED: Handle incoming messages with proper race condition prevention
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

        // 🔥 NEW: Prevent duplicate processing
        const messageKey = `${messageData.id}_${conversationId}`
        if (this.messageProcessingQueue.has(messageKey)) {
          console.log('🚫 Message already being processed, skipping duplicate')
          return
        }
        this.messageProcessingQueue.set(messageKey, Date.now())

        // 🔥 NEW: Clean up old entries from processing queue (prevent memory leak)
        const now = Date.now()
        for (const [key, timestamp] of this.messageProcessingQueue.entries()) {
          if (now - timestamp > 10000) { // 10 seconds
            this.messageProcessingQueue.delete(key)
          }
        }

        // Find or create conversation in list
        let conversation = this.conversations.find(c => c.id === conversationId)

        if (!conversation) {
          console.warn('⚠️ Conversation not found, will refresh conversations')
          this.fetchConversations()
          return
        }

        // 🔥 NEW: Mark message as delivered immediately since we received it
        const processedMessage = {
          ...messageData,
          isDelivered: true,
          timestamp: new Date(messageData.createdAt),
          status: 'delivered' // Received messages are always delivered
        }

        // CRITICAL: Update conversation preview and move to top
        this.updateConversationWithMessage(conversation, processedMessage, currentUserId)

        // Add message to conversation messages if loaded
        if (this.messages[conversationId]) {
          this.addMessageToConversation(conversationId, processedMessage, currentUserId)
        }

        // 🔥 FIXED: Better current conversation detection and unread handling
        const isCurrentlyViewing = this.currentConversationId === conversationId &&
          this.currentConversation?.id === conversationId

        if (!isCurrentlyViewing) {
          console.log(`📈 Incrementing unread count - not currently viewing ${conversationId}`)
          this.incrementUnreadCount(conversationId, 'incoming_message')
        } else {
          console.log(`📖 Auto-marking as read - currently viewing ${conversationId}`)
          // If currently viewing, mark as read immediately without delay
          this.autoMarkAsRead(conversationId)
        }

        // 🔥 NEW: Auto-send delivery confirmation via socket
        const { socketService } = await import('@/services/socket')
        if (socketService.isSocketConnected()) {
          socketService.markMessageAsDelivered(messageData.id, conversationId)
        }

        this.triggerUpdate('unread')

        console.log('✅ Successfully processed incoming message')

        // Clean up processing queue entry
        setTimeout(() => {
          this.messageProcessingQueue.delete(messageKey)
        }, 5000)

      } catch (error) {
        console.error('❌ Error handling incoming message:', error)
      }
    },

    // Update conversation with new message
    updateConversationWithMessage(conversation, messageData, currentUserId) {
      const isFromOtherUser = messageData.senderId !== currentUserId

      // Update conversation preview
      let previewContent = ''
      if (messageData.mediaUrls && messageData.mediaUrls.length > 0) {
        previewContent = messageData.content ? messageData.content.trim() : '📎 Media'
      } else {
        previewContent = messageData.content || ''
      }

      // 🔥 FIXED: Proper status determination for conversation preview
      const messageStatus = getMessageStatus(messageData, currentUserId)

      // Update conversation data
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

      // Move conversation to top
      const currentIndex = this.conversations.findIndex(c => c.id === conversation.id)
      if (currentIndex > 0) {
        this.conversations.splice(currentIndex, 1)
        this.conversations.unshift(conversation)
      } else if (currentIndex === 0) {
        this.conversations[0] = { ...conversation }
      }
    },

    // Add message to conversation messages
    addMessageToConversation(conversationId, messageData, currentUserId) {
      const messages = this.messages[conversationId]

      // Check for duplicates
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

      // Sort messages by timestamp
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

      console.log(`✅ Added message to conversation ${conversationId}`)
    },

    // 🔥 NEW: Handle conversation status updates from socket
    handleMessageStatusUpdate(data) {
      try {
        const { messageId, conversationId, status, updatedBy } = data
        console.log(`📱 STORE: Processing message status update:`, {
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

            // Update message status
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
          if (status === 'delivered') {
            conversation.lastMessageData.isDelivered = true
            conversation.lastMessageData.status = 'delivered'
          } else if (status === 'read') {
            conversation.lastMessageData.isRead = true
            conversation.lastMessageData.isDelivered = true
            conversation.lastMessageData.status = 'read'
          }

          console.log(`✅ Updated conversation preview status for ${conversationId}`)
        }

        // Trigger reactivity
        this.triggerUpdate()

      } catch (error) {
        console.error('❌ Error handling message status update:', error)
      }
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

        // Find the conversation
        const conversation = this.conversations.find(c => c.id === conversationId)
        if (!conversation) {
          console.warn(`⚠️ Conversation ${conversationId} not found for status update`)
          return
        }

        if (status === 'read') {
          // Messages were marked as read, reduce unread count
          const currentUnread = conversation.unreadCount || 0
          const messagesToReduce = count || 1
          const newUnreadCount = Math.max(0, currentUnread - messagesToReduce)

          console.log(`📖 Reducing unread count for ${conversationId}: ${currentUnread} → ${newUnreadCount}`)

          this.updateUnreadCount(conversationId, newUnreadCount, 'conversation_status_update')

          // Update messages in memory if they're loaded
          const messages = this.messages[conversationId]
          if (messages) {
            // Mark recent messages as read
            let markedCount = 0
            for (let i = messages.length - 1; i >= 0 && markedCount < messagesToReduce; i--) {
              const message = messages[i]
              // Only mark messages from other users that aren't already read
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

        // Trigger reactivity to update UI
        this.triggerUpdate('unread')

        console.log(`✅ Handled conversation status update: ${conversationId} → ${status}`)

      } catch (error) {
        console.error('❌ Error handling conversation status update:', error)
      }
    },

    // 🔥 ENHANCED: Send message with optimistic updates and proper unread handling
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

      // Update conversation preview optimistically
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

        // 🔥 FIXED: Replace optimistic message with proper status
        const messages = this.messages[conversationId]
        const tempIndex = messages.findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          console.log(`🔄 Replacing optimistic message ${tempId} with real message ${realMessage.id}`)
          messages[tempIndex] = {
            ...realMessage,
            timestamp: new Date(realMessage.createdAt),
            status: 'sent', // 🔥 IMPORTANT: Start with "sent" status
            isDelivered: false, // Will be updated via socket when delivered
            isRead: false, // Will be updated via socket when read
            isOptimistic: false,
            realMessageId: realMessage.id
          }
        }

        // Update conversation preview with sent status
        const updatedMessage = messages[tempIndex]
        this.updateConversationWithMessage(
          this.currentConversation,
          updatedMessage,
          authStore.currentUser.id
        )

        this.triggerUpdate()

        console.log('✅ Message sent successfully:', realMessage.id)
        return { success: true, message: realMessage }

      } catch (error) {
        console.error('❌ Send message error:', error)

        // Mark optimistic message as failed
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

    // 🔥 FIXED: Don't clear unread count immediately when selecting conversation
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

      // 🔥 NEW: Set current conversation ID first for better race condition handling
      this.currentConversationId = conversationId
      this.currentConversation = conversation

      // Join new conversation
      const { socketService } = await import('@/services/socket')
      socketService.joinConversation(conversationId)

      // 🔥 ENHANCED: Load messages BEFORE any unread count manipulation
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

      // 🔥 CRITICAL: DON'T clear unread count here
      // Let ChatArea handle the divider display and then clear unread count
      // Only mark as read after user has had time to see the unread state

      console.log(`✅ Conversation selected: ${conversationId} (unread count preserved for divider)`)

      // Trigger update to notify UI
      this.triggerUpdate()

      return { success: true, messagesLoaded }
    },

    // Enhanced fetch messages
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

        // 🔥 NEW: Trigger update to notify UI that messages are loaded
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

    // Enhanced typing handlers
    handleTypingStart(data) {
      try {
        const { conversationId, user } = data
        const authStore = useAuthStore()

        // Don't show typing for own messages
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

    // 🔥 FIXED: Handle user coming online with proper reactivity
    handleUserOnline(userId) {
      try {
        console.log(`🟢 User ${userId} came online`)
        this.updateUserOnlineStatus(userId, true, 'socket_online')
      } catch (error) {
        console.error('❌ Error handling user online:', error)
      }
    },

    // 🔥 FIXED: Handle user going offline with proper reactivity
    handleUserOffline(userId) {
      try {
        console.log(`🔴 User ${userId} went offline`)
        this.updateUserOnlineStatus(userId, false, 'socket_offline')
      } catch (error) {
        console.error('❌ Error handling user offline:', error)
      }
    },

    // 🔥 NEW: Get real-time online status for a user (used in components)
    isUserOnline(userId) {
      const _ = this.onlineStatusUpdateTrigger // Force reactivity
      return this.userOnlineStatus.get(userId) || false
    },

    // 🔥 NEW: Initialize online status from conversations
    initializeOnlineStatus() {
      console.log('🔄 Initializing online status from conversations...')

      this.conversations.forEach(conversation => {
        // Initialize direct chat participants
        if (!conversation.isGroup && conversation.otherParticipant) {
          const userId = conversation.otherParticipant.id
          const isOnline = conversation.otherParticipant.isOnline || false
          this.userOnlineStatus.set(userId, isOnline)

          if (isOnline) {
            this.onlineUsers.add(userId)
          }
        }

        // Initialize group chat participants
        if (conversation.participants) {
          conversation.participants.forEach(participant => {
            if (participant.user) {
              const userId = participant.user.id
              const isOnline = participant.user.isOnline || false
              this.userOnlineStatus.set(userId, isOnline)

              if (isOnline) {
                this.onlineUsers.add(userId)
              }
            }
          })
        }
      })

      console.log(`✅ Initialized online status for ${this.userOnlineStatus.size} users`)
      this.triggerUpdate('online')
    },

    // 🔥 ENHANCED: Fetch conversations with online status initialization
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

        // 🔥 NEW: Initialize online status from fresh data
        this.initializeOnlineStatus()

        // Initialize socket if not already done
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

    // Create new conversation
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
          unreadCount: 0 // New conversations start with 0 unread
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

    // 🔥 ENHANCED: Mark conversation as read with proper unread count handling
    async markConversationAsRead(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation || conversation.unreadCount === 0) return

      try {
        await messagesAPI.markAsRead(conversationId)

        // 🔥 ENHANCED: Update local state with proper reactivity
        this.clearUnreadCount(conversationId, 'mark_as_read')

        // Mark messages as read
        const messages = this.messages[conversationId] || []
        const authStore = useAuthStore()
        const currentUserId = authStore.currentUser?.id

        messages.forEach(msg => {
          if (msg.senderId !== currentUserId) {
            msg.isRead = true
            msg.status = 'read'
          }
        })

        // Update conversation preview status if last message was from another user
        if (conversation.lastMessageData && conversation.lastMessageData.senderId !== currentUserId) {
          conversation.lastMessageData.isRead = true
          conversation.lastMessageData.status = 'read'
        }

        console.log(`✅ Marked conversation ${conversationId} as read`)

      } catch (error) {
        console.error('❌ Mark as read error:', error)
      }
    },

    // 🔥 FIXED: Auto-mark as read without delays
    async autoMarkAsRead(conversationId) {
      const messages = this.messages[conversationId] || []
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      // Find unread messages from other users
      const unreadMessages = messages.filter(msg =>
        msg.senderId !== currentUserId &&
        !msg.isRead
      )

      if (unreadMessages.length === 0) return

      console.log(`📖 Auto-marking ${unreadMessages.length} messages as read`)

      // 🔥 FIXED: Clear unread count immediately, no delays
      this.clearUnreadCount(conversationId, 'auto_mark_read')

      // Mark as read locally first (optimistic update)
      unreadMessages.forEach(msg => {
        msg.isRead = true
        msg.status = 'read'
      })

      // Persist to database and emit socket events (async, don't wait)
      try {
        const messageIds = unreadMessages.map(msg => msg.id)

        // Bulk update in database
        messagesAPI.updateConversationMessageStatus(conversationId, 'read', messageIds).catch(error => {
          console.error('❌ Failed to mark messages as read on server:', error)
        })

        // Emit socket events for each message
        const { socketService } = await import('@/services/socket')
        if (socketService.isSocketConnected()) {
          unreadMessages.forEach(msg => {
            socketService.markMessageAsRead(msg.id, conversationId)
          })

          // Also mark conversation as read
          messagesAPI.markAsRead(conversationId).catch(error => {
            console.error('❌ Failed to mark conversation as read on server:', error)
          })
        }

        console.log(`✅ Successfully marked ${unreadMessages.length} messages as read`)

      } catch (error) {
        console.error('❌ Failed to process auto mark as read:', error)
      }
    },

    // Load more messages (pagination)
    async loadMoreMessages() {
      if (!this.currentConversation || this.loadingMore || !this.hasMoreMessages[this.currentConversation.id]) {
        return
      }

      const messages = this.messages[this.currentConversation.id] || []
      const currentPage = Math.ceil(messages.length / 50) + 1

      return await this.fetchMessages(this.currentConversation.id, currentPage)
    },

    // Search conversations
    setSearchQuery(query) {
      this.searchQuery = query
      this.triggerUpdate()
    },

    // Switch chat type
    setChatType(type) {
      this.selectedChatType = type
      this.currentConversation = null
      this.currentConversationId = null // 🔥 NEW: Also clear ID tracking
      this.triggerUpdate()
    },

    // Upload media for message
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

    // Handle conversation updates from socket
    handleConversationUpdate(conversationData) {
      try {
        console.log('💬 Handling conversation update:', conversationData.id)

        const index = this.conversations.findIndex(c => c.id === conversationData.id)
        if (index !== -1) {
          // Update existing conversation
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

    // Handle typing with debounce
    handleTypingInput() {
      if (!this.currentConversation) return

      const conversationId = this.currentConversation.id

      // Start typing
      this.startTyping(conversationId)

      // Clear existing timer
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
      }

      // Stop typing after 1 second of inactivity
      this.typingTimer = setTimeout(() => {
        this.stopTyping(conversationId)
      }, 1000)
    },

    // Helper method to get message status
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

      // Leave current conversation room if connected
      if (this.currentConversation && socketService.isSocketConnected()) {
        socketService.leaveConversation(this.currentConversation.id)
      }

      // Clear conversation state
      this.currentConversation = null
      this.currentConversationId = null

      // Clear any typing timers
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
        this.typingTimer = null
      }

      console.log('✅ Current conversation cleared')
    },

    clearError() {
      this.error = null
    },

    // Check if initialized
    isInitialized() {
      return this.conversations.length > 0 || this.loading
    },

    // 🔥 ENHANCED: Reset store with proper cleanup
    cleanup() {
      console.log('🧹 Cleaning up messages store...')

      // Disconnect socket
      if (this.socketService) {
        this.socketService.disconnect()
      }

      // Reset state
      this.conversations = []
      this.messages = {}
      this.currentConversation = null
      this.currentConversationId = null // 🔥 NEW: Also clear ID tracking
      this.socketConnected = false
      this.typingUsers = {}
      this.searchQuery = ''
      this.loading = false
      this.sendingMessage = false
      this.error = null
      this.hasMoreMessages = {}
      this.lastUpdate = 0
      this.unreadCountUpdateTrigger = 0
      this.messageProcessingQueue.clear() // 🔥 NEW: Clear processing queue

      // 🔥 NEW: Clear online status
      this.onlineStatusUpdateTrigger = 0
      this.userOnlineStatus.clear()
      this.onlineUsers.clear()

      // 🔥 CRITICAL: Trigger final reactivity update
      this.triggerUpdate('unread')

      console.log('✅ Messages store cleanup complete')
    }
  }
})