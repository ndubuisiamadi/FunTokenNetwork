// src/routes/auth.js
const express = require('express')
const { body } = require('express-validator')
const { auth } = require('../middleware/auth')
const authController = require('../controllers/auth')

const router = express.Router()

// Registration validation - now REQUIRES email
const registerValidation = [
  body('username')
    .isLength({ min: 7, max: 34 })
    .matches(/^[a-zA-Z0-9_]+\.fun$/)
    .withMessage('Username must be 3-30 characters (before .fun), contain only letters, numbers, and underscores, and end with .fun'),
  body('email')  // Remove .optional() to make it required
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
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
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username is required and must be 3-30 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('adminRequest')
    .optional()
    .isBoolean()
    .withMessage('adminRequest must be a boolean')
]


const verifyEmailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be a 6-digit number')
]

const resendCodeValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
]

// Password reset validations
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
]

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
]

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

// Email verification routes
router.post('/verify-email', verifyEmailValidation, authController.verifyEmail)
router.post('/resend-verification', resendCodeValidation, authController.resendVerificationCode)

// Password reset routes
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword)
router.post('/reset-password', resetPasswordValidation, authController.resetPassword)

module.exports = router