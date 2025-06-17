// server.js - FIXED VERSION
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')
const { createServer } = require('http')
const { Server } = require('socket.io')

require('dotenv').config()

const app = express()
const server = createServer(app)

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
})

// Make io available to route handlers
app.set('io', io)

// Import and setup socket handlers
let setupSocketHandlers
try {
  const socketModule = require('./src/services/socket')
  setupSocketHandlers = socketModule.setupSocketHandlers
  setupSocketHandlers(io)
} catch (error) {
  console.warn('⚠️  Socket.IO handlers not found, continuing without real-time features')
  console.warn('Error:', error.message)
}

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    'uploads',
    'uploads/messages',
    'uploads/avatars',
    'uploads/media'
  ]
  
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`📁 Created directory: ${dir}`)
    }
  })
}

createDirectories()

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  }
}))

// Rate limiting with different limits for different endpoints
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API rate limit
app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, 'Too many API requests'))

// Stricter limits for auth endpoints
app.use('/api/auth/login', createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts'))
app.use('/api/auth/register', createRateLimit(60 * 60 * 1000, 3, 'Too many registration attempts'))

// Messages rate limit (more generous for real-time chat)
app.use('/api/messages/', createRateLimit(1 * 60 * 1000, 100, 'Too many message requests'))

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:3000", // For development
      "http://127.0.0.1:5173"
    ]
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Body parsing middleware with increased limits for file uploads
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}))

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Serve uploaded files with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path, stat) => {
    // Set proper content types
    const ext = path.split('.').pop().toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`)
    } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
      res.setHeader('Content-Type', `video/${ext}`)
      res.setHeader('Accept-Ranges', 'bytes') // Enable video seeking
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      res.setHeader('Content-Type', `audio/${ext}`)
      res.setHeader('Accept-Ranges', 'bytes') // Enable audio seeking
    } else if (ext === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
    }
    
    // Enable CORS for media files
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Range')
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
  }
}))

// Health check with detailed information
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    socketConnections: io.engine.clientsCount
  }
  
  res.status(200).json(healthCheck)
})

// API root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Media API Server',
    version: '2.0.0',
    docs: '/api',
    health: '/health',
    features: [
      'Authentication & Authorization',
      'Real-time Messaging',
      'Posts & Social Feed',
      'Friends System',
      'File Uploads',
      'Leaderboard & Gamification'
    ]
  })
})

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Social Media API v2.0',
    documentation: {
      auth: {
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login', 
          'POST /api/auth/logout',
          'GET /api/auth/profile',
          'PUT /api/auth/profile'
        ]
      },
      messages: {
        endpoints: [
          'GET /api/messages/conversations',
          'POST /api/messages/conversations',
          'GET /api/messages/conversations/:id/messages',
          'POST /api/messages/conversations/:id/messages',
          'PUT /api/messages/conversations/:id/read'
        ],
        realtime: 'Socket.io enabled for real-time messaging'
      },
      posts: {
        endpoints: [
          'GET /api/posts/feed',
          'POST /api/posts',
          'GET /api/posts/:id',
          'DELETE /api/posts/:id',
          'POST /api/posts/:id/like'
        ]
      },
      friends: {
        endpoints: [
          'POST /api/friends/request/:userId',
          'PUT /api/friends/request/:requestId',
          'GET /api/friends/list',
          'GET /api/friends/requests'
        ]
      },
      upload: {
        endpoints: [
          'POST /api/upload/media',
          'POST /api/upload/avatar',
          'POST /api/messages/upload/media'
        ]
      },
      leaderboard: {
        endpoints: [
          'GET /api/leaderboard',
          'GET /api/leaderboard/me',
          'GET /api/leaderboard/top'
        ]
      }
    },
    websocket: {
      url: '/socket.io',
      events: [
        'message:new',
        'conversation:created',
        'typing:start',
        'typing:stop',
        'user:online',
        'user:offline'
      ]
    }
  })
})

// Safe route loading with error handling
const loadRoutes = () => {
  console.log('🔍 Loading routes...')
  
  const routeConfigs = [
    { path: '/api/auth', file: './src/routes/auth', name: 'auth' },
    { path: '/api/users', file: './src/routes/users', name: 'users' }, 
    { path: '/api/friends', file: './src/routes/friends', name: 'friends' },
    { path: '/api/posts', file: './src/routes/posts', name: 'posts' },
      { path: '/api/communities', file: './src/routes/communities', name: 'communities' },
    { path: '/api/upload', file: './src/routes/upload', name: 'upload' },
    { path: '/api/messages', file: './src/routes/messages', name: 'messages' },
    { path: '/api/leaderboard', file: './src/routes/leaderboard', name: 'leaderboard' },
    { path: '/api/search', file: './src/routes/search', name: 'search' }

  ]

  routeConfigs.forEach(({ path, file, name }) => {
    try {
      console.log(`  Loading ${path} from ${file}...`)
      const routes = require(file)
      app.use(path, routes)
      console.log(`  ✅ Mounted ${path}`)
    } catch (error) {
      console.error(`  ❌ Failed to load ${name} routes:`, error.message)
      console.error(`     File: ${file}`)
      console.error(`     Error: ${error.stack}`)
      // Continue loading other routes even if one fails
    }
  })
  
  console.log('✅ Route loading completed')
}

// Load all routes
loadRoutes()

// Websocket connection logging
io.on('connection', (socket) => {
  console.log(`📱 Socket connected: ${socket.id} (User: ${socket.userId || 'unknown'})`)
  
  socket.on('disconnect', (reason) => {
    console.log(`📱 Socket disconnected: ${socket.id} (${reason})`)
  })
})

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available: '/api'
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack)
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    })
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      field: err.path
    })
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    })
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    })
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    })
  }
  
  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS policy violation'
    })
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large'
    })
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      message: 'Too many files'
    })
  }
  
  // Default error response
  const statusCode = err.status || err.statusCode || 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : err.message
  
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  })
})

// Server configuration
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err)
      process.exit(1)
    }
    
    console.log('✅ Server closed successfully')
    
    // Close database connections
    try {
      const prisma = require('./src/db')
      prisma.$disconnect()
        .then(() => {
          console.log('✅ Database disconnected')
          process.exit(0)
        })
        .catch((err) => {
          console.error('❌ Database disconnect error:', err)
          process.exit(1)
        })
    } catch (error) {
      console.log('⚠️  Database connection already closed')
      process.exit(0)
    }
  })
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Start server
server.listen(PORT, HOST, () => {
  console.log('\n🚀 ================================')
  console.log('🚀 Social Media API Server Started')
  console.log('🚀 ================================')
  console.log(`📍 Server: http://${HOST}:${PORT}`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📊 Health: http://${HOST}:${PORT}/health`)
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api`)
  console.log(`📁 Static Files: http://${HOST}:${PORT}/uploads`)
  console.log(`⚡ WebSocket: ws://${HOST}:${PORT}/socket.io`)
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
  console.log('🚀 ================================\n')
  
  // Log initial socket server status
  console.log(`📱 Socket.io server ready for connections`)
  console.log(`📱 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`)
})

// Export for testing
module.exports = { app, server, io }