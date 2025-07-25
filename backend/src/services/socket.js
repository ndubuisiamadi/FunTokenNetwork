// backend/src/services/socket.js - ENHANCED WITH RELIABILITY FEATURES

const jwt = require('jsonwebtoken')
const prisma = require('../db')
const { 
  MESSAGE_STATUS, 
  MESSAGE_RELIABILITY_CONFIG,
  getMessageStatusForRecipient,
  autoDeliverMessages,
  batchUpdateMessageStatus,
  logStatusTransition,
  validateMessageStatus
} = require('../utils/messageStatus')

// Enhanced in-memory tracking
const userSockets = new Map()     // userId -> Set of socketIds
const messageTimeouts = new Map() // messageId -> timeoutId
const pendingMessages = new Map() // tempId -> message data

class MessagingSocketService {
  constructor(io) {
    this.io = io
    this.setupHandlers()
    this.startCleanupTimer()
  }

  setupHandlers() {
    this.io.use(this.authenticateSocket.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true }
      })

      if (!user) return next(new Error('Invalid token'))

      socket.userId = user.id
      socket.user = user
      next()
    } catch (error) {
      next(new Error('Auth failed'))
    }
  }

  async handleConnection(socket) {
    const { userId, user } = socket
    console.log(`📱 User connected: ${user.username} (${userId})`)

    // Track this connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId).add(socket.id)

    // Join user's personal room for notifications
    socket.join(`user:${userId}`)
    console.log(`👤 User ${userId} joined personal room: user:${userId}`)

    // Update database - only lastSeen, online status managed by socket tracking
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() }
    }).catch(console.error)

    // 🔥 AUTO-DELIVER MESSAGES when user comes online
    try {
      const deliveryResult = await autoDeliverMessages(prisma, userId)
      if (deliveryResult.success && deliveryResult.count > 0) {
        // Notify all conversations about the delivery updates
        deliveryResult.conversationIds?.forEach(conversationId => {
          this.io.to(`conversation:${conversationId}`).emit('messages:auto_delivered', {
            userId,
            conversationId,
            count: deliveryResult.count,
            timestamp: new Date()
          })
        })
      }
    } catch (error) {
      console.error('❌ Auto-delivery failed for user', userId, error)
    }

    // Broadcast user online status
    this.io.emit('user:online', {
      userId: userId,
      username: user.username,
      timestamp: new Date()
    })
    console.log(`📡 Broadcasted: User ${user.username} is online`)

    // Send current online users list to this user
    const onlineUserIds = Array.from(userSockets.keys())
    socket.emit('users:online_list', {
      users: onlineUserIds,
      timestamp: new Date()
    })
    console.log(`📤 Sent online users list to ${user.username}: ${onlineUserIds.length} users`)

    // Setup message handlers with reliability
    socket.on('message:send', async (data) => {
      await this.handleSendMessage(socket, data)
    })

    socket.on('message:retry', async (data) => {
      await this.handleRetryMessage(socket, data)
    })

    socket.on('conversation:mark_read', async (data) => {
      await this.handleMarkRead(socket, data)
    })

    socket.on('conversation:join', async (data) => {
      await this.handleJoinConversation(socket, data)
    })

    socket.on('conversation:leave', (data) => {
      this.handleLeaveConversation(socket, data)
    })

    socket.on('disconnect', () => {
      this.handleDisconnect(userId, socket.id)
    })
  }

  // Enhanced send message with reliability features
  async handleSendMessage(socket, { conversationId, content, mediaUrls = [], messageType = 'text', tempId }) {
    const { userId } = socket

    try {
      console.log(`📤 Socket: User ${userId} sending message to conversation ${conversationId}`)

      // Validate message data
      if (!content?.trim() && mediaUrls.length === 0) {
        socket.emit('message:error', { 
          tempId, 
          error: 'Message cannot be empty',
          code: 'EMPTY_MESSAGE'
        })
        return
      }

      // Get conversation participants
      const conversationParticipants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        include: { user: { select: { id: true, username: true } } }
      })

      if (!conversationParticipants.find(p => p.userId === userId)) {
        socket.emit('message:error', { 
          tempId, 
          error: 'Access denied to conversation',
          code: 'ACCESS_DENIED'
        })
        return
      }

      // Get next sequence number atomically
      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastSequenceNumber: { increment: 1 } },
        select: { lastSequenceNumber: true }
      })

      // Determine initial status based on recipient online status
      const recipientIds = conversationParticipants
        .filter(p => p.userId !== userId)
        .map(p => p.userId)
      
      const anyRecipientOnline = recipientIds.some(id => this.isUserOnline(id))
      const initialStatus = anyRecipientOnline ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT

      // Create message in database
      const message = await prisma.message.create({
        data: {
          content: content?.trim() || null,
          mediaUrls,
          messageType,
          senderId: userId,
          conversationId,
          sequenceNumber: conversation.lastSequenceNumber,
          status: initialStatus,
          // statusUpdatedAt: new Date()
        },
        include: {
          sender: {
            select: { id: true, username: true, firstName: true, lastName: true, avatarUrl: true }
          }
        }
      })

      logStatusTransition(message.id, 'new', initialStatus, `recipients_online: ${anyRecipientOnline}`)

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: content?.trim() || (mediaUrls.length > 0 ? '📎 Media' : ''),
          lastActivity: new Date()
        }
      })

      // Prepare message data for broadcast
      const messageData = {
        id: message.id,
        content: message.content,
        mediaUrls: message.mediaUrls,
        messageType: message.messageType,
        senderId: message.senderId,
        sender: message.sender,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        status: message.status,
        sequenceNumber: message.sequenceNumber,
        timestamp: message.createdAt
      }

      // Broadcast to conversation room
      this.io.to(`conversation:${conversationId}`).emit('message:new', messageData)

      // Send confirmation to sender
      socket.emit('message:sent_confirmation', {
        messageId: message.id,
        tempId,
        sequenceNumber: message.sequenceNumber,
        status: message.status,
        timestamp: message.createdAt
      })

      // Clear any pending timeout for this tempId
      if (tempId && messageTimeouts.has(tempId)) {
        clearTimeout(messageTimeouts.get(tempId))
        messageTimeouts.delete(tempId)
      }

      console.log(`✅ Socket: Message sent successfully with status: ${message.status}`)

    } catch (error) {
      console.error('❌ Socket: Send message error:', error)
      
      // Send detailed error to client
      socket.emit('message:error', { 
        tempId, 
        error: 'Failed to send message',
        code: 'SEND_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  // Handle message retry requests
  async handleRetryMessage(socket, { messageId, tempId, conversationId }) {
    const { userId } = socket

    try {
      console.log(`🔄 Socket: Retrying message ${messageId || tempId}`)

      // If we have pending message data, try to send it again
      if (tempId && pendingMessages.has(tempId)) {
        const messageData = pendingMessages.get(tempId)
        pendingMessages.delete(tempId)
        
        // Retry the send operation
        await this.handleSendMessage(socket, {
          ...messageData,
          tempId: `retry_${tempId}` // New temp ID for retry
        })
        return
      }

      // If message exists in DB but failed, mark it for retry
      if (messageId) {
        const message = await prisma.message.findFirst({
          where: { 
            id: messageId, 
            senderId: userId,
            status: MESSAGE_STATUS.FAILED
          }
        })

        if (message) {
          // Update status back to SENT and try delivery again
          await prisma.message.update({
            where: { id: messageId },
            data: { 
              status: MESSAGE_STATUS.SENT,
              // statusUpdatedAt: new Date()
            }
          })

          // Check if recipients are online for immediate delivery
          const participants = await prisma.conversationParticipant.findMany({
            where: { 
              conversationId: message.conversationId,
              userId: { not: userId }
            }
          })

          const anyRecipientOnline = participants.some(p => this.isUserOnline(p.userId))
          
          if (anyRecipientOnline) {
            await prisma.message.update({
              where: { id: messageId },
              data: { 
                status: MESSAGE_STATUS.DELIVERED,
                // statusUpdatedAt: new Date()
              }
            })
          }

          // Notify about status update
          this.io.to(`conversation:${conversationId}`).emit('message:status_updated', {
            messageId,
            status: anyRecipientOnline ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT,
            timestamp: new Date()
          })

          socket.emit('message:retry_success', {
            messageId,
            status: anyRecipientOnline ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT
          })
        }
      }

    } catch (error) {
      console.error('❌ Socket: Retry message error:', error)
      socket.emit('message:retry_failed', { 
        messageId: messageId || tempId,
        error: 'Retry failed'
      })
    }
  }

  // Enhanced mark as read with batch processing
  async handleMarkRead(socket, { conversationId }) {
    const { userId } = socket

    try {
      console.log(`📖 Socket: User ${userId} marking conversation ${conversationId} as read`)

      // Batch update all unread messages to READ status
      const updateResult = await batchUpdateMessageStatus(
        prisma,
        conversationId,
        userId,
        MESSAGE_STATUS.READ,
        [MESSAGE_STATUS.FAILED] // Don't mark failed messages as read
      )

      if (updateResult.success && updateResult.count > 0) {
        // Broadcast read status to conversation
        this.io.to(`conversation:${conversationId}`).emit('messages:read', {
          conversationId,
          readBy: userId,
          count: updateResult.count,
          timestamp: new Date()
        })

        // Also emit individual status updates for real-time UI
        this.io.to(`conversation:${conversationId}`).emit('message:status_updated', {
          conversationId,
          status: MESSAGE_STATUS.READ,
          readBy: userId,
          timestamp: new Date()
        })

        console.log(`📖 Socket: Marked ${updateResult.count} messages as read`)
      }

    } catch (error) {
      console.error('❌ Socket: Mark read error:', error)
    }
  }

  // Join conversation room with validation
  async handleJoinConversation(socket, { conversationId }) {
    const { userId } = socket

    try {
      // Verify user has access to this conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId }
      })

      if (!participant) {
        console.warn(`🚫 User ${userId} attempted to join unauthorized conversation ${conversationId}`)
        return
      }

      console.log(`👥 User ${userId} joining conversation: ${conversationId}`)
      socket.join(`conversation:${conversationId}`)

      // Auto-mark messages as delivered when joining if user is online
      const deliveredCount = await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: MESSAGE_STATUS.SENT
        },
        data: {
          status: MESSAGE_STATUS.DELIVERED,
          // statusUpdatedAt: new Date()
        }
      })

      if (deliveredCount.count > 0) {
        this.io.to(`conversation:${conversationId}`).emit('messages:auto_delivered', {
          conversationId,
          userId,
          count: deliveredCount.count,
          timestamp: new Date()
        })
      }

    } catch (error) {
      console.error('❌ Socket: Join conversation error:', error)
    }
  }

  // Leave conversation room
  handleLeaveConversation(socket, { conversationId }) {
    const { userId } = socket
    console.log(`👥 User ${userId} leaving conversation: ${conversationId}`)
    socket.leave(`conversation:${conversationId}`)
  }

  // Enhanced disconnect handling
  async handleDisconnect(userId, socketId) {
    console.log(`📱 User ${userId} disconnecting socket ${socketId}`)
    
    const userSocketSet = userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(socketId)
      
      // If no more connections for this user
      if (userSocketSet.size === 0) {
        userSockets.delete(userId)
        
        // Update last seen in database
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() }
        }).catch(console.error)

        // Broadcast user offline status
        this.io.emit('user:offline', {
          userId: userId,
          timestamp: new Date()
        })
        console.log(`📡 Broadcasted: User ${userId} went offline`)
      } else {
        console.log(`📱 User ${userId} still has ${userSocketSet.size} connections`)
      }
    }
  }

  // Cleanup timer for old data
  startCleanupTimer() {
    const cleanupInterval = MESSAGE_RELIABILITY_CONFIG.CLEANUP_INTERVAL

    setInterval(() => {
      try {
        // Clean up old message timeouts
        const now = Date.now()
        for (const [tempId, timeoutId] of messageTimeouts.entries()) {
          // Clean up timeouts older than 1 minute
          if (now - parseInt(tempId.split('_')[1]) > 60000) {
            clearTimeout(timeoutId)
            messageTimeouts.delete(tempId)
          }
        }

        // Clean up old pending messages
        for (const [tempId, data] of pendingMessages.entries()) {
          if (now - data.createdAt > 300000) { // 5 minutes old
            pendingMessages.delete(tempId)
          }
        }

        console.log(`🧹 Cleanup: Timeouts: ${messageTimeouts.size}, Pending: ${pendingMessages.size}`)
      } catch (error) {
        console.error('❌ Cleanup error:', error)
      }
    }, cleanupInterval)
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  // Check if user is online (single source of truth)
  isUserOnline(userId) {
    return userSockets.has(userId) && userSockets.get(userId).size > 0
  }

  // Get all online users
  getOnlineUsers() {
    return Array.from(userSockets.keys())
  }

  // Get connection stats for monitoring
  getConnectionStats() {
    const stats = {
      totalUsers: userSockets.size,
      totalConnections: 0,
      pendingMessages: pendingMessages.size,
      activeTimeouts: messageTimeouts.size,
      users: []
    }

    userSockets.forEach((sockets, userId) => {
      stats.totalConnections += sockets.size
      stats.users.push({
        userId,
        connections: sockets.size,
        socketIds: Array.from(sockets)
      })
    })

    return stats
  }

  // Force deliver messages for a conversation (admin utility)
  async forceDeliverMessages(conversationId, userId = null) {
    try {
      const whereClause = {
        conversationId,
        status: MESSAGE_STATUS.SENT
      }

      if (userId) {
        whereClause.senderId = { not: userId }
      }

      const result = await prisma.message.updateMany({
        where: whereClause,
        data: {
          status: MESSAGE_STATUS.DELIVERED,
          // statusUpdatedAt: new Date()
        }
      })

      console.log(`🔧 Force delivered ${result.count} messages in conversation ${conversationId}`)
      return result
    } catch (error) {
      console.error('❌ Force delivery failed:', error)
      throw error
    }
  }
}

module.exports = { MessagingSocketService }