// src/controllers/auth.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const prisma = require('../db')
const emailService = require('../services/emailService') // Add this import

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

    const { username, email, password, firstName, lastName } = req.body

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

    // Check if email already exists (now using findUnique)
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

    // Create user
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        gumballs: 0,
        isEmailVerified: false,
        emailRequired: !!normalizedEmail // true if email provided
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
        // Continue without email verification if email fails
        return res.status(201).json({
          message: 'User registered successfully. Email verification unavailable.',
          user,
          requiresVerification: false
        })
      }
    }

    // If no email or email verification disabled, proceed without verification
    const { accessToken, refreshToken } = generateTokens(user.id)

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken,
      requiresVerification: false
    })

  } catch (error) {
    console.error('Registration error:', error)
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

    // Find valid verification code
    const verificationRecord = await prisma.emailVerificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code: code,
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
            lastName: true,
            avatarUrl: true,
            gumballs: true,
            isEmailVerified: true,
            createdAt: true
          }
        }
      }
    })

    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' })
    }

    // Use a transaction to ensure both operations succeed
    const [updatedCode, updatedUser] = await prisma.$transaction([
      prisma.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: { isUsed: true }
      }),
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
      })
    ])

    // Generate tokens for the verified user
    const { accessToken, refreshToken } = generateTokens(updatedUser.id)

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, updatedUser.username)
    } catch (emailError) {
      console.error('Welcome email failed:', emailError)
      // Continue anyway
    }

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

// Now you can use findUnique for email
const resendVerificationCode = async (req, res) => {
  try {
    console.log('🔄 RESEND VERIFICATION - START')
    console.log('Request body:', req.body)
    
    const { email } = req.body

    if (!email) {
      console.log('❌ No email provided')
      return res.status(400).json({ message: 'Email is required' })
    }

    const normalizedEmail = email.toLowerCase()
    console.log('📧 Looking for user with email:', normalizedEmail)

    // Use findUnique since email is now unique
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, username: true, email: true, isEmailVerified: true }
    })

    console.log('👤 User found:', user)

    if (!user) {
      console.log('❌ User not found')
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.isEmailVerified) {
      console.log('❌ Email already verified')
      return res.status(400).json({ message: 'Email is already verified' })
    }

    // Check rate limiting
    const recentCodes = await prisma.emailVerificationCode.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gt: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    })

    console.log('🕒 Recent codes count:', recentCodes)

    if (recentCodes >= 3) {
      console.log('❌ Rate limit exceeded')
      return res.status(429).json({ 
        message: 'Too many verification attempts. Please wait 15 minutes before requesting a new code.' 
      })
    }

    // Mark previous codes as used
    console.log('🗑️ Marking previous codes as used...')
    await prisma.emailVerificationCode.updateMany({
      where: {
        email: normalizedEmail,
        isUsed: false
      },
      data: { isUsed: true }
    })

    // Generate new verification code
    const verificationCode = emailService.generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    
    console.log('🔢 Generated verification code:', verificationCode)
    console.log('⏰ Expires at:', expiresAt)

    // Save verification code
    const savedCode = await prisma.emailVerificationCode.create({
      data: {
        code: verificationCode,
        email: normalizedEmail,
        userId: user.id,
        expiresAt
      }
    })

    console.log('💾 Saved verification code:', savedCode.id)

    // Send verification email
    console.log('📤 Sending verification email...')
    const emailResult = await emailService.sendVerificationEmail(normalizedEmail, verificationCode, user.username)
    console.log('📤 Email service result:', emailResult)

    console.log('✅ RESEND VERIFICATION - SUCCESS')
    res.json({
      message: 'Verification code sent successfully'
    })

  } catch (error) {
    console.error('❌ RESEND VERIFICATION - ERROR:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, password } = req.body
    const normalizedUsername = username.toLowerCase()

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        isEmailVerified: true,
        emailRequired: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check email verification only for users who registered with email requirement
    const isLegacyUser = !user.emailRequired || user.email?.includes('@legacy.placeholder.local')
    
    if (!isLegacyUser && user.email && !user.isEmailVerified && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
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

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken
    })

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

    const updateData = {}
    
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    if (bio !== undefined) updateData.bio = bio?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (birthDate) updateData.birthDate = new Date(birthDate)
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl?.trim() || null
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl?.trim() || null

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

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Update profile error:', error)
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
  resendVerificationCode
}