// backend/src/controllers/admin.js - COMPLETE IMPLEMENTATION WITH ERROR HANDLING
const prisma = require('../db')
const log = require('../services/logger')

// ===================================
// IN-MEMORY CACHING SYSTEM
// ===================================

const statsCache = new Map()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes
const HEALTH_CACHE_DURATION = 30 * 1000 // 30 seconds for health checks

// Helper function to get cached data or compute fresh data
const getCachedData = async (key, computeFn, duration = CACHE_DURATION) => {
  const cached = statsCache.get(key)
  
  // Return cached data if it's still fresh
  if (cached && Date.now() - cached.timestamp < duration) {
    return { data: cached.data, fromCache: true, age: Date.now() - cached.timestamp }
  }
  
  try {
    // Compute fresh data
    const data = await computeFn()
    
    // Cache the result
    statsCache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    return { data, fromCache: false, age: 0 }
  } catch (error) {
    // If computation fails but we have stale cache, use it
    if (cached) {
      log.warn(`Using stale cache for ${key} due to error`, error)
      return { data: cached.data, fromCache: true, stale: true, age: Date.now() - cached.timestamp }
    }
    throw error
  }
}

// Helper function to log admin actions
const logAdminAction = async (adminId, action, targetType = null, targetId = null, details = null) => {
  try {
    console.log(`[ADMIN ACTION] Admin ${adminId}: ${action}`, {
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

// ===================================
// CACHED SYSTEM HEALTH & MONITORING
// ===================================

const getSystemHealth = async (req, res) => {
  try {
    const startTime = Date.now()
    
    // 🔧 FIXED: MongoDB-compatible database health check
    let dbStatus = 'healthy'
    let dbResponseTime = 0
    let userCount = 0
    
    try {
      const dbStart = Date.now()
      // Use a simple count query instead of $queryRaw (MongoDB compatible)
      userCount = await prisma.user.count()
      dbResponseTime = Date.now() - dbStart
      dbStatus = 'healthy'
    } catch (error) {
      dbStatus = 'unhealthy'
      console.error('Database health check failed:', error)
    }
    
    // Get system info
    const serverResponseTime = Date.now() - startTime
    
    const health = {
      status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        userCount: userCount,
        provider: 'mongodb' // Explicitly show we're using MongoDB
      },
      server: {
        responseTime: serverResponseTime,
        nodeVersion: process.version,
        platform: process.platform
      },
      cache: {
        size: statsCache.size,
        hitRate: '95%' // Placeholder
      }
    }

    // Cache for shorter duration due to frequent updates
    statsCache.set('system-health', {
      data: health,
      timestamp: Date.now()
    })

    console.log('✅ System health check completed:', health.status)
    res.json(health)
    
  } catch (error) {
    console.error('❌ System health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: {
        status: 'error',
        provider: 'mongodb'
      }
    })
  }
}


const getSystemStats = async (req, res) => {
  try {
    const result = await getCachedData('system_stats', async () => {
      // User statistics
      const [totalUsers, new24hUsers, new7dUsers, new30dUsers, active24hUsers] = await Promise.allSettled([
        prisma.user.count(),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.user.count({
          where: {
            lastSeen: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      // Content statistics
      const [totalPosts, postsLast24h, totalComments, commentsLast24h] = await Promise.allSettled([
        prisma.post.count(),
        prisma.post.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.comment.count(),
        prisma.comment.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      // Task statistics
      const [totalTasks, activeTasks, completedLast24h, totalRewardsData] = await Promise.allSettled([
        prisma.task.count(),
        prisma.task.count({ where: { isActive: true } }),
        prisma.userTask.count({
          where: {
            status: 'completed',
            completedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.userTask.aggregate({
          where: { status: 'completed' },
          _sum: { reward: true }
        })
      ])

      return {
        users: {
          total: totalUsers.status === 'fulfilled' ? totalUsers.value : 0,
          new24h: new24hUsers.status === 'fulfilled' ? new24hUsers.value : 0,
          new7d: new7dUsers.status === 'fulfilled' ? new7dUsers.value : 0,
          new30d: new30dUsers.status === 'fulfilled' ? new30dUsers.value : 0,
          active24h: active24hUsers.status === 'fulfilled' ? active24hUsers.value : 0
        },
        content: {
          totalPosts: totalPosts.status === 'fulfilled' ? totalPosts.value : 0,
          postsLast24h: postsLast24h.status === 'fulfilled' ? postsLast24h.value : 0,
          totalComments: totalComments.status === 'fulfilled' ? totalComments.value : 0,
          commentsLast24h: commentsLast24h.status === 'fulfilled' ? commentsLast24h.value : 0
        },
        tasks: {
          total: totalTasks.status === 'fulfilled' ? totalTasks.value : 0,
          active: activeTasks.status === 'fulfilled' ? activeTasks.value : 0,
          completedLast24h: completedLast24h.status === 'fulfilled' ? completedLast24h.value : 0,
          totalRewardsDistributed: totalRewardsData.status === 'fulfilled' && totalRewardsData.value?._sum?.reward ? 
            totalRewardsData.value._sum.reward : 0
        },
        computedAt: new Date().toISOString()
      }
    })
    
    res.json({
      ...result.data,
      timestamp: new Date().toISOString(),
      cache: {
        hit: result.fromCache,
        age: Math.round(result.age / 1000), // age in seconds
        stale: result.stale || false
      }
    })
    
  } catch (error) {
    console.error('System stats failed:', error)
    log.error('Failed to get system stats', error)
    res.status(500).json({ message: 'Failed to retrieve system statistics' })
  }
}

const getSystemLogs = async (req, res) => {
  try {
    const { level = 'info', limit = 100, offset = 0 } = req.query
    
    res.json({
      logs: [],
      pagination: {
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      message: 'Log system integration pending'
    })
  } catch (error) {
    log.error('Failed to get system logs', error)
    res.status(500).json({ message: 'Failed to retrieve system logs' })
  }
}

// ===================================
// ADMIN AUTHENTICATION
// ===================================

const getAdminProfile = async (req, res) => {
  try {
    // Since we're here, the user already passed admin auth middleware
    // Just return their profile with confirmation of admin status
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        createdAt: true,
        lastSeen: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Double-check admin role (redundant but safe)
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    res.json({
      user: {
        ...user,
        isAdmin: true,
        adminLevel: user.role === 'super_admin' ? 'super' : 'standard'
      },
      sessionValid: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    log.error('Failed to get admin profile', error)
    res.status(500).json({ message: 'Failed to retrieve admin profile' })
  }
}

// ===================================
// CACHE MANAGEMENT ENDPOINTS
// ===================================

const clearCache = async (req, res) => {
  try {
    const cacheKeys = Array.from(statsCache.keys())
    statsCache.clear()
    
    log.info('Admin cache cleared', { 
      adminId: req.user.id, 
      clearedKeys: cacheKeys.length 
    })
    
    res.json({ 
      message: 'Cache cleared successfully',
      clearedKeys: cacheKeys.length,
      keys: cacheKeys
    })
  } catch (error) {
    log.error('Failed to clear cache', error)
    res.status(500).json({ message: 'Failed to clear cache' })
  }
}

const getCacheStatus = async (req, res) => {
  try {
    const cacheInfo = Array.from(statsCache.entries()).map(([key, value]) => ({
      key,
      age: Math.round((Date.now() - value.timestamp) / 1000),
      expires: Math.max(0, Math.round((CACHE_DURATION - (Date.now() - value.timestamp)) / 1000))
    }))
    
    res.json({
      cacheSize: statsCache.size,
      entries: cacheInfo,
      settings: {
        defaultDuration: CACHE_DURATION / 1000,
        healthDuration: HEALTH_CACHE_DURATION / 1000
      }
    })
  } catch (error) {
    log.error('Failed to get cache status', error)
    res.status(500).json({ message: 'Failed to get cache status' })
  }
}

// ===================================
// USER MANAGEMENT - FIXED IMPLEMENTATION
// ===================================

const getAllUsers = async (req, res) => {
  try {
    console.log('🔍 getAllUsers called with query:', req.query)
    
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      level = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query
    
    console.log('📊 Parsed parameters:', { page, limit, search, role, status, level, sortBy, sortOrder })
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)
    
    // Build where clause
    const where = {}
    
    // Search filter
    if (search && search.trim() !== '') {
      where.OR = [
        { username: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } }
      ]
    }
    
    // Role filter
    if (role && role !== '' && role !== 'all') {
      where.role = role
    }
    
    // Status filter
    if (status && status !== '' && status !== 'all') {
      if (status === 'active') {
        where.isEmailVerified = true
      } else if (status === 'suspended') {
        where.isEmailVerified = false
      } else if (status === 'banned') {
        where.role = 'banned'
      }
    }
    
    // Level filter
    if (level && level.trim() !== '') {
      where.level = { contains: level.trim(), mode: 'insensitive' }
    }
    
    console.log('🎯 Prisma where clause:', JSON.stringify(where, null, 2))
    
    // Execute main user query
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          level: true,
          gumballs: true,
          isEmailVerified: true,
          createdAt: true,
          lastSeen: true,
          avatarUrl: true, // ✅ VERIFY this line is present
          isOnline: true,  // ✅ VERIFY this line is present (for online indicator)
          totalReferrals: true,
          activeReferrals: true,
          referralEarnings: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              UserTask: true,
              likes: true,
              friendships1: true,
              friendships2: true,
              communities: true,
              ownedCommunities: true,
              sentMessages: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])
    
    console.log(`✅ Found ${users.length} users out of ${total} total`)
    
    // 🚀 OPTIMIZED: Batch calculate earnings for all users in this page
    const userIds = users.map(u => u.id)
    
    // Get all referral earnings for these users in one query
    const referralEarnings = await prisma.referralReward.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { amount: true }
    })
    
    // Get all task earnings for these users in one query
    const completedTasks = await prisma.userTask.findMany({
      where: { 
        userId: { in: userIds },
        status: 'completed'
      },
      select: {
        userId: true,
        task: {
          select: {
            reward: true
          }
        }
      }
    })
    
    // Create lookup maps for quick access
    const referralEarningsMap = new Map()
    referralEarnings.forEach(earning => {
      referralEarningsMap.set(earning.userId, earning._sum.amount || 0)
    })
    
    const taskEarningsMap = new Map()
    completedTasks.forEach(userTask => {
      const currentEarnings = taskEarningsMap.get(userTask.userId) || 0
      taskEarningsMap.set(userTask.userId, currentEarnings + (userTask.task?.reward || 0))
    })
    
    // 🔧 ENHANCED: Add real-time earnings to each user
    const usersWithComputedStats = users.map(user => {
      const realReferralEarnings = referralEarningsMap.get(user.id) || 0
      const realTaskEarnings = taskEarningsMap.get(user.id) || 0
      const totalEarnings = realReferralEarnings + realTaskEarnings
      
      return {
        ...user,
        // Computed stats for frontend display
        stats: {
          totalPosts: user._count.posts,
          totalComments: user._count.comments,
          totalTasks: user._count.UserTask,
          totalLikes: user._count.likes,
          totalFriends: user._count.friendships1 + user._count.friendships2,
          totalCommunities: user._count.communities,
          ownedCommunities: user._count.ownedCommunities,
          totalMessages: user._count.sentMessages,
          // Use direct fields from user model
          totalReferrals: user.totalReferrals,
          activeReferrals: user.activeReferrals,
          // 🔧 FIXED: Use real-time calculated earnings
          referralEarnings: realReferralEarnings,
          taskEarnings: realTaskEarnings,
          totalEarnings: totalEarnings,
          // For comparison/debugging
          storedReferralEarnings: user.referralEarnings,
          earningsDiscrepancy: realReferralEarnings !== user.referralEarnings,
          // Show in gumballs field what they actually earned vs stored
          actualGumballs: totalEarnings,
          storedGumballs: user.gumballs
        }
      }
    })
    
    res.json({
      users: usersWithComputedStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('❌ Failed to get all users:', error)
    log.error('Failed to get all users', error)
    res.status(500).json({ 
      message: 'Failed to retrieve users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const getUserStats = async (req, res) => {
  try {
    console.log('📊 Fetching user statistics...')
    
    // Calculate time ranges
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    
    // Run all queries in parallel for better performance
    const [
      totalUsers,
      activeUsers24h,
      newUsersLast7d,
      newUsersLastWeek,
      unverifiedUsers, // Using this instead of suspended users for now
      usersWithoutProfiles
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Active users in last 24h
      prisma.user.count({
        where: {
          lastSeen: {
            gte: yesterday
          }
        }
      }),
      
      // New users in last 7 days
      prisma.user.count({
        where: {
          createdAt: {
            gte: weekAgo
          }
        }
      }),
      
      // New users in the previous week (for growth calculation)
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastWeek,
            lt: weekAgo
          }
        }
      }),
      
      // 🔧 FIXED: Use actual fields from schema
      // Unverified users (as proxy for problematic accounts)
      prisma.user.count({
        where: {
          isEmailVerified: false
        }
      }),
      
      // Users without completed profiles
      prisma.user.count({
        where: {
          profileCompleted: false
        }
      })
    ])
    
    // Calculate growth percentage
    const growthPercentage = newUsersLastWeek > 0 
      ? ((newUsersLast7d - newUsersLastWeek) / newUsersLastWeek) * 100
      : newUsersLast7d > 0 ? 100 : 0
    
    // Calculate active percentage
    const activePercentage = totalUsers > 0 ? (activeUsers24h / totalUsers) * 100 : 0
    
    // Calculate unverified percentage (proxy for suspended)
    const unverifiedPercentage = totalUsers > 0 ? (unverifiedUsers / totalUsers) * 100 : 0
    
    // Calculate average daily new users
    const avgDaily = newUsersLast7d / 7
    
    const userStats = {
      total: totalUsers,
      growth: Math.round(growthPercentage * 10) / 10, // Round to 1 decimal
      active24h: activeUsers24h,
      activePercentage: Math.round(activePercentage * 10) / 10,
      new7d: newUsersLast7d,
      avgDaily: Math.round(avgDaily * 10) / 10,
      // 🔧 FIXED: Use unverified as proxy for suspended users
      suspended: unverifiedUsers,
      suspendedPercentage: Math.round(unverifiedPercentage * 10) / 10,
      unverified: unverifiedUsers,
      incompleteProfiles: usersWithoutProfiles,
      computedAt: new Date().toISOString()
    }
    
    console.log('✅ User statistics computed:', userStats)
    
    res.json({
      success: true,
      stats: userStats,
      timestamp: new Date().toISOString(),
      note: 'Using isEmailVerified=false as proxy for suspended users until suspension system is implemented'
    })
    
  } catch (error) {
    console.error('❌ Failed to get user stats:', error)
    log.error('Failed to get user stats', error)
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        // Basic user info
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        level: true,
        gumballs: true,  // Stored value
        isEmailVerified: true,
        createdAt: true,
        lastSeen: true,
        avatarUrl: true,
        bio: true,
        location: true,
        isOnline: true,
        totalReferrals: true,
        activeReferrals: true,
        referralEarnings: true,
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true
      }
    })
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // 🚀 Calculate real-time detailed stats
    const [
      completedTasks,
      allTasks,
      postsCount,
      commentsCount,
      likesCount,
      commentLikesCount,
      friendsCount1,
      friendsCount2,
      communitiesCount,
      ownedCommunitiesCount,
      messagesCount,
      sentFriendRequests,
      receivedFriendRequests,
      gumballHistory
    ] = await Promise.all([
      // Calculate real gumballs from completed tasks
      prisma.userTask.findMany({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { not: null }
        },
        select: {
          completedAt: true,
          task: {
            select: {
              reward: true,
              title: true
            }
          }
        },
        orderBy: { completedAt: 'desc' }
      }),
      prisma.userTask.count({ where: { userId: user.id } }),
      prisma.post.count({ where: { userId: user.id } }),
      prisma.comment.count({ where: { userId: user.id } }),
      prisma.like.count({ where: { userId: user.id } }),
      prisma.commentLike.count({ where: { userId: user.id } }),
      prisma.friendship.count({ where: { user1Id: user.id } }),
      prisma.friendship.count({ where: { user2Id: user.id } }),
      prisma.communityMember.count({ where: { userId: user.id } }),
      prisma.community.count({ where: { createdById: user.id } }),
      prisma.message.count({ where: { senderId: user.id } }),
      prisma.friendRequest.count({ where: { senderId: user.id } }),
      prisma.friendRequest.count({ where: { receiverId: user.id } }),
      prisma.gumballHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          change: true,
          reason: true,
          createdAt: true,
          gumballs: true
        }
      })
    ])
    
    // Calculate real gumballs from task completions
    const calculatedGumballs = completedTasks.reduce((total, userTask) => {
      return total + (userTask.task?.reward || 0)
    }, 0)
    
    const gumballDiscrepancy = user.gumballs !== calculatedGumballs
    
    const userWithStats = {
      ...user,
      realTimeGumballs: calculatedGumballs,
      storedGumballs: user.gumballs,
      gumballDiscrepancy,
      recentTaskCompletions: completedTasks.slice(0, 5),
      recentGumballHistory: gumballHistory,
      stats: {
        totalPosts: postsCount,
        totalComments: commentsCount,
        totalTasks: allTasks,
        completedTasks: completedTasks.length,
        totalLikes: likesCount,
        totalCommentLikes: commentLikesCount,
        totalFriends: friendsCount1 + friendsCount2,
        totalCommunities: communitiesCount,
        ownedCommunities: ownedCommunitiesCount,
        totalMessages: messagesCount,
        sentFriendRequests: sentFriendRequests,
        receivedFriendRequests: receivedFriendRequests,
        totalReferrals: user.totalReferrals,
        activeReferrals: user.activeReferrals,
        referralEarnings: user.referralEarnings,
        taskCompletionRate: allTasks > 0 ? Math.round((completedTasks.length / allTasks) * 100) : 0
      }
    }
    
    res.json({ 
      user: userWithStats,
      meta: {
        calculatedAt: new Date().toISOString(),
        realTimeStats: true
      }
    })
  } catch (error) {
    log.error('Failed to get user by ID', error)
    res.status(500).json({ message: 'Failed to retrieve user' })
  }
}

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params
    const allowedUpdates = ['username', 'email', 'role', 'level', 'isEmailVerified', 'firstName', 'lastName']
    const updates = {}
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid updates provided' })
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates
    })
    
    await logAdminAction(req.user.id, 'update_user', 'user', userId, updates)
    
    res.json({ user, message: 'User updated successfully' })
  } catch (error) {
    log.error('Failed to update user', error)
    res.status(500).json({ message: 'Failed to update user' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true }
    })
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Prevent deletion of admin users
    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(403).json({ 
        message: 'Cannot delete admin users',
        error: 'Admin users cannot be deleted for security reasons'
      })
    }
    
    await prisma.user.delete({
      where: { id: userId }
    })
    
    await logAdminAction(req.user.id, 'delete_user', 'user', userId, { username: user.username })
    
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    log.error('Failed to delete user', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
}

