// src/stores/messages.js
import { defineStore } from 'pinia'
import { messagesAPI } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { socketService } from '@/services/socket'

// Convert database fields to status string
const getMessageStatus = (message, currentUserId) => {
  // For messages sent by current user
  if (message.senderId === currentUserId) {
    if (message.isRead) return 'read'
    if (message.isDelivered) return 'delivered'
    return 'sent'
  }
  // For received messages, they're automatically delivered when received
  return 'delivered'
}

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
    
    // Pagination
    hasMoreMessages: {},
    loadingMore: false,
    
    // Real-time
    socket: null,
    typingUsers: {},
    onlineUsers: new Set(),
    
    // UI state
    selectedChatType: 'direct', // 'direct' or 'group'
    searchQuery: '',
    newConversationModal: false,
    typingTimer: null
  }),

  getters: {
    // Filter conversations by type
    directChats: (state) => {
      return state.conversations.filter(conv => !conv.isGroup)
    },
    
    groupChats: (state) => {
      return state.conversations.filter(conv => conv.isGroup)
    },
    
    // Get current conversations based on selected type
    currentConversations: (state) => {
    const conversations = state.selectedChatType === 'direct' 
      ? state.conversations.filter(conv => !conv.isGroup)
      : state.conversations.filter(conv => conv.isGroup)
      
    // Apply search filter
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

  // Add these new getters for the counters
  directUnreadCount: (state) => {
    return state.conversations
      .filter(conv => !conv.isGroup)
      .reduce((total, conv) => total + (conv.unreadCount || 0), 0)
  },
  
  groupUnreadCount: (state) => {
    return state.conversations
      .filter(conv => conv.isGroup)
      .reduce((total, conv) => total + (conv.unreadCount || 0), 0)
  },
    
    // Get messages for current conversation
    currentMessages: (state) => {
      if (!state.currentConversation) return []
      return state.messages[state.currentConversation.id] || []
    },
    
    // Total unread count
    totalUnreadCount: (state) => {
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
    }
  },

  actions: {
    // Initialize socket connection
    initializeSocket() {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn) return

      // Import socket service dynamically to avoid circular dependency
      import('@/services/socket').then(({ socketService }) => {
        if (!socketService.connected) {
          socketService.connect()
        }
      })
    },

    // Enhanced fetchConversations to include proper lastMessageData
async fetchConversations() {
  this.loading = true
  this.error = null
  
  try {
    const response = await messagesAPI.getConversations()
    
    // Process conversations to ensure proper structure
    this.conversations = response.data.conversations.map(conv => ({
      ...conv,
      lastMessageTime: conv.lastMessageTime ? new Date(conv.lastMessageTime) : new Date(conv.lastActivity),
      lastMessageData: conv.lastMessageData || null
    }))
    
    // Sort by last activity
    this.conversations = sortConversationsByActivity(this.conversations)
    
    return { success: true }
  } catch (error) {
    console.error('Fetch conversations error:', error)
    this.error = error.response?.data?.message || 'Failed to load conversations'
    return { success: false, error: this.error }
  } finally {
    this.loading = false
  }
},

    // Fetch messages with proper status conversion
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
    
    // Process messages and add proper status
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
        status: getMessageStatus(message, currentUserId) // Convert DB fields to status
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


    // Select conversation
    async selectConversation(conversationId) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (!conversation) return { success: false, error: 'Conversation not found' }
      
      // Leave previous conversation
  if (this.currentConversation) {
    socketService.leaveConversation(this.currentConversation.id)
  }
      
      this.currentConversation = conversation
      
      // Join new conversation
  socketService.joinConversation(conversationId)
      
      // Mark conversation as read
      this.markConversationAsRead(conversationId)
      
      // Fetch messages if not already loaded
      if (!this.messages[conversationId]) {
        return await this.fetchMessages(conversationId)
      }
      
      return { success: true }
    },

    // Enhanced sendMessage with optimistic conversation preview updates
