// src/controllers/leaderboard.js - HYBRID RANKING COMPATIBLE
const { validationResult } = require('express-validator')
const prisma = require('../db')
const { LEVEL_THRESHOLDS, getCurrentWeek, getCurrentMonth } = require('../services/levelSystem')

// 🚀 HYBRID: Efficient leaderboard with hybrid ranking support
const getLeaderboard = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { 
      period = 'all', // 'all', 'weekly', 'monthly'
      level = 'all',  // 'all', 'novice', 'apprentice', etc.
      page = 1, 
      limit = 50 
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100) // Cap at 100 for performance
    const skip = (pageNum - 1) * limitNum

    console.log(`📊 Getting hybrid leaderboard: period=${period}, level=${level}, page=${pageNum}`)

    // 🚀 Build optimized where clause
    let whereClause = {}
    
    // Level filtering
    if (level !== 'all') {
      const levelKey = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
      if (LEVEL_THRESHOLDS[levelKey]) {
        const threshold = LEVEL_THRESHOLDS[levelKey]
        whereClause.gumballs = {
          gte: threshold.min,
          ...(threshold.max !== Infinity && { lte: threshold.max })
        }
      }
    }

    // 🚀 Ensure we only get users with ranks to avoid null values
    if (period === 'weekly') {
      whereClause.weeklyRank = { not: null }
    } else if (period === 'monthly') {
      whereClause.monthlyRank = { not: null }
    } else {
      whereClause.globalRank = { not: null }
    }

    // 🚀 HYBRID: Use pre-calculated ranks with proper ordering
    let orderBy = []
    let rankField = 'globalRank'
    
    if (period === 'weekly') {
      orderBy = [
        { weeklyRank: 'asc' },
        { gumballs: 'desc' }
      ]
      rankField = 'weeklyRank'
    } else if (period === 'monthly') {
      orderBy = [
        { monthlyRank: 'asc' },
        { gumballs: 'desc' }
      ]
      rankField = 'monthlyRank'
    } else {
      // 🎯 HYBRID: Global ranking uses hybrid logic (ordinal for 0, tied for others)
      orderBy = [
        { globalRank: 'asc' },
        { gumballs: 'desc' },
        { createdAt: 'asc' }
      ]
    }

    // 🚀 Single efficient query with proper selection
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          gumballs: true,
          level: true,
          globalRank: true,
          weeklyRank: true,
          monthlyRank: true,
          rankChange: true,
          weeklyRankChange: true,
          monthlyRankChange: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        },
        orderBy,
        skip,
        take: limitNum
      }),
      
      // Get total count for pagination
      prisma.user.count({ where: whereClause })
    ])

    // 🚀 Format response efficiently with hybrid rank info
    const formattedUsers = users.map((user, index) => {
      // Use the pre-calculated rank (hybrid system handles uniqueness)
      const rank = user[rankField] || (skip + index + 1)
      
      // Get the appropriate rank change
      let rankChangeValue = 0
      if (period === 'weekly') {
        rankChangeValue = user.weeklyRankChange || 0
      } else if (period === 'monthly') {
        rankChangeValue = user.monthlyRankChange || 0
      } else {
        rankChangeValue = user.rankChange || 0
      }

      return {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        gumballs: user.gumballs,
        level: user.level,
        rank,
        globalRank: user.globalRank,
        weeklyRank: user.weeklyRank,
        monthlyRank: user.monthlyRank,
        rankChange: rankChangeValue,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        // 🎯 HYBRID: Indicate if user is in "new user" category
        isNewUser: user.gumballs === 0
      }
    })

    // 🎯 HYBRID: Get stats for response metadata
    const activeUsersCount = await prisma.user.count({ where: { gumballs: { gt: 0 } } })
    const newUsersCount = await prisma.user.count({ where: { gumballs: 0 } })

    const response = {
      success: true,
      users: formattedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: skip + limitNum < totalCount
      },
      filters: {
        period,
        level
      },
      meta: {
        rankField,
        rankingSystem: 'hybrid', // Indicates hybrid ranking is in use
        activeUsers: activeUsersCount,
        newUsers: newUsersCount,
        queryTime: new Date().toISOString()
      }
    }

    res.json(response)
  } catch (error) {
    console.error('❌ Get hybrid leaderboard error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 🚀 OPTIMIZATION: Efficient user rank info with single query
const getUserRankInfo = async (req, res) => {
  try {
    const userId = req.user.id

    // 🚀 Single query to get all user rank data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        level: true,
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true,
        rankChange: true,
        weeklyRankChange: true,
        monthlyRankChange: true,
        
        // 🚀 Get period earnings efficiently
        gumballHistory: {
          where: {
            OR: [
              { week: getCurrentWeek() },
              { month: getCurrentMonth() }
            ]
          },
          select: {
            change: true,
            week: true,
            month: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      })
    }

    // 🚀 Calculate period earnings from history
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    
    const weeklyEarnings = user.gumballHistory
      .filter(h => h.week === currentWeek)
      .reduce((sum, h) => sum + h.change, 0)
    
    const monthlyEarnings = user.gumballHistory
      .filter(h => h.month === currentMonth)
      .reduce((sum, h) => sum + h.change, 0)

    // 🚀 Get user's position percentiles efficiently
    const [totalUsers, usersAbove, weeklyActiveUsers, monthlyActiveUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          gumballs: { gt: user.gumballs }
        }
      }),
      prisma.gumballHistory.groupBy({
        by: ['userId'],
        where: { week: currentWeek }
      }).then(results => results.length),
      prisma.gumballHistory.groupBy({
        by: ['userId'],
        where: { month: currentMonth }
      }).then(results => results.length)
    ])

    const percentile = totalUsers > 0 ? ((totalUsers - usersAbove) / totalUsers * 100).toFixed(1) : 0

    const response = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        gumballs: user.gumballs,
        level: user.level,
        globalRank: user.globalRank || null,
        weeklyRank: user.weeklyRank || null,
        monthlyRank: user.monthlyRank || null,
        rankChange: user.rankChange || 0,
        weeklyRankChange: user.weeklyRankChange || 0,
        monthlyRankChange: user.monthlyRankChange || 0,
        
        // 🚀 Additional insights
        weeklyEarnings,
        monthlyEarnings,
        percentile: parseFloat(percentile),
        isTopPercent: parseFloat(percentile) >= 90,
        // 🎯 HYBRID: Indicate if user is in "new user" category
        isNewUser: user.gumballs === 0,
        rankingType: user.gumballs === 0 ? 'ordinal' : 'tied'
      },
      stats: {
        totalUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        queryTime: new Date().toISOString()
      },
      meta: {
        rankingSystem: 'hybrid',
        description: user.gumballs === 0 
          ? 'New users get unique ranks based on join order'
          : 'Users with gumballs share ranks for same amounts'
      }
    }

    res.json(response)
  } catch (error) {
    console.error('❌ Get user rank info error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 🚀 OPTIMIZATION: Efficient top achievers with caching potential
const getTopAchievers = async (req, res) => {
  try {
    const { limit = 5, period = 'weekly' } = req.query
    const limitNum = Math.min(parseInt(limit), 20) // Cap at 20
    
    let orderBy = []
    let whereClause = {}
    
    if (period === 'weekly') {
      whereClause.weeklyRank = { not: null }
      orderBy = [{ weeklyRank: 'asc' }]
    } else if (period === 'monthly') {
      whereClause.monthlyRank = { not: null }
      orderBy = [{ monthlyRank: 'asc' }]
    } else {
      whereClause.globalRank = { not: null }
      orderBy = [{ globalRank: 'asc' }]
    }
    
    const topUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        level: true,
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true
      },
      orderBy,
      take: limitNum
    })

    res.json({ 
      success: true,
      users: topUsers,
      period,
      meta: {
        count: topUsers.length,
        queryTime: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Get top achievers error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 🚀 OPTIMIZATION: Efficient level distribution
const getLevelDistribution = async (req, res) => {
  try {
    const distribution = await prisma.user.groupBy({
      by: ['level'],
      _count: { level: true },
      _avg: { gumballs: true },
      _min: { gumballs: true },
      _max: { gumballs: true }
    })

    const formattedDistribution = distribution.map(item => ({
      level: item.level,
      count: item._count.level,
      averageGumballs: Math.round(item._avg.gumballs || 0),
      minGumballs: item._min.gumballs || 0,
      maxGumballs: item._max.gumballs || 0,
      threshold: LEVEL_THRESHOLDS[item.level] || { min: 0, max: 0 }
    }))

    // Sort by level hierarchy
    const levelOrder = ['Novice', 'Apprentice', 'Expert', 'Master', 'Grandmaster']
    formattedDistribution.sort((a, b) => 
      levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
    )

    res.json({ 
      success: true,
      distribution: formattedDistribution,
      meta: {
        totalUsers: formattedDistribution.reduce((sum, level) => sum + level.count, 0),
        queryTime: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Get level distribution error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 🚀 NEW: Search users endpoint for proper server-side search
const searchUsers = async (req, res) => {
  try {
    const { q: query, period = 'all', level = 'all', page = 1, limit = 20 } = req.query
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      })
    }

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 50)
    const skip = (pageNum - 1) * limitNum

    // 🚀 Build search conditions
    const searchTerms = query.trim().toLowerCase()
    let whereClause = {
      OR: [
        { firstName: { contains: searchTerms, mode: 'insensitive' } },
        { lastName: { contains: searchTerms, mode: 'insensitive' } },
        { username: { contains: searchTerms, mode: 'insensitive' } }
      ]
    }

    // Add level filter
    if (level !== 'all') {
      const levelKey = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
      if (LEVEL_THRESHOLDS[levelKey]) {
        const threshold = LEVEL_THRESHOLDS[levelKey]
        whereClause.gumballs = {
          gte: threshold.min,
          ...(threshold.max !== Infinity && { lte: threshold.max })
        }
      }
    }

    // Set ordering based on period
    let orderBy = []
    if (period === 'weekly') {
      orderBy = [{ weeklyRank: 'asc' }, { gumballs: 'desc' }]
    } else if (period === 'monthly') {
      orderBy = [{ monthlyRank: 'asc' }, { gumballs: 'desc' }]
    } else {
      orderBy = [{ globalRank: 'asc' }, { gumballs: 'desc' }]
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          gumballs: true,
          level: true,
          globalRank: true,
          weeklyRank: true,
          monthlyRank: true,
          rankChange: true,
          weeklyRankChange: true,
          monthlyRankChange: true,
          isOnline: true,
          lastSeen: true
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.user.count({ where: whereClause })
    ])

    res.json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: skip + limitNum < totalCount
      },
      query: searchTerms,
      filters: { period, level }
    })
  } catch (error) {
    console.error('❌ Search users error:', error)
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

module.exports = {
  getLeaderboard,
  getUserRankInfo,
  getTopAchievers,
  getLevelDistribution,
  searchUsers
}