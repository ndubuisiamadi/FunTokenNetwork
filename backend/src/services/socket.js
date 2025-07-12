// src/services/socket.js - FIXED BACKEND SOCKET SERVICE
const jwt = require('jsonwebtoken')
const prisma = require('../db')

// Store for active socket connections
const activeConnections = new Map() // userId -> socketId
const userSockets = new Map() // socketId -> userId
const typingUsers = new Map() // conversationId -> Set of userIds

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

// CRITICAL: Function to emit new message to all conversation participants
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

    // ALSO emit directly to each participant to ensure delivery
    participants.forEach(participant => {
      const userId = participant.userId
      const socketId = activeConnections.get(userId)
      
      if (socketId) {
        console.log(`📱 Sending message directly to user ${participant.user.username} (${userId})`)
        io.to(socketId).emit('message:new', {
          ...messageData,
          conversationId,
          timestamp: messageData.createdAt
        })
      } else {
        console.log(`😴 User ${participant.user.username} (${userId}) is offline`)
      }
    })

    console.log(`✅ Message emitted successfully to conversation ${conversationId}`)

  } catch (error) {
    console.error('❌ Error emitting new message:', error)
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

    // Notify other users that this user is online
    socket.broadcast.emit('user:online', { userId })

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
        
        // Confirm join
        socket.emit('conversation:joined', { conversationId })
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

    // ENHANCED: Message status events
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      console.log(`✅ Message ${messageId} delivered in conversation ${conversationId}`)
      
      try {
        // Update in database
        await prisma.message.update({
          where: { id: messageId },
          data: { isDelivered: true }
        })
        
        // Emit to conversation participants
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
      console.log(`👁️ Message ${messageId} read in conversation ${conversationId}`)
      
      try {
        // Update in database
        await prisma.message.update({
          where: { id: messageId },
          data: { 
            isRead: true,
            isDelivered: true
          }
        })
        
        // Emit to conversation participants
        socket.to(`conversation:${conversationId}`).emit('message:status_updated', {
          messageId,
          conversationId,
          status: 'read',
          updatedBy: userId
        })
        
      } catch (error) {
        console.error('❌ Error updating read status:', error)
      }
    })

    // Handle ping for keepalive
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // Handle disconnection
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

      // Notify other users that this user is offline
      socket.broadcast.emit('user:offline', { userId })
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

  console.log('✅ Socket.IO handlers setup complete')
  console.log(`📊 Active connections tracking: ${activeConnections.size} users`)
}

// Export the main function and helpers
module.exports = {
  setupSocketHandlers,
  emitNewMessage,
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