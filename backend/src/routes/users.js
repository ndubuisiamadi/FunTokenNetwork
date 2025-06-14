// src/routes/users.js - NEW FILE
const express = require('express')
const { query, param } = require('express-validator')
const { auth, optionalAuth } = require('../middleware/auth')
const usersController = require('../controllers/users')

const router = express.Router()

// Validation rules
const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
]

const userIdValidation = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required')
]

// Routes - SPECIFIC routes BEFORE parameterized routes

// Search/browse users
router.get('/search', optionalAuth, searchValidation, usersController.searchUsers)

// Get all users (for browsing)
router.get('/', optionalAuth, searchValidation, usersController.getAllUsers)

// PARAMETERIZED ROUTES

// Get user by ID
router.get('/:userId', optionalAuth, userIdValidation, usersController.getUserById)

// Get user's posts
router.get('/:userId/posts', optionalAuth, userIdValidation, usersController.getUserPosts)

module.exports = router