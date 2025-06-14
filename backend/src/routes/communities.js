// src/routes/communities.js
const express = require('express')
const { body, param, query } = require('express-validator')
const { auth, optionalAuth } = require('../middleware/auth')
const communitiesController = require('../controllers/communities')

const router = express.Router()

// Validation rules
const createCommunityValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Community name must be between 3 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('rules')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rules must be less than 1000 characters'),
]

const updateCommunityValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Community name must be between 3 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('rules')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rules must be less than 1000 characters'),
    body('avatarUrl')  
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),
  body('bannerUrl')   
    .optional()
    .isURL()
    .withMessage('Banner URL must be a valid URL'),
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

const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters')
]

const memberRoleValidation = [
  body('role')
    .isIn(['member', 'admin'])
    .withMessage('Role must be either member or admin')
]

// Routes - Specific routes BEFORE parameterized routes

// Get all communities (public explore page)
router.get('/', optionalAuth, paginationValidation, communitiesController.getAllCommunities)

// Search communities
router.get('/search', optionalAuth, [...searchValidation, ...paginationValidation], communitiesController.searchCommunities)

// Get user's communities (joined/owned/admin)
router.get('/my', auth, paginationValidation, communitiesController.getUserCommunities)

// Create a new community
router.post('/', auth, createCommunityValidation, communitiesController.createCommunity)

// Parameterized routes

// Get community by ID
router.get('/:communityId', optionalAuth, communitiesController.getCommunity)

// Update community (owner/admin only)
router.put('/:communityId', auth, updateCommunityValidation, communitiesController.updateCommunity)

// Delete community (owner only)
router.delete('/:communityId', auth, communitiesController.deleteCommunity)

// Join community
router.post('/:communityId/join', auth, communitiesController.joinCommunity)

// Leave community
router.delete('/:communityId/leave', auth, communitiesController.leaveCommunity)

// Get community members
router.get('/:communityId/members', optionalAuth, paginationValidation, communitiesController.getCommunityMembers)

// Update member role (admin/owner only)
router.put('/:communityId/members/:userId', auth, memberRoleValidation, communitiesController.updateMemberRole)

// Remove member (admin/owner only)
router.delete('/:communityId/members/:userId', auth, communitiesController.removeMember)

// Get community posts
router.get('/:communityId/posts', optionalAuth, paginationValidation, communitiesController.getCommunityPosts)

module.exports = router