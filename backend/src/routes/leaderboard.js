// src/routes/leaderboard.js - OPTIMIZED WITH SEARCH ENDPOINT
const express = require('express')
const { query } = require('express-validator')
const { auth, optionalAuth } = require('../middleware/auth')
const leaderboardController = require('../controllers/leaderboard')

const router = express.Router()

// 🚀 OPTIMIZATION: Enhanced validation for leaderboard queries
const leaderboardValidation = [
  query('period')
    .optional()
    .isIn(['all', 'weekly', 'monthly'])
    .withMessage('Period must be all, weekly, or monthly'),
  query('level')
    .optional()
    .isIn(['all', 'novice', 'apprentice', 'expert', 'master', 'grandmaster'])
    .withMessage('Invalid level filter'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// 🚀 NEW: Search validation
const searchValidation = [
  query('q')
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
    .trim()
    .escape(),
  query('period')
    .optional()
    .isIn(['all', 'weekly', 'monthly'])
    .withMessage('Period must be all, weekly, or monthly'),
  query('level')
    .optional()
    .isIn(['all', 'novice', 'apprentice', 'expert', 'master', 'grandmaster'])
    .withMessage('Invalid level filter'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
]

// 🚀 OPTIMIZATION: Public route - get leaderboard with filtering and caching
router.get('/', 
  leaderboardValidation, 
  leaderboardController.getLeaderboard
)

// 🚀 NEW: Search users endpoint (the missing one!)
router.get('/search', 
  searchValidation,
  leaderboardController.searchUsers
)

// 🚀 OPTIMIZATION: Protected route - get current user's ranking info
router.get('/me', 
  auth, 
  leaderboardController.getUserRankInfo
)

// 🚀 OPTIMIZATION: Public route - get top achievers (for cards/widgets)
router.get('/top', 
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    query('period')
      .optional()
      .isIn(['all', 'weekly', 'monthly'])
      .withMessage('Period must be all, weekly, or monthly')
  ],
  leaderboardController.getTopAchievers
)

// 🚀 OPTIMIZATION: Public route - get level distribution stats
router.get('/stats', 
  leaderboardController.getLevelDistribution
)

module.exports = router