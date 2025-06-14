// src/services/logger.js - Production logging service
const winston = require('winston')
const path = require('path')
const fs = require('fs')

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    if (meta && Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    return log
  })
)

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'social-media-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
})

// Enhanced logging methods
const log = {
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, error = null, meta = {}) => {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    }
    logger.error(message, errorMeta)
  },
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Request logging
  request: (req, res, duration) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Error', meta)
    } else {
      logger.info('HTTP Request', meta)
    }
  },
  
  // Database operation logging
  database: (operation, table, duration, error = null) => {
    const meta = {
      operation,
      table,
      duration: `${duration}ms`
    }
    
    if (error) {
      log.error(`Database ${operation} failed on ${table}`, error, meta)
    } else {
      logger.debug(`Database ${operation} on ${table}`, meta)
    }
  },
  
  // Socket event logging
  socket: (event, userId, data = {}) => {
    logger.info('Socket Event', {
      event,
      userId,
      data
    })
  },
  
  // Security event logging
  security: (event, userId = null, details = {}) => {
    logger.warn('Security Event', {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    })
  }
}

module.exports = log