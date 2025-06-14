// scripts/fix-all-ranks.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAllRanks() {
  try {
    console.log('Fixing all user ranks...')
    
    // Get all users and rank them by gumballs
    const users = await prisma.user.findMany({
      select: { id: true, gumballs: true },
      orderBy: { gumballs: 'desc' }
    })
    
    // Update each user with their rank
    for (let i = 0; i < users.length; i++) {
      await prisma.user.update({
        where: { id: users[i].id },
        data: { globalRank: i + 1 }
      })
    }
    
    console.log(`✅ Fixed ranks for ${users.length} users`)
    
    // Show first 10 users
    const topUsers = await prisma.user.findMany({
      select: { username: true, gumballs: true, globalRank: true },
      orderBy: { globalRank: 'asc' },
      take: 10
    })
    
    console.log('\nTop 10 users:')
    topUsers.forEach(user => {
      console.log(`#${user.globalRank} - ${user.username}: ${user.gumballs} gumballs`)
    })
    
  } catch (error) {
    console.error('Error fixing ranks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllRanks()