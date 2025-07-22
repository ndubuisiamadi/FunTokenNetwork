// backend/src/routes/admin.js - UPDATED WITH PROPER VALIDATION AND TEST ENDPOINT
const express = require('express')
const { body, query, param } = require('express-validator')
const { auth } = require('../middleware/auth')
const adminController = require('../controllers/admin')
const { validationResult } = require('express-validator')

// Validation middleware (inline like in tasks.js)
const checkValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array())
    return res.status(400).json({ 
      message: 'Validation error',
      errors: errors.array() 
    })
  }
  next()
}

const router = express.Router()

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  console.log('🔍 Admin auth check - User:', req.user?.username, 'Role:', req.user?.role)
  
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    console.log('❌ Admin access denied for user:', req.user?.username || 'anonymous')
    return res.status(403).json({
      message: 'Admin access required',
      error: 'Insufficient privileges'
    })
  }
  
  console.log('✅ Admin access granted for:', req.user.username)
  next()
}

// Super admin middleware
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      message: 'Super admin access required',
      error: 'Insufficient privileges'
    })
  }
  next()
}

// All admin routes require authentication and admin role
router.use(auth, requireAdmin)

// ===================================
// TEST ENDPOINT (for debugging)
// ===================================

// GET /api/admin/test - Simple test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 Admin test endpoint called by:', req.user.username)
  res.json({
    message: 'Admin routes are working!',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    },
    timestamp: new Date().toISOString()
  })
})

// ===================================
// ADMIN PROFILE
// ===================================

// GET /api/admin/profile - Get admin profile
router.get('/profile', adminController.getAdminProfile)

// ===================================
// CACHE MANAGEMENT
// ===================================

// DELETE /api/admin/cache - Clear all cached data
router.delete('/cache', adminController.clearCache)

// GET /api/admin/cache/status - Get cache status and info
router.get('/cache/status', adminController.getCacheStatus)

// ===================================
// SYSTEM HEALTH & MONITORING
// ===================================

// GET /api/admin/system/health - System health check
router.get('/system/health', adminController.getSystemHealth)

// GET /api/admin/system/stats - System statistics
router.get('/system/stats', adminController.getSystemStats)

// GET /api/admin/system/logs - System logs (super admin only)
router.get('/system/logs', requireSuperAdmin, [
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 }),
  checkValidation
], adminController.getSystemLogs)

// ===================================
// USER MANAGEMENT - FIXED VALIDATION
// ===================================

// 🔧 FIXED: Custom validator for empty strings and valid values
const allowEmptyOrValid = (validValues) => {
  return (value) => {
    if (!value || value === '' || value === 'all') return true
    return validValues.includes(value)
  }
}

// GET /api/admin/users/stats - Get user statistics for dashboard
router.get('/users/stats', adminController.getUserStats)

// GET /api/admin/users - Get all users with filtering
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  // 🔧 FIXED: Allow empty strings for filters
  query('role').optional().custom(allowEmptyOrValid(['user', 'admin', 'super_admin']))
    .withMessage('Role must be empty, "all", "user", "admin", or "super_admin"'),
  query('status').optional().custom(allowEmptyOrValid(['active', 'suspended', 'banned']))
    .withMessage('Status must be empty, "all", "active", "suspended", or "banned"'),
  query('level').optional().trim(), // Allow any level value including empty
  query('sortBy').optional().isIn(['createdAt', 'username', 'email', 'level', 'gumballs']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  checkValidation
], adminController.getAllUsers)

// GET /api/admin/users/:userId - Get specific user details
router.get('/users/:userId', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  checkValidation
], adminController.getUserById)

// PUT /api/admin/users/:userId - Update user
router.put('/users/:userId', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  body('username').optional().trim().isLength({ min: 3, max: 30 }),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['user', 'admin', 'super_admin']),
  body('level').optional().trim(),
  body('isEmailVerified').optional().isBoolean(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  checkValidation
], adminController.updateUser)

// DELETE /api/admin/users/:userId - Delete user (super admin only)
router.delete('/users/:userId', requireSuperAdmin, [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  checkValidation
], adminController.deleteUser)

// POST /api/admin/users/:userId/suspend - Suspend user
router.post('/users/:userId/suspend', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  body('duration').optional().isInt({ min: 1 }), // hours
  checkValidation
], adminController.suspendUser)