const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params
    const { reason, duration } = req.body
    
    // For now, we'll just mark them as unverified as a suspension mechanism
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isEmailVerified: false,
        // You can add suspension fields to your schema later
      }
    })
    
    await logAdminAction(req.user.id, 'suspend_user', 'user', userId, { reason, duration })
    
    res.json({ 
      user, 
      message: 'User suspended successfully',
      suspension: { reason, duration }
    })
  } catch (error) {
    log.error('Failed to suspend user', error)
    res.status(500).json({ message: 'Failed to suspend user' })
  }
}

const unsuspendUser = async (req, res) => {
  try {
    const { userId } = req.params
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isEmailVerified: true
        // Remove suspension fields when you add them
      }
    })
    
    await logAdminAction(req.user.id, 'unsuspend_user', 'user', userId)
    
    res.json({ user, message: 'User unsuspended successfully' })
  } catch (error) {
    log.error('Failed to unsuspend user', error)
    res.status(500).json({ message: 'Failed to unsuspend user' })
  }
}

const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query
    
    res.json({
      activities: [],
      pagination: {
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0
      },
      message: 'Activity logging system pending implementation'
    })
  } catch (error) {
    log.error('Failed to get user activity', error)
    res.status(500).json({ message: 'Failed to retrieve user activity' })
  }
}

