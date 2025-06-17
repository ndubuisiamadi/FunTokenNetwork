// src/routes/search.js
const express = require('express')
const { query } = require('express-validator')
const { auth } = require('../middleware/auth')
const searchController = require('../controllers/search')

const router = express.Router()

// Validation
const searchValidation = [
  query('q')
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

// Routes
router.get('/', auth, searchValidation, searchController.globalSearch)
router.get('/posts', auth, searchValidation, searchController.searchPosts)
router.get('/users', auth, searchValidation, searchController.searchUsers)
router.get('/communities', auth, searchValidation, searchController.searchCommunities)

module.exports = router