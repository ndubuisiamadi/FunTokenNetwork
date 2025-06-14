// src/routes/friends.js - FIXED VERSION
const express = require('express')
const { body } = require('express-validator')
const { auth } = require('../middleware/auth')
const friendsController = require('../controllers/friends')

const router = express.Router()

// Validation rules
const respondToRequestValidation = [
  body('action')
    .isIn(['accept', 'decline'])
    .withMessage('Action must be "accept" or "decline"')
]

// Routes - PROPERLY DEFINED
router.post('/request/:userId', auth, friendsController.sendFriendRequest)
router.put('/request/:requestId', auth, respondToRequestValidation, friendsController.respondToFriendRequest)
router.get('/requests', auth, friendsController.getFriendRequests)

// Fixed: Use separate routes instead of optional parameters
router.get('/list', auth, friendsController.getFriends)        // Get current user's friends
router.get('/list/:userId', auth, friendsController.getFriends) // Get specific user's friends (removed duplicate)

router.delete('/:userId', auth, friendsController.removeFriend)
router.get('/status/:userId', auth, friendsController.checkFriendshipStatus)

router.get('/chat', auth, friendsController.getFriendsForChat)

module.exports = router