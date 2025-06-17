const express = require('express')
const { body } = require('express-validator')
const { auth } = require('../middleware/auth')
const authController = require('../controllers/auth')

const router = express.Router()

// SIMPLIFIED validation rules - NO EMAIL, NO VERIFICATION
const registerValidation = [
  body('username')
    .isLength({ min: 7, max: 34 }) // Minimum 3 chars + '.fun' = 7, max 30 + '.fun' = 34
    .matches(/^[a-zA-Z0-9_]+\.fun$/) // Must be lowercase/uppercase letters, numbers, underscores, ending with .fun
    .withMessage('Username must be 3-30 characters (before .fun), contain only letters, numbers, and underscores, and end with .fun'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters')
]

const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// SIMPLIFIED update profile validation - NO EMAIL FOR NOW
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Must be a valid date')
]

// Routes
router.post('/register', registerValidation, authController.register)
router.post('/login', loginValidation, authController.login)
router.post('/logout', auth, authController.logout)
router.get('/profile', auth, authController.getProfile)
router.put('/profile', auth, updateProfileValidation, authController.updateProfile)

module.exports = router