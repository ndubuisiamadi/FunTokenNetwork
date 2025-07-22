// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken')
const prisma = require('../db')

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        role: true,  // 🆕 ADDED - Required for admin authentication
        email: true  // 🆕 ADDED - May be needed for admin functions
      }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' })
    }
    next(error)
  }
}

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        role: true,  // 🆕 ADDED
        email: true  // 🆕 ADDED
      }
    })

    if (user) {
      req.user = user
    }
    
    next()
  } catch (error) {
    // For optional auth, ignore token errors and continue
    next()
  }
}

module.exports = { auth, optionalAuth }