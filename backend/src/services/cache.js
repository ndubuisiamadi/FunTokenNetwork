// src/services/cache.js - Redis caching service
const Redis = require('ioredis')

class CacheService {
  constructor() {
    this.redis = null
    this.isConnected = false
    this.init()
  }

  init() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4, // IPv4
      }

      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          ...redisConfig,
          maxRetriesPerRequest: 3,
        })
      } else {
        this.redis = new Redis(redisConfig)
      }

      this.redis.on('connect', () => {
        console.log('🔄 Redis connecting...')
      })

      this.redis.on('ready', () => {
        console.log('✅ Redis connected and ready')
        this.isConnected = true
      })

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message)
        this.isConnected = false
      })

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed')
        this.isConnected = false
      })

    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message)
      console.log('⚠️  Continuing without Redis cache')
    }
  }

  // Generic cache methods
  async get(key) {
    if (!this.isConnected) return null
    
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    if (!this.isConnected) return false
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }

  async del(key) {
    if (!this.isConnected) return false
    
    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  async exists(key) {
    if (!this.isConnected) return false
    
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  // Specialized cache methods for the app

  // User cache
  async cacheUser(userId, userData, ttl = 1800) { // 30 minutes
    return await this.set(`user:${userId}`, userData, ttl)
  }

  async getUser(userId) {
    return await this.get(`user:${userId}`)
  }

  async invalidateUser(userId) {
    const keys = [
      `user:${userId}`,
      `user:${userId}:conversations`,
      `user:${userId}:friends`,
      `conversations:user:${userId}:*`
    ]
    
    for (const key of keys) {
      if (key.includes('*')) {
        // Handle wildcard patterns
        const matchingKeys = await this.redis.keys(key)
        if (matchingKeys.length > 0) {
          await this.redis.del(...matchingKeys)
        }
      } else {
        await this.del(key)
      }
    }
  }

  // Conversations cache
  async cacheConversations(userId, conversations, ttl = 900) { // 15 minutes
    return await this.set(`conversations:user:${userId}`, conversations, ttl)
  }

  async getConversations(userId) {
    return await this.get(`conversations:user:${userId}`)
  }

  async invalidateConversations(userId) {
    return await this.del(`conversations:user:${userId}`)
  }

  // Messages cache
  async cacheMessages(conversationId, page, messages, ttl = 1800) { // 30 minutes
    return await this.set(`messages:${conversationId}:page:${page}`, messages, ttl)
  }

  async getMessages(conversationId, page) {
    return await this.get(`messages:${conversationId}:page:${page}`)
  }

  async invalidateMessages(conversationId) {
    const keys = await this.redis.keys(`messages:${conversationId}:*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  // Online users cache
  async cacheOnlineUsers(users, ttl = 300) { // 5 minutes
    return await this.set('users:online', users, ttl)
  }

  async getOnlineUsers() {
    return await this.get('users:online')
  }

  // Leaderboard cache
  async cacheLeaderboard(type, data, ttl = 1800) { // 30 minutes
    return await this.set(`leaderboard:${type}`, data, ttl)
  }

  async getLeaderboard(type) {
    return await this.get(`leaderboard:${type}`)
  }

  async invalidateLeaderboards() {
    const keys = await this.redis.keys('leaderboard:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  // Posts feed cache
  async cacheFeed(userId, page, posts, ttl = 600) { // 10 minutes
    return await this.set(`feed:user:${userId}:page:${page}`, posts, ttl)
  }

  async getFeed(userId, page) {
    return await this.get(`feed:user:${userId}:page:${page}`)
  }

  async invalidateFeed(userId) {
    const keys = await this.redis.keys(`feed:user:${userId}:*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  // Rate limiting
  async checkRateLimit(key, limit, windowSeconds) {
    if (!this.isConnected) return { allowed: true, remaining: limit }
    
    try {
      const current = await this.redis.incr(key)
      
      if (current === 1) {
        await this.redis.expire(key, windowSeconds)
      }
      
      const ttl = await this.redis.ttl(key)
      const remaining = Math.max(0, limit - current)
      
      return {
        allowed: current <= limit,
        remaining,
        resetTime: Date.now() + (ttl * 1000)
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true, remaining: limit }
    }
  }

  // Session management
  async setSession(sessionId, data, ttl = 86400) { // 24 hours
    return await this.set(`session:${sessionId}`, data, ttl)
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`)
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`)
  }

  // Cleanup expired keys
  async cleanup() {
    if (!this.isConnected) return
    
    try {
      console.log('🧹 Running cache cleanup...')
      
      // This is handled automatically by Redis TTL
      // But we can add custom cleanup logic here if needed
      
      console.log('✅ Cache cleanup completed')
    } catch (error) {
      console.error('❌ Cache cleanup error:', error)
    }
  }

  // Health check
  async health() {
    if (!this.isConnected) {
      return {
        status: 'disconnected',
        error: 'Redis not connected'
      }
    }
    
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start
      
      return {
        status: 'healthy',
        latency: `${latency}ms`
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      }
    }
  }

  // Graceful shutdown
  async disconnect() {
    if (this.redis) {
      await this.redis.quit()
      console.log('✅ Redis disconnected gracefully')
    }
  }
}

// Singleton instance
const cacheService = new CacheService()

// Cache middleware for Express
const cacheMiddleware = (ttl = 600, keyGenerator = null) => {
  return async (req, res, next) => {
    if (!cacheService.isConnected) {
      return next()
    }
    
    try {
      // Generate cache key
      const key = keyGenerator 
        ? keyGenerator(req) 
        : `route:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`
      
      // Check cache
      const cachedData = await cacheService.get(key)
      if (cachedData) {
        return res.json(cachedData)
      }
      
      // Store original res.json
      const originalJson = res.json
      
      // Override res.json to cache response
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(key, data, ttl).catch(console.error)
        }
        return originalJson.call(this, data)
      }
      
      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next()
    }
  }
}

