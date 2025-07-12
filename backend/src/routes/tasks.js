// backend/src/routes/tasks.js
// Enhanced Task Routes with Server-Side Filtering

const express = require('express')
const { body, param, query } = require('express-validator')
const { validationResult } = require('express-validator')
const tasks = require('../controllers/tasks')
const { auth } = require('../middleware/auth')

const router = express.Router()

// Validation middleware
const checkValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// 🆕 ENHANCED FILTERING VALIDATION
const taskFilterValidation = [
  // Platform filtering
  query('platform')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Platform must be a string between 1-50 characters'),
    
  // Status filtering  
  query('status')
    .optional()
    .isIn(['all', 'available', 'in_progress', 'completed', 'failed'])
    .withMessage('Status must be one of: all, available, in_progress, completed, failed'),
    
  // Difficulty filtering
  query('difficulty')
    .optional()
    .custom(value => {
      if (value === 'all') return true
      const num = parseInt(value)
      return num >= 1 && num <= 5
    })
    .withMessage('Difficulty must be "all" or an integer between 1 and 5'),
    
  // Search filtering
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
    
  // Date range filtering
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO date'),
    
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO date'),
    
  // Sorting
  query('sortBy')
    .optional()
    .isIn(['reward', 'difficulty', 'created', 'title', 'status', 'completed'])
    .withMessage('sortBy must be one of: reward, difficulty, created, title, status, completed'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be either "asc" or "desc"'),
    
  // Pagination
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be an integer between 1 and 10,000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
    
  // Custom validation for date range
  query('dateFrom').custom((value, { req }) => {
    if (value && req.query.dateTo) {
      const fromDate = new Date(value)
      const toDate = new Date(req.query.dateTo)
      if (fromDate > toDate) {
        throw new Error('dateFrom must be before or equal to dateTo')
      }
    }
    return true
  })
]

// 🆕 TWITTER SETUP ENDPOINTS
// ==========================

// POST /api/tasks/setup-twitter - User sets up Twitter ID
router.post('/setup-twitter', auth, [
  body('twitterId')
    .isString()
    .trim()
    .matches(/^\d+$/)
    .withMessage('Twitter ID must be numeric')
    .isLength({ min: 4, max: 19 })
    .withMessage('Twitter ID length is invalid'),
  checkValidation
], tasks.setupUserTwitterId)

// GET /api/tasks/twitter-setup - Check Twitter setup status
router.get('/twitter-setup', auth, tasks.checkTwitterSetup)

// 🆕 ADMIN TASK CREATION
// ======================

// POST /api/tasks/create - Create task for ANY Twitter account
router.post('/create', auth, [
  body('targetUsername')
    .notEmpty()
    .withMessage('Target username is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be 1-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  body('type')
    .isIn(['follow', 'like', 'retweet', 'comment', 'subscribe', 'join'])
    .withMessage('Invalid task type'),
    
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
    
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
    
  body('reward')
    .isInt({ min: 1000, max: 100000 })
    .withMessage('Reward must be between 1,000 and 100,000 gumballs'),
    
  body('difficulty')
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty must be between 1 and 5'),
    
  checkValidation
], tasks.createTask)

// 🔄 ENHANCED TASK ENDPOINTS
// ===========================

// GET /api/tasks/health - API health check (BEFORE parameterized routes)
router.get('/health', tasks.healthCheck)

// 🆕 GET /api/tasks/filtered - Enhanced filtering endpoint
router.get('/filtered', auth, taskFilterValidation, checkValidation, tasks.getFilteredTasks)

// GET /api/tasks/my-tasks - Enhanced user tasks with filtering
router.get('/my-tasks', auth, taskFilterValidation, checkValidation, tasks.getUserTasksFiltered)

// GET /api/tasks - Legacy endpoint (keep for backward compatibility)
router.get('/', auth, [
  query('platform').optional().isString().trim(),
  query('difficulty').optional().isInt({ min: 1, max: 5 }),
  checkValidation
], tasks.getAvailableTasks)

// 🆕 GET /api/tasks/:taskId/status - Get task status
router.get('/:taskId/status', auth, [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  checkValidation
], tasks.getTaskStatus)

// POST /api/tasks/:taskId/start - Start a task
router.post('/:taskId/start', auth, [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  checkValidation
], tasks.startTask)

// POST /api/tasks/:taskId/verify - Verify task completion (disabled)
router.post('/:taskId/verify', auth, [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  checkValidation
], tasks.verifyTask)

module.exports = router