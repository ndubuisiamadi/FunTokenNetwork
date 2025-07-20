// src/services/levelSystem.js - HYBRID RANKING SYSTEM
const prisma = require('../db')

// Level thresholds (same as your frontend)
const LEVEL_THRESHOLDS = {
  'Novice': { min: 0, max: 999 },
  'Apprentice': { min: 1000, max: 4999 },
  'Expert': { min: 5000, max: 19999 },
  'Master': { min: 20000, max: 49999 },
  'Grandmaster': { min: 50000, max: Infinity }
}

const calculateLevel = (gumballs) => {
  if (gumballs >= 50000) return 'Grandmaster'
  if (gumballs >= 20000) return 'Master'
  if (gumballs >= 5000) return 'Expert'
  if (gumballs >= 1000) return 'Apprentice'
  return 'Novice'
}

const getCurrentWeek = () => {
  const now = new Date()
  const year = now.getFullYear()
  const week = getWeekNumber(now)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
}

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// 🚀 HYBRID RANKING: Ordinal for 0 gumballs, Tied for others
const calculateHybridRanks = (users) => {
  console.log(`🎯 Calculating hybrid ranks for ${users.length} users`)
  
  // Separate users by gumball amount
  const activeUsers = users.filter(user => user.gumballs > 0)
  const newUsers = users.filter(user => user.gumballs === 0)
  
  console.log(`📊 Active users: ${activeUsers.length}, New users: ${newUsers.length}`)
  
  const rankedUsers = []
  let currentRank = 1
  
  // 🎯 PART 1: Handle active users with TIED RANKING
  if (activeUsers.length > 0) {
    let lastGumballs = null
    let actualRank = 1
    
    for (const user of activeUsers) {
      // Standard competition ranking - same gumballs = same rank
      if (lastGumballs !== null && user.gumballs !== lastGumballs) {
        currentRank = actualRank
      }
      
      rankedUsers.push({
        ...user,
        rank: currentRank
      })
      
      lastGumballs = user.gumballs
      actualRank++
    }
    
    // Update currentRank for new users
    currentRank = activeUsers.length + 1
  }
  
  // 🎯 PART 2: Handle new users with ORDINAL RANKING
  if (newUsers.length > 0) {
    for (const user of newUsers) {
      rankedUsers.push({
        ...user,
        rank: currentRank
      })
      currentRank++ // Each 0-gumball user gets unique rank
    }
  }
  
  console.log(`✅ Hybrid ranking complete: Ranks 1-${currentRank - 1}`)
  return rankedUsers
}

// Award gumballs and update level
const awardGumballs = async (userId, amount, reason = 'manual') => {
  try {
    console.log(`🎯 Awarding ${amount} gumballs to user ${userId} for: ${reason}`)
    
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gumballs: true, level: true }
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    const oldTotal = user.gumballs
    const newTotal = user.gumballs + amount
    const newLevel = calculateLevel(newTotal)
    const levelChanged = user.level !== newLevel
    
    // Update user's gumballs and level
    await prisma.user.update({
      where: { id: userId },
      data: {
        gumballs: newTotal,
        level: newLevel
      }
    })
    
    // Record the gumball change
    await prisma.gumballHistory.create({
      data: {
        userId,
        gumballs: newTotal,
        change: amount,
        reason,
        week: getCurrentWeek(),
        month: getCurrentMonth()
      }
    })
    
    console.log(`✅ User ${userId}: ${oldTotal} -> ${newTotal} gumballs, level: ${newLevel}`)
    
    // 🚀 SPECIAL: If user moved from 0 to >0 gumballs, trigger full ranking update
    if (oldTotal === 0 && newTotal > 0) {
      console.log(`🎯 User moved from 0 to ${newTotal} gumballs - triggering ranking update`)
      setImmediate(() => {
        updateAllRankings('global').catch(console.error)
      })
    } else if (amount >= 100 || levelChanged) {
      // Regular significant change - update single user rank
      setImmediate(() => {
        updateUserRank(userId).catch(console.error)
      })
    }
    
    return {
      success: true,
      newTotal,
      newLevel,
      levelChanged,
      change: amount,
      wasNewUser: oldTotal === 0 && newTotal > 0
    }
  } catch (error) {
    console.error('❌ Error awarding gumballs:', error)
    return { success: false, error: error.message }
  }
}