module.exports = {
  cacheService,
  cacheMiddleware
}

// src/middleware/performance.js - Performance optimization middleware
const compression = require('compression')
const slowDown = require('express-slow-down')

// Compression middleware
const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false
    }
    // Use compression for all compressible responses
    return compression.filter(req, res)
  },
  level: 6, // Good balance between compression ratio and speed
  threshold: 1024, // Only compress responses larger than 1KB
})

// Slow down middleware for heavy endpoints
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per window at full speed
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  headers: true,
})

// Database query optimization helpers
const optimizeQuery = {
  // Pagination helper
  paginate: (page = 1, limit = 20) => {
    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100) // Max 100 items per page
    const skip = (pageNum - 1) * limitNum
    
    return { skip, take: limitNum, page: pageNum, limit: limitNum }
  },
  
  // Select only necessary fields
  selectUser: {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
    isOnline: true,
    lastSeen: true,
    gumballs: true
  },
  
  selectConversation: {
    id: true,
    name: true,
    isGroup: true,
    lastActivity: true,
    createdAt: true
  },
  
  selectMessage: {
    id: true,
    content: true,
    mediaUrls: true,
    messageType: true,
    createdAt: true,
    isRead: true,
    senderId: true
  }
}

// Memory usage monitoring
const monitorMemory = () => {
  const usage = process.memoryUsage()
  const formatMemory = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100
  
  return {
    rss: `${formatMemory(usage.rss)} MB`,
    heapTotal: `${formatMemory(usage.heapTotal)} MB`,
    heapUsed: `${formatMemory(usage.heapUsed)} MB`,
    external: `${formatMemory(usage.external)} MB`,
    arrayBuffers: `${formatMemory(usage.arrayBuffers)} MB`
  }
}

// Graceful degradation for heavy operations
const gracefulDegradation = {
  async withFallback(primaryOperation, fallbackOperation, timeout = 5000) {
    return Promise.race([
      primaryOperation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]).catch(async (error) => {
      console.warn('Primary operation failed, using fallback:', error.message)
      return await fallbackOperation()
    })
  }
}

module.exports = {
  compressionMiddleware,
  speedLimiter,
  optimizeQuery,
  monitorMemory,
  gracefulDegradation
}