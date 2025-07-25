// server.js - ENHANCED WITH RELIABILITY FEATURES AND SOCKET INTEGRATION
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')
const { createServer } = require('http')
const { Server } = require('socket.io')

const referralRoutes = require('./src/routes/referrals')

require('dotenv').config()

const app = express()
app.set('trust proxy', 'loopback, linklocal, uniquelocal')
const server = createServer(app)

// Configure Socket.io with CORS (including admin dashboard)
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',    // Main frontend
      'http://localhost:5174',    // Admin dashboard
      'http://192.168.0.159:5173', 
      'http://192.168.235.64:5173', 
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'     // Admin dashboard
    ],
    credentials: true
  },
  // 🔥 ENHANCED: Reliability-focused socket configuration
  pingTimeout: 60000,           // 60 seconds before considering connection dead
  pingInterval: 25000,          // Ping every 25 seconds  
  connectTimeout: 45000,        // 45 seconds to establish connection
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for large message payloads
  transports: ['websocket', 'polling'], // Allow fallback to polling
  allowEIO3: true               // Compatibility with older clients
});

// Make io available to route handlers
app.set('io', io)

// 🔥 ENHANCED: Import and setup socket handlers with error handling
let messagingSocketService = null
try {
  const { MessagingSocketService } = require('./src/services/socket')
  messagingSocketService = new MessagingSocketService(io)
  
  // 🔥 CRITICAL: Make socket service globally accessible for reliability checks
  global.socketService = messagingSocketService
  io.socketService = messagingSocketService
  
  console.log('✅ Enhanced messaging socket service initialized')
  console.log('📊 Socket service features enabled:')
  console.log('   - Auto-delivery when users come online')
  console.log('   - Message retry with exponential backoff')
  console.log('   - Connection state tracking')
  console.log('   - Failed message recovery')
  
} catch (error) {
  console.error('❌ Socket.IO service initialization failed:', error.message)
  console.warn('⚠️  Continuing without real-time features')
}

// 🚀 Initialize ranking scheduler
let rankingScheduler
try {
  const { rankingScheduler: scheduler } = require('./src/services/rankingScheduler')
  rankingScheduler = scheduler
  rankingScheduler.init()
  console.log('✅ Ranking scheduler initialized')
} catch (error) {
  console.warn('⚠️  Ranking scheduler not found, continuing without automated rankings')
  console.warn('Error:', error.message)
}

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    'uploads',
    'uploads/messages',
    'uploads/avatars',
    'uploads/media',
    'logs'  // 🔥 ADDED: For reliability logging
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

// 🔥 ENHANCED: Rate limiting with reliability considerations
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
  // 🔥 ENHANCED: Skip rate limiting for socket health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/socket-stats'
  }
})

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  // General API rate limit
  app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, 'Too many API requests'))

  // Stricter limits for auth endpoints
  app.use('/api/auth/login', createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts'))
  app.use('/api/auth/register', createRateLimit(60 * 60 * 1000, 3, 'Too many registration attempts'))

  // Admin endpoints with special rate limiting
  app.use('/api/admin/', createRateLimit(15 * 60 * 1000, 200, 'Too many admin requests'))

  // 🔥 ENHANCED: More generous limits for messages (reliability requires retries)
  app.use('/api/messages/', createRateLimit(1 * 60 * 1000, 200, 'Too many message requests'))
}

// CORS configuration - UPDATED TO INCLUDE ADMIN DASHBOARD
app.use(cors({
  origin: [
    'http://localhost:5173',    // Main frontend
    'http://localhost:5174',    // Admin dashboard
    'http://localhost:5163',
    'http://192.168.0.159:5173',
    'http://192.168.235.64:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'     // Admin dashboard
  ],
  credentials: true
}));

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

app.use('/api/referrals', referralRoutes)

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

// 🔥 ENHANCED: Health check with socket and reliability information
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    
    // 🔥 SOCKET HEALTH
    socket: {
      connected: io.engine.clientsCount,
      hasService: !!messagingSocketService,
      serviceStats: messagingSocketService ? messagingSocketService.getConnectionStats() : null
    },
    
    // 🔥 RELIABILITY FEATURES
    reliability: {
      messageStatusConstants: !!global.MESSAGE_STATUS,
      socketServiceAvailable: !!global.socketService,
      autoDeliveryEnabled: true,
      retryEnabled: true
    }
  }
  
  res.status(200).json(healthCheck)
})

// 🔥 NEW: Socket statistics endpoint for debugging
app.get('/socket-stats', (req, res) => {
  if (!messagingSocketService) {
    return res.status(503).json({
      error: 'Socket service not available',
      connected: io.engine.clientsCount
    })
  }
  
  const stats = messagingSocketService.getConnectionStats()
  
  res.json({
    timestamp: new Date().toISOString(),
    ...stats,
    io: {
      clientsCount: io.engine.clientsCount,
      rooms: Object.keys(io.sockets.adapter.rooms).length
    }
  })
})

