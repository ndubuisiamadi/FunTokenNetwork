// src/controllers/messages.js
const { validationResult } = require('express-validator')
const prisma = require('../db')
const multer = require('multer')
const path = require('path')

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

// Helper function to get conversation with participants
const getConversationWithDetails = async (conversationId, currentUserId) => {
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
                isOnline: true,
                lastSeen: true
              }
            }
          }
        }
      }
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Calculate unread count for current user
    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: currentUserId },
        isRead: false
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
        otherParticipant = otherParticipantData.user
      }
    }

    // Build the conversation object
    const conversationWithDetails = {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      avatarUrl: conversation.avatarUrl,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
      participants: conversation.participants,
      unreadCount,
      lastMessage: lastMessage?.content || null,
      lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
      lastMessageData: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        mediaUrls: lastMessage.mediaUrls,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
        isRead: lastMessage.isRead,
        isDelivered: lastMessage.isDelivered
      } : null,
      // Add otherParticipant for direct messages
      otherParticipant
    }

    return conversationWithDetails
  } catch (error) {
    console.error('Error getting conversation details:', error)
    throw error
  }
}

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20 } = req.query

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
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        // Include the last message with full details
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
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
      skip: (page - 1) * limit,
      take: parseInt(limit)
    })

    // Process conversations to add required data
    const processedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            isRead: false
          }
        })

        const lastMessage = conversation.messages[0]
        const otherParticipants = conversation.participants.filter(p => p.userId !== userId)

        return {
          id: conversation.id,
          name: conversation.name,
          isGroup: conversation.isGroup,
          lastActivity: conversation.lastActivity,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
          // Add full last message data for status and media
          lastMessageData: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            mediaUrls: lastMessage.mediaUrls || [],
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            status: getMessageStatus(lastMessage), // You'll need to implement this
            isRead: lastMessage.isRead,
            isDelivered: lastMessage.isDelivered
          } : null,
          unreadCount,
          participants: conversation.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            user: p.user
          })),
          otherParticipant: conversation.isGroup ? null : otherParticipants[0]?.user
        }
      })
    )

    res.json({
      conversations: processedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: conversations.length === parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Get conversations error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Helper function to determine message status
const getMessageStatus = (message) => {
  if (message.isRead) return 'read'
  if (message.isDelivered) return 'delivered'
  return 'sent'
}

const createConversation = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { participantIds, isGroup = false, name = null, avatarUrl = null } = req.body
    const userId = req.user.id

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required' })
    }

    // Define allParticipantIds BEFORE using it
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
        const fullConversation = await getConversationWithDetails(existingConversation.id, userId)
        return res.json({
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
      return res.status(400).json({ message: 'One or more participants not found' })
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

    console.log('Conversation created:', conversation.id)

    // Get full conversation details with all participant information
    const fullConversation = await getConversationWithDetails(conversation.id, userId)

    // Emit socket event to all participants
    const io = req.app.get('io')
    if (io) {
      allParticipantIds.forEach(participantId => {
        io.to(`user:${participantId}`).emit('conversation:created', fullConversation)
      })
    }

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: fullConversation
    })
  } catch (error) {
    console.error('Create conversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query
    const userId = req.user.id

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    // Verify user has access to this conversation
    const hasAccess = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this conversation' })
    }

    // Get messages (newest first for pagination, will reverse on frontend)
    const messages = await prisma.message.findMany({
      where: { conversationId },
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

    console.log(`Found ${messages.length} messages for conversation ${conversationId}`)

    res.json({
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: messages.length === limitNum
      }
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Update message status (delivered/read)
const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params
    const { status } = req.body // 'delivered' or 'read'
    const userId = req.user.id

    console.log(`Updating message ${messageId} status to ${status} for user ${userId}`)

    // Verify message exists and user has access
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          participants: {
            some: { userId }
          }
        }
      },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    })

    if (!message) {
      return res.status(404).json({ message: 'Message not found or access denied' })
    }

    // Don't allow users to update their own message status
    if (message.senderId === userId) {
      return res.status(400).json({ message: 'Cannot update own message status' })
    }

    // Update message status in database
    const updateData = {}
    if (status === 'delivered') {
      updateData.isDelivered = true
    } else if (status === 'read') {
      updateData.isRead = true
      updateData.isDelivered = true // Read implies delivered
    }

    await prisma.message.update({
      where: { id: messageId },
      data: updateData
    })

    // Emit socket event to conversation participants
    const io = req.app.get('io')
    if (io) {
      io.to(`conversation:${message.conversationId}`).emit('message:status_updated', {
        messageId,
        conversationId: message.conversationId,
        status,
        updatedBy: userId
      })
    }

    res.json({ 
      message: 'Message status updated successfully',
      status 
    })
  } catch (error) {
    console.error('Update message status error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Bulk update message status for conversation
const updateConversationMessageStatus = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { status, messageIds } = req.body // status: 'delivered' | 'read', messageIds: array of IDs
    const userId = req.user.id

    console.log(`Bulk updating messages in conversation ${conversationId} to ${status}`)

    // Verify user has access to conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })

    if (!participant) {
      return res.status(403).json({ message: 'Access denied to this conversation' })
    }

    // Build update data
    const updateData = {}
    if (status === 'delivered') {
      updateData.isDelivered = true
    } else if (status === 'read') {
      updateData.isRead = true
      updateData.isDelivered = true
    }

    // Update messages
    const whereClause = {
      conversationId,
      senderId: { not: userId }, // Don't update own messages
      ...(messageIds ? { id: { in: messageIds } } : {}) // If specific IDs provided
    }

    const updatedMessages = await prisma.message.updateMany({
      where: whereClause,
      data: updateData
    })

    // Emit socket event
    const io = req.app.get('io')
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:status_updated', {
        conversationId,
        status,
        updatedBy: userId,
        count: updatedMessages.count
      })
    }

    res.json({ 
      message: 'Messages status updated successfully',
      count: updatedMessages.count 
    })
  } catch (error) {
    console.error('Bulk update message status error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { conversationId } = req.params
    const { content, mediaUrls = [], messageType = 'text' } = req.body
    const userId = req.user.id

    // Validate message has content
    if (!content?.trim() && mediaUrls.length === 0) {
      return res.status(400).json({ message: 'Message must have content or media' })
    }

    // Verify user has access to this conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })

    if (!participant) {
      return res.status(403).json({ message: 'Access denied to this conversation' })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content?.trim() || null,
        mediaUrls,
        messageType,
        senderId: userId,
        conversationId
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

    // Update conversation's last activity
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastActivity: new Date() }
    })

    console.log('Message sent:', message.id)

    // Emit socket event to conversation room
    // Use conversation room instead of individual user rooms for better efficiency
    const io = req.app.get('io')
    if (io) {
      // Emit to conversation room (all users in the conversation)
      io.to(`conversation:${conversationId}`).emit('message:new', {
        ...message,
        conversationId
      })
    }

    res.status(201).json({
      message: 'Message sent successfully',
      message: message
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    // Verify user has access to this conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })

    if (!participant) {
      return res.status(403).json({ message: 'Access denied to this conversation' })
    }

    // Mark all unread messages in this conversation as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    })

    // Update participant's last read time
    await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      },
      data: { lastReadAt: new Date() }
    })

    console.log(`Marked conversation ${conversationId} as read for user ${userId}`)

    res.json({ message: 'Conversation marked as read' })
  } catch (error) {
    console.error('Mark as read error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    const conversation = await getConversationWithDetails(conversationId, userId)

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or access denied' })
    }

    res.json({ conversation })
  } catch (error) {
    console.error('Get conversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getConversationAvatar = (conversation) => {
  if (conversation.isGroup) {
    // Use custom avatar if available, otherwise generate one
    return conversation.avatarUrl || 
           'https://ui-avatars.com/api/?name=' + encodeURIComponent(conversation.name || 'Group') + '&background=055CFF&color=fff&size=40'
  }
  
  return conversation.otherParticipant?.avatarUrl || 'https://randomuser.me/api/portraits/men/32.jpg'
}

const updateConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { name } = req.body
    const userId = req.user.id

    // Verify user has access and conversation is a group
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
      return res.status(404).json({ message: 'Group conversation not found or access denied' })
    }

    // Update conversation
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { name: name.trim() }
    })

    res.json({
      message: 'Conversation updated successfully',
      conversation: updatedConversation
    })
  } catch (error) {
    console.error('Update conversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const leaveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params
    const userId = req.user.id

    // Verify this is a group conversation and user has access
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
      return res.status(404).json({ message: 'Group conversation not found or access denied' })
    }

    // Remove user from conversation
    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    })

    res.json({ message: 'Left conversation successfully' })
  } catch (error) {
    console.error('Leave conversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const addParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { participantIds } = req.body
    const userId = req.user.id

    // Verify this is a group conversation and user has access
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
      return res.status(404).json({ message: 'Group conversation not found or access denied' })
    }

    // Add new participants
    const newParticipants = participantIds.map(participantId => ({
      userId: participantId,
      conversationId
    }))

    await prisma.conversationParticipant.createMany({
      data: newParticipants,
      skipDuplicates: true
    })

    res.json({ message: 'Participants added successfully' })
  } catch (error) {
    console.error('Add participants error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId: targetUserId } = req.params
    const userId = req.user.id

    // Verify this is a group conversation and user has access
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
      return res.status(404).json({ message: 'Group conversation not found or access denied' })
    }

    // Remove participant
    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId: targetUserId,
          conversationId
        }
      }
    })

    res.json({ message: 'Participant removed successfully' })
  } catch (error) {
    console.error('Remove participant error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const uploadMessageMedia = async (req, res) => {
  try {
    // Use multer middleware
    upload.array('media', 10)(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err)
        return res.status(400).json({ message: err.message })
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' })
      }

      const fileUrls = req.files.map(file => `/uploads/messages/${file.filename}`)

      res.json({
        message: 'Files uploaded successfully',
        urls: fileUrls,
        count: fileUrls.length
      })
    })
  } catch (error) {
    console.error('Upload message media error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const searchConversations = async (req, res) => {
  try {
    const { q } = req.query
    const userId = req.user.id

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' })
    }

    const searchQuery = q.trim()

    // Search conversations by name and participant names
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
                isOnline: true,
                lastSeen: true
              }
            }
          }
        }
      },
      take: 10
    })

    res.json({ conversations })
  } catch (error) {
    console.error('Search conversations error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = await prisma.user.findMany({
      where: { isOnline: true },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        lastSeen: true
      }
    })

    res.json({ users: onlineUsers })
  } catch (error) {
    console.error('Get online users error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  getConversations,
  createConversation,
  getConversationAvatar,
  getMessages,
  sendMessage,
  markAsRead,
  getConversation,
  updateConversation,
  leaveConversation,
  addParticipants,
  removeParticipant,
  uploadMessageMedia,
  searchConversations,
  getOnlineUsers,
  updateMessageStatus,
  updateConversationMessageStatus
}