// ===================================
// TASK MANAGEMENT - FULL IMPLEMENTATION
// ===================================

const getAllTasks = async (req, res) => {
  try {
    console.log('🔍 getAllTasks called with query:', req.query)
    
    const {
      page = 1,
      limit = 20,
      status = '',
      platform = '',
      type = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query
    
    console.log('📊 Parsed parameters:', { page, limit, status, platform, type, search, sortBy, sortOrder })
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)
    
    const where = {}
    
    // Status filter
    if (status && status !== '' && status !== 'all') {
      if (status === 'active') where.isActive = true
      if (status === 'paused') where.isActive = false
    }
    
    // Type filter
    if (type && type !== '' && type !== 'all') {
      where.type = type
    }
    
    // Platform filter using relation
    if (platform && platform !== '' && platform !== 'all') {
      where.platform = {
        name: { contains: platform, mode: 'insensitive' }
      }
    }
    
    // Search filter
    if (search && search !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    console.log('🎯 Prisma where clause:', JSON.stringify(where, null, 2))
    
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          platform: {
            select: {
              name: true,
              iconUrl: true
            }
          },
          _count: {
            select: {
              userTasks: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ])
    
    console.log(`✅ Found ${tasks.length} tasks out of ${total} total`)
    
    res.json({
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('❌ getAllTasks error:', error)
    log.error('Failed to get all tasks', error)
    res.status(500).json({ message: 'Failed to retrieve tasks', error: error.message })
  }
}

const getTaskStats = async (req, res) => {
  try {
    console.log('📈 getTaskStats called')
    
    const [
      totalTasks,
      activeTasks,
      pausedTasks,
      completedTasks,
      totalRewards,
      totalUserTasks
    ] = await Promise.all([
      prisma.task.count().catch(err => {
        console.error('Error counting total tasks:', err)
        return 0
      }),
      prisma.task.count({ where: { isActive: true } }).catch(err => {
        console.error('Error counting active tasks:', err)
        return 0
      }),
      prisma.task.count({ where: { isActive: false } }).catch(err => {
        console.error('Error counting paused tasks:', err)
        return 0
      }),
      prisma.userTask.count({ where: { status: 'completed' } }).catch(err => {
        console.error('Error counting completed tasks:', err)
        return 0
      }),
      prisma.userTask.aggregate({
        where: { status: 'completed' },
        _sum: { reward: true }
      }).catch(err => {
        console.error('Error aggregating rewards:', err)
        return { _sum: { reward: 0 } }
      }),
      prisma.userTask.count().catch(err => {
        console.error('Error counting total user tasks:', err)
        return 0
      })
    ])
    
    console.log('📊 Raw stats:', {
      totalTasks,
      activeTasks,
      pausedTasks,
      completedTasks,
      totalRewards,
      totalUserTasks
    })
    
    const completionRate = totalUserTasks > 0 ? 
      (completedTasks / totalUserTasks * 100) : 0
    
    const result = {
      total: totalTasks,
      active: activeTasks,
      paused: pausedTasks,
      completed: completedTasks,
      totalRewards: totalRewards?._sum?.reward || 0,
      completionRate: parseFloat(completionRate.toFixed(2))
    }
    
    console.log('✅ Task stats result:', result)
    
    res.json(result)
  } catch (error) {
    console.error('❌ getTaskStats error:', error)
    log.error('Failed to get task stats', error)
    res.status(500).json({ 
      message: 'Failed to retrieve task statistics',
      error: error.message,
      // Provide default stats in case of error
      total: 0,
      active: 0,
      paused: 0,
      completed: 0,
      totalRewards: 0,
      completionRate: 0
    })
  }
}

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params
    const allowedUpdates = ['title', 'description', 'reward', 'difficulty', 'isActive']
    const updates = {}
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid updates provided' })
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updates,
      include: {
        platform: {
          select: {
            name: true,
            iconUrl: true
          }
        }
      }
    })
    
    await logAdminAction(req.user.id, 'update_task', 'task', taskId, updates)
    
    res.json({ task, message: 'Task updated successfully' })
  } catch (error) {
    log.error('Failed to update task', error)
    res.status(500).json({ message: 'Failed to update task' })
  }
}

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params
    
    await prisma.task.delete({
      where: { id: taskId }
    })
    
    await logAdminAction(req.user.id, 'delete_task', 'task', taskId)
    
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    log.error('Failed to delete task', error)
    res.status(500).json({ message: 'Failed to delete task' })
  }
}

