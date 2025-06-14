// src/routes/posts.js
const express = require('express')
const { body } = require('express-validator')
const { auth, optionalAuth } = require('../middleware/auth')
const postsController = require('../controllers/posts')

const router = express.Router()

// Validation rules
const createPostValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Content must be less than 2000 characters'),
  body('postType')
    .optional()
    .isIn(['text', 'photo', 'video', 'link'])
    .withMessage('Invalid post type'),
  body('mediaUrls')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 media files allowed'),
  body('mediaUrls.*')
    .optional()
    .isString()
    .withMessage('Media URLs must be strings'),
  body('linkPreview')
  .optional({ nullable: true })
  .custom((value) => {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    throw new Error('Link preview must be an object or null');
  })
]

// Routes
router.get('/feed', optionalAuth, postsController.getFeed)
router.post('/', auth, createPostValidation, postsController.createPost)
router.get('/:id', optionalAuth, postsController.getPost)
router.delete('/:id', auth, postsController.deletePost)
router.post('/:id/like', auth, postsController.likePost)
router.delete('/:id/like', auth, postsController.unlikePost)

module.exports = router