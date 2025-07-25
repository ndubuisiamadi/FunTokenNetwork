// backend/src/controllers/messages.js - ENHANCED WITH RELIABILITY FEATURES

const { validationResult } = require('express-validator')
const prisma = require('../db')
const multer = require('multer')
const path = require('path')
const { 
  MESSAGE_STATUS, 
  MESSAGE_RELIABILITY_CONFIG,
  getMessageStatusForRecipient,
  batchUpdateMessageStatus,
  logStatusTransition,
  validateMessageStatus
} = require('../utils/messageStatus')

// Configure multer for message media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'message-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type for message'), false)
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10
  }
})

// Helper function to check if user is online via socket service
const isUserOnlineViaSocket = (userId, req) => {
  try {
    const io = req.app.get('io')
    if (io && io.engine && io.engine.clientsCount > 0) {
      // Try to access socket service if available
      const socketService = global.socketService || io.socketService
      if (socketService && typeof socketService.isUserOnline === 'function') {
        return socketService.isUserOnline(userId)
      }
    }
    return false // Conservative fallback
  } catch (error) {
    console.warn('Could not check online status:', error.message)
    return false
  }
}

// Enhanced conversation details helper
const getConversationWithDetails = async (conversationId, currentUserId, req = null) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                lastSeen: true
                // Note: isOnline field is ignored - we get this from socket service
              }
            }
          }
        }
      }
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Calculate unread count using reliable status filtering
    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: currentUserId },
        status: { 
          in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] // Not READ and not FAILED
        }
      }
    })

    // Get last message
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    })

    // For direct conversations, identify the other participant
    let otherParticipant = null
    if (!conversation.isGroup) {
      const otherParticipantData = conversation.participants.find(
        p => p.userId !== currentUserId
      )
      if (otherParticipantData) {
        otherParticipant = {
          ...otherParticipantData.user,
          // Get real-time online status from socket service
          isOnline: req ? isUserOnlineViaSocket(otherParticipantData.userId, req) : false
        }
      }
    }

    // Build enhanced conversation object
    const conversationWithDetails = {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
      participants: conversation.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          isOnline: req ? isUserOnlineViaSocket(p.userId, req) : false
        }
      })),
      unreadCount,
      lastMessage: lastMessage?.content || null,
      lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
      lastMessageData: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        mediaUrls: lastMessage.mediaUrls,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
        status: lastMessage.status
      } : null,
      otherParticipant
    }

    return conversationWithDetails
  } catch (error) {
    console.error('Error getting conversation details:', error)
    throw error
  }
}