const forceCompleteTask = async (req, res) => {
  try {
    const { taskId } = req.params
    const { userId, reason } = req.body
    
    // Find the user task using the composite unique constraint
    const userTask = await prisma.userTask.findFirst({
      where: {
        userId: userId,
        taskId: taskId
      },
      include: {
        task: true
      }
    })
    
    if (!userTask) {
      return res.status(404).json({ message: 'User task not found' })
    }
    
    // Update task status and give reward
    await prisma.$transaction([
      prisma.userTask.update({
        where: { id: userTask.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          verificationNote: `Force completed by admin: ${reason || 'No reason provided'}`
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          gumballs: {
            increment: userTask.task.reward
          }
        }
      })
    ])
    
    await logAdminAction(req.user.id, 'force_complete_task', 'task', taskId, { userId, reason })
    
    res.json({ message: 'Task force completed successfully' })
  } catch (error) {
    log.error('Failed to force complete task', error)
    res.status(500).json({ message: 'Failed to force complete task' })
  }
}

// ===================================
// CONTENT MODERATION (Placeholder implementations)
// ===================================

const getPendingPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    
    // Placeholder implementation
    res.json({
      posts: [],
      pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 },
      message: 'Content moderation system pending implementation'
    })
  } catch (error) {
    log.error('Failed to get pending posts', error)
    res.status(500).json({ message: 'Failed to retrieve pending posts' })
  }
}

const approvePost = async (req, res) => {
  try {
    const { postId } = req.params
    
    // Placeholder implementation
    await logAdminAction(req.user.id, 'approve_post', 'post', postId)
    
    res.json({ message: 'Post approved successfully' })
  } catch (error) {
    log.error('Failed to approve post', error)
    res.status(500).json({ message: 'Failed to approve post' })
  }
}

const rejectPost = async (req, res) => {
  try {
    const { postId } = req.params
    const { reason } = req.body
    
    // Placeholder implementation
    await logAdminAction(req.user.id, 'reject_post', 'post', postId, { reason })
    
    res.json({ message: 'Post rejected successfully' })
  } catch (error) {
    log.error('Failed to reject post', error)
    res.status(500).json({ message: 'Failed to reject post' })
  }
}

const getContentReports = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({
      reports: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      message: 'Content reporting system pending implementation'
    })
  } catch (error) {
    log.error('Failed to get content reports', error)
    res.status(500).json({ message: 'Failed to retrieve content reports' })
  }
}

// ===================================
// ANALYTICS IMPLEMENTATIONS
// ===================================

// Live Data Backend Analytics 
// backend/src/controllers/admin.js - REPLACE YOUR 3 ANALYTICS METHODS

const getUserAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d' } = req.params
    const { includeAdmins = 'false' } = req.query
    
    const excludeAdmins = includeAdmins !== 'true'
    
    console.log(`📊 Getting user analytics: timeframe=${timeframe}, excludeAdmins=${excludeAdmins}`)

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    console.log(`📅 Date range: ${startDate.toISOString()} to ${now.toISOString()}`)

    // 🔧 IMPROVED FILTERING: More explicit role filtering
    let userFilter = {}
    if (excludeAdmins) {
      userFilter = {
        AND: [
          { role: { not: 'admin' } },
          { role: { not: 'super_admin' } }
        ]
      }
    }

    console.log('🔍 User filter applied:', JSON.stringify(userFilter, null, 2))

    // Test the filter first
    const testUsers = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, username: true, role: true },
      take: 5
    })
    console.log(`👥 Sample users with filter:`, testUsers)

    // Get user counts with improved filtering
    const [totalUsers, newUsers, activeUsers] = await Promise.all([
      prisma.user.count({
        where: userFilter
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          createdAt: { gte: startDate }
        }
      }),
      prisma.user.count({
        where: {
          ...userFilter,
          lastSeen: { gte: startDate }
        }
      })
    ])

    console.log(`👥 Filtered counts: Total=${totalUsers}, New=${newUsers}, Active=${activeUsers}`)

    // Get user registrations with proper filtering
    const userRegistrations = await prisma.user.findMany({
      where: {
        ...userFilter,
        createdAt: { gte: startDate }
      },
      select: { 
        createdAt: true,
        username: true,
        role: true  // Include for debugging
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`📊 Registration data: ${userRegistrations.length} users found`)
    console.log('Sample registrations:', userRegistrations.slice(0, 3))

    // Create registration trend - ALWAYS create data structure
    const registrationsByDay = {}
    const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))

    // Initialize all days with 0
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      registrationsByDay[dateKey] = 0
    }

    // Count registrations per day
    userRegistrations.forEach(user => {
      const dateKey = user.createdAt.toISOString().split('T')[0]
      if (registrationsByDay[dateKey] !== undefined) {
        registrationsByDay[dateKey]++
      }
    })

    // Convert to chart format
    const registrationTrend = Object.entries(registrationsByDay)
      .map(([date, count]) => ({ date, registrations: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    console.log(`📈 Registration trend: ${registrationTrend.length} data points`)
    console.log('Sample trend data:', registrationTrend.slice(0, 3))

    // Get top users with filtering
    const topUsers = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        username: true,
        gumballs: true,
        level: true,
        globalRank: true,
        role: true
      },
      orderBy: { gumballs: 'desc' },
      take: 10
    })

    console.log(`🏆 Top users: ${topUsers.length} found`)

    // Get level distribution with filtering
    const levelCounts = await prisma.user.groupBy({
      by: ['level'],
      where: userFilter,
      _count: { id: true }
    })

    const levelDistribution = levelCounts.map(level => ({
      level: level.level || 'Unknown',
      count: level._count.id,
      percentage: totalUsers > 0 ? ((level._count.id / totalUsers) * 100).toFixed(1) : '0'
    }))

    // Calculate growth rate
    const previousPeriodStart = new Date(startDate)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff)
    
    const previousNewUsers = await prisma.user.count({
      where: {
        ...userFilter,
        createdAt: { 
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    })

    const growthRate = previousNewUsers > 0 
      ? (((newUsers - previousNewUsers) / previousNewUsers) * 100).toFixed(1)
      : newUsers > 0 ? 100 : 0

    const response = {
      timeframe,
      includeAdmins: !excludeAdmins,
      summary: {
        totalUsers,
        newUsers,
        activeUsers,
        growthRate: parseFloat(growthRate)
      },
      registrationTrend,
      levelDistribution,
      topUsers,
      debug: {
        excludedAdmins: excludeAdmins,
        appliedFilter: userFilter,
        sampleUsers: testUsers,
        registrationDataPoints: registrationTrend.length,
        hasRegistrationData: registrationTrend.some(item => item.registrations > 0)
      }
    }

    console.log(`✅ Final response summary:`, response.summary)
    console.log(`✅ Debug info:`, response.debug)
    
    res.json(response)

  } catch (error) {
    console.error('❌ User analytics failed:', error)
    res.status(500).json({ 
      message: 'Failed to get user analytics',
      error: error.message 
    })
  }
}

const getEngagementAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query
    const { includeAdmins = 'false' } = req.query
    
    const excludeAdmins = includeAdmins !== 'true'
    
    console.log(`📈 Getting engagement analytics for timeframe: ${timeframe}, excludeAdmins: ${excludeAdmins}`)

    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // 🔧 ADMIN FILTERING: Apply to engagement queries
    const userFilter = excludeAdmins 
      ? { role: { notIn: ['admin', 'super_admin'] } }
      : {}

    // Get engagement counts with admin filtering
    const [totalPosts, totalComments, totalLikes, activeUsers] = await Promise.all([
      prisma.post.count({
        where: {
          createdAt: { gte: startDate },
          ...(excludeAdmins && {
            user: userFilter
          })
        }
      }),
      prisma.comment.count({
        where: {
          createdAt: { gte: startDate },
          ...(excludeAdmins && {
            user: userFilter
          })
        }
      }).catch(() => 0),
      prisma.like.count({
        where: {
          createdAt: { gte: startDate },
          ...(excludeAdmins && {
            user: userFilter
          })
        }
      }).catch(() => 0),
      prisma.user.count({
        where: {
          ...userFilter,
          lastSeen: { gte: startDate }
        }
      })
    ])

    console.log(`💬 Filtered engagement: Posts=${totalPosts}, Comments=${totalComments}, Likes=${totalLikes}`)

    // Get daily engagement data with admin filtering
    const posts = await prisma.post.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(excludeAdmins && {
          user: userFilter
        })
      },
      select: { createdAt: true }
    })

    const comments = await prisma.comment.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(excludeAdmins && {
          user: userFilter
        })
      },
      select: { createdAt: true }
    }).catch(() => [])

    const likes = await prisma.like.findMany({
      where: {
        createdAt: { gte: startDate },
        ...(excludeAdmins && {
          user: userFilter
        })
      },
      select: { createdAt: true }
    }).catch(() => [])

    // Group by day
    const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
    const dailyEngagement = []

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      
      const dayPosts = posts.filter(p => p.createdAt.toISOString().split('T')[0] === dateKey).length
      const dayComments = comments.filter(c => c.createdAt.toISOString().split('T')[0] === dateKey).length
      const dayLikes = likes.filter(l => l.createdAt.toISOString().split('T')[0] === dateKey).length

      dailyEngagement.push({
        date: dateKey,
        posts: dayPosts,
        comments: dayComments,
        likes: dayLikes
      })
    }

    const totalUsers = await prisma.user.count({
      where: userFilter
    })
    const engagementRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0

    const response = {
      timeframe,
      includeAdmins: !excludeAdmins,
      summary: {
        totalPosts,
        totalComments,
        totalLikes,
        activeUsers,
        engagementRate: parseFloat(engagementRate)
      },
      dailyEngagement,
      filters: {
        excludedAdmins: excludeAdmins
      }
    }

    console.log(`✅ Filtered engagement analytics:`, JSON.stringify(response.summary, null, 2))
    res.json(response)

  } catch (error) {
    console.error('❌ Engagement analytics failed:', error)
    res.status(500).json({ 
      message: 'Failed to get engagement analytics',
      error: error.message 
    })
  }
}

const getRevenueAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query
    const { includeAdmins = 'false' } = req.query
    
    const excludeAdmins = includeAdmins !== 'true'
    
    console.log(`💰 Getting revenue analytics for timeframe: ${timeframe}, excludeAdmins: ${excludeAdmins}`)

    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // 🔧 ADMIN FILTERING: Apply to revenue queries
    const userFilter = excludeAdmins 
      ? { role: { notIn: ['admin', 'super_admin'] } }
      : {}

    // Get revenue data with admin filtering
    const [totalGumballs, gumballHistory, completedTasks] = await Promise.all([
      prisma.user.aggregate({
        where: userFilter,
        _sum: { gumballs: true }
      }),
      prisma.gumballHistory.aggregate({
        where: { 
          createdAt: { gte: startDate },
          change: { gt: 0 },
          ...(excludeAdmins && {
            user: userFilter
          })
        },
        _sum: { change: true },
        _count: { id: true }
      }).catch(() => ({ _sum: { change: 0 }, _count: { id: 0 } })),
      prisma.userTask.count({
        where: { 
          status: 'completed',
          completedAt: { gte: startDate },
          ...(excludeAdmins && {
            user: userFilter
          })
        }
      }).catch(() => 0)
    ])

    console.log(`💰 Filtered revenue: Total Gumballs=${totalGumballs._sum.gumballs}, Distributed=${gumballHistory._sum.change}, Tasks=${completedTasks}`)

    const response = {
      timeframe,
      includeAdmins: !excludeAdmins,
      summary: {
        totalGumballsDistributed: gumballHistory._sum.change || 0,
        totalTransactions: gumballHistory._count.id || 0,
        completedTasks,
        totalTaskRewards: completedTasks * 50,
        totalGumballsInSystem: totalGumballs._sum.gumballs || 0
      },
      filters: {
        excludedAdmins: excludeAdmins
      }
    }

    console.log(`✅ Filtered revenue analytics:`, JSON.stringify(response.summary, null, 2))
    res.json(response)

  } catch (error) {
    console.error('❌ Revenue analytics failed:', error)
    res.status(500).json({ 
      message: 'Failed to get revenue analytics',
      error: error.message 
    })
  }
}

