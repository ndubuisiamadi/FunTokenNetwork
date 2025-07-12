// src/stores/messages.js
import { defineStore } from 'pinia'
import { messagesAPI } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

// Convert database fields to status string
// const getMessageStatus = (message, currentUserId) => {
//   // For messages sent by current user
//   if (message.senderId === currentUserId) {
//     if (message.isRead) return 'read'
//     if (message.isDelivered) return 'delivered'
//     return 'sent'
//   }
//   // For received messages, they're automatically delivered when received
//   return 'delivered'
// }

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

const clearCurrentConversation = () => {
  currentConversation.value = null
}

// Export it
export { clearCurrentConversation }

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
    lastUpdate: 0,
    socketConnected: false
  }),

  getters: {
    directChats: (state) => {
      const _ = state.lastUpdate // Force reactivity
      return state.conversations.filter(conv => !conv.isGroup)
    },

    groupChats: (state) => {
      const _ = state.lastUpdate // Force reactivity
      return state.conversations.filter(conv => conv.isGroup)
    },

    currentConversations: (state) => {
      const _ = state.lastUpdate // Force reactivity
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

    directUnreadCount: (state) => {
      const _ = state.lastUpdate // Force reactivity
      return state.conversations
        .filter(conv => !conv.isGroup)
        .reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    },

    groupUnreadCount: (state) => {
      const _ = state.lastUpdate // Force reactivity
      return state.conversations
        .filter(conv => conv.isGroup)
        .reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    },

    currentMessages: (state) => {
      if (!state.currentConversation) return []
      return state.messages[state.currentConversation.id] || []
    },

    totalUnreadCount: (state) => {
      const _ = state.lastUpdate // Force reactivity
      return state.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
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

    // Total unread count across all conversations
    totalUnreadCount: (state) => {
      return state.conversations.reduce((total, conversation) => {
        return total + (conversation.unreadCount || 0)
      }, 0)
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
      return state.conversations.filter(conv => (conv.unreadCount || 0) > 0)
    }
  },

  actions: {
    // CRITICAL: Force reactivity trigger
    triggerUpdate() {
      this.lastUpdate = Date.now()
      console.log('🔄 Triggered reactivity update:', this.lastUpdate)
    },

    // Initialize socket connection when store loads
    async initializeSocket() {
      try {
        const { socketService } = await import('@/services/socket')
        const connected = await socketService.connect()

        if (connected) {
          console.log('✅ Messages Store: Socket initialized successfully')
          this.socketConnected = true
          
          // CRITICAL: Set up event listeners immediately
          this.setupSocketListeners(socketService)
          
          // Join all existing conversations
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

    // NEW: Setup socket event listeners
    setupSocketListeners(socketService) {
      if (!socketService.socket) {
        console.error('❌ No socket available for event listeners')
        return
      }

      console.log('🔧 Setting up socket event listeners in messages store')

      // Listen for new messages - MOST CRITICAL
      socketService.socket.on('message:new', (messageData) => {
        console.log('📨 SOCKET EVENT: New message received in store:', messageData)
        this.handleIncomingMessage(messageData)
      })

      // Listen for message status updates
      socketService.socket.on('message:status_updated', (data) => {
        console.log('📱 SOCKET EVENT: Message status update:', data)
        this.handleMessageStatusUpdate(data)
      })

      // Listen for conversation updates
      socketService.socket.on('conversation:updated', (data) => {
        console.log('💬 SOCKET EVENT: Conversation update:', data)
        this.handleConversationUpdate(data)
      })

      console.log('✅ Socket event listeners set up in messages store')
    },

    // COMPLETELY REWRITTEN: Handle incoming messages for real-time updates
    handleIncomingMessage(messageData) {
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

        // Find or create conversation in list
        let conversation = this.conversations.find(c => c.id === conversationId)
        
        if (!conversation) {
          console.warn('⚠️ Conversation not found, will refresh conversations')
          // Refresh conversations to get the new one
          this.fetchConversations()
          return
        }

        // CRITICAL: Update conversation preview and move to top
        this.updateConversationWithMessage(conversation, messageData, currentUserId)

        // Add message to conversation messages if loaded
        if (this.messages[conversationId]) {
          this.addMessageToConversation(conversationId, messageData, currentUserId)
        }

        // CRITICAL: Trigger reactivity
        this.triggerUpdate()

        console.log('✅ Successfully processed incoming message')

      } catch (error) {
        console.error('❌ Error handling incoming message:', error)
      }
    },

    // NEW: Update conversation with new message
    updateConversationWithMessage(conversation, messageData, currentUserId) {
      const isFromOtherUser = messageData.senderId !== currentUserId

      // Update conversation preview
      let previewContent = ''
      if (messageData.mediaUrls && messageData.mediaUrls.length > 0) {
        previewContent = messageData.content ? messageData.content.trim() : '📎 Media'
      } else {
        previewContent = messageData.content || ''
      }

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
        status: 'delivered',
        isRead: false,
        isDelivered: true
      }

      // Update unread count for messages from others
      if (isFromOtherUser) {
        if (!this.currentConversation || this.currentConversation.id !== conversation.id) {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1
          console.log(`📈 Updated unread count for ${conversation.id}: ${conversation.unreadCount}`)
        }
      }

      // Move conversation to top
      const currentIndex = this.conversations.findIndex(c => c.id === conversation.id)
      if (currentIndex > 0) {
        // Remove from current position and add to top
        this.conversations.splice(currentIndex, 1)
        this.conversations.unshift(conversation)
        console.log(`🔝 Moved conversation ${conversation.id} to top`)
      } else if (currentIndex === 0) {
        // Already at top, just ensure reactivity
        this.conversations[0] = { ...conversation }
      }
    },

    // NEW: Add message to conversation messages
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

    // ENHANCED: Send message with optimistic updates
    async sendMessage(content, mediaUrls = [], messageType = 'text') {
      if (!this.currentConversation || (!content.trim() && mediaUrls.length === 0)) {
        return { success: false, error: 'Invalid message content' }
      }
      
      this.sendingMessage = true
      this.error = null
      
      const conversationId = this.currentConversation.id
      const authStore = useAuthStore()
      
      // Create optimistic message with specific markers
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
        tempId: tempId // Track temp ID for replacement
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
        
        // CRITICAL: Replace optimistic message with real message
        const messages = this.messages[conversationId]
        const tempIndex = messages.findIndex(m => m.tempId === tempId)
        if (tempIndex !== -1) {
          console.log(`🔄 Replacing optimistic message ${tempId} with real message ${realMessage.id}`)
          messages[tempIndex] = {
            ...realMessage,
            timestamp: new Date(realMessage.createdAt),
            status: 'sent',
            isOptimistic: false,
            realMessageId: realMessage.id // Mark as real message
          }
        } else {
          console.warn('⚠️ Could not find optimistic message to replace')
        }
        
        // Update conversation preview
        this.updateConversationWithMessage(
          this.currentConversation,
          realMessage,
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

    // ENHANCED: Fetch conversations with socket setup
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
          lastMessageData: conv.lastMessageData || null
        }))
        
        console.log(`✅ Loaded ${this.conversations.length} conversations`)
        
        // Initialize socket if not already done
        if (!this.socketConnected) {
          await this.initializeSocket()
        }
        
        this.triggerUpdate()
        return { success: true }
        
      } catch (error) {
        console.error('❌ Fetch conversations error:', error)
        this.error = error.response?.data?.message || 'Failed to load conversations'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Enhanced message status update
    handleMessageStatusUpdate(data) {
      try {
        const { messageId, conversationId, status } = data
        
        // Update in messages if loaded
        const messages = this.messages[conversationId]
        if (messages) {
          const message = messages.find(m => m.id === messageId)
          if (message) {
            message.status = status
            if (status === 'delivered') {
              message.isDelivered = true
            } else if (status === 'read') {
              message.isRead = true
              message.isDelivered = true
            }
          }
        }
        
        // Update conversation preview
        const conversation = this.conversations.find(c => c.id === conversationId)
        if (conversation && conversation.lastMessageData?.id === messageId) {
          conversation.lastMessageData.status = status
          if (status === 'delivered') {
            conversation.lastMessageData.isDelivered = true
          } else if (status === 'read') {
            conversation.lastMessageData.isRead = true
            conversation.lastMessageData.isDelivered = true
          }
        }
        
        this.triggerUpdate()
      } catch (error) {
        console.error('❌ Error handling message status update:', error)
      }
    },

    // Select conversation
    async selectConversation(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return { success: false, error: 'Conversation not found' }
      
      // Leave previous conversation
      if (this.currentConversation) {
        const { socketService } = await import('@/services/socket')
        socketService.leaveConversation(this.currentConversation.id)
      }
      
      this.currentConversation = conversation
      
      // Join new conversation
      const { socketService } = await import('@/services/socket')
      socketService.joinConversation(conversationId)
      
      // Clear unread count
      if (conversation.unreadCount > 0) {
        conversation.unreadCount = 0
        this.triggerUpdate()
      }
      
      // Fetch messages if not loaded
      if (!this.messages[conversationId]) {
        return await this.fetchMessages(conversationId)
      }
      
      return { success: true }
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
        } else {
          const existing = this.messages[conversationId] || []
          this.messages[conversationId] = [...processedMessages.reverse(), ...existing]
        }

        this.hasMoreMessages[conversationId] = pagination.hasMore

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

    // NEW: Enhanced socket event handlers
    setupSocketEventHandlers(socketService) {
      // Listen for new messages that affect conversation list
      socketService.socket?.on('message:new', (messageData) => {
        this.handleNewMessage(messageData)
      })

      // Listen for conversation updates
      socketService.socket?.on('conversation:updated', (conversationData) => {
        this.handleConversationUpdate(conversationData)
      })

      // Listen for message status updates that affect conversation previews
      socketService.socket?.on('message:status_updated', (data) => {
        this.handleMessageStatusUpdate(data)
      })

      console.log('✅ Enhanced socket event handlers set up')
    },

    handleNewMessage(messageData) {
      try {
        console.log('📨 Handling new message for conversation list:', messageData)
        
        const conversationId = messageData.conversationId
        const authStore = useAuthStore()
        const currentUserId = authStore.currentUser?.id
        
        if (!this.conversations) {
          this.conversations = []
        }
        
        let conversation = this.conversations.find(c => c.id === conversationId)
        if (!conversation) {
          console.warn('⚠️ Conversation not found, fetching conversations...')
          this.fetchConversations()
          return
        }

        console.log('🔄 Updating conversation preview and order')
        
        // Store original position
        const originalIndex = this.conversations.findIndex(c => c.id === conversationId)
        
        // Handle message in conversation messages if conversation is loaded
        if (this.messages[conversationId]) {
          const messages = this.messages[conversationId]
          
          // Check for duplicates
          const isDuplicate = messages.some(m => m.id === messageData.id)
          
          if (!isDuplicate) {
            if (messageData.senderId === currentUserId) {
              // Handle own message (from another device)
              const optimisticIndex = messages.findIndex(m => 
                m.isOptimistic && 
                m.content === messageData.content &&
                m.senderId === currentUserId
              )
              
              if (optimisticIndex !== -1) {
                messages[optimisticIndex] = {
                  ...messageData,
                  timestamp: new Date(messageData.createdAt),
                  status: 'sent',
                  isOptimistic: false
                }
              } else {
                messages.push({
                  ...messageData,
                  timestamp: new Date(messageData.createdAt),
                  status: 'sent',
                  isOptimistic: false
                })
              }
            } else {
              // Message from other user
              const processedMessage = {
                ...messageData,
                timestamp: new Date(messageData.createdAt),
                status: 'delivered',
                isDelivered: true,
                isOptimistic: false
              }
              
              messages.push(processedMessage)
              
              // Mark as delivered
              import('@/services/socket').then(({ socketService }) => {
                socketService.markMessageAsDelivered(messageData.id, conversationId)
              }).catch(console.error)
            }
            
            // Sort messages
            messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          }
        }

        // UPDATE CONVERSATION PREVIEW AND ORDER
        this.updateConversationPreview(conversationId, messageData)
        
        // Handle unread count for messages from others
        if (messageData.senderId !== currentUserId) {
          if (this.currentConversation?.id !== conversationId) {
            // Increment unread count if not in this conversation
            conversation.unreadCount = (conversation.unreadCount || 0) + 1
            console.log(`📈 Incremented unread count for ${conversationId}: ${conversation.unreadCount}`)
          }
        }

        // FORCE MOVE CONVERSATION TO TOP
        if (originalIndex > 0) {
          // Remove from current position
          const [updatedConv] = this.conversations.splice(originalIndex, 1)
          // Add to top
          this.conversations.unshift(updatedConv)
          console.log(`🔝 Moved conversation ${conversationId} to top`)
        } else if (originalIndex === 0) {
          // Already at top, just update the reference to trigger reactivity
          this.conversations[0] = { ...conversation }
        }

        // TRIGGER REACTIVITY
        this.lastConversationUpdate = Date.now()
        
        console.log('✅ Conversation list updated with new message')
        
      } catch (error) {
        console.error('❌ Error handling new message for conversation list:', error)
      }
    },

    // Enhanced message status update handling
    updateMessageStatus(messageId, conversationId, status) {
      console.log(`🔄 Updating message ${messageId} to ${status}`)
      
      // Update message in chat
      const messages = this.messages[conversationId]
      if (messages) {
        const message = messages.find(m => m.id === messageId)
        if (message) {
          message.status = status
          
          if (status === 'delivered') {
            message.isDelivered = true
          } else if (status === 'read') {
            message.isRead = true
            message.isDelivered = true
          }
          
          console.log(`✅ Message ${messageId} status updated to: ${status}`)
        }
      }
      
      // Update conversation preview if this is the last message
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation && conversation.lastMessageData?.id === messageId) {
        conversation.lastMessageData.status = status
        if (status === 'delivered') {
          conversation.lastMessageData.isDelivered = true
        } else if (status === 'read') {
          conversation.lastMessageData.isRead = true
          conversation.lastMessageData.isDelivered = true
        }
      }
    },

    // NEW: Clear unread count for conversation
    clearUnreadCount(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation && conversation.unreadCount > 0) {
        conversation.unreadCount = 0
        console.log(`🧹 Cleared unread count for ${conversationId}`)
      }
    },

    // 🔥 NEW: Refresh unread counts from server (fallback)
    async refreshUnreadCounts() {
      try {
        // Get fresh conversation data with unread counts
        const response = await messagesAPI.getConversations()
        const freshConversations = response.data.conversations
        
        // Update unread counts in existing conversations
        freshConversations.forEach(freshConv => {
          const existingConv = this.conversations.find(c => c.id === freshConv.id)
          if (existingConv) {
            existingConv.unreadCount = freshConv.unreadCount || 0
          }
        })
        
        console.log('✅ Unread counts refreshed from server')
      } catch (error) {
        console.error('❌ Failed to refresh unread counts:', error)
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

    // Enhanced user status handlers
    handleUserOnline(userId) {
      try {
        this.onlineUsers.add(userId)
        
        // Update conversation participant status
        this.conversations.forEach(conversation => {
          if (conversation.participants) {
            const participant = conversation.participants.find(p => p.userId === userId)
            if (participant) {
              participant.user.isOnline = true
            }
          }
        })
        
        console.log(`🟢 User ${userId} is now online`)
        
      } catch (error) {
        console.error('❌ Error handling user online:', error)
      }
    },

    handleUserOffline(userId) {
      try {
        this.onlineUsers.delete(userId)
        
        // Update conversation participant status
        this.conversations.forEach(conversation => {
          if (conversation.participants) {
            const participant = conversation.participants.find(p => p.userId === userId)
            if (participant) {
              participant.user.isOnline = false
            }
          }
        })
        
        console.log(`🔴 User ${userId} went offline`)
        
      } catch (error) {
        console.error('❌ Error handling user offline:', error)
      }
    },

    // Create new conversation
    createConversation: async function(participantIds, isGroup = false, name = null, avatarUrl = null) {
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
          lastMessageData: newConversation.lastMessageData || null
        }

        this.conversations.unshift(processedConversation)
        await this.selectConversation(processedConversation.id)
        
        this.triggerUpdate()

        return { success: true, conversation: processedConversation }
      } catch (error) {
        console.error('Create conversation error:', error)
        this.error = error.response?.data?.message || 'Failed to create conversation'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    // Enhanced markConversationAsRead that updates conversation preview
    async markConversationAsRead(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation || conversation.unreadCount === 0) return

      try {
        await messagesAPI.markAsRead(conversationId)

        // Update local state
        conversation.unreadCount = 0

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

      } catch (error) {
        console.error('Mark as read error:', error)
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
    },

    // Switch chat type
    setChatType(type) {
      this.selectedChatType = type
      this.currentConversation = null
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

    updateConversationPreview(conversationId, message) {
      const convIndex = this.conversations.findIndex(c => c.id === conversationId)
      if (convIndex === -1) return

      const conversation = this.conversations[convIndex]
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      // Create timestamp
      let timestamp
      try {
        timestamp = new Date(message.createdAt || new Date())
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date()
        }
      } catch (error) {
        timestamp = new Date()
      }

      // Create preview content
      let previewContent = ''
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        if (message.content && message.content.trim()) {
          previewContent = message.content.trim()
        } else {
          previewContent = '📎 Media'
        }
      } else {
        previewContent = message.content || ''
      }

      // Update conversation data
      const updatedConversation = {
        ...conversation,
        lastMessage: previewContent,
        lastActivity: message.createdAt || new Date().toISOString(),
        lastMessageTime: timestamp,
        lastMessageData: {
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

      // Update the conversation in place
      this.conversations[convIndex] = updatedConversation

      // TRIGGER REACTIVITY
      this.lastConversationUpdate = Date.now()

      console.log('✅ Updated conversation preview for:', conversationId)
    },

    // NEW: Handle conversation updates from socket
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
          
          // TRIGGER REACTIVITY
          this.lastConversationUpdate = Date.now()
          
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

    // Update message status with database persistence
    async updateMessageStatus(messageId, conversationId, status) {
      const messages = this.messages[conversationId]
      if (!messages) return

      const message = messages.find(m => m.id === messageId)
      if (!message) return

      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      // Don't update own messages via this method
      if (message.senderId === currentUserId) return

      // Update local state immediately
      message.status = status
      Object.assign(message, statusToDbFields(status))

      // Persist to database
      try {
        await messagesAPI.updateMessageStatus(messageId, status)
        console.log(`Message ${messageId} status updated to ${status} in database`)
      } catch (error) {
        console.error('Failed to update message status in database:', error)
        // Revert local state on error
        message.status = getMessageStatus(message, currentUserId)
      }
    },

    // Set message status when sending
    setMessageStatus(messageId, conversationId, status) {
      const messages = this.messages[conversationId]
      if (messages) {
        const message = messages.find(m => m.id === messageId)
        if (message) {
          message.status = status
        }
      }
    },

    // Enhanced auto-mark as read with proper API calls
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
      
      // Mark as read locally first (optimistic update)
      unreadMessages.forEach(msg => {
        msg.isRead = true
        msg.status = 'read'
      })
      
      // Update conversation unread count
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        conversation.unreadCount = 0
      }
      
      // Persist to database and emit socket events
      try {
        const messageIds = unreadMessages.map(msg => msg.id)
        
        // Bulk update in database
        await messagesAPI.updateConversationMessageStatus(conversationId, 'read', messageIds)
        
        // Emit socket events for each message
        unreadMessages.forEach(msg => {
          socketService.markMessageAsRead(msg.id, conversationId)
        })
        
        // Also mark conversation as read
        await messagesAPI.markAsRead(conversationId)
        
        console.log(`✅ Successfully marked ${unreadMessages.length} messages as read`)
        
      } catch (error) {
        console.error('❌ Failed to mark messages as read:', error)
        
        // Revert optimistic updates on error
        unreadMessages.forEach(msg => {
          msg.isRead = false
          msg.status = 'delivered'
        })
        
        if (conversation) {
          conversation.unreadCount = unreadMessages.length
        }
      }
    },

    // 🔥 NEW: Update conversation unread count
    updateConversationUnreadCount(conversationId, count) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        conversation.unreadCount = Math.max(0, count)
        console.log(`📊 Updated unread count for ${conversationId}: ${conversation.unreadCount}`)
      }
    },

    clearUnreadCount(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation && conversation.unreadCount > 0) {
        conversation.unreadCount = 0
        
        // TRIGGER REACTIVITY
        this.lastConversationUpdate = Date.now()
        
        console.log(`🧹 Cleared unread count for ${conversationId}`)
      }
    },

    incrementUnreadCount(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1
        
        // TRIGGER REACTIVITY
        this.lastConversationUpdate = Date.now()
        
        console.log(`📈 Incremented unread count for ${conversationId}: ${conversation.unreadCount}`)
      }
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

    // Utility methods
    setChatType(type) {
      this.selectedChatType = type
      this.triggerUpdate()
    },

    setSearchQuery(query) {
      this.searchQuery = query
      this.triggerUpdate()
    },

    clearError() {
      this.error = null
    },

    // Check if initialized
    isInitialized() {
      return this.conversations.length > 0 || this.loading
    },

    // Reset store
    cleanup() {
      console.log('Cleaning up messages store...')

      // Disconnect socket
      if (this.socketService) {
        this.socketService.disconnect()
      }

      // Reset state
      this.conversations = []
      this.messages = {}
      this.currentConversation = null
      this.socketConnected = false
      this.triggerUpdate()
      this.typingUsers = {}
      this.searchQuery = ''
      this.loading = false
      this.sendingMessage = false
      this.error = null
      this.hasMoreMessages = {}

      console.log('Messages store cleanup complete')
    },
  }
})