// src/controllers/auth.js
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const prisma = require('../db')
const emailService = require('../services/emailService') 
const referralService = require('../services/referralService')

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  )
  
  return { accessToken, refreshToken }
}

const register = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, firstName, lastName, referralCode } = req.body

    // Normalize username and email
    const normalizedUsername = username.toLowerCase()
    const normalizedEmail = email ? email.toLowerCase() : null

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' })
    }

    // Check if email already exists
    if (normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate referral code immediately (to avoid null issues)
    const generateReferralCode = (username) => {
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 6)
      return `${username.substring(0, 4).toUpperCase()}${timestamp}${random}`.toUpperCase()
    }

    const userReferralCode = generateReferralCode(normalizedUsername)

    // Create user WITH generated referral code
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        gumballs: 0,
        isEmailVerified: false,
        emailRequired: !!normalizedEmail,
        // Provide actual values instead of null
        referralCode: userReferralCode,  // Generated immediately
        referredBy: null,                // This will be set by referral tracking
        totalReferrals: 0,
        activeReferrals: 0,
        referralEarnings: 0,
        profileCompleted: false          // NEW: Track if profile is completed
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        isEmailVerified: true,
        emailRequired: true,
        createdAt: true
      }
    })

    // MODIFIED: Only track referral relationship, don't award rewards yet
    if (referralCode) {
      try {
        console.log(`Tracking referral signup for user ${user.username} with code ${referralCode}`)
        await referralService.trackReferralSignup(user.id, referralCode.toUpperCase())
        console.log(`Referral relationship tracked - rewards will be given after profile completion`)
      } catch (referralError) {
        console.error('Referral tracking failed:', referralError)
        // Continue with registration even if referral tracking fails
      }
    }

    // Rest of your registration logic (email verification, etc.)
    // If email provided, send verification code
    if (normalizedEmail && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      try {
        const verificationCode = emailService.generateVerificationCode()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        await prisma.emailVerificationCode.create({
          data: {
            code: verificationCode,
            email: normalizedEmail,
            userId: user.id,
            expiresAt
          }
        })

        // Send verification email
        await emailService.sendVerificationEmail(normalizedEmail, verificationCode, user.username)

        return res.status(201).json({
          message: 'User registered successfully. Please check your email for verification code.',
          user,
          requiresVerification: true
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        return res.status(201).json({
          message: 'User registered successfully. Email verification unavailable.',
          user,
          requiresVerification: true
        })
      }
    } else {
      // No email verification required
      return res.status(201).json({
        message: 'User registered successfully.',
        user,
        requiresVerification: false
      })
    }

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { username, password, adminRequest } = req.body
    const normalizedUsername = username.toLowerCase()

    // Find user by username (keep it simple like your original system)
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // 🆕 ADMIN REQUEST HANDLING
    if (adminRequest) {
      // If this is an admin login request, verify admin role
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          message: 'Admin access required',
          error: 'Insufficient privileges'
        })
      }
      
      console.log(`🔐 Admin login: ${user.username} (${user.role})`)
    }

    // Check if email verification is required (skip for admin requests)
    if (!adminRequest && user.emailRequired && !user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      })
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id)

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    // 🆕 Different response for admin vs regular login
    if (adminRequest) {
      res.json({
        message: 'Admin login successful',
        user: userWithoutPassword,
        token: accessToken,  // Admin dashboard expects 'token'
        refreshToken
      })
    } else {
      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        accessToken,
        refreshToken
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}