// Helper function to get days in timeframe
const getDaysInTimeframe = (timeframe) => {
  switch (timeframe) {
    case '1d': return 1
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    default: return 7
  }
}

const getAnalyticsOverview = async (req, res) => {
  try {
    console.log('📊 Getting analytics overview')

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get key metrics in parallel
    const [
      totalUsers,
      newUsersToday,
      newUsers7d,
      activeUsers24h,
      totalPosts,
      postsToday,
      totalTasks,
      completedTasksToday,
      totalGumballs,
      gumballsDistributedToday,
      totalCommunities,
      newCommunitiesToday
    ] = await Promise.all([
      // User metrics
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: last24h } } }),
      prisma.user.count({ where: { createdAt: { gte: last7d } } }),
      prisma.user.count({ where: { lastSeen: { gte: last24h } } }),
      
      // Content metrics
      prisma.post.count(),
      prisma.post.count({ where: { createdAt: { gte: last24h } } }),
      
      // Task metrics
      prisma.task.count(),
      prisma.userTask.count({ 
        where: { 
          status: 'completed',
          completedAt: { gte: last24h }
        }
      }),
      
      // Revenue metrics
      prisma.user.aggregate({ _sum: { gumballs: true } }),
      prisma.gumballHistory.aggregate({
        where: { 
          createdAt: { gte: last24h },
          change: { gt: 0 }
        },
        _sum: { change: true }
      }),
      
      // Community metrics
      prisma.community.count(),
      prisma.community.count({ where: { createdAt: { gte: last24h } } })
    ])

    // Calculate growth rates
    const userGrowthRate = await calculateGrowthRate('user', 'createdAt', 7)
    const postGrowthRate = await calculateGrowthRate('post', 'createdAt', 7)
    const taskCompletionRate = await calculateGrowthRate('userTask', 'completedAt', 7, { status: 'completed' })

    // Get top performers
    const topUsers = await prisma.user.findMany({
      select: {
        username: true,
        gumballs: true,
        level: true
      },
      orderBy: { gumballs: 'desc' },
      take: 5
    })

    const recentActivity = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const overview = {
      timestamp: now.toISOString(),
      summary: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          new7d: newUsers7d,
          active24h: activeUsers24h,
          growthRate: userGrowthRate
        },
        content: {
          totalPosts,
          postsToday,
          growthRate: postGrowthRate
        },
        tasks: {
          total: totalTasks,
          completedToday: completedTasksToday,
          completionRate: taskCompletionRate
        },
        revenue: {
          totalGumballs: totalGumballs._sum.gumballs || 0,
          distributedToday: gumballsDistributedToday._sum.change || 0
        },
        communities: {
          total: totalCommunities,
          newToday: newCommunitiesToday
        }
      },
      topUsers,
      recentActivity: recentActivity.map(post => ({
        id: post.id,
        content: post.content ? post.content.substring(0, 50) + '...' : '',
        author: post.user.username,
        createdAt: post.createdAt
      }))
    }

    res.json(overview)
  } catch (error) {
    console.error('❌ Failed to get analytics overview:', error)
    res.status(500).json({ 
      message: 'Failed to retrieve analytics overview',
      error: error.message 
    })
  }
}

const getTaskAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d' } = req.params
    console.log(`📋 Getting task analytics for timeframe: ${timeframe}`)
    
    const startDate = getStartDateFromTimeframe(timeframe)

    // Task completion metrics
    const [
      totalTasks,
      activeTasks,
      completedTasks,
      failedTasks,
      inProgressTasks
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { isActive: true } }),
      prisma.userTask.count({ 
        where: { 
          status: 'completed',
          completedAt: { gte: startDate }
        }
      }),
      prisma.userTask.count({ 
        where: { 
          status: 'failed',
          updatedAt: { gte: startDate }
        }
      }),
      prisma.userTask.count({ where: { status: 'in_progress' } })
    ])

    // Task performance by platform
    const platformPerformance = await prisma.userTask.groupBy({
      by: ['taskId'],
      where: {
        status: 'completed',
        completedAt: { gte: startDate }
      },
      _count: { id: true }
    })

    // Get platform details
    const platformStats = await Promise.all(
      platformPerformance.map(async (item) => {
        const task = await prisma.task.findUnique({
          where: { id: item.taskId },
          include: { platform: true }
        })
        return {
          platform: task?.platform.name || 'Unknown',
          completions: item._count.id,
          taskTitle: task?.title || 'Unknown'
        }
      })
    )

    // Task completion over time
    const dailyCompletions = await prisma.userTask.groupBy({
      by: ['completedAt'],
      where: {
        status: 'completed',
        completedAt: { gte: startDate }
      },
      _count: { id: true }
    })

    const completionsByDay = {}
    dailyCompletions.forEach(item => {
      if (item.completedAt) {
        const date = item.completedAt.toISOString().split('T')[0]
        completionsByDay[date] = (completionsByDay[date] || 0) + item._count.id
      }
    })

    // Most popular tasks
    const popularTasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        reward: true,
        difficulty: true,
        platform: {
          select: { name: true }
        },
        _count: {
          select: {
            userTasks: {
              where: {
                status: 'completed',
                completedAt: { gte: startDate }
              }
            }
          }
        }
      },
      orderBy: {
        userTasks: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Average completion time (approximation)
    const avgCompletionTime = await prisma.userTask.aggregate({
      where: {
        status: 'completed',
        completedAt: { gte: startDate },
        startedAt: { not: null }
      },
      _avg: {
        // Note: This would need a computed field for duration
        // For now, we'll estimate based on created vs completed
      }
    })

    const responseData = {
      timeframe,
      summary: {
        totalTasks,
        activeTasks,
        completedTasks,
        failedTasks,
        inProgressTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
      },
      platformPerformance: Object.values(
        platformStats.reduce((acc, item) => {
          if (!acc[item.platform]) {
            acc[item.platform] = { platform: item.platform, completions: 0 }
          }
          acc[item.platform].completions += item.completions
          return acc
        }, {})
      ),
      dailyCompletions: Object.entries(completionsByDay).map(([date, count]) => ({
        date,
        completions: count
      })),
      popularTasks: popularTasks.map(task => ({
        id: task.id,
        title: task.title,
        platform: task.platform.name,
        reward: task.reward,
        difficulty: task.difficulty,
        completions: task._count.userTasks
      }))
    }

    res.json(responseData)
  } catch (error) {
    console.error('❌ Failed to get task analytics:', error)
    res.status(500).json({ 
      message: 'Failed to retrieve task analytics',
      error: error.message 
    })
  }
}

