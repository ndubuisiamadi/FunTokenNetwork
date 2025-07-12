// src/routes/messages.js - FIXED VERSION
const express = require('express')
const { body, query, param } = require('express-validator')
const { auth } = require('../middleware/auth')
const messagesController = require('../controllers/messages')

const router = express.Router()

// Fixed validation rules for messages routes
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
    .optional({ nullable: true }) // Allow null values
    .custom((value) => {
      // Only validate if value is not null/undefined
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

// FIXED: Search validation - proper middleware chain
const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query must be at least 1 character')
]

// Routes - FIXED ORDER: Specific routes BEFORE parameterized routes

// Get all conversations for the current user
router.get('/conversations', auth, messagesController.getConversations)

// FIXED: Search conversations - BEFORE parameterized routes
router.get('/conversations/search', auth, searchValidation, messagesController.searchConversations)

// Create a new conversation
router.post('/conversations', auth, createConversationValidation, messagesController.createConversation)

// Upload media for messages
router.post('/upload/media', auth, messagesController.uploadMessageMedia)

// Get online users
router.get('/users/online', auth, messagesController.getOnlineUsers)

// Parameterized routes - AFTER specific routes
// Get conversation details
router.get('/conversations/:conversationId', auth, messagesController.getConversation)

// Update conversation (name, etc.)
router.put('/conversations/:conversationId', auth, messagesController.updateConversation)

// Mark conversation as read
router.put('/conversations/:conversationId/read', auth, messagesController.markAsRead)

// Update individual message status
router.put('/messages/:messageId/status', auth, [
  body('status')
    .isIn(['delivered', 'read'])
    .withMessage('Status must be either delivered or read')
], messagesController.updateMessageStatus)

// Bulk update conversation message status
router.put('/conversations/:conversationId/messages/status', auth, [
  body('status')
    .isIn(['delivered', 'read'])
    .withMessage('Status must be either delivered or read'),
  body('messageIds')
    .optional()
    .isArray()
    .withMessage('Message IDs must be an array')
], messagesController.updateConversationMessageStatus)

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

router.get('/unread-count', auth, messagesController.getTotalUnreadCount)

module.exports = router