// 🔥 NEW: Reliability test endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/test-reliability', async (req, res) => {
    try {
      const tests = []
      
      // Test socket service availability
      tests.push({
        name: 'Socket Service Available',
        status: !!messagingSocketService,
        details: messagingSocketService ? 'Socket service initialized' : 'Socket service missing'
      })
      
      // Test message status constants
      try {
        const { MESSAGE_STATUS } = require('./src/utils/messageStatus')
        tests.push({
          name: 'Message Status Constants',
          status: !!MESSAGE_STATUS,
          details: Object.keys(MESSAGE_STATUS).join(', ')
        })
      } catch (error) {
        tests.push({
          name: 'Message Status Constants',
          status: false,
          details: error.message
        })
      }
      
      // Test database connectivity
      try {
        const prisma = require('./src/db')
        await prisma.user.count()
        tests.push({
          name: 'Database Connectivity',
          status: true,
          details: 'Database accessible'
        })
      } catch (error) {
        tests.push({
          name: 'Database Connectivity',
          status: false,
          details: error.message
        })
      }
      
      // Test online user tracking
      if (messagingSocketService) {
        const onlineUsers = messagingSocketService.getOnlineUsers()
        tests.push({
          name: 'Online User Tracking',
          status: true,
          details: `${onlineUsers.length} users online`
        })
      }
      
      const allPassed = tests.every(test => test.status)
      
      res.json({
        overall: allPassed ? 'PASS' : 'FAIL',
        timestamp: new Date().toISOString(),
        tests
      })
      
    } catch (error) {
      res.status(500).json({
        overall: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
}

// API root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Media API Server',
    version: '2.1.0',  // 🔥 UPDATED: Version bump for reliability features
    docs: '/api',
    health: '/health',
    socketStats: '/socket-stats',
    features: [
      'Authentication & Authorization',
      'Real-time Messaging with Reliability', // 🔥 UPDATED
      'Message Auto-Retry & Offline Queueing', // 🔥 NEW
      'Connection State Tracking',              // 🔥 NEW
      'Posts & Social Feed',
      'Friends System',
      'File Uploads',
      'Leaderboard & Gamification',
      'Admin Dashboard'
    ],
    // 🔥 NEW: Reliability info
    reliability: {
      autoDelivery: 'Messages auto-deliver when users come online',
      retry: 'Failed messages auto-retry with exponential backoff',
      offline: 'Messages queued when offline, sent when reconnected',
      status: '4-state message status tracking (sent → delivered → read)'
    }
  })
})

// 🔥 ENHANCED: API documentation endpoint with reliability info
app.get('/api', (req, res) => {
  res.json({
    message: 'Social Media API v2.1 - Enhanced Reliability',
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
      admin: {
        endpoints: [
          'GET /api/admin/system/health',
          'GET /api/admin/system/stats',
          'GET /api/admin/users',
          'PUT /api/admin/users/:id',
          'GET /api/admin/tasks',
          'GET /api/admin/analytics/users'
        ],
        description: 'Admin-only endpoints for platform management'
      },
      messages: {
        endpoints: [
          'GET /api/messages/conversations',
          'POST /api/messages/conversations',
          'GET /api/messages/conversations/:id/messages',
          'POST /api/messages/conversations/:id/messages',
          'PUT /api/messages/conversations/:id/read'
        ],
        realtime: 'Socket.io enabled for real-time messaging',
        reliability: {
          autoDelivery: 'Messages auto-deliver when recipients come online',
          retry: 'Socket-level retry with exponential backoff',
          offline: 'Client-side message queuing for offline scenarios',
          status: 'Enhanced 4-state message status tracking'
        }
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
        'message:sent_confirmation',  // 🔥 NEW
        'message:status_updated',     // 🔥 NEW  
        'message:error',              // 🔥 NEW
        'message:retry_success',      // 🔥 NEW
        'messages:read',
        'messages:auto_delivered',    // 🔥 NEW
        'conversation:created',
        'typing:start',
        'typing:stop',
        'user:online',
        'user:offline',
        'users:online_list'           // 🔥 NEW
      ],
      reliability: {
        pingTimeout: '60s',
        pingInterval: '25s',
        autoReconnect: true,
        messageRetry: 'Exponential backoff up to 3 attempts',
        offlineQueue: 'Client-side localStorage queue'
      }
    }
  })
})

console.log('Testing admin route import...')
try {
  const testAdminRoutes = require('./src/routes/admin')
  console.log('✅ Admin routes imported successfully:', typeof testAdminRoutes)
} catch (err) {
  console.error('❌ Admin routes import failed:', err.message)
  console.error('Full error:', err)
}