const getCommunityAnalytics = async (req, res) => {
  try {
    const { timeframe = '7d' } = req.params
    console.log(`👥 Getting community analytics for timeframe: ${timeframe}`)
    
    const startDate = getStartDateFromTimeframe(timeframe)

    // Community metrics
    const [
      totalCommunities,
      newCommunities,
      totalMembers,
      newMembers
    ] = await Promise.all([
      prisma.community.count(),
      prisma.community.count({ where: { createdAt: { gte: startDate } } }),
      prisma.communityMember.count(),
      prisma.communityMember.count({ where: { joinedAt: { gte: startDate } } })
    ])

    // Top communities by member count
    const topCommunities = await prisma.community.findMany({
      select: {
        id: true,
        name: true,
        memberCount: true,
        createdAt: true,
        createdBy: {
          select: { username: true }
        },
        _count: {
          select: {
            posts: {
              where: { createdAt: { gte: startDate } }
            }
          }
        }
      },
      orderBy: { memberCount: 'desc' },
      take: 10
    })

    // Community growth over time
    const dailyJoins = await prisma.communityMember.groupBy({
      by: ['joinedAt'],
      where: { joinedAt: { gte: startDate } },
      _count: { id: true }
    })

    const joinsByDay = {}
    dailyJoins.forEach(item => {
      const date = item.joinedAt.toISOString().split('T')[0]
      joinsByDay[date] = (joinsByDay[date] || 0) + item._count.id
    })

    // Community activity (posts per community)
    const communityActivity = await prisma.community.findMany({
      select: {
        name: true,
        _count: {
          select: {
            posts: {
              where: { createdAt: { gte: startDate } }
            },
            members: true
          }
        }
      },
      orderBy: {
        posts: {
          _count: 'desc'
        }
      },
      take: 10
    })

    const responseData = {
      timeframe,
      summary: {
        totalCommunities,
        newCommunities,
        totalMembers,
        newMembers,
        avgMembersPerCommunity: totalCommunities > 0 ? Math.round(totalMembers / totalCommunities) : 0
      },
      topCommunities: topCommunities.map(community => ({
        id: community.id,
        name: community.name,
        members: community.memberCount,
        recentPosts: community._count.posts,
        createdBy: community.createdBy.username,
        createdAt: community.createdAt
      })),
      growthTrend: Object.entries(joinsByDay).map(([date, joins]) => ({
        date,
        joins
      })),
      activityRanking: communityActivity.map(community => ({
        name: community.name,
        posts: community._count.posts,
        members: community._count.members,
        engagement: community._count.members > 0 
          ? (community._count.posts / community._count.members).toFixed(2)
          : 0
      }))
    }

    res.json(responseData)
  } catch (error) {
    console.error('❌ Failed to get community analytics:', error)
    res.status(500).json({ 
      message: 'Failed to retrieve community analytics',
      error: error.message 
    })
  }
}

const getRealtimeAnalytics = async (req, res) => {
  try {
    console.log('⚡ Getting real-time analytics')

    const now = new Date()
    const last5min = new Date(now.getTime() - 5 * 60 * 1000)
    const last1hour = new Date(now.getTime() - 60 * 60 * 1000)

    // Real-time metrics
    const [
      onlineUsers,
      recentPosts,
      recentTasks,
      recentRegistrations,
      activeTaskAttempts
    ] = await Promise.all([
      prisma.user.count({ where: { isOnline: true } }),
      prisma.post.count({ where: { createdAt: { gte: last5min } } }),
      prisma.userTask.count({ 
        where: { 
          status: 'completed',
          completedAt: { gte: last5min }
        }
      }),
      prisma.user.count({ where: { createdAt: { gte: last1hour } } }),
      prisma.userTask.count({ where: { status: 'in_progress' } })
    ])

    // Recent activity feed
    const recentActivity = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { username: true }
        }
      },
      where: { createdAt: { gte: last1hour } },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const responseData = {
      timestamp: now.toISOString(),
      metrics: {
        onlineUsers,
        recentPosts: recentPosts,
        recentTasks: recentTasks,
        recentRegistrations,
        activeTaskAttempts
      },
      activity: recentActivity.map(post => ({
        type: 'post',
        id: post.id,
        content: post.content ? post.content.substring(0, 100) + '...' : '',
        user: post.user.username,
        timestamp: post.createdAt
      }))
    }

    res.json(responseData)
  } catch (error) {
    console.error('❌ Failed to get real-time analytics:', error)
    res.status(500).json({ 
      message: 'Failed to retrieve real-time analytics',
      error: error.message 
    })
  }
}

const calculateGrowthRate = async (model, dateField, days, additionalWhere = {}) => {
  try {
    const now = new Date()
    const currentPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000)

    const currentCount = await prisma[model].count({
      where: {
        [dateField]: { gte: currentPeriodStart },
        ...additionalWhere
      }
    })

    const previousCount = await prisma[model].count({
      where: {
        [dateField]: { 
          gte: previousPeriodStart,
          lt: currentPeriodStart
        },
        ...additionalWhere
      }
    })

    if (previousCount === 0) return currentCount > 0 ? 100 : 0
    return ((currentCount - previousCount) / previousCount * 100).toFixed(1)
  } catch (error) {
    console.error('Error calculating growth rate:', error)
    return 0
  }
}

const exportAnalytics = async (req, res) => {
  try {
    const { type, timeframe = '7d', format = 'json' } = req.query
    console.log(`📊 Exporting ${type} analytics as ${format} for ${timeframe}`)

    const startDate = getStartDateFromTimeframe(timeframe)
    let data = {}

    switch (type) {
      case 'users':
        data = await exportUserData(startDate)
        break
      case 'engagement':
        data = await exportEngagementData(startDate)
        break
      case 'revenue':
        data = await exportRevenueData(startDate)
        break
      case 'tasks':
        data = await exportTaskData(startDate)
        break
      default:
        return res.status(400).json({ message: 'Invalid export type' })
    }

    // Format response
    if (format === 'csv') {
      const csv = convertToCSV(data)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${timeframe}.csv"`)
      res.send(csv)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${timeframe}.json"`)
      res.json({
        exportType: type,
        timeframe,
        generatedAt: new Date().toISOString(),
        data
      })
    }
  } catch (error) {
    console.error('❌ Failed to export analytics:', error)
    res.status(500).json({ 
      message: 'Failed to export analytics',
      error: error.message 
    })
  }
}

const exportUserData = async (startDate) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      level: true,
      gumballs: true,
      globalRank: true,
      totalReferrals: true,
      createdAt: true,
      lastSeen: true,
      isOnline: true
    },
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'desc' }
  })

  return users
}

const exportEngagementData = async (startDate) => {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      content: true,
      likesCount: true,
      commentsCount: true,
      createdAt: true,
      user: {
        select: { username: true }
      }
    },
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'desc' }
  })

  return posts
}

const exportRevenueData = async (startDate) => {
  const gumballHistory = await prisma.gumballHistory.findMany({
    select: {
      id: true,
      gumballs: true,
      change: true,
      reason: true,
      week: true,
      month: true,
      createdAt: true,
      user: {
        select: { username: true }
      }
    },
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'desc' }
  })

  return gumballHistory
}