// Enhanced create conversation
const createConversation = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { participantIds, isGroup = false, name = null, avatarUrl = null } = req.body
    const userId = req.user.id

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'At least one participant is required' 
      })
    }

    const allParticipantIds = [userId, ...participantIds.filter(id => id !== userId)]

    // For direct chats, check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: { in: allParticipantIds }
            }
          }
        }
      })

      if (existingConversation) {
        const fullConversation = await getConversationWithDetails(existingConversation.id, userId, req)
        return res.json({
          success: true,
          message: 'Conversation already exists',
          conversation: fullConversation
        })
      }
    }

    // Validate that all participant users exist
    const users = await prisma.user.findMany({
      where: {
        id: { in: allParticipantIds }
      },
      select: { id: true, username: true, firstName: true, lastName: true }
    })

    if (users.length !== allParticipantIds.length) {
      return res.status(400).json({ 
        success: false,
        message: 'One or more participants not found' 
      })
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        name,
        isGroup,
        avatarUrl,
        participants: {
          create: allParticipantIds.map(participantId => ({
            userId: participantId
          }))
        }
      }
    })

    console.log('✅ Conversation created:', conversation.id)

    // Get full conversation details
    const fullConversation = await getConversationWithDetails(conversation.id, userId, req)

    // Emit socket event to all participants
    const io = req.app.get('io')
    if (io) {
      allParticipantIds.forEach(participantId => {
        io.to(`user:${participantId}`).emit('conversation:created', fullConversation)
      })
      console.log('📡 Broadcasted conversation created event')
    }

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      conversation: fullConversation
    })
  } catch (error) {
    console.error('❌ Create conversation error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Enhanced get messages with status filtering
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query
    const userId = req.user.id

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100) // Cap at 100 for performance
    const skip = (pageNum - 1) * limitNum

    // Verify user has access to this conversation
    const hasAccess = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied to this conversation' 
      })
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: { 
        conversationId,
        // Exclude failed messages from regular fetching
        status: { not: MESSAGE_STATUS.FAILED }
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    })

    console.log(`📋 Found ${messages.length} messages for conversation ${conversationId}`)

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: { 
        conversationId,
        status: { not: MESSAGE_STATUS.FAILED }
      }
    })

    res.json({
      success: true,
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore: messages.length === limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    })
  } catch (error) {
    console.error('❌ Get messages error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Enhanced send message with reliability
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { conversationId } = req.params
    const { content, mediaUrls = [], messageType = 'text' } = req.body
    const userId = req.user.id

    console.log(`📤 API: Sending message to conversation ${conversationId}`)

    // Validate message content
    if (!content?.trim() && mediaUrls.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Message must have content or media' 
      })
    }

    // Verify access and get participants
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      include: { user: { select: { id: true } } }
    })

    const participant = participants.find(p => p.userId === userId)
    if (!participant) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied to this conversation' 
      })
    }

    // Get recipient IDs for status determination
    const recipientIds = participants
      .filter(p => p.userId !== userId)
      .map(p => p.userId)

    // Check if any recipient is online
    const anyRecipientOnline = recipientIds.some(id => isUserOnlineViaSocket(id, req))
    const initialStatus = anyRecipientOnline ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT

    // Get next sequence number
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastSequenceNumber: { increment: 1 } },
      select: { lastSequenceNumber: true }
    })

    // Create message with appropriate initial status
    const message = await prisma.message.create({
      data: {
        content: content?.trim() || null,
        mediaUrls,
        messageType,
        senderId: userId,
        conversationId,
        sequenceNumber: conversation.lastSequenceNumber,
        status: initialStatus,
        statusUpdatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    })

    logStatusTransition(message.id, 'new', initialStatus, `via_api recipients_online: ${anyRecipientOnline}`)

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content?.trim() || (mediaUrls.length > 0 ? '📎 Media' : ''),
        lastActivity: new Date()
      }
    })

    // Emit via socket if available
    const io = req.app.get('io')
    if (io) {
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

      io.to(`conversation:${conversationId}`).emit('message:new', messageData)
      console.log('📡 API: Emitted message via socket')
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...message,
        timestamp: message.createdAt
      }
    })

    console.log(`✅ API: Message sent with status: ${message.status}`)

  } catch (error) {
    console.error('❌ API: Send message error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Enhanced get conversations with reliable unread counting
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

    console.log(`📋 API: Getting conversations for user ${userId}`)

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 50) // Cap for performance

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: {
            // Only get last message that's not failed
            status: { not: MESSAGE_STATUS.FAILED }
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { lastActivity: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum
    })

    console.log(`📊 API: Found ${conversations.length} conversations`)

    // Process conversations with enhanced unread counts and online status
    const processedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // Enhanced unread count - only count non-failed messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            status: { 
              in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] // Exclude READ and FAILED
            }
          }
        })

        const lastMessage = conversation.messages[0]
        const otherParticipants = conversation.participants.filter(p => p.userId !== userId)

        // Add real-time online status
        const participantsWithOnlineStatus = conversation.participants.map(p => ({
          ...p,
          user: {
            ...p.user,
            isOnline: isUserOnlineViaSocket(p.userId, req)
          }
        }))

        const result = {
          id: conversation.id,
          name: conversation.name,
          isGroup: conversation.isGroup,
          avatarUrl: conversation.avatarUrl,
          lastActivity: conversation.lastActivity,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
          lastMessageData: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            mediaUrls: lastMessage.mediaUrls || [],
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            status: lastMessage.status
          } : null,
          unreadCount,
          participants: participantsWithOnlineStatus,
          otherParticipant: conversation.isGroup ? null : {
            ...otherParticipants[0]?.user,
            isOnline: isUserOnlineViaSocket(otherParticipants[0]?.userId, req)
          }
        }

        return result
      })
    )

    const totalUnread = processedConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)
    console.log(`📊 API: Processed ${processedConversations.length} conversations, total unread: ${totalUnread}`)

    // Get total count for pagination
    const totalCount = await prisma.conversation.count({
      where: {
        participants: {
          some: { userId }
        }
      }
    })

    res.json({
      success: true,
      conversations: processedConversations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore: conversations.length === limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      summary: {
        totalUnread,
        totalConversations: totalCount
      }
    })
  } catch (error) {
    console.error('❌ API: Get conversations error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Enhanced mark conversation as read
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    console.log(`📖 API: Marking conversation ${conversationId} as read for user ${userId}`)

    // Use batch update for better performance
    const updateResult = await batchUpdateMessageStatus(
      prisma,
      conversationId,
      userId,
      MESSAGE_STATUS.READ,
      [MESSAGE_STATUS.FAILED] // Don't mark failed messages as read
    )

    console.log(`✅ API: Marked ${updateResult.count} messages as read`)

    // Emit socket event if available
    const io = req.app.get('io')
    if (io && updateResult.success && updateResult.count > 0) {
      io.to(`conversation:${conversationId}`).emit('messages:read', {
        conversationId,
        readBy: userId,
        count: updateResult.count,
        timestamp: new Date()
      })
    }

    res.json({
      success: true,
      message: 'Conversation marked as read',
      data: {
        updatedCount: updateResult.count,
        conversationId
      }
    })

  } catch (error) {
    console.error('❌ API: Mark as read error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Enhanced total unread count
const getTotalUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id

    // Get total unread using reliable status filtering
    const unreadCount = await prisma.message.count({
      where: {
        conversation: {
          participants: {
            some: { userId }
          }
        },
        senderId: { not: userId },
        status: { 
          in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] // Exclude READ and FAILED
        }
      }
    })

    console.log(`📊 API: Total unread count for user ${userId}: ${unreadCount}`)

    res.json({ 
      success: true,
      unreadCount,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('❌ Get total unread count error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Keep other existing functions with minor enhancements
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    const conversation = await getConversationWithDetails(conversationId, userId, req)

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found or access denied' 
      })
    }

    res.json({ 
      success: true,
      conversation 
    })
  } catch (error) {
    console.error('❌ Get conversation error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const updateConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { name } = req.body
    const userId = req.user.id

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        participants: {
          some: { userId }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Group conversation not found or access denied' 
      })
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { name: name.trim() }
    })

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      conversation: updatedConversation
    })
  } catch (error) {
    console.error('❌ Update conversation error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const leaveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        participants: {
          some: { userId }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Group conversation not found or access denied' 
      })
    }

    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    })

    res.json({ 
      success: true,
      message: 'Left conversation successfully' 
    })
  } catch (error) {
    console.error('❌ Leave conversation error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const addParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { participantIds } = req.body
    const userId = req.user.id

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        participants: {
          some: { userId }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Group conversation not found or access denied' 
      })
    }

    const newParticipants = participantIds.map(participantId => ({
      userId: participantId,
      conversationId
    }))

    await prisma.conversationParticipant.createMany({
      data: newParticipants,
      skipDuplicates: true
    })

    res.json({ 
      success: true,
      message: 'Participants added successfully' 
    })
  } catch (error) {
    console.error('❌ Add participants error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId: targetUserId } = req.params
    const userId = req.user.id

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isGroup: true,
        participants: {
          some: { userId }
        }
      }
    })

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Group conversation not found or access denied' 
      })
    }

    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId: targetUserId,
          conversationId
        }
      }
    })

    res.json({ 
      success: true,
      message: 'Participant removed successfully' 
    })
  } catch (error) {
    console.error('❌ Remove participant error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const uploadMessageMedia = async (req, res) => {
  try {
    upload.array('media', 10)(req, res, (err) => {
      if (err) {
        console.error('❌ Upload error:', err)
        return res.status(400).json({ 
          success: false,
          message: err.message 
        })
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No files uploaded' 
        })
      }

      const fileUrls = req.files.map(file => `/uploads/messages/${file.filename}`)

      res.json({
        success: true,
        message: 'Files uploaded successfully',
        urls: fileUrls,
        count: fileUrls.length
      })
    })
  } catch (error) {
    console.error('❌ Upload message media error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const searchConversations = async (req, res) => {
  try {
    const { q } = req.query
    const userId = req.user.id

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 2 characters' 
      })
    }

    const searchQuery = q.trim()

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        },
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { firstName: { contains: searchQuery, mode: 'insensitive' } },
                    { lastName: { contains: searchQuery, mode: 'insensitive' } },
                    { username: { contains: searchQuery, mode: 'insensitive' } }
                  ]
                }
              }
            }
          }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                lastSeen: true
              }
            }
          }
        }
      },
      take: 10
    })

    // Add real-time online status to search results
    const conversationsWithOnlineStatus = conversations.map(conv => ({
      ...conv,
      participants: conv.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          isOnline: isUserOnlineViaSocket(p.userId, req)
        }
      }))
    }))

    res.json({ 
      success: true,
      conversations: conversationsWithOnlineStatus 
    })
  } catch (error) {
    console.error('❌ Search conversations error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const getOnlineUsers = async (req, res) => {
  try {
    // Try to get real-time online users from socket service
    const io = req.app.get('io')
    let onlineUserIds = []

    if (io) {
      try {
        const socketService = global.socketService || io.socketService
        if (socketService && typeof socketService.getOnlineUsers === 'function') {
          onlineUserIds = socketService.getOnlineUsers()
        }
      } catch (error) {
        console.warn('Could not get online users from socket service:', error.message)
      }
    }

    // If we have online user IDs, get their details
    if (onlineUserIds.length > 0) {
      const onlineUsers = await prisma.user.findMany({
        where: { id: { in: onlineUserIds } },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          lastSeen: true
        }
      })

      res.json({ 
        success: true,
        users: onlineUsers.map(user => ({ ...user, isOnline: true }))
      })
    } else {
      // Fallback to empty list
      res.json({ 
        success: true,
        users: []
      })
    }
  } catch (error) {
    console.error('❌ Get online users error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  getConversation,
  updateConversation,
  leaveConversation,
  addParticipants,
  removeParticipant,
  uploadMessageMedia,
  searchConversations,
  getOnlineUsers,
  getTotalUnreadCount,
  markConversationAsRead
}