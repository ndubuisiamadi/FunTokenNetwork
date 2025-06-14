// scripts/migrate-existing-users.js - COMPLETE FILE
// Run this ONCE after adding the new level system fields to your schema

const prisma = require('../src/db')
const { calculateLevel, updateRankings } = require('../src/services/levelSystem')

async function migrateExistingUsers() {
  try {
    console.log('Starting user migration for level system...')
    
    // Get all existing users
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        gumballs: true, 
        level: true,
        username: true
      }
    })
    
    console.log(`Found ${users.length} users to migrate`)
    
    if (users.length === 0) {
      console.log('No users found to migrate')
      return
    }
    
    // Update each user's level based on their current gumballs
    console.log('Updating user levels based on current gumballs...')
    
    const updates = users.map(user => {
      const correctLevel = calculateLevel(user.gumballs || 0)
      
      console.log(`User ${user.username}: ${user.gumballs} gumballs -> ${correctLevel} level`)
      
      return prisma.user.update({
        where: { id: user.id },
        data: {
          level: correctLevel,
          globalRank: null, // Will be set by ranking update
          weeklyRank: null,
          monthlyRank: null,
          rankChange: 0
        }
      })
    })
    
    await Promise.all(updates)
    console.log('✅ Updated all user levels')
    
    // Calculate initial rankings
    console.log('Calculating initial rankings...')
    console.log('  - All-time rankings...')
    await updateRankings('all')
    
    console.log('  - Weekly rankings...')
    await updateRankings('weekly')
    
    console.log('  - Monthly rankings...')
    await updateRankings('monthly')
    
    console.log('✅ Initial rankings calculated')
    
    // Show migration results
    console.log('\n📊 Migration Results:')
    
    // Show level distribution
    const levelStats = await prisma.user.groupBy({
      by: ['level'],
      _count: { level: true }
    })
    
    console.log('Level distribution:')
    levelStats.forEach(stat => {
      console.log(`  ${stat.level}: ${stat._count.level} users`)
    })
    
    // Show top 5 users
    const topUsers = await prisma.user.findMany({
      select: {
        username: true,
        gumballs: true,
        level: true,
        globalRank: true
      },
      orderBy: { gumballs: 'desc' },
      take: 5
    })
    
    console.log('\nTop 5 users:')
    topUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username}: ${user.gumballs} gumballs (${user.level}) - Rank #${user.globalRank}`)
    })
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Add the leaderboard route to your server.js')
    console.log('2. Update your posts controller to award gumballs')
    console.log('3. Test the leaderboard API endpoints')
    console.log('4. Set up the frontend store and update your LeaderboardView')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Helper function to add sample gumball history for testing
async function addSampleGumballHistory() {
  try {
    console.log('Adding sample gumball history for testing...')
    
    const users = await prisma.user.findMany({
      select: { id: true, gumballs: true, username: true },
      take: 10 // Only add history for first 10 users
    })
    
    const { getCurrentWeek, getCurrentMonth } = require('../src/services/levelSystem')
    const currentWeek = getCurrentWeek()
    const currentMonth = getCurrentMonth()
    
    const historyEntries = []
    
    users.forEach(user => {
      // Add some random history entries for this week/month
      const weeklyEarnings = Math.floor(Math.random() * 100) + 10
      const reasons = ['post_created', 'received_like', 'task_completed', 'daily_bonus']
      
      // Add 3-5 random entries for each user
      const numEntries = Math.floor(Math.random() * 3) + 3
      
      for (let i = 0; i < numEntries; i++) {
        const change = Math.floor(Math.random() * 20) + 5
        const reason = reasons[Math.floor(Math.random() * reasons.length)]
        
        historyEntries.push({
          userId: user.id,
          gumballs: user.gumballs,
          change: change,
          reason: reason,
          week: currentWeek,
          month: currentMonth
        })
      }
    })
    
    await prisma.gumballHistory.createMany({
      data: historyEntries
    })
    
    console.log(`✅ Added ${historyEntries.length} sample history entries`)
    console.log('Sample users with weekly activity:')
    
    // Show some sample weekly earnings
    for (const user of users.slice(0, 5)) {
      const userEntries = historyEntries.filter(e => e.userId === user.id)
      const totalWeekly = userEntries.reduce((sum, e) => sum + e.change, 0)
      console.log(`  ${user.username}: +${totalWeekly} gumballs this week`)
    }
    
  } catch (error) {
    console.error('Failed to add sample history:', error)
  }
}

// Run migration
if (require.main === module) {
  const args = process.argv.slice(2)
  const addSampleData = args.includes('--sample-data')
  
  migrateExistingUsers()
    .then(async () => {
      if (addSampleData) {
        console.log('\n📝 Adding sample data...')
        await addSampleGumballHistory()
        
        // Recalculate weekly/monthly rankings with sample data
        console.log('Recalculating rankings with sample data...')
        const { updateRankings } = require('../src/services/levelSystem')
        await updateRankings('weekly')
        await updateRankings('monthly')
        console.log('✅ Sample data setup complete')
      }
      
      console.log('\n🚀 Level system is ready!')
      console.log('Test your leaderboard API: GET /api/leaderboard')
      process.exit(0)
    })
    .catch(err => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}

module.exports = { migrateExistingUsers, addSampleGumballHistory }