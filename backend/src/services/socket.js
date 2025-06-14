// src/services/socket.js - Backend Socket.io handlers
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

// Setup socket event handlers
const setupSocketHandlers = (io) => {
  console.log('Setting up Socket.IO handlers...')

  // Apply authentication middleware
  io.use(authenticateSocket)

  io.on('connection', async (socket) => {
    const { userId, user } = socket
    
    console.log(`📱 User connected: ${user.username} (${userId})`)

    // Store active connection
    activeConnections.set(userId, socket.id)
    userSockets.set(socket.id, userId)

    // Update user online status
    await updateUserOnlineStatus(userId, true)

    // Notify other users that this user is online
    socket.broadcast.emit('user:online', { userId })

    // Join conversation rooms
    socket.on('conversation:join', async ({ conversationId }) => {
      console.log(`User ${userId} joining conversation ${conversationId}`)
      
      // Verify user has access to this conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId }
      })
      
      if (participant) {
        socket.join(`conversation:${conversationId}`)
        console.log(`User ${userId} joined conversation room: ${conversationId}`)
      } else {
        console.log(`User ${userId} denied access to conversation ${conversationId}`)
        socket.emit('error', { message: 'Access denied to conversation' })
      }
    })

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }) => {
      console.log(`User ${userId} leaving conversation ${conversationId}`)
      socket.leave(`conversation:${conversationId}`)
    })

    // Handle typing events
    socket.on('typing:start', ({ conversationId }) => {
      console.log(`User ${userId} started typing in conversation ${conversationId}`)
      
      // Track typing user
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
      console.log(`User ${userId} stopped typing in conversation ${conversationId}`)
      
      // Remove from typing users
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId)
        
        // Clean up empty sets
        if (typingUsers.get(conversationId).size === 0) {
          typingUsers.delete(conversationId)
        }
      }
      
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId
      })
    })

    // Handle message events
    socket.on('message:delivered', ({ messageId, conversationId }) => {
      console.log(`Message ${messageId} delivered in conversation ${conversationId}`)
      socket.to(`conversation:${conversationId}`).emit('message:delivered', {
        messageId,
        conversationId,
        userId
      })
    })

    socket.on('message:read', ({ messageId, conversationId }) => {
      console.log(`Message ${messageId} read in conversation ${conversationId}`)
      socket.to(`conversation:${conversationId}`).emit('message:read', {
        messageId,
        conversationId,
        userId
      })
    })

    // Handle ping for keepalive
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`📱 User disconnected: ${user.username} (${userId}) - Reason: ${reason}`)

      // Clean up typing status for all conversations
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
      console.error(`Socket error for user ${userId}:`, error)
    })
  })

  // Helper function to send message to user
  io.sendToUser = (userId, event, data) => {
    const socketId = activeConnections.get(userId)
    if (socketId) {
      io.to(socketId).emit(event, data)
      return true
    }
    return false
  }

  // Helper function to send message to conversation
  io.sendToConversation = (conversationId, event, data) => {
    io.to(`conversation:${conversationId}`).emit(event, data)
  }

  // Helper function to get online users
  io.getOnlineUsers = () => {
    return Array.from(activeConnections.keys())
  }

  // Helper function to check if user is online
  io.isUserOnline = (userId) => {
    return activeConnections.has(userId)
  }

  console.log('✅ Socket.IO handlers setup complete')
}

// Emit new message to conversation participants
const emitNewMessage = (io, message, conversationId) => {
  io.sendToConversation(conversationId, 'message:new', {
    ...message,
    conversationId
  })
}

// Emit conversation created to participants
const emitConversationCreated = (io, conversation) => {
  conversation.participants.forEach(participant => {
    io.sendToUser(participant.userId, 'conversation:created', conversation)
  })
}

// Emit conversation updated to participants
const emitConversationUpdated = (io, conversation) => {
  conversation.participants.forEach(participant => {
    io.sendToUser(participant.userId, 'conversation:updated', conversation)
  })
}

module.exports = {
  setupSocketHandlers,
  emitNewMessage,
  emitConversationCreated,
  emitConversationUpdated
}