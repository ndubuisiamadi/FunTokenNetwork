// src/routes/leaderboard.js
const express = require('express')
const { query } = require('express-validator')
const { auth, optionalAuth } = require('../middleware/auth')
const leaderboardController = require('../controllers/leaderboard')

const router = express.Router()

// Validation for leaderboard queries
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
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// Public route - get leaderboard with filtering
router.get('/', leaderboardValidation, leaderboardController.getLeaderboard)

// Protected route - get current user's ranking info
router.get('/me', auth, leaderboardController.getUserRankInfo)

// Public route - get top achievers (for cards/widgets)
router.get('/top', leaderboardController.getTopAchievers)

// Public route - get level distribution stats
router.get('/stats', leaderboardController.getLevelDistribution)

module.exports = router