async sendMessage(content, mediaUrls = [], messageType = 'text') {
  if (!this.currentConversation || (!content.trim() && mediaUrls.length === 0)) {
    return { success: false, error: 'Invalid message content' }
  }
  
  this.sendingMessage = true
  this.error = null
  
  const conversationId = this.currentConversation.id
  const authStore = useAuthStore()
  
  // Create optimistic message for UI
  const tempId = `temp_${Date.now()}_${Math.random()}`
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
    isEdited: false
  }
  
  // Add optimistic message to chat
  if (!this.messages[conversationId]) {
    this.messages[conversationId] = []
  }
  this.messages[conversationId].push(optimisticMessage)
  
  // Optimistically update conversation preview
  this.updateConversationPreview(conversationId, optimisticMessage)
  
  try {
    const response = await messagesAPI.sendMessage(conversationId, {
      content: content.trim(),
      mediaUrls,
      messageType
    })
    
    const realMessage = response.data.message
    
    // Replace optimistic message with real message
    const messages = this.messages[conversationId]
    const tempIndex = messages.findIndex(m => m.id === tempId)
    if (tempIndex !== -1) {
      messages[tempIndex] = {
        ...realMessage,
        timestamp: new Date(realMessage.createdAt),
        status: 'sent' // Mark as sent after successful API call
      }
    }
    
    // Update conversation preview with real message data
    const realMessageWithStatus = {
      ...realMessage,
      status: 'sent'
    }
    this.updateConversationPreview(conversationId, realMessageWithStatus)
    
    return { success: true, message: realMessage }
  } catch (error) {
    console.error('Send message error:', error)
    
    // Mark optimistic message as failed
    const messages = this.messages[conversationId]
    const tempIndex = messages.findIndex(m => m.id === tempId)
    if (tempIndex !== -1) {
      messages[tempIndex].status = 'failed'
      
      // Update conversation preview to show failed status
      const failedMessage = {
        ...optimisticMessage,
        status: 'failed'
      }
      this.updateConversationPreview(conversationId, failedMessage)
    }
    
    this.error = error.response?.data?.message || 'Failed to send message'
    return { success: false, error: this.error }
  } finally {
    this.sendingMessage = false
  }
},

// Enhanced updateMessageStatus that also updates conversation preview
updateMessageStatus(messageId, conversationId, status) {
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
      
      console.log(`Message ${messageId} status updated to: ${status}`)
    }
  }
},

    // Create new conversation
    // Update the createConversation method to handle server errors better