// Safe route loading with error handling - UPDATED WITH ADMIN ROUTES
const loadRoutes = () => {
  console.log('🔍 Loading routes...')
  
  const routeConfigs = [
    { path: '/api/auth', file: './src/routes/auth', name: 'auth' },
    { path: '/api/users', file: './src/routes/users', name: 'users' }, 
    { path: '/api/friends', file: './src/routes/friends', name: 'friends' },
    { path: '/api/posts', file: './src/routes/posts', name: 'posts' },
    { path: '/api/comments', file: './src/routes/comments', name: 'comments' },
    { path: '/api/communities', file: './src/routes/communities', name: 'communities' },
    { path: '/api/upload', file: './src/routes/upload', name: 'upload' },
    { path: '/api/messages', file: './src/routes/messages', name: 'messages' },
    { path: '/api/leaderboard', file: './src/routes/leaderboard', name: 'leaderboard' },
    { path: '/api/search', file: './src/routes/search', name: 'search' },
    { path: '/api/tasks', file: './src/routes/tasks', name: 'tasks' },
    { path: '/api/admin', file: './src/routes/admin', name: 'admin' }
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
      
      // For admin routes, provide more specific guidance
      if (name === 'admin') {
        console.error(`     💡 Make sure you have created /src/routes/admin.js and /src/controllers/admin.js`)
        console.error(`     💡 Admin dashboard will not be accessible until these files are created`)
      }
      
      // Continue loading other routes even if one fails
    }
  })
  
  console.log('✅ Route loading completed')
}

// Load all routes
loadRoutes()

// 🔥 ENHANCED: Websocket connection logging with reliability info
io.on('connection', (socket) => {
  console.log(`📱 Socket connected: ${socket.id} (User: ${socket.userId || 'unknown'})`)
  
  // Log reliability features status
  if (messagingSocketService) {
    const stats = messagingSocketService.getConnectionStats()
    console.log(`📊 Connection stats: ${stats.totalUsers} users, ${stats.totalConnections} connections`)
  }
  
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
    available: '/api',
    // 🔥 HELPFUL: Suggest reliability endpoints for debugging
    debug: req.originalUrl.includes('socket') || req.originalUrl.includes('reliability') ? {
      healthCheck: '/health',
      socketStats: '/socket-stats',
      reliabilityTest: process.env.NODE_ENV === 'development' ? '/test-reliability' : 'Not available in production'
    } : undefined
  })
})

// 🔥 ENHANCED: Global error handler with reliability context
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack)
  
  // Log additional context for socket-related errors
  if (req.path.includes('message') || req.path.includes('socket')) {
    console.error('🔌 Socket context:', {
      socketAvailable: !!messagingSocketService,
      connectedClients: io.engine.clientsCount,
      userAgent: req.get('User-Agent')
    })
  }
  
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
  
  // 🔥 SOCKET ERRORS
  if (err.message && err.message.includes('socket')) {
    return res.status(503).json({
      message: 'Socket service error',
      available: !!messagingSocketService,
      suggestion: 'Check socket connection and retry'
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

// 🔥 ENHANCED: Graceful shutdown with socket cleanup
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`)
  
  // 🔥 CLEANUP: Disconnect all sockets gracefully
  if (messagingSocketService) {
    console.log('🔌 Disconnecting socket service...')
    try {
      // Notify all clients of impending shutdown
      io.emit('server:shutdown', {
        message: 'Server shutting down, please reconnect in a moment',
        timestamp: new Date()
      })
      
      // Give clients time to process shutdown message
      setTimeout(() => {
        io.close()
      }, 1000)
    } catch (error) {
      console.error('❌ Socket shutdown error:', error)
    }
  }
  
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
          console.log('✅ Graceful shutdown complete')
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

// 🔥 ENHANCED: Start server with comprehensive reliability info
server.listen(PORT, HOST, () => {
  console.log('\n🚀 ====================================')
  console.log('🚀 Social Media API Server Started')
  console.log('🚀 ====================================')
  console.log(`📍 Server: http://${HOST}:${PORT}`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📊 Health: http://${HOST}:${PORT}/health`)
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api`)
  console.log(`📁 Static Files: http://${HOST}:${PORT}/uploads`)
  console.log(`⚡ WebSocket: ws://${HOST}:${PORT}/socket.io`)
  console.log(`🛡️  Admin API: http://${HOST}:${PORT}/api/admin`)
  console.log(`📡 Socket Stats: http://${HOST}:${PORT}/socket-stats`)
  
  // 🔥 RELIABILITY STATUS
  console.log('\n🔧 ====== RELIABILITY FEATURES ======')
  console.log(`📱 Socket Service: ${messagingSocketService ? '✅ Active' : '❌ Disabled'}`)
  console.log(`🔄 Auto-Retry: ${messagingSocketService ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`📦 Auto-Delivery: ${messagingSocketService ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`🔗 Connection Tracking: ${messagingSocketService ? '✅ Enabled' : '❌ Disabled'}`)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🧪 Reliability Test: http://${HOST}:${PORT}/test-reliability`)
  }
  
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
  console.log('🚀 ====================================\n')
  
  // Log initial socket server status
  console.log(`📱 Socket.io server ready for connections`)
  console.log(`📱 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`)
  console.log(`🛡️  Admin dashboard CORS: http://localhost:5174`)
  
  if (messagingSocketService) {
    console.log(`🎯 Reliability features fully operational`)
  } else {
    console.warn(`⚠️  Running without reliability features - socket service failed to initialize`)
  }
})

// Export for testing
module.exports = { app, server, io, messagingSocketService }