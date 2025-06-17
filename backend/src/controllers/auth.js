// src/controllers/auth.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const prisma = require('../db')

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

    const { username, password, firstName, lastName } = req.body

    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase()

    // Check if username already exists (now case-insensitive)
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user - REMOVED email and isVerified
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        gumballs: 0 // Starting gumballs
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        createdAt: true
      }
    })

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id)

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('Registration error:', error)
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

    // Find user by username only
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Update last seen and online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeen: new Date(),
        isOnline: true
      }
    })

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

// ADD THIS LOGOUT METHOD
const logout = async (req, res) => {
  try {
    // Update user's online status to false
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    })

    res.json({
      message: 'Logout successful'
    })
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
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        birthDate: true,
        avatarUrl: true,
        bannerUrl: true,
        gumballs: true,
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
    console.log('=== PROFILE UPDATE START ===')
    console.log('User ID:', req.user?.id)
    console.log('Request body:', req.body)

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array())
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      })
    }

    const { firstName, lastName, bio, location, birthDate, avatarUrl, bannerUrl } = req.body

    // Build update data object - only include fields that exist in schema
    const updateData = {}
    
    if (firstName && firstName.trim()) {
      updateData.firstName = firstName.trim()
    }
    if (lastName && lastName.trim()) {
      updateData.lastName = lastName.trim()
    }
    if (bio !== undefined) {
      updateData.bio = bio.trim() || null  // Allow empty bio
    }
    if (location !== undefined) {
      updateData.location = location.trim() || null  // Allow empty location
    }
    if (birthDate) {
      updateData.birthDate = new Date(birthDate)
    }
    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl
    }
    if (bannerUrl) {
      updateData.bannerUrl = bannerUrl
    }
    
    updateData.updatedAt = new Date()

    console.log('Update data prepared:', updateData)

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        location: true,
        birthDate: true,
        avatarUrl: true,
        bannerUrl: true,
        gumballs: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('Profile updated successfully:', user)
    console.log('=== PROFILE UPDATE END ===')

    res.json({
      message: 'Profile updated successfully',
      user
    })
  } catch (error) {
    console.error('=== PROFILE UPDATE ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('=== END ERROR ===')
    
    // Check for specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'A user with this information already exists',
        error: 'duplicate_constraint'
      })
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'user_not_found'
      })
    }

    // Check for field not found errors
    if (error.message && error.message.includes('Unknown field')) {
      return res.status(400).json({ 
        message: 'Invalid field in request',
        error: 'invalid_field'
      })
    }

    res.status(500).json({ 
      message: 'Internal server error',
      error: 'database_error'
    })
  }
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile
}