const logout = async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        birthDate: true,
        avatarUrl: true,
        bannerUrl: true,
        gumballs: true,
        isEmailVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            friendships1: true,
            friendships2: true,
            communities: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ 
      user: {
        ...user,
        friendsCount: user._count.friendships1 + user._count.friendships2
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { firstName, lastName, bio, location, birthDate, avatarUrl, bannerUrl } = req.body

    // Get current user to check profile completion status
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        firstName: true,
        lastName: true,
        profileCompleted: true,
        referredBy: true
      }
    })

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    const updateData = {}
    
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    if (bio !== undefined) updateData.bio = bio?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (birthDate) updateData.birthDate = new Date(birthDate)
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl?.trim() || null
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl?.trim() || null

    // Check if this is the first time completing profile (firstName and lastName are being set)
    const isFirstTimeCompletion = !currentUser.profileCompleted && 
                                  !currentUser.firstName && 
                                  !currentUser.lastName && 
                                  updateData.firstName && 
                                  updateData.lastName

    if (isFirstTimeCompletion) {
      updateData.profileCompleted = true
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        birthDate: true,
        avatarUrl: true,
        bannerUrl: true,
        gumballs: true,
        isEmailVerified: true,
        createdAt: true
      }
    })

    // NEW: Process referral rewards after profile completion
    if (isFirstTimeCompletion && currentUser.referredBy) {
      try {
        console.log(`Processing referral rewards for completed profile: ${updatedUser.username}`)
        await referralService.processReferralRewards(req.user.id, currentUser.referredBy)
        console.log(`Referral rewards processed successfully`)
        
        // Refresh user data to include updated gumballs
        const userWithUpdatedGumballs = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            bio: true,
            location: true,
            birthDate: true,
            avatarUrl: true,
            bannerUrl: true,
            gumballs: true,
            isEmailVerified: true,
            createdAt: true
          }
        })
        
        res.json({ 
          message: 'Profile updated successfully! Welcome bonus awarded.',
          user: userWithUpdatedGumballs 
        })
        return
      } catch (referralError) {
        console.error('Failed to process referral rewards:', referralError)
        // Continue with normal response even if referral processing fails
      }
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Email verification function
const verifyEmail = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, code } = req.body
    const normalizedEmail = email.toLowerCase()

    console.log(`Verifying email: ${normalizedEmail} with code: ${code}`)

    // Find the verification code
    const verificationRecord = await prisma.emailVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code: code,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    })

    if (!verificationRecord) {
      console.log('Invalid or expired verification code')
      return res.status(400).json({ message: 'Invalid or expired verification code' })
    }

    // Mark user as verified and mark code as used
    const [updatedUser, updatedCode] = await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationRecord.userId },
        data: { isEmailVerified: true },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          gumballs: true,
          isEmailVerified: true,
          createdAt: true
        }
      }),
      prisma.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true }
      })
    ])

    // Generate tokens for auto-login
    const { accessToken, refreshToken } = generateTokens(updatedUser.id)

    console.log('Email verified successfully')

    res.json({
      message: 'Email verified successfully!',
      user: updatedUser,
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Resend verification code
const resendVerificationCode = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const normalizedEmail = email.toLowerCase()

    console.log(`Resending verification code to: ${normalizedEmail}`)

    // Find user with this email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' })
    }

    // Invalidate old codes
    await prisma.emailVerificationCode.updateMany({
      where: {
        email: normalizedEmail,
        isUsed: false
      },
      data: { isUsed: true }
    })

    // Generate new code
    const verificationCode = emailService.generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.emailVerificationCode.create({
      data: {
        code: verificationCode,
        email: normalizedEmail,
        userId: user.id,
        expiresAt
      }
    })

    // Send verification email
    await emailService.sendVerificationEmail(normalizedEmail, verificationCode, user.username)

    console.log('Verification code resent successfully')

    res.json({ 
      message: 'Verification code sent! Please check your email.' 
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Forgot password function
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const normalizedEmail = email.toLowerCase()

    console.log(`🔄 FORGOT PASSWORD - Email: ${normalizedEmail}`)

    // Find user with this email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, username: true, email: true }
    })

    if (!user) {
      console.log('❌ User not found')
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account with this email exists, you will receive a password reset link.' 
      })
    }

    console.log(`👤 User found: ${user.username}`)

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true }
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt
      }
    })

    console.log('💾 Reset token saved to database')

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, resetToken, user.username)
      console.log('📤 Reset email sent successfully')
    } catch (emailError) {
      console.error('📤 Failed to send reset email:', emailError)
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.' 
      })
    }

    console.log('✅ FORGOT PASSWORD - SUCCESS')

    res.json({ 
      message: 'If an account with this email exists, you will receive a password reset link.' 
    })
  } catch (error) {
    console.error('❌ FORGOT PASSWORD - ERROR:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Reset password function
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, password } = req.body

    console.log(`🔄 RESET PASSWORD - Token: ${token?.substring(0, 8)}...`)

    // Hash the provided token to match database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    console.log('🔒 Token hashed for database lookup')

    // Find valid reset token
    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    console.log('🔍 Database lookup completed. Token found:', !!resetTokenRecord)

    if (!resetTokenRecord) {
      console.log('❌ Invalid or expired token')
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    console.log('👤 User for reset:', resetTokenRecord.user.username)

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)
    console.log('🔒 Password hashed successfully')

    // Use transaction to update password and mark token as used
    const [updatedUser, updatedToken] = await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { password: hashedPassword },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { isUsed: true }
      })
    ])

    console.log('💾 Password updated and token marked as used')

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeConfirmationEmail(
        resetTokenRecord.user.email, 
        resetTokenRecord.user.username
      )
      console.log('📤 Password change confirmation email sent')
    } catch (emailError) {
      console.error('📤 Failed to send confirmation email:', emailError)
      // Continue anyway
    }

    console.log('✅ RESET PASSWORD - SUCCESS')
    res.json({
      message: 'Password reset successfully! You can now log in with your new password.'
    })

  } catch (error) {
    console.error('❌ RESET PASSWORD - ERROR:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  resetPassword
}