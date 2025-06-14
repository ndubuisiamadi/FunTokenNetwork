// src/middleware/errorHandler.js - Advanced error handling
const log = require('../services/logger')

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date().toISOString()
    
    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400)
    this.errors = errors
    this.type = 'validation'
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401)
    this.type = 'authentication'
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403)
    this.type = 'authorization'
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404)
    this.type = 'not_found'
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409)
    this.type = 'conflict'
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429)
    this.type = 'rate_limit'
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message
  
  // Log error
  log.error('Error occurred', err, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format'
    error = new ValidationError(message)
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]
    const message = `${field} already exists`
    error = new ConflictError(message)
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }))
    error = new ValidationError('Validation failed', errors)
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token')
  }
  
  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired')
  }
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ValidationError('File too large')
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ValidationError('Invalid file field')
  }
  
  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, false)
  }
  
  // Send error response
  const response = {
    success: false,
    error: {
      message: error.message,
      type: error.type || 'internal_error',
      ...(error.errors && { validation: error.errors }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    },
    timestamp: new Date().toISOString(),
    requestId: req.id
  }
  
  res.status(error.statusCode || 500).json(response)
}

// 404 handler
const notFoundHandler = (req, res) => {
  const error = new NotFoundError('Route')
  
  log.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  })
  
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      type: 'not_found',
      path: req.originalUrl,
      method: req.method
    },
    timestamp: new Date().toISOString()
  })
}

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler
}