async createConversation(participantIds, isGroup = false, name = null, avatarUrl = null) {
  this.loading = true
  this.error = null
  
  try {
    console.log('Creating conversation with payload:', {
      participantIds,
      isGroup,
      name,
      avatarUrl
    })
    
    const response = await messagesAPI.createConversation({
      participantIds,
      isGroup,
      name,
      avatarUrl
    })
    
    const newConversation = response.data.conversation
    
    // Process the conversation to ensure proper structure
    const processedConversation = {
      ...newConversation,
      lastMessageTime: newConversation.lastMessageTime 
        ? new Date(newConversation.lastMessageTime) 
        : new Date(newConversation.createdAt),
      lastMessageData: newConversation.lastMessageData || null
    }
    
    console.log('Processed new conversation:', processedConversation)
    
    // Add to conversations list
    this.conversations.unshift(processedConversation)
    
    // Auto-select the new conversation
    await this.selectConversation(processedConversation.id)
    
    return { success: true, conversation: processedConversation }
  } catch (error) {
    console.error('Create conversation error:', error)
    
    let errorMessage = 'Failed to create conversation'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error occurred. Please try again.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    this.error = errorMessage
    return { success: false, error: errorMessage }
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

    // Real-time event handlers (called by socket)
    handleNewMessage(message) {
  const conversationId = message.conversationId
  const authStore = useAuthStore()
  const currentUserId = authStore.currentUser?.id
  
  // Don't skip own messages anymore - we need them for conversation preview
  // But handle them differently to prevent duplicates in message list
  
  // Simple ID-based duplicate check for all messages
  const existingMessages = this.messages[conversationId] || []
  const messageExists = existingMessages.some(m => m.id === message.id)
  
  // Only add to message list if it's not from current user or doesn't exist
  if (!messageExists && message.senderId !== currentUserId) {
    console.log('Socket: Adding new message from other user', message.id)
    
    if (!this.messages[conversationId]) {
      this.messages[conversationId] = []
    }
    
    // Safe date parsing
    let timestamp
    try {
      timestamp = new Date(message.createdAt)
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid date received:', message.createdAt)
        timestamp = new Date()
      }
    } catch (error) {
      console.error('Error parsing date:', message.createdAt, error)
      timestamp = new Date()
    }
    
    this.messages[conversationId].push({
      ...message,
      timestamp,
      status: 'delivered' // Incoming messages are automatically delivered
    })
  }
  
  // Always update conversation preview for all messages (including own messages from other devices)
  this.updateConversationPreview(conversationId, message)
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
  
  // Update conversation data
  const updatedConversation = {
    ...conversation,
    lastMessage: message.content || '',
    lastActivity: message.createdAt || new Date().toISOString(),
    lastMessageTime: timestamp,
    lastMessageData: createMessagePreviewData(message)
  }
  
  // Handle unread count
  if (message.senderId !== currentUserId) {
    // Increment unread count if not current conversation
    if (this.currentConversation?.id !== conversationId) {
      updatedConversation.unreadCount = (conversation.unreadCount || 0) + 1
    }
  }
  
  // Update the conversation
  this.conversations[convIndex] = updatedConversation
  
  // Re-sort conversations by activity
  this.conversations = sortConversationsByActivity(this.conversations)
  
  console.log('Updated conversation preview for:', conversationId)
},

handleMessageStatusUpdate(data) {
  const { messageId, conversationId, status } = data
  this.updateMessageStatus(messageId, conversationId, status)
},


    handleTypingStart(data) {
      const { conversationId, user } = data
      if (!this.typingUsers[conversationId]) {
        this.typingUsers[conversationId] = []
      }
      
      if (!this.typingUsers[conversationId].find(u => u.id === user.id)) {
        this.typingUsers[conversationId].push(user)
      }
    },

    handleTypingStop(data) {
      const { conversationId, userId } = data
      if (this.typingUsers[conversationId]) {
        this.typingUsers[conversationId] = this.typingUsers[conversationId].filter(u => u.id !== userId)
      }
    },

    handleUserOnline(userId) {
      this.onlineUsers.add(userId)
    },

    handleUserOffline(userId) {
      this.onlineUsers.delete(userId)
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

// Auto-mark messages as read with database persistence
async autoMarkAsRead(conversationId) {
  const messages = this.messages[conversationId] || []
  const authStore = useAuthStore()
  const currentUserId = authStore.currentUser?.id
  
  // Find unread messages from other users
  const unreadMessages = messages.filter(msg => 
    msg.senderId !== currentUserId && 
    !msg.isRead
  )
  
  if (unreadMessages.length > 0) {
    const messageIds = unreadMessages.map(msg => msg.id)
    
    // Mark as read locally first
    unreadMessages.forEach(msg => {
      msg.isRead = true
      msg.status = 'read'
    })
    
    // Persist to database
    try {
      await messagesAPI.updateConversationMessageStatus(conversationId, 'read', messageIds)
      console.log(`Marked ${unreadMessages.length} messages as read in database`)
      
      // Emit socket events for real-time updates
      const socketService = await import('@/services/socket')
      unreadMessages.forEach(msg => {
        socketService.default.markMessageAsRead(msg.id, conversationId)
      })
      
      // Also mark conversation as read
      await this.markConversationAsRead(conversationId)
    } catch (error) {
      console.error('Failed to mark messages as read in database:', error)
      // Revert local state
      unreadMessages.forEach(msg => {
        msg.isRead = false
        msg.status = 'delivered'
      })
    }
  }
},

    // Clear error
    clearError() {
      this.error = null
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
  this.typingUsers = {}
  this.searchQuery = ''
  this.loading = false
  this.sendingMessage = false
  this.error = null
  this.hasMoreMessages = {}
  
  console.log('Messages store cleanup complete')
},

// Add a method to check if already initialized
isInitialized() {
  return this.conversations.length > 0 || this.loading
}
  }
})