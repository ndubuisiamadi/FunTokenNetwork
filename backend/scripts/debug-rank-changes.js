// debug-rank-changes.js - Find why weekly changes are blank
const prisma = require('../src/db') // Fixed path
const { getCurrentWeek, getCurrentMonth } = require('../src/services/levelSystem') // Fixed path

const debugRankChanges = async () => {
  console.log('🔍 DEBUGGING RANK CHANGES SYSTEM')
  console.log('=' .repeat(50))
  
  try {
    // Step 1: Check if we have historical data
    console.log('\n📊 STEP 1: Checking Historical Data')
    console.log('-'.repeat(30))
    
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    
    // Calculate previous periods
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    }
    
    const prevWeek = `${lastWeek.getFullYear()}-W${getWeekNumber(lastWeek).toString().padStart(2, '0')}`
    const prevMonth = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`
    
    console.log(`Current Week: ${currentWeek}`)
    console.log(`Previous Week: ${prevWeek}`)
    console.log(`Current Month: ${currentMonth}`)
    console.log(`Previous Month: ${prevMonth}`)
    
    // Check historical snapshots
    const totalSnapshots = await prisma.rankHistory.count()
    const currentWeekSnapshots = await prisma.rankHistory.count({
      where: { week: currentWeek }
    })
    const previousWeekSnapshots = await prisma.rankHistory.count({
      where: { week: prevWeek }
    })
    const previousMonthSnapshots = await prisma.rankHistory.count({
      where: { month: prevMonth }
    })
    
    console.log(`Total Historical Snapshots: ${totalSnapshots}`)
    console.log(`Current Week Snapshots: ${currentWeekSnapshots}`)
    console.log(`Previous Week Snapshots: ${previousWeekSnapshots}`)
    console.log(`Previous Month Snapshots: ${previousMonthSnapshots}`)
    
    if (totalSnapshots === 0) {
      console.log('❌ NO HISTORICAL DATA FOUND - This is the issue!')
      return { issue: 'no_historical_data' }
    }
    
    if (previousWeekSnapshots === 0) {
      console.log('❌ NO PREVIOUS WEEK DATA - Cannot calculate weekly changes!')
      return { issue: 'no_previous_week_data' }
    }
    
    console.log('✅ Historical data exists')
    
    // Step 2: Check current user rank change values
    console.log('\n👥 STEP 2: Checking User Rank Changes')
    console.log('-'.repeat(30))
    
    const totalUsers = await prisma.user.count()
    const usersWithWeeklyChange = await prisma.user.count({
      where: { weeklyRankChange: { not: null } }
    })
    const usersWithMonthlyChange = await prisma.user.count({
      where: { monthlyRankChange: { not: null } }
    })
    const usersWithGlobalChange = await prisma.user.count({
      where: { rankChange: { not: null } }
    })
    
    console.log(`Total Users: ${totalUsers}`)
    console.log(`Users with Weekly Change: ${usersWithWeeklyChange}`)
    console.log(`Users with Monthly Change: ${usersWithMonthlyChange}`)
    console.log(`Users with Global Change: ${usersWithGlobalChange}`)
    
    if (usersWithWeeklyChange === 0) {
      console.log('❌ NO USERS HAVE WEEKLY RANK CHANGES - This is the issue!')
      return { issue: 'no_weekly_changes_calculated' }
    }
    
    // Step 3: Check sample user data
    console.log('\n🔍 STEP 3: Sample User Data Analysis')
    console.log('-'.repeat(30))
    
    const sampleUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gumballs: true,
        globalRank: true,
        weeklyRank: true,
        monthlyRank: true,
        rankChange: true,
        weeklyRankChange: true,
        monthlyRankChange: true
      },
      take: 5,
      orderBy: { gumballs: 'desc' }
    })
    
    console.log('Sample of top users:')
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}:`)
      console.log(`   Gumballs: ${user.gumballs}`)
      console.log(`   Global Rank: ${user.globalRank}`)
      console.log(`   Weekly Rank: ${user.weeklyRank}`)
      console.log(`   Monthly Rank: ${user.monthlyRank}`)
      console.log(`   Global Change: ${user.rankChange}`)
      console.log(`   Weekly Change: ${user.weeklyRankChange}`)
      console.log(`   Monthly Change: ${user.monthlyRankChange}`)
      console.log('')
    })
    
    // Step 4: Check API response
    console.log('\n🌐 STEP 4: API Response Check')
    console.log('-'.repeat(30))
    
    // Simulate API call
    const apiResponse = await prisma.user.findMany({
      where: { globalRank: { not: null } },
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
      orderBy: [
        { globalRank: 'asc' },
        { gumballs: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 3
    })
    
    console.log('API Response Sample (top 3 users):')
    apiResponse.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName}:`)
      console.log(`   rankChange: ${user.rankChange}`)
      console.log(`   weeklyRankChange: ${user.weeklyRankChange}`)
      console.log(`   monthlyRankChange: ${user.monthlyRankChange}`)
    })
    
    // Step 5: Check recent historical snapshots
    console.log('\n📸 STEP 5: Recent Historical Snapshots')
    console.log('-'.repeat(30))
    
    const recentSnapshots = await prisma.rankHistory.findMany({
      where: {
        OR: [
          { week: prevWeek },
          { week: currentWeek }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    })
    
    console.log('Recent snapshots:')
    recentSnapshots.forEach((snapshot, index) => {
      console.log(`${index + 1}. ${snapshot.user.firstName} ${snapshot.user.lastName}:`)
      console.log(`   Week: ${snapshot.week}`)
      console.log(`   Global Rank: ${snapshot.globalRank}`)
      console.log(`   Weekly Rank: ${snapshot.weeklyRank}`)
      console.log(`   Created: ${snapshot.createdAt}`)
      console.log('')
    })
    
    // Step 6: Manual calculation test
    console.log('\n🧮 STEP 6: Manual Calculation Test')
    console.log('-'.repeat(30))
    
    if (sampleUsers.length > 0) {
      const testUser = sampleUsers[0]
      console.log(`Testing calculations for: ${testUser.firstName} ${testUser.lastName}`)
      
      // Get this user's history
      const userHistory = await prisma.rankHistory.findMany({
        where: {
          userId: testUser.id,
          OR: [
            { week: prevWeek },
            { month: prevMonth }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`Historical records found: ${userHistory.length}`)
      
      if (userHistory.length > 0) {
        const prevWeekHistory = userHistory.find(h => h.week === prevWeek)
        const prevMonthHistory = userHistory.find(h => h.month === prevMonth)
        
        console.log('Previous week history:', prevWeekHistory)
        console.log('Previous month history:', prevMonthHistory)
        
        if (prevWeekHistory) {
          const currentWeeklyRank = testUser.weeklyRank || 999999
          const previousWeeklyRank = prevWeekHistory.weeklyRank || currentWeeklyRank
          const calculatedWeeklyChange = previousWeeklyRank - currentWeeklyRank
          
          console.log(`Manual calculation:`)
          console.log(`  Current weekly rank: ${currentWeeklyRank}`)
          console.log(`  Previous weekly rank: ${previousWeeklyRank}`)
          console.log(`  Calculated change: ${calculatedWeeklyChange}`)
          console.log(`  Stored change: ${testUser.weeklyRankChange}`)
          
          if (calculatedWeeklyChange !== testUser.weeklyRankChange) {
            console.log('❌ MISMATCH - Calculation not working properly!')
            return { issue: 'calculation_mismatch' }
          }
        }
      }
    }
    
    console.log('\n✅ DIAGNOSIS COMPLETE')
    console.log('=' .repeat(50))
    
    return { 
      issue: null,
      totalUsers,
      usersWithWeeklyChange,
      historicalSnapshots: totalSnapshots,
      previousWeekSnapshots
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return { issue: 'debug_error', error: error.message }
  }
}

// Fix function for common issues
const fixRankChanges = async () => {
  console.log('🔧 ATTEMPTING TO FIX RANK CHANGES...')
  
  try {
    // Import the function from levelSystem
    const { calculateRankChanges } = require('../src/services/levelSystem') // Fixed path
    
    console.log('Running calculateRankChanges...')
    const result = await calculateRankChanges()
    
    if (result.success) {
      console.log(`✅ Fixed! Updated ${result.updated} users`)
    } else {
      console.log(`❌ Fix failed: ${result.error}`)
    }
    
    return result
  } catch (error) {
    console.error('❌ Fix error:', error)
    return { success: false, error: error.message }
  }
}

// Run debug if called directly
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--fix')) {
    fixRankChanges()
      .then(result => {
        if (result.success) {
          console.log('🎉 Rank changes should now work!')
        }
        process.exit(0)
      })
      .catch(error => {
        console.error('Fix failed:', error)
        process.exit(1)
      })
  } else {
    debugRankChanges()
      .then(result => {
        if (result.issue) {
          console.log(`\n🚨 ISSUE IDENTIFIED: ${result.issue}`)
          console.log('\n💡 TO FIX: Run "node debug-rank-changes.js --fix"')
        } else {
          console.log('\n🎉 No issues found - rank changes should be working!')
        }
        process.exit(0)
      })
      .catch(error => {
        console.error('Debug failed:', error)
        process.exit(1)
      })
  }
}

module.exports = { debugRankChanges, fixRankChanges }