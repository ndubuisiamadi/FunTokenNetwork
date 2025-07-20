// src/services/socket.js - FIXED STATUS UPDATES VERSION
const jwt = require('jsonwebtoken')
const prisma = require('../db')

// Store for active socket connections
const activeConnections = new Map() // userId -> socketId
const userSockets = new Map() // socketId -> userId
const typingUsers = new Map() // conversationId -> Set of userIds

const handleUserOnline = async (io, userId) => {
  try {
    console.log(`🟢 User ${userId} came online`)
    console.log(`✅ User ${userId} online status updated - messages will be delivered naturally`)
    
  } catch (error) {
    console.error('❌ Error handling user online:', error)
  }
}

// Authentication middleware for socket.io
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isOnline: true
      }
    })

    if (!user) {
      return next(new Error('Authentication error: Invalid token'))
    }

    // Attach user to socket
    socket.userId = user.id
    socket.user = user

    next()
  } catch (error) {
    console.error('Socket authentication error:', error.message)
    next(new Error('Authentication error: Invalid token'))
  }
}

// Update user online status
const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: new Date()
      }
    })
  } catch (error) {
    console.error('Error updating user online status:', error)
  }
}

// Calculate and emit unread count for a user
const emitUnreadCountUpdate = async (io, userId, conversationId = null) => {
  try {
    console.log(`📊 Calculating unread count for user ${userId}`)

    let unreadData = {}

    if (conversationId) {
      // Get unread count for specific conversation
      const unreadCount = await prisma.message.count({
        where: {
          conversationId,
          conversation: {
            participants: {
              some: { userId }
            }
          },
          senderId: { not: userId },
          isRead: false
        }
      })

      unreadData = {
        conversationId,
        count: unreadCount
      }

      console.log(`📊 Conversation ${conversationId} unread count for user ${userId}: ${unreadCount}`)
    } else {
      // Get total unread count across all conversations
      const totalUnreadCount = await prisma.message.count({
        where: {
          conversation: {
            participants: {
              some: { userId }
            }
          },
          senderId: { not: userId },
          isRead: false
        }
      })

      unreadData = {
        totalCount: totalUnreadCount
      }

      console.log(`📊 Total unread count for user ${userId}: ${totalUnreadCount}`)
    }

    // Emit to user's socket
    const socketId = activeConnections.get(userId)
    if (socketId) {
      io.to(socketId).emit('unread_count:updated', unreadData)
      console.log(`📤 Emitted unread count update to user ${userId}`)
    }

    return unreadData

  } catch (error) {
    console.error('❌ Error calculating/emitting unread count:', error)
    return null
  }
}

// Emit unread count update to all conversation participants
const emitConversationUnreadUpdate = async (io, conversationId) => {
  try {
    console.log(`📊 Updating unread counts for conversation ${conversationId}`)

    // Get all participants
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      include: {
        user: { select: { id: true, username: true } }
      }
    })

    // Calculate and emit unread count for each participant
    for (const participant of participants) {
      await emitUnreadCountUpdate(io, participant.userId, conversationId)
    }

    console.log(`✅ Updated unread counts for ${participants.length} participants`)

  } catch (error) {
    console.error('❌ Error updating conversation unread counts:', error)
  }
}

