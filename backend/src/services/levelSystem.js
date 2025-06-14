// src/services/levelSystem.js - COMPLETE FILE
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

// Award gumballs and update level
const awardGumballs = async (userId, amount, reason = 'manual') => {
  try {
    console.log(`Awarding ${amount} gumballs to user ${userId} for: ${reason}`)
    
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gumballs: true, level: true }
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
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
    
    console.log(`User ${userId}: ${user.gumballs} -> ${newTotal} gumballs, level: ${newLevel}`)
    
    return {
      success: true,
      newTotal,
      newLevel,
      levelChanged,
      change: amount
    }
  } catch (error) {
    console.error('Error awarding gumballs:', error)
    return { success: false, error: error.message }
  }
}

// Calculate and update all user rankings
const updateRankings = async (period = 'all') => {
  try {
    console.log(`Updating ${period} rankings...`)
    
    let users
    
    if (period === 'weekly') {
      // Get users ranked by gumballs earned this week
      const currentWeek = getCurrentWeek()
      
      users = await prisma.user.findMany({
        select: {
          id: true,
          gumballs: true,
          gumballHistory: {
            where: { week: currentWeek },
            select: { change: true }
          }
        }
      })
      
      // Calculate weekly totals and sort
      users = users.map(user => ({
        ...user,
        weeklyGumballs: user.gumballHistory.reduce((sum, h) => sum + h.change, 0)
      })).sort((a, b) => b.weeklyGumballs - a.weeklyGumballs || b.gumballs - a.gumballs)
      
    } else if (period === 'monthly') {
      // Get users ranked by gumballs earned this month
      const currentMonth = getCurrentMonth()
      
      users = await prisma.user.findMany({
        select: {
          id: true,
          gumballs: true,
          gumballHistory: {
            where: { month: currentMonth },
            select: { change: true }
          }
        }
      })
      
      // Calculate monthly totals and sort
      users = users.map(user => ({
        ...user,
        monthlyGumballs: user.gumballHistory.reduce((sum, h) => sum + h.change, 0)
      })).sort((a, b) => b.monthlyGumballs - a.monthlyGumballs || b.gumballs - a.gumballs)
      
    } else {
      // All-time ranking by total gumballs
      users = await prisma.user.findMany({
        select: { id: true, gumballs: true },
        orderBy: { gumballs: 'desc' }
      })
    }
    
    // Update ranks in batch
    const updates = users.map((user, index) => {
      const rank = index + 1
      const updateData = {}
      
      if (period === 'all') updateData.globalRank = rank
      else if (period === 'weekly') updateData.weeklyRank = rank
      else if (period === 'monthly') updateData.monthlyRank = rank
      
      return prisma.user.update({
        where: { id: user.id },
        data: updateData
      })
    })
    
    await Promise.all(updates)
    
    console.log(`Updated ${period} rankings for ${users.length} users`)
    return { success: true, updated: users.length }
  } catch (error) {
    console.error('Error updating rankings:', error)
    return { success: false, error: error.message }
  }
}

// Calculate rank changes (for the arrows)
const calculateRankChanges = async () => {
  try {
    console.log('Calculating rank changes...')
    
    const currentWeek = getCurrentWeek()
    
    // Calculate previous week
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prevWeek = `${lastWeek.getFullYear()}-W${getWeekNumber(lastWeek).toString().padStart(2, '0')}`
    
    // Get current ranks and previous ranks
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        globalRank: true,
        rankHistory: {
          where: { week: prevWeek },
          select: { globalRank: true },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    const updates = users.map(user => {
      const currentRank = user.globalRank || 999999
      const previousRank = user.rankHistory[0]?.globalRank || currentRank
      const rankChange = previousRank - currentRank // Positive = rank improved
      
      return prisma.user.update({
        where: { id: user.id },
        data: { rankChange }
      })
    })
    
    await Promise.all(updates)
    
    console.log(`Calculated rank changes for ${users.length} users`)
    return { success: true }
  } catch (error) {
    console.error('Error calculating rank changes:', error)
    return { success: false, error: error.message }
  }
}

// Save current rankings to history (run weekly)
const saveRankingSnapshot = async () => {
  try {
    console.log('Saving ranking snapshot...')
    
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
      data: snapshots
    })
    
    console.log(`Saved ranking snapshot for ${snapshots.length} users`)
    return { success: true }
  } catch (error) {
    console.error('Error saving ranking snapshot:', error)
    return { success: false, error: error.message }
  }
}

const calculatePeriodRankChanges = async () => {
  try {
    console.log('Calculating weekly and monthly rank changes...')
    
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    
    // Calculate previous week and month
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const prevWeek = `${lastWeek.getFullYear()}-W${getWeekNumber(lastWeek).toString().padStart(2, '0')}`
    const prevMonth = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`
    
    // Get all users with their current and historical ranks
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        weeklyRank: true,
        monthlyRank: true,
        rankHistory: {
          where: {
            OR: [
              { week: prevWeek },
              { month: prevMonth }
            ]
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    const updates = users.map(user => {
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
      
      return prisma.user.update({
        where: { id: user.id },
        data: { 
          weeklyRankChange,
          monthlyRankChange
        }
      })
    })
    
    await Promise.all(updates)
    
    console.log(`Calculated weekly and monthly rank changes for ${users.length} users`)
    return { success: true }
  } catch (error) {
    console.error('Error calculating period rank changes:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  calculateLevel,
  awardGumballs,
  updateRankings,
  calculateRankChanges,
  saveRankingSnapshot,
  getCurrentWeek,
  getCurrentMonth,
  LEVEL_THRESHOLDS
}