// 🚀 OPTIMIZATION: Update single user rank (hybrid aware)
const updateUserRank = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gumballs: true }
    })
    
    if (!user) return { success: false, error: 'User not found' }
    
    // If user has 0 gumballs, need full ranking update for ordinal positioning
    if (user.gumballs === 0) {
      console.log(`🎯 User has 0 gumballs - need full ranking update for ordinal positioning`)
      return await updateAllRankings('global')
    }
    
    // Calculate global rank efficiently for active users
    const globalRank = await prisma.user.count({
      where: {
        gumballs: { gt: user.gumballs }
      }
    }) + 1
    
    // Calculate weekly rank
    const currentWeek = getCurrentWeek()
    const weeklyGumballs = await prisma.gumballHistory.aggregate({
      where: {
        userId,
        week: currentWeek
      },
      _sum: { change: true }
    })
    
    const weeklyTotal = weeklyGumballs._sum.change || 0
    const weeklyRank = await prisma.gumballHistory.groupBy({
      by: ['userId'],
      where: { week: currentWeek },
      _sum: { change: true },
      having: {
        change: { _sum: { gt: weeklyTotal } }
      }
    }).then(results => results.length + 1)
    
    // Calculate monthly rank
    const currentMonth = getCurrentMonth()
    const monthlyGumballs = await prisma.gumballHistory.aggregate({
      where: {
        userId,
        month: currentMonth
      },
      _sum: { change: true }
    })
    
    const monthlyTotal = monthlyGumballs._sum.change || 0
    const monthlyRank = await prisma.gumballHistory.groupBy({
      by: ['userId'],
      where: { month: currentMonth },
      _sum: { change: true },
      having: {
        change: { _sum: { gt: monthlyTotal } }
      }
    }).then(results => results.length + 1)
    
    // Update user ranks
    await prisma.user.update({
      where: { id: userId },
      data: {
        globalRank,
        weeklyRank,
        monthlyRank
      }
    })
    
    return { success: true, globalRank, weeklyRank, monthlyRank }
  } catch (error) {
    console.error('❌ Error updating user rank:', error)
    return { success: false, error: error.message }
  }
}

// 🚀 HYBRID: Batch update all rankings with hybrid logic
const updateAllRankings = async (period = 'all') => {
  try {
    console.log(`🔄 Starting ${period} hybrid ranking update...`)
    const startTime = Date.now()
    
    if (period === 'all' || period === 'global') {
      console.log('📊 Updating global rankings with hybrid logic...')
      
      // Get all users sorted properly for hybrid ranking
      const users = await prisma.user.findMany({
        select: { id: true, gumballs: true, createdAt: true },
        orderBy: [
          { gumballs: 'desc' },     // Primary: more gumballs first
          { createdAt: 'asc' }      // Tiebreaker: older accounts first
        ]
      })
      
      // Apply hybrid ranking logic
      const rankedUsers = calculateHybridRanks(users)
      
      // Batch update ranks efficiently
      const updates = rankedUsers.map(user =>
        prisma.user.update({
          where: { id: user.id },
          data: { globalRank: user.rank }
        })
      )
      
      // Execute all updates in batches for performance
      const batchSize = 100
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        await Promise.all(batch)
      }
      
      console.log(`✅ Updated global hybrid ranks for ${users.length} users`)
    }
    
    if (period === 'all' || period === 'weekly') {
      console.log('📊 Updating weekly rankings...')
      await updatePeriodRankings('weekly')
    }
    
    if (period === 'all' || period === 'monthly') {
      console.log('📊 Updating monthly rankings...')
      await updatePeriodRankings('monthly')
    }
    
    const duration = Date.now() - startTime
    console.log(`✅ Hybrid ranking update completed in ${duration}ms`)
    
    return { success: true, duration, period }
  } catch (error) {
    console.error('❌ Error updating hybrid rankings:', error)
    return { success: false, error: error.message }
  }
}

// 🚀 OPTIMIZATION: Update period rankings efficiently
const updatePeriodRankings = async (period) => {
  const currentPeriod = period === 'weekly' ? getCurrentWeek() : getCurrentMonth()
  
  // Get aggregated gumball changes for the period
  const userTotals = await prisma.gumballHistory.groupBy({
    by: ['userId'],
    where: {
      [period === 'weekly' ? 'week' : 'month']: currentPeriod
    },
    _sum: { change: true },
    orderBy: {
      _sum: {
        change: 'desc'
      }
    }
  })
  
  // For period rankings, use standard tied ranking (no hybrid logic needed)
  const updates = []
  let currentRank = 1
  let lastTotal = null
  let actualRank = 1
  
  for (const userTotal of userTotals) {
    const total = userTotal._sum.change || 0
    
    // Handle ties properly
    if (lastTotal !== null && total !== lastTotal) {
      currentRank = actualRank
    }
    
    const updateData = {}
    if (period === 'weekly') {
      updateData.weeklyRank = currentRank
    } else {
      updateData.monthlyRank = currentRank
    }
    
    updates.push(
      prisma.user.update({
        where: { id: userTotal.userId },
        data: updateData
      })
    )
    
    lastTotal = total
    actualRank++
  }
  
  // Execute updates in batches
  const batchSize = 100
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    await Promise.all(batch)
  }
  
  console.log(`✅ Updated ${period} ranks for ${userTotals.length} users`)
}