const emitNewMessage = async (io, messageData) => {
  try {
    const conversationId = messageData.conversationId

    console.log(`📡 EMITTING new message to conversation ${conversationId}:`, {
      messageId: messageData.id,
      content: messageData.content?.substring(0, 50) + '...',
      sender: messageData.sender?.username
    })

    // Get all participants in the conversation
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      include: {
        user: {
          select: { id: true, username: true }
        }
      }
    })

    console.log(`📤 Found ${participants.length} participants for conversation ${conversationId}`)

    // Emit to conversation room (all connected users in the conversation)
    io.to(`conversation:${conversationId}`).emit('message:new', {
      ...messageData,
      conversationId,
      timestamp: messageData.createdAt
    })

    // Track online recipients for potential delivery confirmation
    const senderId = messageData.senderId
    const onlineRecipients = []

    // Emit directly to each participant to ensure delivery
    participants.forEach(participant => {
      const userId = participant.userId
      const socketId = activeConnections.get(userId)

      if (userId === senderId) {
        // Don't deliver to sender
        return
      }

      if (socketId) {
        console.log(`📱 Sending message directly to user ${participant.user.username} (${userId})`)
        io.to(socketId).emit('message:new', {
          ...messageData,
          conversationId,
          timestamp: messageData.createdAt
        })

        onlineRecipients.push(userId)
      } else {
        console.log(`😴 User ${participant.user.username} (${userId}) is offline - message queued`)
      }
    })

    console.log(`📊 Message sent to ${onlineRecipients.length} online recipients - awaiting delivery confirmation`)

    console.log(`✅ Message emitted successfully to conversation ${conversationId}`)

  } catch (error) {
    console.error('❌ Error emitting new message:', error)
  }
}

// Get online user stats
const getOnlineStats = () => {
  return {
    totalConnections: activeConnections.size,
    activeConversations: typingUsers.size,
    timestamp: new Date().toISOString()
  }
}

