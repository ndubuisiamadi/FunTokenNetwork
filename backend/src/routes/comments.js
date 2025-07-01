// src/routes/comments.js
const express = require('express')
const router = express.Router()
const { body, query, param, validationResult } = require('express-validator')
const { auth } = require('../middleware/auth') // Fixed: added destructuring
const commentsController = require('../controllers/comments')

// Simple validation middleware (inline since validateRequest might not exist)
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

// Validation middleware
const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId')
]

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
]

const mongoIdValidation = [
  param('postId')
    .isMongoId()
    .withMessage('Post ID must be a valid MongoDB ObjectId'),
  param('commentId')
    .optional()
    .isMongoId()
    .withMessage('Comment ID must be a valid MongoDB ObjectId')
]

// Get comments for a post
router.get('/posts/:postId/comments', 
  [param('postId').isMongoId().withMessage('Post ID must be a valid MongoDB ObjectId')],
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('sortBy').optional().isIn(['top', 'newest', 'oldest']).withMessage('SortBy must be top, newest, or oldest')
  ],
  handleValidationErrors,
  commentsController.getComments
)

// Get replies for a comment
router.get('/comments/:commentId/replies',
  [param('commentId').isMongoId().withMessage('Comment ID must be a valid MongoDB ObjectId')],
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  commentsController.getReplies
)

// Create a comment on a post
router.post('/posts/:postId/comments',
  auth,
  [
    param('postId').isMongoId().withMessage('Post ID must be a valid MongoDB ObjectId'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
    body('parentId').optional().isMongoId().withMessage('Parent ID must be a valid MongoDB ObjectId')
  ],
  handleValidationErrors,
  commentsController.createComment
)

// Like a comment
router.post('/comments/:commentId/like',
  auth,
  [param('commentId').isMongoId().withMessage('Comment ID must be a valid MongoDB ObjectId')],
  handleValidationErrors,
  commentsController.likeComment
)

// Unlike a comment
router.delete('/comments/:commentId/like',
  auth,
  [param('commentId').isMongoId().withMessage('Comment ID must be a valid MongoDB ObjectId')],
  handleValidationErrors,
  commentsController.unlikeComment
)

// Update a comment
router.put('/comments/:commentId',
  auth,
  [
    param('commentId').isMongoId().withMessage('Comment ID must be a valid MongoDB ObjectId'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters')
  ],
  handleValidationErrors,
  commentsController.updateComment
)

// Delete a comment
router.delete('/comments/:commentId',
  auth,
  [param('commentId').isMongoId().withMessage('Comment ID must be a valid MongoDB ObjectId')],
  handleValidationErrors,
  commentsController.deleteComment
)

// Temporary route to fix comment counts
router.post('/fix-counts', auth, commentsController.fixCommentCounts)

module.exports = router