// backend/src/routes/messages.js - CLEANED VERSION (remove problematic routes)

const express = require('express')
const { body, query, param } = require('express-validator')
const { auth } = require('../middleware/auth')
const messagesController = require('../controllers/messages')

const router = express.Router()

// Validation rules (keep existing ones)
const createConversationValidation = [
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('Participant IDs must be a non-empty array'),
  body('participantIds.*')
    .isString()
    .withMessage('Participant IDs must be strings'),
  body('isGroup')
    .optional()
    .isBoolean()
    .withMessage('isGroup must be a boolean'),
  body('name')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && value !== undefined) {
        if (typeof value !== 'string') {
          throw new Error('Group name must be a string')
        }
        const trimmed = value.trim()
        if (trimmed.length === 0 || trimmed.length > 100) {
          throw new Error('Group name must be 1-100 characters')
        }
      }
      return true
    })
]

const sendMessageValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content must be less than 2000 characters'),
  body('mediaUrls')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 media files allowed'),
  body('mediaUrls.*')
    .optional()
    .isString()
    .withMessage('Media URLs must be strings'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'video', 'file', 'audio'])
    .withMessage('Invalid message type')
]

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must be at least 1 character')
]

// ====== ESSENTIAL ROUTES ONLY (Socket-only approach) ======

// Get all conversations for the current user
router.get('/conversations', auth, messagesController.getConversations)

// Search conversations
router.get('/conversations/search', auth, searchValidation, messagesController.searchConversations)

// Create a new conversation
router.post('/conversations', auth, createConversationValidation, messagesController.createConversation)

// Upload media for messages
router.post('/upload/media', auth, messagesController.uploadMessageMedia)

// Get online users
router.get('/users/online', auth, messagesController.getOnlineUsers)

// Get total unread count
router.get('/unread-count', auth, messagesController.getTotalUnreadCount)

// Get conversation details
router.get('/conversations/:conversationId', auth, messagesController.getConversation)

// Update conversation (name, etc.)
router.put('/conversations/:conversationId', auth, messagesController.updateConversation)

// Mark conversation as read
router.put('/conversations/:conversationId/read', auth, messagesController.markConversationAsRead)

// Leave a group conversation
router.delete('/conversations/:conversationId/leave', auth, messagesController.leaveConversation)

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', auth, paginationValidation, messagesController.getMessages)

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', auth, sendMessageValidation, messagesController.sendMessage)

// Add participants to group conversation
router.post('/conversations/:conversationId/participants', auth, messagesController.addParticipants)

// Remove participant from group conversation
router.delete('/conversations/:conversationId/participants/:userId', auth, messagesController.removeParticipant)

module.exports = router