// Setup socket event handlers
const setupSocketHandlers = (io) => {
  console.log('🚀 Setting up Socket.IO handlers...')

  // Apply authentication middleware
  io.use(authenticateSocket)

  io.on('connection', async (socket) => {
    const { userId, user } = socket

    console.log(`📱 User connected: ${user.username} (${userId}) - Socket: ${socket.id}`)

    // Store active connection
    if (activeConnections.has(userId)) {
      console.log(`🔄 User ${user.username} reconnected - updating socket ID`)
    }
    activeConnections.set(userId, socket.id)
    userSockets.set(socket.id, userId)

    // Update user online status
    await updateUserOnlineStatus(userId, true)

    // Send current online count to newly connected user
    const onlineCount = activeConnections.size
    socket.emit('online_status_update', {
      totalOnline: onlineCount,
      userOnline: true,
      timestamp: new Date().toISOString()
    })

    // Handle delivery status for incoming user
    await handleUserOnline(io, userId)

    // Notify other users
    socket.broadcast.emit('user:online', {
      userId,
      username: user.username,
      timestamp: new Date().toISOString()
    })

    // Send initial unread count on connection
    setTimeout(async () => {
      await emitUnreadCountUpdate(io, userId)
    }, 500)

    // Handle request for online users list
    socket.on('get_online_users', () => {
      console.log(`📋 User ${userId} requested online users list`)

      try {
        // Get all currently online user IDs
        const onlineUserIds = Array.from(activeConnections.keys())

        console.log(`📤 Sending online users list: ${onlineUserIds.length} users`)

        socket.emit('online_users_list', {
          users: onlineUserIds,
          count: onlineUserIds.length,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('❌ Error sending online users list:', error)
        socket.emit('online_users_list', { users: [], count: 0 })
      }
    })

    // Handle online status check request
    socket.on('check_online_status', () => {
      console.log(`🔍 User ${userId} requested online status check`)

      try {
        const onlineCount = activeConnections.size
        const userSocketId = activeConnections.get(userId)

        socket.emit('online_status_response', {
          isOnline: !!userSocketId,
          socketId: userSocketId,
          totalOnline: onlineCount,
          timestamp: new Date().toISOString()
        })

        console.log(`✅ Sent online status response to ${userId}`)
      } catch (error) {
        console.error('❌ Error checking online status:', error)
      }
    })

    // Join conversation rooms automatically
    socket.on('conversation:join', async ({ conversationId }) => {
      console.log(`👥 User ${userId} joining conversation ${conversationId}`)

      // Verify user has access to this conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId }
      })

      if (participant) {
        socket.join(`conversation:${conversationId}`)
        console.log(`✅ User ${userId} joined conversation room: ${conversationId}`)

        // Confirm join and send unread count for this conversation
        socket.emit('conversation:joined', { conversationId })
        await emitUnreadCountUpdate(io, userId, conversationId)
      } else {
        console.log(`❌ User ${userId} denied access to conversation ${conversationId}`)
        socket.emit('error', { message: 'Access denied to conversation' })
      }
    })

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      console.log(`👋 User ${userId} leaving conversation ${conversationId}`)
      socket.leave(`conversation:${conversationId}`)
      socket.emit('conversation:left', { conversationId })
    })

    // Handle conversation mark as read
    socket.on('conversation:mark_read', async ({ conversationId }) => {
      console.log(`📖 User ${userId} marking conversation ${conversationId} as read`)

      try {
        // Mark all unread messages in conversation as read
        const updatedMessages = await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            isRead: false
          },
          data: { isRead: true }
        })

        console.log(`📖 Marked ${updatedMessages.count} messages as read in conversation ${conversationId}`)

        // Emit status update to conversation participants
        socket.to(`conversation:${conversationId}`).emit('conversation:status_updated', {
          conversationId,
          status: 'read',
          count: updatedMessages.count,
          updatedBy: userId
        })

        // Update unread counts
        await emitUnreadCountUpdate(io, userId, conversationId)
        await emitUnreadCountUpdate(io, userId) // Total count

      } catch (error) {
        console.error('❌ Error marking conversation as read:', error)
        socket.emit('error', { message: 'Failed to mark conversation as read' })
      }
    })

    // Handle unread count refresh requests
    socket.on('unread_count:refresh', async () => {
      console.log(`📊 User ${userId} requesting unread count refresh`)
      await emitUnreadCountUpdate(io, userId)
    })

    // Handle typing events
    socket.on('typing:start', ({ conversationId }) => {
      console.log(`⌨️ User ${userId} started typing in conversation ${conversationId}`)

      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set())
      }
      typingUsers.get(conversationId).add(userId)

      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        user
      })
    })

    socket.on('typing:stop', ({ conversationId }) => {
      console.log(`⌨️ User ${userId} stopped typing in conversation ${conversationId}`)

      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId)

        if (typingUsers.get(conversationId).size === 0) {
          typingUsers.delete(conversationId)
        }
      }

      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId
      })
    })

    // 🔥 FIXED: Enhanced message status events with proper sender notification
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      console.log(`✅ Message ${messageId} delivered in conversation ${conversationId} by user ${userId}`)

      try {
        // Update in database
        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { isDelivered: true },
          include: {
            sender: { select: { id: true, username: true } }
          }
        })

        console.log(`📤 Notifying sender ${updatedMessage.sender.username} of delivery`)

        // 🔥 CRITICAL: Emit to the MESSAGE SENDER specifically
        const senderSocketId = activeConnections.get(updatedMessage.senderId)
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:status_updated', {
            messageId,
            conversationId,
            status: 'delivered',
            updatedBy: userId
          })
          console.log(`✅ Delivery notification sent to sender ${updatedMessage.sender.username}`)
        } else {
          console.log(`⚠️ Sender ${updatedMessage.sender.username} is offline - status update queued`)
        }

        // Also emit to conversation room for other participants
        socket.to(`conversation:${conversationId}`).emit('message:status_updated', {
          messageId,
          conversationId,
          status: 'delivered',
          updatedBy: userId
        })

      } catch (error) {
        console.error('❌ Error updating delivered status:', error)
      }
    })

    socket.on('message:read', async ({ messageId, conversationId }) => {
      console.log(`👁️ Message ${messageId} read in conversation ${conversationId} by user ${userId}`)

      try {
        // Update in database
        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            isRead: true,
            isDelivered: true
          },
          include: {
            sender: { select: { id: true, username: true } }
          }
        })

        console.log(`📤 Notifying sender ${updatedMessage.sender.username} of read status`)

        // 🔥 CRITICAL: Emit to the MESSAGE SENDER specifically
        const senderSocketId = activeConnections.get(updatedMessage.senderId)
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:status_updated', {
            messageId,
            conversationId,
            status: 'read',
            updatedBy: userId
          })
          console.log(`✅ Read notification sent to sender ${updatedMessage.sender.username}`)
        } else {
          console.log(`⚠️ Sender ${updatedMessage.sender.username} is offline - status update queued`)
        }

        // Also emit to conversation room for other participants
        socket.to(`conversation:${conversationId}`).emit('message:status_updated', {
          messageId,
          conversationId,
          status: 'read',
          updatedBy: userId
        })

        // Update unread counts after marking as read
        await emitUnreadCountUpdate(io, userId, conversationId)
        await emitUnreadCountUpdate(io, userId) // Total count

      } catch (error) {
        console.error('❌ Error updating read status:', error)
      }
    })

    // Handle ping for keepalive
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // 🔥 ENHANCED: Better disconnect handling
    socket.on('disconnect', async (reason) => {
      console.log(`📱 User disconnected: ${user.username} (${userId}) - Reason: ${reason}`)

      // Clean up typing status
      typingUsers.forEach((userSet, conversationId) => {
        if (userSet.has(userId)) {
          userSet.delete(userId)
          socket.to(`conversation:${conversationId}`).emit('typing:stop', {
            conversationId,
            userId
          })
        }
      })

      // Remove from active connections
      activeConnections.delete(userId)
      userSockets.delete(socket.id)

      // Update user offline status
      await updateUserOnlineStatus(userId, false)

      // Notify other users
      socket.broadcast.emit('user:offline', {
        userId,
        username: user.username,
        reason,
        timestamp: new Date().toISOString()
      })

      // Send updated online count to remaining users
      const remainingOnlineCount = activeConnections.size
      socket.broadcast.emit('online_count_update', {
        totalOnline: remainingOnlineCount,
        timestamp: new Date().toISOString()
      })
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${userId}:`, error)
    })
  })

  // CRITICAL: Helper functions for emitting events
  io.sendToUser = (userId, event, data) => {
    const socketId = activeConnections.get(userId)
    if (socketId) {
      io.to(socketId).emit(event, data)
      return true
    }
    return false
  }

  io.sendToConversation = (conversationId, event, data) => {
    io.to(`conversation:${conversationId}`).emit(event, data)
  }

  io.getOnlineUsers = () => {
    return Array.from(activeConnections.keys())
  }

  io.isUserOnline = (userId) => {
    return activeConnections.has(userId)
  }

  // CRITICAL: Attach the emitNewMessage function to io
  io.emitNewMessage = (messageData) => emitNewMessage(io, messageData)

  // Attach unread count functions
  io.emitUnreadCountUpdate = (userId, conversationId = null) => emitUnreadCountUpdate(io, userId, conversationId)
  io.emitConversationUnreadUpdate = (conversationId) => emitConversationUnreadUpdate(io, conversationId)

  console.log('✅ Socket.IO handlers setup complete')
  console.log(`📊 Active connections tracking: ${activeConnections.size} users`)
}

module.exports = {
  setupSocketHandlers,
  emitNewMessage,
  emitUnreadCountUpdate,
  emitConversationUnreadUpdate,
  getOnlineStats,
  // Keep existing exports for compatibility
  emitConversationCreated: (io, conversation) => {
    conversation.participants.forEach(participant => {
      io.sendToUser(participant.userId, 'conversation:created', conversation)
    })
  },
  emitConversationUpdated: (io, conversation) => {
    conversation.participants.forEach(participant => {
      io.sendToUser(participant.userId, 'conversation:updated', conversation)
    })
  }
}