// POST /api/admin/users/:userId/unsuspend - Unsuspend user
router.post('/users/:userId/unsuspend', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  checkValidation
], adminController.unsuspendUser)

// GET /api/admin/users/:userId/activity - Get user activity log
router.get('/users/:userId/activity', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidation
], adminController.getUserActivity)

// ===================================
// TASK MANAGEMENT
// ===================================

// GET /api/admin/tasks - Get all tasks with admin details
router.get('/tasks', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('platform').optional().trim(),
  query('difficulty').optional().isInt({ min: 1, max: 5 }),
  query('isActive').optional().isBoolean(),
  query('sortBy').optional().isIn(['createdAt', 'title', 'platform', 'difficulty', 'reward']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  checkValidation
], adminController.getAllTasks)

// GET /api/admin/tasks/stats - Get task statistics
router.get('/tasks/stats', adminController.getTaskStats)

// PUT /api/admin/tasks/:taskId - Update task
router.put('/tasks/:taskId', [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('reward').optional().isInt({ min: 1, max: 1000000 }),
  body('difficulty').optional().isInt({ min: 1, max: 5 }),
  body('isActive').optional().isBoolean(),
  body('platform').optional().trim(),
  checkValidation
], adminController.updateTask)

// DELETE /api/admin/tasks/:taskId - Delete task
router.delete('/tasks/:taskId', [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  checkValidation
], adminController.deleteTask)

// POST /api/admin/tasks/:taskId/force-complete - Force complete task
router.post('/tasks/:taskId/force-complete', [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  checkValidation
], adminController.forceCompleteTask)

// ===================================
// CONTENT MODERATION
// ===================================

// GET /api/admin/content/posts/pending - Get pending posts
router.get('/content/posts/pending', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidation
], adminController.getPendingPosts)

// POST /api/admin/content/posts/:postId/approve - Approve post
router.post('/content/posts/:postId/approve', [
  param('postId').isMongoId().withMessage('Invalid post ID'),
  checkValidation
], adminController.approvePost)

// POST /api/admin/content/posts/:postId/reject - Reject post
router.post('/content/posts/:postId/reject', [
  param('postId').isMongoId().withMessage('Invalid post ID'),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  checkValidation
], adminController.rejectPost)

// GET /api/admin/content/reports - Get content reports
router.get('/content/reports', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidation
], adminController.getContentReports)

// ===================================
// ANALYTICS - WORKING ENDPOINTS
// ===================================

router.get('/analytics/users/:timeframe', [
  param('timeframe').isIn(['1d', '7d', '30d', '90d']),
  checkValidation
], adminController.getUserAnalytics)

router.get('/analytics/engagement', [
  query('timeframe').optional().isIn(['1d', '7d', '30d', '90d']),
  checkValidation
], adminController.getEngagementAnalytics)

router.get('/analytics/revenue', [
  query('timeframe').optional().isIn(['1d', '7d', '30d', '90d']),
  checkValidation
], adminController.getRevenueAnalytics)

// ===================================
// COMMUNITY MANAGEMENT
// ===================================

// GET /api/admin/communities - Get all communities
router.get('/communities', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['createdAt', 'name', 'memberCount']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  checkValidation
], adminController.getAllCommunities)

// PUT /api/admin/communities/:communityId - Update community
router.put('/communities/:communityId', [
  param('communityId').isMongoId().withMessage('Invalid community ID'),
  body('name').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('rules').optional().isArray(),
  body('isPrivate').optional().isBoolean(),
  checkValidation
], adminController.updateCommunity)

// DELETE /api/admin/communities/:communityId - Delete community
router.delete('/communities/:communityId', requireSuperAdmin, [
  param('communityId').isMongoId().withMessage('Invalid community ID'),
  checkValidation
], adminController.deleteCommunity)

// ===================================
// AUDIT LOGGING
// ===================================

// POST /api/admin/audit/log - Log admin action
router.post('/audit/log', [
  body('action').notEmpty().trim(),
  body('targetType').optional().trim(),
  body('targetId').optional().trim(),
  body('details').optional().isObject(),
  checkValidation
], adminController.logAdminAction)

// GET /api/admin/audit/logs - Get admin action logs
router.get('/audit/logs', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('adminId').optional().isMongoId(),
  query('action').optional().trim(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  checkValidation
], adminController.getAdminActionLogs)

module.exports = router