const exportTaskData = async (startDate) => {
  const userTasks = await prisma.userTask.findMany({
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      submissionData: true,
      user: {
        select: { username: true }
      },
      task: {
        select: {
          title: true,
          reward: true,
          difficulty: true,
          platform: {
            select: { name: true }
          }
        }
      }
    },
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'desc' }
  })

  return userTasks
}

const compareAnalytics = async (req, res) => {
  try {
    const { metric, period1, period2 } = req.query
    console.log(`🔍 Comparing ${metric} analytics: ${period1} vs ${period2}`)

    const startDate1 = getStartDateFromTimeframe(period1)
    const startDate2 = getStartDateFromTimeframe(period2)

    let comparison = {}

    switch (metric) {
      case 'users':
        comparison = await compareUserMetrics(startDate1, startDate2)
        break
      case 'engagement':
        comparison = await compareEngagementMetrics(startDate1, startDate2)
        break
      case 'revenue':
        comparison = await compareRevenueMetrics(startDate1, startDate2)
        break
      default:
        return res.status(400).json({ message: 'Invalid metric type' })
    }

    res.json({
      metric,
      periods: { period1, period2 },
      comparison
    })
  } catch (error) {
    console.error('❌ Failed to compare analytics:', error)
    res.status(500).json({ 
      message: 'Failed to compare analytics',
      error: error.message 
    })
  }
}

const compareUserMetrics = async (startDate1, startDate2) => {
  const [users1, users2] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate1 } } }),
    prisma.user.count({ where: { createdAt: { gte: startDate2 } } })
  ])

  return {
    period1: { newUsers: users1 },
    period2: { newUsers: users2 },
    change: users2 > 0 ? ((users1 - users2) / users2 * 100).toFixed(1) : 0
  }
}

const compareEngagementMetrics = async (startDate1, startDate2) => {
  const [posts1, posts2, likes1, likes2] = await Promise.all([
    prisma.post.count({ where: { createdAt: { gte: startDate1 } } }),
    prisma.post.count({ where: { createdAt: { gte: startDate2 } } }),
    prisma.like.count({ where: { createdAt: { gte: startDate1 } } }),
    prisma.like.count({ where: { createdAt: { gte: startDate2 } } })
  ])

  return {
    period1: { posts: posts1, likes: likes1 },
    period2: { posts: posts2, likes: likes2 },
    changes: {
      posts: posts2 > 0 ? ((posts1 - posts2) / posts2 * 100).toFixed(1) : 0,
      likes: likes2 > 0 ? ((likes1 - likes2) / likes2 * 100).toFixed(1) : 0
    }
  }
}

const compareRevenueMetrics = async (startDate1, startDate2) => {
  const [revenue1, revenue2] = await Promise.all([
    prisma.gumballHistory.aggregate({
      where: { 
        createdAt: { gte: startDate1 },
        change: { gt: 0 }
      },
      _sum: { change: true }
    }),
    prisma.gumballHistory.aggregate({
      where: { 
        createdAt: { gte: startDate2 },
        change: { gt: 0 }
      },
      _sum: { change: true }
    })
  ])

  const rev1 = revenue1._sum.change || 0
  const rev2 = revenue2._sum.change || 0

  return {
    period1: { revenue: rev1 },
    period2: { revenue: rev2 },
    change: rev2 > 0 ? ((rev1 - rev2) / rev2 * 100).toFixed(1) : 0
  }
}

// Helper functions
const getStartDateFromTimeframe = (timeframe) => {
  const now = new Date()
  switch (timeframe) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

const convertToCSV = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No data available'
  }

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Handle objects and arrays
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }
      // Handle strings with commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

// ===================================
// COMMUNITIES (Placeholder implementations)
// ===================================

const getAllCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)
    
    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              posts: true
            }
          }
        }
      }),
      prisma.community.count()
    ])
    
    res.json({
      communities,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    log.error('Failed to get all communities', error)
    res.status(500).json({ message: 'Failed to retrieve communities' })
  }
}

const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    const allowedUpdates = ['name', 'description', 'isPublic', 'bannerUrl', 'avatarUrl']
    const updates = {}
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })
    
    const community = await prisma.community.update({
      where: { id: communityId },
      data: updates
    })
    
    await logAdminAction(req.user.id, 'update_community', 'community', communityId, updates)
    
    res.json({ community, message: 'Community updated successfully' })
  } catch (error) {
    log.error('Failed to update community', error)
    res.status(500).json({ message: 'Failed to update community' })
  }
}

const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params
    
    await prisma.community.delete({
      where: { id: communityId }
    })
    
    await logAdminAction(req.user.id, 'delete_community', 'community', communityId)
    
    res.json({ message: 'Community deleted successfully' })
  } catch (error) {
    log.error('Failed to delete community', error)
    res.status(500).json({ message: 'Failed to delete community' })
  }
}

// ===================================
// AUDIT LOGS (Placeholder implementation)
// ===================================

const logAdminActionAPI = async (req, res) => {
  try {
    const { action, targetType, targetId, details } = req.body
    
    await logAdminAction(req.user.id, action, targetType, targetId, details)
    
    res.json({ message: 'Action logged successfully' })
  } catch (error) {
    log.error('Failed to log admin action', error)
    res.status(500).json({ message: 'Failed to log action' })
  }
}

const getAdminActionLogs = async (req, res) => {
  try {
    // Placeholder implementation
    res.json({
      logs: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      message: 'Audit logging system pending implementation'
    })
  } catch (error) {
    log.error('Failed to get action logs', error)
    res.status(500).json({ message: 'Failed to retrieve action logs' })
  }
}

// ===================================
// AUTOMATIC CACHE CLEANUP
// ===================================

// Prevent memory leaks by cleaning old cache entries
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of statsCache.entries()) {
    // Remove entries older than 1 hour
    if (now - value.timestamp > 60 * 60 * 1000) {
      statsCache.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`)
  }
}, 15 * 60 * 1000) // Clean every 15 minutes

module.exports = {
  // System (Enhanced with caching)
  getSystemHealth,
  getSystemStats,
  getSystemLogs,
  
  // Admin auth
  getAdminProfile,
  
  // Cache management
  clearCache,
  getCacheStatus,
  
  // Users (Full implementation)
  getAllUsers,
  getUserStats,
  getUserById,
  updateUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
  getUserActivity,
  
  // Tasks (Full implementation)
  getAllTasks,
  getTaskStats,
  updateTask,
  deleteTask,
  forceCompleteTask,
  
  // Content (Placeholders)
  getPendingPosts,
  approvePost,
  rejectPost,
  getContentReports,
  
  // Analytics (Full implementation)
  getUserAnalytics,
  getEngagementAnalytics,
  getRevenueAnalytics,
  getAnalyticsOverview,
  getTaskAnalytics,
  getCommunityAnalytics,
  getRealtimeAnalytics,
  exportAnalytics,
  compareAnalytics,
  
  // Communities (Full implementation)
  getAllCommunities,
  updateCommunity,
  deleteCommunity,
  
  // Audit (Placeholders)
  logAdminAction: logAdminActionAPI,
  getAdminActionLogs
}