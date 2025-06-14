// src/controllers/leaderboard.js - COMPLETE FILE
const { validationResult } = require('express-validator')
const prisma = require('../db')
const { LEVEL_THRESHOLDS, getCurrentWeek, getCurrentMonth } = require('../services/levelSystem')

const getLeaderboard = async (req, res) => {
  try {
    const { 
      period = 'all', // 'all', 'weekly', 'monthly'
      level = 'all',  // 'all', 'novice', 'apprentice', etc.
      page = 1, 
      limit = 50 
    } = req.query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    console.log(`Getting leaderboard: period=${period}, level=${level}, page=${pageNum}`)

    // Build where clause for level filtering
    let whereClause = {}
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

    let users

    if (period === 'weekly') {
      // Get users by weekly gumball earnings
      const currentWeek = getCurrentWeek()
      
      users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          gumballs: true,
          level: true,
          weeklyRank: true,
          rankChange: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          gumballHistory: {
            where: { week: currentWeek },
            select: { change: true }
          }
        }
      })
      
      // Calculate weekly earnings and sort
      users = users.map(user => ({
        ...user,
        weeklyGumballs: user.gumballHistory.reduce((sum, h) => sum + h.change, 0),
        gumballHistory: undefined // Remove from response
      })).sort((a, b) => b.weeklyGumballs - a.weeklyGumballs || b.gumballs - a.gumballs)
      
    } else if (period === 'monthly') {
      // Get users by monthly gumball earnings
      const currentMonth = getCurrentMonth()
      
      users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          gumballs: true,
          level: true,
          monthlyRank: true,
          rankChange: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          gumballHistory: {
            where: { month: currentMonth },
            select: { change: true }
          }
        }
      })
      
      // Calculate monthly earnings and sort
      users = users.map(user => ({
        ...user,
        monthlyGumballs: user.gumballHistory.reduce((sum, h) => sum + h.change, 0),
        gumballHistory: undefined // Remove from response
      })).sort((a, b) => b.monthlyGumballs - a.monthlyGumballs || b.gumballs - a.gumballs)
      
    } else {
      // All-time leaderboard
      users = await prisma.user.findMany({
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
          rankChange: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        },
        orderBy: [
          { gumballs: 'desc' },
          { createdAt: 'asc' } // Tiebreaker
        ]
      })
    }

    // Apply pagination
    const paginatedUsers = users.slice(skip, skip + limitNum)

    // Add rank numbers and format for frontend
    const formattedUsers = paginatedUsers.map((user, index) => ({
      ...user,
      rank: user.globalRank || user.weeklyRank || user.monthlyRank || (skip + index + 1),
      change: user.rankChange || 0,
      // Add mock achievements for now (you can implement real ones later)
      achievements: ['trophy', 'fire', 'diamond'].slice(0, Math.floor(Math.random() * 3) + 1),
      // Format join date
      joinDate: user.createdAt
    }))

    // Get total count for pagination
    const totalCount = users.length

    res.json({
      users: formattedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: skip + limitNum < totalCount
      },
      period,
      level
    })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getUserRankInfo = async (req, res) => {
  try {
    const userId = req.user.id

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
        weeklyRankChange: true,  // Add this
        monthlyRankChange: true  // Add this
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Return the rank changes instead of gumball earnings
    res.json({
      user: {
        ...user,
        // Keep these for backward compatibility but they won't be used in frontend
        weeklyGumballs: 0,
        monthlyGumballs: 0
      }
    })
  } catch (error) {
    console.error('Get user rank info error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getTopAchievers = async (req, res) => {
  try {
    const { limit = 5 } = req.query
    
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gumballs: true,
        level: true,
        globalRank: true
      },
      orderBy: { gumballs: 'desc' },
      take: parseInt(limit)
    })

    res.json({ users: topUsers })
  } catch (error) {
    console.error('Get top achievers error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getLevelDistribution = async (req, res) => {
  try {
    const distribution = await prisma.user.groupBy({
      by: ['level'],
      _count: { level: true }
    })

    const formattedDistribution = distribution.map(item => ({
      level: item.level,
      count: item._count.level
    }))

    res.json({ distribution: formattedDistribution })
  } catch (error) {
    console.error('Get level distribution error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  getLeaderboard,
  getUserRankInfo,
  getTopAchievers,
  getLevelDistribution
}