// src/controllers/auth.js - SIMPLIFIED ONLINE STATUS VERSION
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

    // Generate referral code
    const generateReferralCode = (username) => {
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 6)
      return `${username.substring(0, 4).toUpperCase()}${timestamp}${random}`.toUpperCase()
    }

    const userReferralCode = generateReferralCode(normalizedUsername)

    // Create user with simple online status initialization
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
        referralCode: userReferralCode,
        referredBy: null,
        totalReferrals: 0,
        activeReferrals: 0,
        referralEarnings: 0,
        profileCompleted: false,
        // Simple initialization - socket will handle actual online status
        isOnline: false,
        lastSeen: new Date()
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
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    })

    console.log(`✅ User registered: ${user.username} (${user.id})`)

    // Track referral if provided
    if (referralCode) {
      try {
        await referralService.trackReferralSignup(user.id, referralCode.toUpperCase())
      } catch (referralError) {
        console.error('Referral tracking failed:', referralError)
      }
    }

    // Handle email verification
    if (normalizedEmail && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      try {
        const verificationCode = emailService.generateVerificationCode()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.emailVerificationCode.create({
          data: {
            code: verificationCode,
            email: normalizedEmail,
            userId: user.id,
            expiresAt
          }
        })

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

// Simplified login - let socket handle online status
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

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Admin request handling
    if (adminRequest) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
          message: 'Admin access required',
          error: 'Insufficient privileges'
        })
      }
    }

    // Check email verification
    if (!adminRequest && user.emailRequired && !user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      })
    }

    // Simple lastSeen update - don't touch isOnline, let socket handle it
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeen: new Date()
        // Don't update isOnline here - socket connection will handle it
      },
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
        role: true,
        isEmailVerified: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    })

    const { accessToken, refreshToken } = generateTokens(user.id)

    console.log(`🔐 User logged in: ${user.username} (socket will handle online status)`)

    if (adminRequest) {
      res.json({
        message: 'Admin login successful',
        user: updatedUser,
        token: accessToken,
        refreshToken
      })
    } else {
      res.json({
        message: 'Login successful',
        user: updatedUser,
        accessToken,
        refreshToken
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Simplified logout - let socket handle online status
const logout = async (req, res) => {
  try {
    const userId = req.user?.id

    if (userId) {
      console.log(`🔐 User logging out: ${req.user.username}`)

      // Simple lastSeen update - don't touch isOnline, let socket handle it
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSeen: new Date()
          // Don't update isOnline here - socket disconnection will handle it
        }
      }).catch(error => {
        console.error('Error updating lastSeen on logout:', error)
      })
    }

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
        isOnline: true,
        lastSeen: true,
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

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        firstName: true,
        lastName: true,
        profileCompleted: true,
        referredBy: true,
        isOnline: true,
        lastSeen: true
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

    const isFirstTimeCompletion = !currentUser.profileCompleted && 
                                  !currentUser.firstName && 
                                  !currentUser.lastName && 
                                  updateData.firstName && 
                                  updateData.lastName

    if (isFirstTimeCompletion) {
      updateData.profileCompleted = true
    }

    // Simple lastSeen update
    updateData.lastSeen = new Date()

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
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    })

    // Process referral rewards if first time completion
    if (isFirstTimeCompletion && currentUser.referredBy) {
      try {
        await referralService.processReferralRewards(req.user.id, currentUser.referredBy)
        
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
            isOnline: true,
            lastSeen: true,
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

const refreshUser = async (req, res) => {
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
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ 
      message: 'User data refreshed successfully',
      user 
    })
  } catch (error) {
    console.error('Refresh user error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const verifyEmail = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, code } = req.body
    const normalizedEmail = email.toLowerCase()

    const verificationRecord = await prisma.emailVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code: code,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    })

    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' })
    }

    // Mark as verified and update lastSeen
    const [updatedUser, updatedCode] = await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationRecord.userId },
        data: { 
          isEmailVerified: true,
          lastSeen: new Date()
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
          isOnline: true,
          lastSeen: true,
          createdAt: true
        }
      }),
      prisma.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true }
      })
    ])

    const { accessToken, refreshToken } = generateTokens(updatedUser.id)

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

const resendVerificationCode = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const normalizedEmail = email.toLowerCase()

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
      where: { email: normalizedEmail, isUsed: false },
      data: { isUsed: true }
    })

    // Generate new code
    const verificationCode = emailService.generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.emailVerificationCode.create({
      data: {
        code: verificationCode,
        email: normalizedEmail,
        userId: user.id,
        expiresAt
      }
    })

    await emailService.sendVerificationEmail(normalizedEmail, verificationCode, user.username)

    res.json({ 
      message: 'Verification code sent! Please check your email.' 
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const normalizedEmail = email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, username: true, email: true }
    })

    if (!user) {
      return res.json({ 
        message: 'If an account with this email exists, you will receive a password reset link.' 
      })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true }
    })

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt
      }
    })

    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, resetToken, user.username)
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.' 
      })
    }

    res.json({ 
      message: 'If an account with this email exists, you will receive a password reset link.' 
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, password } = req.body

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true }
        }
      }
    })

    if (!resetTokenRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and lastSeen
    const [updatedUser, updatedToken] = await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { 
          password: hashedPassword,
          lastSeen: new Date()
        },
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

    try {
      await emailService.sendPasswordChangeConfirmationEmail(
        resetTokenRecord.user.email, 
        resetTokenRecord.user.username
      )
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
    }

    res.json({
      message: 'Password reset successfully! You can now log in with your new password.'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  refreshUser,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  resetPassword
}