// Calculate rank changes (for the arrows)
const calculateRankChanges = async () => {
  try {
    console.log('🔄 Calculating rank changes...')
    
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    
    // Calculate previous periods
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const prevWeek = `${lastWeek.getFullYear()}-W${getWeekNumber(lastWeek).toString().padStart(2, '0')}`
    const prevMonth = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`
    
    // Get users with their current and historical ranks
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true,
        rankHistory: {
          where: {
            OR: [
              { week: prevWeek },
              { month: prevMonth }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 2
        }
      }
    })
    
    const updates = []
    
    for (const user of users) {
      // Calculate weekly rank change
      const currentWeeklyRank = user.weeklyRank || 999999
      const prevWeeklyHistory = user.rankHistory.find(h => h.week === prevWeek)
      const previousWeeklyRank = prevWeeklyHistory?.weeklyRank || currentWeeklyRank
      const weeklyRankChange = previousWeeklyRank - currentWeeklyRank // Positive = improved
      
      // Calculate monthly rank change
      const currentMonthlyRank = user.monthlyRank || 999999
      const prevMonthlyHistory = user.rankHistory.find(h => h.month === prevMonth)
      const previousMonthlyRank = prevMonthlyHistory?.monthlyRank || currentMonthlyRank
      const monthlyRankChange = previousMonthlyRank - currentMonthlyRank // Positive = improved
      
      // Calculate global rank change (weekly comparison)
      const previousGlobalRank = prevWeeklyHistory?.globalRank || user.globalRank
      const rankChange = previousGlobalRank - (user.globalRank || 999999)
      
      updates.push(
        prisma.user.update({
          where: { id: user.id },
          data: { 
            weeklyRankChange,
            monthlyRankChange,
            rankChange
          }
        })
      )
    }
    
    // Execute updates in batches
    const batchSize = 100
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      await Promise.all(batch)
    }
    
    console.log(`✅ Calculated rank changes for ${users.length} users`)
    return { success: true, updated: users.length }
  } catch (error) {
    console.error('❌ Error calculating rank changes:', error)
    return { success: false, error: error.message }
  }
}

// Save current rankings to history (run weekly)
const saveRankingSnapshot = async () => {
  try {
    console.log('📸 Saving ranking snapshot...')
    
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        gumballs: true, 
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true
      }
    })
    
    const snapshots = users.map(user => ({
      userId: user.id,
      globalRank: user.globalRank || 999999,
      weeklyRank: user.weeklyRank,
      monthlyRank: user.monthlyRank,
      gumballs: user.gumballs,
      week: getCurrentWeek(),
      month: getCurrentMonth()
    }))
    
    await prisma.rankHistory.createMany({
      data: snapshots,
      skipDuplicates: true
    })
    
    console.log(`✅ Saved ranking snapshot for ${snapshots.length} users`)
    return { success: true, saved: snapshots.length }
  } catch (error) {
    console.error('❌ Error saving ranking snapshot:', error)
    return { success: false, error: error.message }
  }
}

// 🚀 NEW: Complete ranking refresh (use sparingly)
const refreshAllRankings = async () => {
  try {
    console.log('🔄 Starting complete hybrid ranking refresh...')
    
    // 1. Update all rankings with hybrid logic
    await updateAllRankings('all')
    
    // 2. Calculate rank changes
    await calculateRankChanges()
    
    // 3. Save snapshot
    await saveRankingSnapshot()
    
    console.log('✅ Complete hybrid ranking refresh completed')
    return { success: true }
  } catch (error) {
    console.error('❌ Error in complete ranking refresh:', error)
    return { success: false, error: error.message }
  }
}

// 🚀 NEW: Get ranking statistics for monitoring
const getRankingStats = async () => {
  try {
    const [
      totalUsers,
      rankedUsers,
      activeUsers,
      newUsers,
      weeklyActiveUsers,
      monthlyActiveUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { globalRank: { not: null } } }),
      prisma.user.count({ where: { gumballs: { gt: 0 } } }),
      prisma.user.count({ where: { gumballs: 0 } }),
      prisma.gumballHistory.groupBy({
        by: ['userId'],
        where: { week: getCurrentWeek() }
      }).then(results => results.length),
      prisma.gumballHistory.groupBy({
        by: ['userId'],
        where: { month: getCurrentMonth() }
      }).then(results => results.length)
    ])
    
    return {
      totalUsers,
      rankedUsers,
      unrankedUsers: totalUsers - rankedUsers,
      activeUsers,
      newUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      rankingCoverage: ((rankedUsers / totalUsers) * 100).toFixed(2) + '%',
      activeUserPercentage: ((activeUsers / totalUsers) * 100).toFixed(2) + '%'
    }
  } catch (error) {
    console.error('❌ Error getting ranking stats:', error)
    return { error: error.message }
  }
}

module.exports = {
  calculateLevel,
  awardGumballs,
  updateUserRank,
  updateAllRankings,
  updatePeriodRankings,
  calculateRankChanges,
  saveRankingSnapshot,
  refreshAllRankings,
  getRankingStats,
  calculateHybridRanks,
  getCurrentWeek,
  getCurrentMonth,
  LEVEL_THRESHOLDS
}